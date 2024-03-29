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



const Ngev = require( 'nextgen-events' ) ;
const Listener = require( './Listener.js' ) ;
const Event = require( './Event.js' ) ;
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Ctx( book , options = {} ) {
	var events ;

	if ( options.events ) {
		events = options.events ;
	}
	else {
		events = new Ngev() ;
		events.listenerMap = {} ;

		// The event bus should be interruptible, so the [cancel] tag will works
		events.setInterruptible( true ) ;
		// The event bus should order its listener by descending priority
		events.setListenerPriority( true ) ;
		events.setNice( Ngev.DESYNC ) ;
		events.desyncUseNextTick( true ) ;
		events.serializeListenerContext( 'script' ) ;
	}

	Object.defineProperties( this , {
		book: { value: book } ,
		type: { value: options.type || null , writable: true , enumerable: true } ,
		parent: { value: options.parent || null , writable: true , enumerable: true } ,
		root: { value: ( options.parent && options.parent.root ) || this , enumerable: true } ,
		nodeRoot: { value: ! options.newNode && options.parent ? options.parent.nodeRoot : this , enumerable: true } ,
		children: { value: new Set() , writable: true , enumerable: true } ,
		events: { value: events , writable: true , enumerable: true } ,
		localListeners: { value: [] , writable: true , enumerable: true } ,
		data: {
			value: options.data || ( options.parent ? Object.create( options.parent.data ) : book.data ) ,
			writable: true ,
			enumerable: true
		} ,
		ticks: { value: options.ticks || 0 , writable: true , enumerable: true } ,
		syncCodeStack: { value: [] , writable: true , enumerable: true } ,
		syncCodeDepth: { value: 0 , writable: true , enumerable: true } ,
		resume: { value: false , writable: true , enumerable: true } ,
		roles: { value: options.roles || book.roles , writable: true , enumerable: true } ,
		active: { value: options.active !== undefined ? options.active : true , writable: true , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true }
	} ) ;

	// Add the context to its parent's children set
	if ( this.parent ) { this.parent.children.add( this ) ; }
	else { this.book.ctx = this ; }
}

//Ctx.prototype = Object.create( Ngev.prototype ) ;
//Ctx.prototype.constructor = Ctx ;

module.exports = Ctx ;



Ctx.prototype.destroy = function() {
	if ( this.destroyed ) { return ; }

	this.destroyed = true ;
	this.active = false ;

	// Remove the context from its parent's children set
	if ( this.parent ) { this.parent.children.delete( this ) ; }
	else { this.book.ctx = null ; }
} ;



Ctx.prototype.emitEvent = function( eventName , data , ctx , callback ) {
	return this.emitEventOnBus( this.events , eventName , data , ctx , callback ) ;
} ;



Ctx.prototype.emitEventOnBus = function( bus , eventName , data , ctx , callback ) {
	if ( ! bus ) { bus = this.events ; }

	// Build the special $event variable
	var $event = new Event() ;

	bus.emit( eventName , data , $event , ctx , cancelValue => {
		callback( cancelValue , $event ) ;
	} ) ;
} ;



// Async/Promise variant of .emitEventOnBus()
Ctx.prototype.emitEventOnBusAsync = function( bus , eventName , data , ctx , ignoreCancel = false ) {
	return new Promise( ( resolve , reject ) => {
		if ( ! bus ) { bus = this.events ; }

		// Build the special $event variable
		var $event = new Event() ;

		bus.emit( eventName , data , $event , ctx , cancelValue => {
			if ( cancelValue && ! ignoreCancel ) { reject( cancelValue ) ; }
			else { resolve( $event ) ; }
		} ) ;
	} ) ;
} ;



Ctx.prototype.emitIntricatedEvents = function( busEvents , data , $event , ctx , callback ) {
	busEvents = busEvents.map( e => {
		if ( ! Array.isArray( e ) ) { e = [ e ] ; }
		if ( e.length <= 1 ) { e.unshift( this.events ) ; }
		e[ 2 ] = data ;
		e[ 3 ] = $event ;
		e[ 4 ] = ctx ;
		return e ;
	} ) ;

	Ngev.emitIntricatedEvents( busEvents , cancelValue => {
		callback( cancelValue , $event ) ;
	} ) ;
} ;



Ctx.prototype.onEvent = function( eventName , tag ) {
	this.onEventOnBus( this.events , eventName , tag ) ;
} ;



Ctx.prototype.onEventOnBus = function( bus , eventName , tag ) {
	if ( ! bus ) { bus = this.events ; }

	//var listenerCtx = this.createScope() ;

	//log.error( "Api on: %I" , arguments ) ;

	// Event emitting is serialized:
	// async listeners are called one at a time, because the 'script' context is serialized

	var listener = new Listener( {
		book: this.book ,
		bus: bus ,
		event: eventName ,
		tag: tag
	} ) ;

	bus.on( eventName , listener , true ) ;
	this.events.listenerMap[ tag.id ] = listener ;
	if ( ! tag.isGlobal ) { this.localListeners.push( listener ) ; }
} ;



Ctx.prototype.offEvent = function( id ) {
	if ( ! this.events.listenerMap[ id ] ) { return ; }

	var listener = this.events.listenerMap[ id ] ;
	listener.bus.off( listener.event , id ) ;
	delete this.events.listenerMap[ id ] ;
} ;

