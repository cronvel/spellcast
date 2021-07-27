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



const kungFig = require( 'kung-fig' ) ;
//const tree = require( 'tree-kit' ) ;
//const copyData = require( '../copyData.js' ) ;
const Ngev = require( 'nextgen-events' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// This is the underlying class for most objects in the game

function BaseObject( book , id , options ) {
	Object.defineProperties( this , {
		book: { value: book } ,
		id: { value: id , enumerable: true } ,
		// An event bus for this object
		events: { value: new Ngev() , enumerable: true }
	} ) ;
	
	this.name = value: options.name || '(unknown)' ;
	
	// Object class
	this.class = options.class || 'object' ;
	
	// Optional, if a model was used, this is the model ID
	this.model = options.model || null ;
	
	// BaseObject's description
	this.description = options.description || options.name || '(unknown)' ;
	
	// A parent object, the current object is "in", "on" or attached in some way to the parent
	this.parent = options.parent || null ;
	
	// Parameters of this object
	this.params = options.params || {} ;
	
	// Adhoc namespace where script and API may store temporary data related to the object
	this.adhoc = options.adhoc || {} ;

	this.events.setInterruptible( true ) ;
	this.events.setListenerPriority( true ) ;
	this.events.setNice( Ngev.DESYNC ) ;
	this.events.desyncUseNextTick( true ) ;
	this.events.serializeListenerContext( 'script' ) ;

	//log.error( "raw place: %I" , this ) ;

	// Reduce the name if it is an array
	if ( Array.isArray( this.name ) ) {
		this.name = this.name[ Math.floor( Math.random() * this.name.length ) ] ;
	}
}

module.exports = BaseObject ;

//BaseObject.prototype.__prototypeUID__ = 'spellcast/BaseObject' ;
//BaseObject.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// E.g. BaseObject.getStackedObjectMatching( chest , 'model' , 'broadsword' )
BaseObject.getStackedObjectMatching = function( stack , key , value ) {
	return stack.find( e => e[ key ] === value ) ;
} ;



BaseObject.prototype.getParentPlace = function() {
	if ( ! this.parent ) { return null ; }
	//if ( this.parent instanceof Place ) { return this.parent ; }
	if ( this.parent.__prototypeUID__ === 'spellcast/Place' ) { return this.parent ; }
	return this.parent.getParentPlace() ;
} ;



BaseObject.prototype.getParentEntity = function() {
	if ( ! this.parent ) { return null ; }
	//if ( this.parent instanceof Entity ) { return this.parent ; }
	if ( this.parent.__prototypeUID__ === 'spellcast/Entity' ) { return this.parent ; }
	return this.parent.getParentEntity() ;
} ;



BaseObject.prototype.removeFromParent = function() {
	if ( this.parent ) { return this.parent.remove( this ) ; }
	return false ;
} ;



// Must be derivated
BaseObject.prototype.getAllSubObjects = () => [] ;
BaseObject.prototype.moveInto = () => false ;
BaseObject.prototype.remove = () => false ;

