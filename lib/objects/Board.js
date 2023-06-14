/*
	Spellcast

	Copyright (c) 2014 - 2021 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/*
	A place is a location that entities can occupy.
	There are places linked to scenes and scenario, or places linked to a Board (acting like space/square/hex).
*/



const BaseObject = require( './BaseObject.js' ) ;
const kungFig = require( 'kung-fig' ) ;
const copyData = require( '../copyData.js' ) ;

const Place = require( './Place.js' ) ;
const svgKit = require( 'svg-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Board( book , id , params ) {
	if ( ! params || typeof params !== 'object' ) {
		params = {} ;
	}
	else {
		// Clone params to avoid parts to be shared
		params = copyData.deep( params ) ;
	}

	if ( ! id ) { id = 'board_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , params ) ;

	// This list all coordinates dimensions
	this['logical-coord-names'] = Array.isArray( params['logical-coord-names'] ) ? params['logical-coord-names'] : [ 'x' ] ;

	// This contains all places
	this.places = new Set() ;

	// This is a 1:1 map linking a (string) coordinate to a place
	this.placesIndex = {} ;

	// This is the reverse a 1:1 map linking a place to a (string) coordinate
	this.placesIndexKey = new Map() ;

	//this.logicalNeighbor = [] ;
	this.logicalNeighbor = [ { x: 1 } , { x: -1 } , { y: 1 } , { y: -1 } ] ;

	if ( Array.isArray( params.places ) ) {
		for ( let place of params.places ) { this.addPlace( place ) ; }
	}

	if ( params['create-places'] ) {
		this.createPlaces( params['create-places'] ) ;
	}
}

module.exports = Board ;

Board.prototype = Object.create( BaseObject.prototype ) ;
Board.prototype.constructor = Board ;
Board.prototype.__prototypeUID__ = 'spellcast/Board' ;
Board.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Board.serializer = function( place ) {
	return { override: place } ;
} ;



Board.unserializeContext = true ;

Board.unserializer = function( context ) {
	var place = Object.create( Board.prototype ) ;
	Object.defineProperty( place , 'book' , { value: context.book } ) ;
	//log.error( "Board.unserializer: %I" , context ) ;
	return place ;
} ;



// Get all sub-objects of the current place
Board.prototype.getAllSubObjects = function( recursive = false , masterArray = null ) {
	var array = [] ;

	array.push( ... this.places ) ;

	if ( masterArray ) { masterArray.push( ... array ) ; }
	else { masterArray = array ; }

	if ( recursive ) {
		array.forEach( o => o.getAllSubObjects( recursive , masterArray ) ) ;
	}

	return masterArray ;
} ;



// Move the object argument into the current instance
Board.prototype.store = function( object ) {
	var stack ;

	if ( ! object || typeof object !== 'object' ) { return false ; }

	switch ( object.__prototypeUID__ ) {
		case 'spellcast/Place' :
			return this.addPlace( object ) ;
		default :
			return false ;
	}

	if ( object.parent && object.parent !== this ) { object.parent.remove( object ) ; }
	stack.add( object ) ;
	object.parent = this ;

	return true ;
} ;



// Remove the object argument from the current instance
Board.prototype.remove = function( object ) {
	var stack , indexOf ;

	if ( ! object || typeof object !== 'object' ) { return false ; }

	switch ( object.__prototypeUID__ ) {
		case 'spellcast/Place' :
			return this.removePlace( object ) ;
		default :
			return false ;
	}

	if ( ! stack.has( object ) ) { return ; }

	// Remove the item from the place
	stack.delete( object ) ;
	object.parent = null ;

	return true ;
} ;



// Add a place to the Board and add it to the indexes
Board.prototype.addPlace = function( place ) {
	var coordsString = this.coordsString( place.logicalCoords ) ;

	if ( this.placesIndex[ coordsString ] && this.placesIndex[ coordsString ] !== place ) {
		throw new Error( "Board: Duplicated place coordinate: " + coordsString ) ;
		//return false ;
	}

	if ( place.parent && place.parent !== this ) { place.parent.remove( place ) ; }
	this.places.add( place ) ;
	this.placesIndex[ coordsString ] = place ;
	this.placesIndexKey.set( place , coordsString ) ;
	place.parent = this ;

	return true ;
} ;



// Remove a place from the Board and remove it from the indexes
Board.prototype.removePlace = function( place ) {
	if ( ! this.places.has( place ) ) { return false ; }
	this.place.delete( place ) ;
	place.parent = null ;

	var coordsString = this.coordsString( place.logicalCoords ) ;

	if ( this.placesIndex[ coordsString ] === place ) { delete this.placesIndex[ coordsString ] ; }
	this.placesIndexKey.delete( place ) ;

	return true ;
} ;



// Drop all places
Board.prototype.removeAllPlaces = function( dropStack ) {
	if ( dropStack && Array.isArray( dropStack ) ) { dropStack.push( ... this.places ) ; }
	for ( let place of this.places ) { this.removePlace( place ) ; }
	return true ;
} ;



Board.prototype.hasPlace = function( place ) { return this.places.has( place ) ; } ;



// E.g. place.getPlaceMatching( 'id' , 'p1_spawn' ) or place.getPlaceMatching( 'model' , 'castle' )
Board.prototype.getPlaceMatching = function( key , value ) {
	for ( let place of this.places ) {
        if ( place[ key ] === value ) { return place ; }
    }

    return null ;
} ;



// Variant returning an array instead of the first place found
Board.prototype.getPlaceListMatching = function( key , value ) {
	var matches = [] ;

	for ( let place of this.places ) {
        if ( place[ key ] === value ) { matches.push( place ) ; }
    }

    return matches ;
} ;



// Get a place using its logical coordinates.
Board.prototype.getPlaceByLogicalCoords = function( coords ) {
	var coordsString = this.coordsString( coords ) ;
	return this.placesIndex[ coordsString ] ;
} ;



// Get a place using its logical coordinates.
Board.prototype.getLogicalNeighborPlaces = function( coords , n = 1 ) {
	if ( ! coords || typeof coords !== 'object' ) { return ; }

	if ( coords.__prototypeUID__ === 'spellcast/Place' ) { coords = coords.logicalCoords ; }

	var currentCoords = {} , places = [] , lastLoopPlaces = [] ;
	
	while ( n -- ) {
		for ( let neighborCoords of this.logicalNeighbor ) {
			Object.assign( currentCoords , coords ) ;
			for ( let coordName in neighborCoords ) { currentCoords[ coordName ] += neighborCoords[ coordName ] ; }
			let coordsString = this.coordsString( coords ) ;
			places.push( this.placesIndex[ coordsString ] ) ;
			lastLoopPlaces.push( this.placesIndex[ coordsString ] ) ;
		}
	}

	return this.placesIndex[ coordsString ] ;
} ;



// Relocate a place, called by place.setLogicalCoords()
Board.prototype._logicalCoordsRelocated = function( place ) {
	var oldCoordsString = this.placesIndexKey.get( place ) ,
		newCoordsString = this.coordsString( place.logicalCoords ) ;

	if ( this.placesIndex[ newCoordsString ] ) {
		throw new Error( "Board: Duplicated place coordinate: " + newCoordsString ) ;
	}

	if ( oldCoordsString && this.placesIndex[ oldCoordsString ] ) { delete this.placesIndex[ oldCoordsString ] ; }
	this.placesIndex[ newCoordsString ] = place ;
	this.placesIndexKey.set( place , newCoordsString ) ;
} ;



// Internal
Board.prototype.coordsString = function( coords ) {
	if ( ! coords || typeof coords !== 'object' ) { return ; }

	var str = '' ;

	// .logical-coord-names is used to have a consistent property order when stringifying coordinates
	for ( let coordName of this['logical-coord-names'] ) {
		if ( coords[ coordName ] !== undefined ) {
			if ( str ) { str += ';' ; }
			str += coordName + ':' + coords[ coordName ] ;
		}
	}

	return str ;
} ;



Board.prototype.createPlaces = function( params ) {
	if ( Array.isArray( params ) ) {
		for ( let subParams of params ) { this.createPlaces( subParams ) ; }
		return ;
	}
	
	var ranges ,
		type = params.type || 'square' ,

	ranges = Array.isArray( params.ranges ) ? params.ranges :
		params.range ? [ params.range ] :
		null ;

	if ( ! ranges || ! ranges.length ) { return ; }

	for ( let range of ranges ) {
		switch ( type ) {
			case 'square' :
				this.createSquareRange( range ) ;
				break ;
			case 'v-hex' :
				this.createVHexRange( range ) ;
				break ;
			case 'h-hex' :
				this.createHHexRange( range ) ;
				break ;
		}
	}
} ;



Board.prototype.createSquareRange = function( range ) {
	var [ xName , yName ] = Object.keys( range ) ,
		xRange = range[ xName ] ,
		yRange = range[ yName ] ;

	for ( let x = xRange.min ; x <= xRange.max ; x ++ ) {
		for ( let y = yRange.min ; y <= yRange.max ; y ++ ) {
			let geometry = new svgKit.VGPath() ;
			geometry.moveTo( { x: x - 0.5 , y: y - 0.5 } ) ;
			geometry.lineTo( { x: x + 0.5 , y: y - 0.5 } ) ;
			geometry.lineTo( { x: x + 0.5 , y: y + 0.5 } ) ;
			geometry.lineTo( { x: x - 0.5 , y: y + 0.5 } ) ;
			geometry.close() ;

			let place = new Place( this.book , undefined , {
				logicalCoords: { x , y } ,
				physicalCoords: { x , y } ,
				geometry
			} ) ;

			this.addPlace( place ) ;
		}
	}
} ;



Board.prototype.createVHexRange = function( range ) {
} ;



Board.prototype.createHHexRange = function( range ) {
} ;

