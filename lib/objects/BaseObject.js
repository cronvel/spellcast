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



//const tree = require( 'tree-kit' ) ;
//const copyData = require( '../copyData.js' ) ;
const kungFig = require( 'kung-fig' ) ;
//const StatsTable = kungFig.statsModifiers.StatsTable ;
const ModifiersTable = kungFig.statsModifiers.ModifiersTable ;

const Ngev = require( 'nextgen-events' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// This is the underlying class for most objects in the game

function BaseObject( book , id , params ) {
	Object.defineProperties( this , {
		book: { value: book } ,
		id: { value: id , enumerable: true } ,
		// An event bus for this object
		events: { value: new Ngev() , enumerable: true }
	} ) ;

	this.name = params.name || '(unknown)' ;

	// Object class
	this.class = params.class || 'object' ;

	// Optional, if a model was used, this is the model ID
	this.model = params.model || null ;

	// BaseObject's description
	this.description = params.description || params.name || '(unknown)' ;

	// A parent object, the current object is "in", "on" or attached in some way to the parent
	this.parent = params.parent || null ;

	// Parameters of this object
	this.params = params.params || {} ;

	// Scriptlets of this object (Key: scriptlet name, value: TagContainer)
	this.scriptlets = params.scriptlets || {} ;

	// Adhoc namespace where script and API may store temporary data related to the object
	this.adhoc = params.adhoc || {} ;

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
// Return the first item matching
BaseObject.getStackedObjectMatching = function( stack , key , value ) {
	for ( let thing of stack ) {
		if ( thing[ key ] === value ) { return thing ; }
	}

	return null ;
} ;



// Same than .getStackedObjectMatching() but return an array of all item matching instead of the first one
BaseObject.getStackedObjectListMatching = function( stack , key , value ) {
	var matches = [] ;

	for ( let thing of stack ) {
		if ( thing[ key ] === value ) { matches.push( thing ) ; }
	}

	return matches ;
} ;



BaseObject.prototype.getParentPlace = function() {
	if ( ! this.parent ) { return null ; }
	if ( this.parent.__prototypeUID__ === 'spellcast/Place' ) { return this.parent ; }
	return this.parent.getParentPlace() ;
} ;



BaseObject.prototype.getParentBoard = function() {
	if ( ! this.parent ) { return null ; }
	if ( this.parent.__prototypeUID__ === 'spellcast/Board' ) { return this.parent ; }
	return this.parent.getParentBoard() ;
} ;



BaseObject.prototype.getParentEntity = function() {
	if ( ! this.parent ) { return null ; }
	if ( this.parent.__prototypeUID__ === 'spellcast/Entity' ) { return this.parent ; }
	return this.parent.getParentEntity() ;
} ;



BaseObject.prototype.removeFromParent = function() {
	if ( this.parent ) { return this.parent.remove( this ) ; }
	return false ;
} ;



const MODIFIERS_RESERVED_KEY = new Set( [ 'id' , 'active' , 'template' , 'events' ] ) ;

BaseObject.prototype.createModifiersTable = function( id , data , prefix = null ) {
	if ( ! data || typeof data !== 'object' ) { return null ; }

	var statName ,
		active = data.active !== undefined ? !! data.active : true ,
		isTemplate = !! data.template ,
		events = data.events ,
		stats = {} ;

	if ( prefix && prefix[ prefix.length - 1 ] !== '.' ) { prefix += '.' ; }

	for ( statName in data ) {
		if ( ! MODIFIERS_RESERVED_KEY.has( statName ) ) {
			if ( prefix && ! statName.startsWith( prefix ) ) { stats[ prefix + statName ] = data[ statName ] ; }
			else { stats[ statName ] = data[ statName ] ; }
		}
	}

	return new ModifiersTable( id , stats , active , isTemplate , events ).getProxy() ;
} ;



// Must be derivated
BaseObject.prototype.getAllSubObjects = () => [] ;
BaseObject.prototype.store = () => false ;
BaseObject.prototype.remove = () => false ;

