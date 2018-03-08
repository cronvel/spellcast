/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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

		// This will DESYNC .emit() callback
		events.setNice( -100 ) ;

		events.serializeListenerContext( 'script' ) ;
	}

	Object.defineProperties( self , {
		book: { value: book } ,
		type: { value: options.type || null , writable: true , enumerable: true } ,
		parent: { value: options.parent || null , writable: true , enumerable: true } ,
		root: { value: ( options.parent && options.parent.root ) || self , enumerable: true } ,
		children: { value: new Set() , writable: true , enumerable: true } ,
		events: { value: events , writable: true , enumerable: true } ,
		localListeners: { value: [] , writable: true , enumerable: true } ,
		data: {
			value: options.data || ( options.parent ? Object.create( options.parent.data ) : book.data ) ,
			writable: true ,
			enumerable: true
		} ,
		ticks: { value: 0 , writable: true , enumerable: true } ,
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



Ctx.prototype.createScope = function createScope() {
	var ctx = Object.create( this , {
		data: { value: Object.create( this.data ) , writable: true , enumerable: true }
	} ) ;

	// Reference local now, it should be preserved to that object, whatever the super context's local is becoming
	ctx.data.local = this.data.local ;

	return ctx ;
} ;



// Import a scope into the current, typically a scope created from this one using .createScope()
Ctx.prototype.importScopeData = function importScopeData( scope ) {
	Object.keys( scope.data ).forEach( key => {
		switch ( key ) {
			case 'global' :
			case 'local' :
			case 'static' :
			case 'args' :
			case 'this' :
				return ;
			default :
				this.data[ key ] = scope.data[ key ] ;
		}
	} ) ;
} ;



// DEPRECATED?
// Restore a scope of the current ctx from serialized data
Ctx.prototype.restoreScope = function restoreScope( raw ) {
	// First, restore the data inheritance
	raw.data = Object.assign( Object.create( this.data ) , raw.data ) ;

	// Then restore the ctx inheritance
	var ctx = Object.assign( Object.create( this ) , raw ) ;

	return ctx ;
} ;



Ctx.prototype.serialize = function serialize() {
	throw new Error( "Cannot serialize Ctx superclass" ) ;
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

	var listener = {
		//nice: -1 ,
		bus: bus || this.events ,
		event: eventName ,
		id: tag.id ,
		async: true ,
		context: 'script' ,
		fn: ( data , emitterCtx , callback ) => {

			/*
				/!\ use emitterCtx or listenerCtx?

				Emitter context is useful because the message tag will not send to role of other branches (split chat).
				But the expected behavior is usually to have the listener context.
			*/

			//log.error( "Api listener: %I" , arguments ) ;

			var innerBus = bus || emitterCtx.events ;

			if ( tag.isDefault && innerBus.listenerCount( eventName ) > 1 ) {
				// Default listener only fire if they are alone
				callback() ;
				return ;
			}

			var returnVal = tag.exec( this.book , { data: data , event: eventName } , emitterCtx , ( error ) => {

				if ( error ) {
					switch ( error.break ) {
						case 'return' :
							//log.error( "Async returnval: %I" , error ) ;
							callback() ;
							return ;
						case 'cancel' :
							//log.error( "Async returnval: %I" , error ) ;
							callback( error.cancel ) ;
							return ;
						default :
							log.error( '[on] tag execution returned error: %E' , error ) ;
							//callback( error ) ;	// or not???
							break ;
					}
				}

				//log.error( "[on] tag finished" ) ;

				callback() ;
			} ) ;

			// When the return value is undefined, it means this was an async tag execution
			if ( returnVal === undefined ) { return ; }

			// Sync variant...

			if ( returnVal ) {
				switch ( returnVal.break ) {
					case 'return' :
						//log.error( "Returnval: %I" , returnVal ) ;
						callback() ;
						return ;
					case 'cancel' :
						//log.error( "Returnval: %I" , returnVal ) ;
						callback( returnVal.cancel ) ;
						return ;
					default :
						log.error( '[on] tag execution returned error: %E' , returnVal ) ;
						//callback( error ) ;	// or not???
						break ;
				}
			}

			callback() ;
		}
	} ;

	listener.bus.on( eventName , listener ) ;
	this.events.listenerMap[ tag.id ] = listener ;
	if ( ! tag.isGlobal ) { this.localListeners.push( listener ) ; }
} ;



Ctx.prototype.offEvent = function offEvent( id ) {
	if ( ! this.events.listenerMap[ id ] ) { return ; }

	var listener = this.events.listenerMap[ id ] ;

	listener.bus.off( listener.event , id ) ;

	delete this.events.listenerMap[ id ] ;
} ;


