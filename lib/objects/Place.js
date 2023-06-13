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
const StatsTable = kungFig.statsModifiers.StatsTable ;
const ModifiersTable = kungFig.statsModifiers.ModifiersTable ;
const copyData = require( '../copyData.js' ) ;

const svgKit = require( 'svg-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Place( book , id , params ) {
	if ( ! params || typeof params !== 'object' ) {
		params = {} ;
	}
	else {
		// Clone params to avoid parts to be shared
		params = copyData.deep( params ) ;
	}

	if ( ! id ) { id = 'place_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , params ) ;

	// When part of a Board, it's the «logical» coordinates, related to the game rules
	this.logicalCoords = null ;

	// When part of a Board, it's the «physical» coordinates, the actual position on the board
	this.physicalCoords = null ;

	// When part of a Board, it is the geometry of the place
	// This is an instance of svgKit.VGPath
	this.geometry = params.geometry instanceof svgKit.VGPath ? params.geometry : null ;

	// Statistics of this place (attributes, e.g. temperature, luminosity, ...)
	this.stats = new StatsTable( params.stats || {} ).getProxy() ;

// /!\ NOT CODED
	// Statistics bonus for entities in this place (e.g. volcano give bonus to fire magic, and so on...)
	this.mods = this.createModifiersTable( this.id + '_place' , params.mods ) ;

	// Items lying in this place (e.g. object that can be grabbed, ...)
	this.items = new Set( Array.isArray( params.items ) ? params.items : undefined ) ;

	// Entities currently in/on this place (e.g.peoples, or any entities populating that place, ...)
	this.entities = new Set( Array.isArray( params.entities ) ? params.entities : undefined ) ;

	// UI are things like image, sound, message theme, etc... organized by variant (e.g. "sunny" or "snowy")
	this["ui-data"] = params['ui-data'] || {} ;
	this.variant = params.variant || 'default' ;

	if ( params.logicalCoords ) { this.setLogicalCoords( params.logicalCoords ) ; }
	if ( params.physicalCoords ) { this.setPhysicalCoords( params.physicalCoords ) ; }
}

module.exports = Place ;

Place.prototype = Object.create( BaseObject.prototype ) ;
Place.prototype.constructor = Place ;
Place.prototype.__prototypeUID__ = 'spellcast/Place' ;
Place.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Place.serializer = function( place ) {
	return { override: place } ;
} ;



Place.unserializeContext = true ;

Place.unserializer = function( context ) {
	var place = Object.create( Place.prototype ) ;
	Object.defineProperty( place , 'book' , { value: context.book } ) ;
	//log.error( "Place.unserializer: %I" , context ) ;
	return place ;
} ;



Place.prototype.setLogicalCoords = function( coords ) {
	if ( ! coords || typeof coords !== 'object' ) { return ; }

	if ( ! this.logicalCoords ) { this.logicalCoords = {} ; }

	if ( Array.isArray( coords ) ) {
		if ( coords[ 0 ] !== undefined ) { this.logicalCoords.x = + coords[ 0 ] || 0 ; }
		if ( coords[ 1 ] !== undefined ) { this.logicalCoords.y = + coords[ 1 ] || 0 ; }
		if ( coords[ 2 ] !== undefined ) { this.logicalCoords.z = + coords[ 2 ] || 0 ; }
	}
	else {
		for ( let key in coords ) {
			if ( coords[ key ] !== undefined ) { this.logicalCoords[ key ] = + coords[ key ] || 0 ; }
		}
	}
} ;



Place.prototype.setPhysicalCoords = function( coords ) {
	if ( ! coords || typeof coords !== 'object' ) { return ; }

	if ( ! this.physicalCoords ) { this.physicalCoords = {} ; }

	if ( Array.isArray( coords ) ) {
		if ( coords[ 0 ] !== undefined ) { this.physicalCoords.x = + coords[ 0 ] || 0 ; }
		if ( coords[ 1 ] !== undefined ) { this.physicalCoords.y = + coords[ 1 ] || 0 ; }
		if ( coords[ 2 ] !== undefined ) { this.physicalCoords.z = + coords[ 2 ] || 0 ; }
	}
	else {
		if ( coords.x !== undefined ) { this.physicalCoords.x = + coords.x || 0 ; }
		if ( coords.y !== undefined ) { this.physicalCoords.y = + coords.y || 0 ; }
		if ( coords.z !== undefined ) { this.physicalCoords.z = + coords.z || 0 ; }
	}
} ;



// Get all sub-objects of the current place
Place.prototype.getAllSubObjects = function( recursive = false , masterArray = null ) {
	var array = [] ;

	array.push( ... this.entities ) ;
	array.push( ... this.items ) ;

	if ( masterArray ) { masterArray.push( ... array ) ; }
	else { masterArray = array ; }

	if ( recursive ) {
		array.forEach( o => o.getAllSubObjects( recursive , masterArray ) ) ;
	}

	return masterArray ;
} ;



// Move the object argument into the current instance
Place.prototype.store = function( object ) {
	var stack ;

	if ( ! object || typeof object !== 'object' ) { return false ; }

	switch ( object.__prototypeUID__ ) {
		case 'spellcast/Entity' :
			stack = this.entities ;
			break ;
		case 'spellcast/Item' :
			stack = this.items ;
			break ;
		default :
			return false ;
	}

	if ( object.parent && object.parent !== this ) { object.parent.remove( object ) ; }
	stack.add( object ) ;
	object.parent = this ;

	return true ;
} ;



// Remove the object argument from the current instance
Place.prototype.remove = function( object ) {
	var stack , indexOf ;

	if ( ! object || typeof object !== 'object' ) { return false ; }

	switch ( object.__prototypeUID__ ) {
		case 'spellcast/Entity' :
			stack = this.entities ;
			break ;
		case 'spellcast/Item' :
			stack = this.items ;
			break ;
		default :
			return false ;
	}

	if ( ! stack.has( object ) ) { return ; }

	// Remove the item from the place
	stack.delete( object ) ;
	object.parent = null ;

	return true ;
} ;



// Drop all items
Place.prototype.removeAllItems = function( dropStack ) {
	this.items.forEach( item => item.parent = null ) ;
	if ( dropStack && Array.isArray( dropStack ) ) { dropStack.push( ... this.items ) ; }
	this.items.clear() ;
	return true ;
} ;



// Drop all entities
Place.prototype.removeAllEntities = function( dropStack ) {
	this.entities.forEach( entity => entity.parent = null ) ;
	if ( dropStack && Array.isArray( dropStack ) ) { dropStack.push( ... this.entities ) ; }
	this.entities.clear() ;
	return true ;
} ;



Place.prototype.hasItem = function( item ) { return this.items.has( item ) ; } ;
Place.prototype.hasEntities = function( entity ) { return this.entities.has( entity ) ; } ;



// E.g. place.getItemMatching( 'id' , 'excalibur' ) or place.getItemMatching( 'model' , 'broadsword' )
Place.prototype.getItemMatching = function( key , value ) {
	for ( let item of this.items ) {
        if ( item[ key ] === value ) { return item ; }
    }

    return null ;
} ;



// Variant returning an array instead of the first item found
Place.prototype.getItemListMatching = function( key , value ) {
	var matches = [] ;

	for ( let item of this.items ) {
        if ( item[ key ] === value ) { matches.push( item ) ; }
    }

    return matches ;
} ;



// E.g. place.getEntityMatching( 'id' , 'guardian' )
Place.prototype.getEntityMatching = function( key , value ) {
	for ( let entity of this.entities ) {
        if ( entity[ key ] === value ) { return entity ; }
    }

    return null ;
} ;



// Variant returning an array instead of the first entity found
Place.prototype.getEntityListMatching = function( key , value ) {
	var matches = [] ;

	for ( let entity of this.entities ) {
        if ( entity[ key ] === value ) { matches.push( entity ) ; }
    }

    return matches ;
} ;



Place.prototype.setVariant = function( variant ) {
	if ( ! this.variant ) {
		this.variant = variant ;
		return ;
	}

	var oldSplitted = this.variant.split( '/' ) ;
	var newSplitted = variant.split( '/' ) ;
	var i , iMax = Math.max( oldSplitted.length , newSplitted.length ) ;

	for ( i = 0 ; i < iMax ; i ++ ) {
		if ( newSplitted[ i ] && newSplitted[ i ] !== 'default' ) { continue ; }
		if ( oldSplitted[ i ] && oldSplitted[ i ] !== 'default' ) { newSplitted[ i ] = oldSplitted[ i ] ; }
		else { newSplitted[ i ] = 'default' ; }
	}

	this.variant = newSplitted.join( '/' ) ;
} ;



Place.prototype.getUiData = function() {
	var variant = this.variant ;

	while ( variant ) {
		if ( this['ui-data'][ variant ] ) { return this['ui-data'][ variant ] ; }
		variant = variant.replace( /\/*[^/]*$/ , '' ) ;
	}

	if ( ! this['ui-data'].default ) { this['ui-data'].default = {} ; }

	return this['ui-data'].default ;
} ;

