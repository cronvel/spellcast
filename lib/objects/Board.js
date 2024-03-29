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

	// This contains all places
	this.places = new Set() ;

	this.groups = {} ;


	// Properties not part of the Spellcast Scripting API

	// The default group when none is provided
	this.defaultGroupName  = null ;
	
	// This is a 1:1 map linking a (string) coordinate to a place
	this.placesIndex = {} ;

	// This is the reverse a 1:1 map linking a place to a (string) coordinate
	this.placesIndexKey = new Map() ;


	if ( Array.isArray( params.places ) ) {
		for ( let place of params.places ) { this.addPlace( place ) ; }
	}

	if ( params.groups && typeof params.groups === 'object' ) {
		for ( let groupName in params.groups ) { this.createGroup( groupName , params.groups[ groupName ] ) ; }
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



const GROUP_TYPES = {
	adhoc: {
		type: 'adhoc' ,
		'logical-coord-names': [ 'x' ] ,
	} ,
	grid: {
		type: 'grid' ,
		'logical-coord-names': [ 'x' , 'y' ] ,
		'logical-neighbor-delta': [ { x: 1 } , { x: -1 } , { y: 1 } , { y: -1 } ] ,
	} ,
	'v-hex-grid': {
		type: 'v-hex-grid' ,
		'logical-coord-names': [ 'x' , 'y' ] ,
		'logical-neighbor-delta': [ { x: 1 , y: 1 } , { x: 1 , y: -1 } , { x: -1 , y: 1 } , { x: -1 , y: -1 } , { y: 2 } , { y: -2 } ] ,
	} ,
	'h-hex-grid': {
		type: 'h-hex-grid' ,
		'logical-coord-names': [ 'x' , 'y' ] ,
		'logical-neighbor-delta': [ { x: 2 } , { x: -2 } , { x: 1 , y: 1 } , { x: -1 , y: 1 } , { x: 1 , y: -1 } , { x: -1 , y: -1 } ] ,
	}
} ;

/*
	A group is a group of places with its own purpose, logic, disposition, network, etc...
	
	type: the group type, string:
		adhoc: no specific built-in design
		grid: grid of squares
		v-hex-grid: grid of hexagons, having a vertical line
		h-hex-grid: grid of hexagons, having a horizontal line
	logical-coord-names: an array of coordinates names, also used to build the coordinate string
	logical-neighbor-delta: an array of coordinates delta, used as the rules defining if a place is a neighbor of another
*/
Board.prototype.createGroup = function( name , params ) {
	var groupType = params.type && GROUP_TYPES[ params.type ] || GROUP_TYPES.adhoc ;

	var group = {
		name: name ,
		type: groupType.type ,
		'logical-coord-names': Array.isArray( params['logical-coord-names'] ) ? params['logical-coord-names'] : groupType['logical-coord-names'] ,
		'logical-neighbor-delta': Array.isArray( params['logical-neighbor-delta'] ) ? params['logical-neighbor-delta'] : groupType['logical-neighbor-delta'] ,
		'type-params': {}
	} ;
	
	if ( params['type-params'] && typeof params['type-params'] === 'object' ) {
		Object.assign( group['type-params'] , params['type-params'] ) ;
	}

	this.groups[ name ] = group ;
	if ( ! this.defaultGroupName ) { this.defaultGroupName = name ; }
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
	var coordsString = this.coordsString( place['logical-coords'] ) ;
	
	if ( ! coordsString ) {
		throw new Error( "Board: Invalid place coordinate: " + JSON.stringify( place['logical-coords'] ) ) ;
		//return false ;
	}

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

	var coordsString = this.coordsString( place['logical-coords'] ) ;

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



// Get neighbors of a place/coords (the target should exist, if n ≥ 2 it propagates only through existing places, not coordinates slots)
Board.prototype.getLogicalNeighborPlaces = function( coords , n = 1 , includeSelf = false ) {
	if ( ! coords || typeof coords !== 'object' ) { return [] ; }

	var swap , groupName ,
		places = [] ,
		lastLoopPlaces = [] ,
		nextLoopPlaces = [] ,
		visitedCoordsString = new Set() ;


	if ( coords.__prototypeUID__ === 'spellcast/Place' ) {
		groupName = coords['logical-coords'].group || this.defaultGroupName ;
		lastLoopPlaces.push( coords ) ;
		if ( includeSelf ) { places.push( coords ) ; }
		coords = coords['logical-coords'] ;
	}
	else {
		let place = this.getPlaceByLogicalCoords( coords ) ;
		if ( ! place ) { return places ; }
		groupName = place.group || this.defaultGroupName ;
		lastLoopPlaces.push( place ) ;
		if ( includeSelf ) { places.push( place ) ; }
	}

	// Always add the current place as visited, even if not included...
	visitedCoordsString.add( this.coordsString( coords ) ) ;

	while ( n -- && lastLoopPlaces.length ) {
		for ( let startingPlace of lastLoopPlaces ) {
			for ( let neighborCoords of this.groups[ groupName ]['logical-neighbor-delta'] ) {
				let currentCoords = Object.assign( {} , startingPlace['logical-coords'] ) ;
				
				// Apply current neighbor translation modifications
				for ( let coordName in neighborCoords ) { currentCoords[ coordName ] += neighborCoords[ coordName ] ; }

				let coordsString = this.coordsString( currentCoords ) ;
				
				if ( ! visitedCoordsString.has( coordsString ) ) {
					visitedCoordsString.add( coordsString ) ;
					let currentPlace = this.placesIndex[ coordsString ] ;
					if ( currentPlace ) {
						places.push( currentPlace ) ;
						nextLoopPlaces.push( currentPlace ) ;
					}
				}
			}
		}

		swap = lastLoopPlaces ;
		lastLoopPlaces = nextLoopPlaces ;
		nextLoopPlaces = swap ;
		nextLoopPlaces.length = 0 ;
	}

	return places ;
} ;



// Relocate a place, called by place.setLogicalCoords()
Board.prototype._logicalCoordsRelocated = function( place ) {
	var oldCoordsString = this.placesIndexKey.get( place ) ,
		newCoordsString = this.coordsString( place['logical-coords'] ) ;

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

	var groupName = coords.group || this.defaultGroupName ,
		group = this.groups[ groupName ] ;
	if ( ! group ) { return ; }

	var str = '' + groupName ;

	// .logical-coord-names is used to have a consistent property order when stringifying coordinates
	for ( let coordName of group['logical-coord-names'] ) {
		if ( coords[ coordName ] !== undefined ) {
			str += ';' + coordName + ':' + coords[ coordName ] ;
		}
	}

	return str ;
} ;



const DEFAULT_PHYSICAL_SCALE = 100 ;



Board.prototype.renderToSvgString = function( options = {} ) {
	var xMin = Infinity ,
		xMax = - Infinity ,
		yMin = Infinity ,
		yMax = - Infinity ,
		vg = new svgKit.VG() ,
		vgEntities = [];

	for ( let place of this.places ) {
		let vgEntity = place.geometry ;
		if ( ! vgEntity ) { continue ; }

		vgEntity = svgKit.objectToVG( vgEntity , true ) ;
		if ( ! vgEntity ) { continue ; }

		let physicalScale = vgEntity.data.scale || DEFAULT_PHYSICAL_SCALE ;
		
		vgEntity.set( {
			style: {
				fill: options.fill || '#fff' ,
				stroke: options.stroke || '#000' ,
				'stroke-width': options['stroke-width'] || 0.05 * physicalScale ,
				'paint-order': 'markers fill stroke'
			}
		} ) ;
		
		if ( place['physical-coords'].x - physicalScale < xMin ) { xMin = place['physical-coords'].x - physicalScale ; }
		if ( place['physical-coords'].x + physicalScale > xMax ) { xMax = place['physical-coords'].x + physicalScale ; }
		if ( place['physical-coords'].y - physicalScale < yMin ) { yMin = place['physical-coords'].y - physicalScale ; }
		if ( place['physical-coords'].y + physicalScale > yMax ) { yMax = place['physical-coords'].y + physicalScale ; }

		vg.addEntity( vgEntity ) ;

		if ( options['show-coords'] ) {
			let coordEntity = new svgKit.VGText( {
				x: place['physical-coords'].x ,
				y: place['physical-coords'].y ,
				text: '(' + place['logical-coords'].x + ';' + place['logical-coords'].y + ')' ,
				style: {
					'font-size': options['font-size'] || 0.15 * physicalScale ,
					fill: '#777'
				}
			} ) ;
			vg.addEntity( coordEntity ) ;
		}
	}
	
	vg.set( {
		viewBox: { x: xMin , y: yMin , width: xMax - xMin , height: yMax - yMin }
	} ) ;
	
	return vg.renderText() ;
} ;



Board.prototype.createPlaces = function( params ) {
	if ( Array.isArray( params ) ) {
		for ( let subParams of params ) { this.createPlaces( subParams ) ; }
		return ;
	}
	
	var group = params.group ? this.groups[ params.group ] : this.groups[ this.defaultGroupName ] ;

	if ( ! group ) {
		log.error( "Board#createPlaces() group not found: %s" , params.group ) ;
		return ;
	}

	var ranges = Array.isArray( params.ranges ) ? params.ranges :
		params.range ? [ params.range ] :
		null ;

	if ( ! ranges || ! ranges.length ) { return ; }
	
	var physicalScale = params['physical-scale'] || DEFAULT_PHYSICAL_SCALE ;

	for ( let range of ranges ) {
		switch ( group.type ) {
			case 'grid' :
				this.createGridRange( group.name , range , physicalScale , group['type-params'] ) ;
				break ;
			case 'v-hex-grid' :
				this.createVHexGridRange( group.name , range , physicalScale , group['type-params'] ) ;
				break ;
			case 'h-hex-grid' :
				this.createHHexGridRange( group.name , range , physicalScale , group['type-params'] ) ;
				break ;
		}
	}
} ;



Board.prototype.createGridRange = function( groupName , range , physicalScale , params ) {
	var [ xName , yName ] = Object.keys( range ) ,
		xRange = range[ xName ] ,
		yRange = range[ yName ] ,
		vertexOffset = 0.5 * physicalScale ;

	for ( let x = xRange.min ; x <= xRange.max ; x ++ ) {
		for ( let y = yRange.min ; y <= yRange.max ; y ++ ) {
			let xPhy = x * physicalScale ,
				yPhy = y * physicalScale ;

			let geometry = new svgKit.VGPath() ;
			geometry.set( { data: { scale: physicalScale } } ) ;
			geometry.moveTo( { x: xPhy - vertexOffset , y: yPhy - vertexOffset } ) ;
			geometry.lineTo( { x: xPhy + vertexOffset , y: yPhy - vertexOffset } ) ;
			geometry.lineTo( { x: xPhy + vertexOffset , y: yPhy + vertexOffset } ) ;
			geometry.lineTo( { x: xPhy - vertexOffset , y: yPhy + vertexOffset } ) ;
			geometry.close() ;

			let place = new Place( this.book , undefined , {
				'logical-coords': { group: groupName , x , y } ,
				'physical-coords': { x: xPhy , y: yPhy } ,
				geometry
			} ) ;

			this.addPlace( place ) ;
		}
	}
} ;



Board.prototype.createVHexGridRange = function( groupName , range , physicalScale , params ) {
	var [ xName , yName ] = Object.keys( range ) ,
		xRange = range[ xName ] ,
		yRange = range[ yName ] ,
		odd = params.odd ? 1 : 0 ,
		cos30 = Math.cos( Math.PI / 6 ) ,
		xPhyScale = cos30 * physicalScale ,
		yPhyScale = 0.5 * physicalScale ,
		vertexOffset0 = 0.5 * physicalScale / cos30 ,
		vertexOffset30 = 0.5 * physicalScale ,
		vertexOffset60 = vertexOffset0 * 0.5 ,
		brickVertexOffsetWidth = cos30 * physicalScale / 2 ,
		brickVertexOffsetHeight = 0.5 * physicalScale ;

	for ( let x = xRange.min ; x <= xRange.max ; x ++ ) {
		for ( let y = yRange.min ; y <= yRange.max ; y ++ ) {
			if ( ( x + y + odd ) % 2 ) { continue ; }
			
			let xPhy = x * xPhyScale ,
				yPhy = y * yPhyScale ;

			let geometry = new svgKit.VGPath() ;
			geometry.set( { data: { scale: physicalScale } } ) ;
			
			if ( params.brick ) {
				// Brick-mode board has rectangle spaces with an hex behavior
				geometry.moveTo( { x: xPhy - brickVertexOffsetWidth , y: yPhy - brickVertexOffsetHeight } ) ;
				geometry.lineTo( { x: xPhy + brickVertexOffsetWidth , y: yPhy - brickVertexOffsetHeight } ) ;
				geometry.lineTo( { x: xPhy + brickVertexOffsetWidth , y: yPhy + brickVertexOffsetHeight } ) ;
				geometry.lineTo( { x: xPhy - brickVertexOffsetWidth , y: yPhy + brickVertexOffsetHeight } ) ;
				geometry.close() ;
			}
			else {
				geometry.moveTo( { x: xPhy - vertexOffset0 , y: yPhy } ) ;
				geometry.lineTo( { x: xPhy - vertexOffset60 , y: yPhy - vertexOffset30 } ) ;
				geometry.lineTo( { x: xPhy + vertexOffset60 , y: yPhy - vertexOffset30 } ) ;
				geometry.lineTo( { x: xPhy + vertexOffset0 , y: yPhy } ) ;
				geometry.lineTo( { x: xPhy + vertexOffset60 , y: yPhy + vertexOffset30 } ) ;
				geometry.lineTo( { x: xPhy - vertexOffset60 , y: yPhy + vertexOffset30 } ) ;
				geometry.close() ;
			}

			let place = new Place( this.book , undefined , {
				'logical-coords': { group: groupName , x , y } ,
				'physical-coords': { x: xPhy , y: yPhy } ,
				geometry
			} ) ;

			this.addPlace( place ) ;
		}
	}
} ;



Board.prototype.createHHexGridRange = function( groupName , range , physicalScale , params ) {
	var [ xName , yName ] = Object.keys( range ) ,
		xRange = range[ xName ] ,
		yRange = range[ yName ] ,
		odd = params.odd ? 1 : 0 ,
		cos30 = Math.cos( Math.PI / 6 ) ,
		xPhyScale = 0.5 * physicalScale ,
		yPhyScale = cos30 * physicalScale ,
		vertexOffset0 = 0.5 * physicalScale / cos30 ,
		vertexOffset30 = 0.5 * physicalScale ,
		vertexOffset60 = vertexOffset0 * 0.5 ,
		brickVertexOffsetWidth = 0.5 * physicalScale ,
		brickVertexOffsetHeight = cos30 * physicalScale / 2 ;

	for ( let y = yRange.min ; y <= yRange.max ; y ++ ) {
		for ( let x = xRange.min ; x <= xRange.max ; x ++ ) {
			if ( ( x + y + odd ) % 2 ) { continue ; }
			
			let xPhy = x * xPhyScale ,
				yPhy = y * yPhyScale ;

			let geometry = new svgKit.VGPath() ;
			geometry.set( { data: { scale: physicalScale } } ) ;

			if ( params.brick ) {
				// Brick-mode board has rectangle spaces with an hex behavior
				geometry.moveTo( { x: xPhy - brickVertexOffsetWidth , y: yPhy - brickVertexOffsetHeight } ) ;
				geometry.lineTo( { x: xPhy + brickVertexOffsetWidth , y: yPhy - brickVertexOffsetHeight } ) ;
				geometry.lineTo( { x: xPhy + brickVertexOffsetWidth , y: yPhy + brickVertexOffsetHeight } ) ;
				geometry.lineTo( { x: xPhy - brickVertexOffsetWidth , y: yPhy + brickVertexOffsetHeight } ) ;
				geometry.close() ;
			}
			else {
				geometry.moveTo( { x: xPhy , y: yPhy - vertexOffset0 } ) ;
				geometry.lineTo( { x: xPhy + vertexOffset30 , y: yPhy - vertexOffset60 } ) ;
				geometry.lineTo( { x: xPhy + vertexOffset30 , y: yPhy + vertexOffset60 } ) ;
				geometry.lineTo( { x: xPhy , y: yPhy + vertexOffset0 } ) ;
				geometry.lineTo( { x: xPhy - vertexOffset30 , y: yPhy + vertexOffset60 } ) ;
				geometry.lineTo( { x: xPhy - vertexOffset30 , y: yPhy - vertexOffset60 } ) ;
				geometry.close() ;
			}

			let place = new Place( this.book , undefined , {
				'logical-coords': { group: groupName , x , y } ,
				'physical-coords': { x: xPhy , y: yPhy } ,
				geometry
			} ) ;

			this.addPlace( place ) ;
		}
	}
} ;

