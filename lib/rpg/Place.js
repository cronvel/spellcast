/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const kungFig = require( 'kung-fig' ) ;
//const tree = require( 'tree-kit' ) ;
const copyData = require( '../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Place( book , id , options ) {
	var slotType ;

	if ( ! options || typeof options !== 'object' ) {
		options = {} ;
	}
	else {
		// Clone options to avoid parts to be shared
		options = copyData.deep( options ) ;
	}

	if ( ! id ) { id = 'place_' + ( autoId ++ ) ; }

	Object.defineProperties( this , {
		book: { value: book } ,
		id: { value: id , enumerable: true } ,
		name: { value: options.name || '(unknown)' , writable: true , enumerable: true } ,

		// Place class, if different types of place exists in the game
		// Not sure if it will ever be useful...
		//class: { value: options.class || 'place' , writable: true , enumerable: true } ,

		// Optional, if a model was used, this is the model ID
		model: { value: options.model || null , writable: true , enumerable: true } ,

		// Place's description
		description: { value: options.description || options.name || '(unknown)' , writable: true , enumerable: true } ,

		// Parameters of this place
		params: { value: options.params || {} , writable: true , enumerable: true } ,

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

		// Adhoc namespace where script and API may store temporary data related to the place
		adhoc: { value: options.adhoc || {} , writable: true , enumerable: true } ,

		// UI are things like image, sound, message theme, etc... organized by variant (e.g. "sunny" or "snowy")
		"ui-data": { value: options['ui-data'] || {} , writable: true , enumerable: true } ,
		variant: { value: options.variant || 'default' , writable: true , enumerable: true }
	} ) ;

	//log.error( "raw place: %I" , this ) ;

	// Reduce the name if it is an array
	if ( Array.isArray( this.name ) ) {
		this.name = this.name[ Math.floor( Math.random() * this.name.length ) ] ;
	}

	//log.error( "%Y" , this ) ;
	//log.error( "%Y" , this['actual-usages'].missile ) ;
}

module.exports = Place ;

Place.prototype.__prototypeUID__ = 'spellcast/Place' ;
Place.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Place.serializer = function( place ) {
	return { overide: place } ;
} ;



Place.unserializeContext = true ;

Place.unserializer = function( context ) {
	var place = Object.create( Place.prototype ) ;
	Object.defineProperty( place , 'book' , { value: context.book } ) ;
	//log.error( "Place.unserializer: %I" , context ) ;
	return place ;
} ;



Place.prototype.addItem = function( item , stack ) {
	var indexOf ;

	// First check if the item is not already there, to avoid duplicate
	if ( this.items.includes( item ) ) { return ; }

	// If there is a stack array and the item should be present, and will be removed
	if ( Array.isArray( stack ) ) {
		indexOf = stack.indexOf( item ) ;

		// Not in the stack? exit now!
		if ( indexOf === -1 ) { return ; }

		//log.error( "Stack before: %Y" , stack ) ;
		// Remove the item from the stack
		stack.splice( indexOf , 1 ) ;
		//log.error( "Stack after: %Y" , stack ) ;
	}

	// Add the item to the place
	this.items.push( item ) ;
} ;



Place.prototype.addEntity = function( entity , stack ) {
	var indexOf ;

	// First check if the entity is not already there, to avoid duplicate
	if ( this.entities.includes( entity ) ) { return ; }

	// If there is a stack array and the entity should be present, and will be removed
	if ( Array.isArray( stack ) ) {
		indexOf = stack.indexOf( entity ) ;

		// Not in the stack? exit now!
		if ( indexOf === -1 ) { return ; }

		//log.error( "Stack before: %Y" , stack ) ;
		// Remove the entity from the stack
		stack.splice( indexOf , 1 ) ;
		//log.error( "Stack after: %Y" , stack ) ;
	}

	// Add the entity to the place
	this.entities.push( entity ) ;
} ;



Place.prototype.removeItem = function( item , stack ) {
	var indexOf = this.items.indexOf( item ) ;

	// Not found in the place? exit now!
	if ( indexOf === -1 ) { return ; }

	// Remove the item from the inventory
	this.items.splice( indexOf , 1 ) ;

	// If there is a stack array and the item does not exist there, put it in the stack
	if ( Array.isArray( stack ) && stack.includes( item ) ) {
		stack.push( item ) ;
	}
} ;



Place.prototype.removeEntity = function( entity , stack ) {
	var indexOf = this.entities.indexOf( entity ) ;

	// Not found in the place? exit now!
	if ( indexOf === -1 ) { return ; }

	// Remove the entity from the inventory
	this.entities.splice( indexOf , 1 ) ;

	// If there is a stack array and the entity does not exist there, put it in the stack
	if ( Array.isArray( stack ) && stack.includes( entity ) ) {
		stack.push( entity ) ;
	}
} ;



// Drop all items
Place.prototype.removeAllItems = function( stack ) {
	if ( Array.isArray( stack ) ) {
		this.items.forEach( item => stack.push( item ) ) ;
	}

	this.items.length = 0 ;
} ;



// Drop all entities
Place.prototype.removeAllEntities = function( stack ) {
	if ( Array.isArray( stack ) ) {
		this.entities.forEach( entity => stack.push( entity ) ) ;
	}

	this.entities.length = 0 ;
} ;



Place.prototype.hasItem = function( item ) {
	return this.items.includes( item ) !== -1 ;
} ;



Place.prototype.hasEntities = function( entity ) {
	return this.entities.includes( entity ) !== -1 ;
} ;



// E.g. hero.getItemMatching( 'id' , 'excalibur' ) or hero.getItemMatching( 'model' , 'broadsword' )
Place.prototype.getItemMatching = function( key , value ) {
	var item = this.items.find( e => e[ key ] === value ) ;
	if ( item ) { return item ; }
} ;



Place.prototype.getEntityMatching = function( key , value ) {
	var item = this.entities.find( e => e[ key ] === value ) ;
	if ( item ) { return item ; }
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

