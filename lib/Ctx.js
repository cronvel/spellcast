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



var Ngev = require( 'nextgen-events' ) ;
var Listener = require( './Listener.js' ) ;
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Ctx() { throw new Error( 'Use Ctx.create() instead.' ) ; }
//Ctx.prototype = Object.create( Ngev.prototype ) ;
//Ctx.prototype.constructor = Ctx ;

module.exports = Ctx ;



Ctx.create = function create( book , options , self ) {
	var events ;

	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( ! ( self instanceof Ctx ) ) { self = Object.create( Ctx.prototype ) ; }

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

	Object.defineProperties( self , {
		book: { value: book } ,
		type: { value: options.type || null , writable: true , enumerable: true } ,
		parent: { value: options.parent || null , writable: true , enumerable: true } ,
		root: { value: ( options.parent && options.parent.root ) || self , enumerable: true } ,
		nodeRoot: { value: ! options.newNode && options.parent ? options.parent.nodeRoot : self , enumerable: true } ,
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
	if ( self.parent ) { self.parent.children.add( self ) ; }
	else { self.book.ctx = self ; }

	return self ;
} ;



Ctx.prototype.destroy = function destroy() {
	if ( this.destroyed ) { return ; }

	this.destroyed = true ;
	this.active = false ;

	// Remove the context from its parent's children set
	if ( this.parent ) { this.parent.children.delete( this ) ; }
	else { this.book.ctx = null ; }
} ;



Ctx.prototype.emitEvent = function emitEvent( eventName , data , ctx , callback ) {
	//log.error( "Api emit: %I" , arguments ) ;
	//this.events.emit( -1 , eventName , data ) ;
	this.events.emit( eventName , data , ctx , callback ) ;
} ;



Ctx.prototype.onEvent = function onEvent( eventName , tag , bus ) {
	//var listenerCtx = this.createScope() ;

	//log.error( "Api on: %I" , arguments ) ;

	// Event emitting is serialized:
	// async listeners are called one at a time, because the 'script' context is serialized

	var listener = new Listener( {
		book: this.book ,
		bus: bus || this.events ,
		event: eventName ,
		tag: tag
	} ) ;

	listener.bus.on( eventName , listener , true ) ;
	this.events.listenerMap[ tag.id ] = listener ;
	if ( ! tag.isGlobal ) { this.localListeners.push( listener ) ; }
} ;



Ctx.prototype.offEvent = function offEvent( id ) {
	if ( ! this.events.listenerMap[ id ] ) { return ; }

	var listener = this.events.listenerMap[ id ] ;
	listener.bus.off( listener.event , id ) ;
	delete this.events.listenerMap[ id ] ;
} ;

