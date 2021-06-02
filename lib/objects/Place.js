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



const BaseObject = require( './BaseObject.js' ) ;
const copyData = require( '../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Place( book , id , options ) {
	if ( ! options || typeof options !== 'object' ) {
		options = {} ;
	}
	else {
		// Clone options to avoid parts to be shared
		options = copyData.deep( options ) ;
	}

	if ( ! id ) { id = 'place_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , options ) ;

	Object.defineProperties( this , {
		// Statistics of this place (attributes, e.g. temperature, luminosity, ...)
		stats: { value: options.stats || {} , writable: true , enumerable: true } ,

		// Skills of this place, almost like stats, but related to bonuses and open new actions (e.g. spells, ...)
		// Not sure if it's useful for a place, maybe for magical bonuses? E.g.: volcano can improve fire magic.
		skills: { value: options.skills || {} , writable: true , enumerable: true } ,

		// Status of this place (temperature, luminosity, ...)
		status: { value: options.status || {} , writable: true , enumerable: true } ,

		// Items lying in this place (e.g. object that can be grabbed, ...)
		items: { value: options.items || [] , writable: true , enumerable: true } ,

		// Entities currently in/on this place (e.g.peoples, or any entities populating that place, ...)
		entities: { value: options.entities || [] , writable: true , enumerable: true } ,

		// UI are things like image, sound, message theme, etc... organized by variant (e.g. "sunny" or "snowy")
		"ui-data": { value: options['ui-data'] || {} , writable: true , enumerable: true } ,
		variant: { value: options.variant || 'default' , writable: true , enumerable: true }
	} ) ;
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
Place.prototype.moveInto = function( object ) {
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

	if ( object.parent ) { object.parent.remove( object ) ; }
	stack.push( object ) ;
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

	indexOf = stack.indexOf( object ) ;
	if ( indexOf === -1 ) { return ; }

	// Remove the item from the inventory
	stack.splice( indexOf , 1 ) ;
	object.parent = null ;

	return true ;
} ;



// Drop all items
Place.prototype.removeAllItems = function( dropStack ) {
	this.items.forEach( item => item.parent = null ) ;
	if ( dropStack && Array.isArray( dropStack ) ) { dropStack.push( ... this.items ) ; }
	this.items.length = 0 ;
	return true ;
} ;



// Drop all entities
Place.prototype.removeAllEntities = function( dropStack ) {
	this.entities.forEach( entity => entity.parent = null ) ;
	if ( dropStack && Array.isArray( dropStack ) ) { dropStack.push( ... this.entities ) ; }
	this.entities.length = 0 ;
	return true ;
} ;



Place.prototype.hasItem = function( item ) { return this.items.includes( item ) ; } ;
Place.prototype.hasEntities = function( entity ) { return this.entities.includes( entity ) ; } ;



// E.g. hero.getItemMatching( 'id' , 'excalibur' ) or hero.getItemMatching( 'model' , 'broadsword' )
Place.prototype.getItemMatching = function( key , value ) {
	var item = this.items.find( e => e[ key ] === value ) ;
	if ( item ) { return item ; }
} ;



Place.prototype.getEntityMatching = function( key , value ) {
	var entity = this.entities.find( e => e[ key ] === value ) ;
	if ( entity ) { return entity ; }
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

