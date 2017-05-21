/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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
var tree = require( 'tree-kit' ) ;
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Ctx() { throw new Error( 'Use Ctx.create() instead.' ) ; }
//Ctx.prototype = Object.create( Ngev.prototype ) ;
//Ctx.prototype.constructor = Ctx ;

module.exports = Ctx ;



Ctx.create = function create( book , options , self )
{
	var eventBus ;
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( self instanceof Ctx ) ) { self = Object.create( Ctx.prototype ) ; }
	
	if ( options.eventBus )
	{
		eventBus = options.eventBus ;
	}
	else
	{
		eventBus = new Ngev() ;
		eventBus.listenerMap = {} ;
		
		// The event bus should be interruptible, so the [cancel] tag will works
		eventBus.setInterruptible( true ) ;
		eventBus.serializeListenerContext( 'script' ) ;
	}
	
	Object.defineProperties( self , {
		type: { value: options.type || null , writable: true , enumerable: true } ,
		book: { value: book , enumerable: true } ,
		parent: { value: options.parent || null , writable: true , enumerable: true } ,
		root: { value: ( options.parent && options.parent.root ) || self , enumerable: true } ,
		children: { value: new Set() , writable: true , enumerable: true } ,
		eventBus: { value: eventBus , writable: true , enumerable: true } ,
		localListeners: { value: [] , writable: true , enumerable: true } ,
		data: {
			value: options.data || ( options.parent ? Object.create( options.parent.data ) : book.data ) ,
			writable: true , enumerable: true
		} ,
		ticks: { value: 0 , writable: true , enumerable: true } ,
		syncCodeStack: { value: [] , writable: true , enumerable: true } ,
		syncCodeDepth: { value: 0 , writable: true , enumerable: true } ,
		resume: { value: false , writable: true , enumerable: true } ,
		roles: { value: options.roles || book.roles , writable: true , enumerable: true } ,
		active: { value: options.active !== undefined ? options.active : true , writable: true , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true } ,
	} ) ;
	
	// Add the context to its parent's children set
	if ( self.parent ) { self.parent.children.add( self ) ; }
	else { self.book.ctx = self ; }
	
	return self ;
} ;



Ctx.prototype.destroy = function destroy()
{
	if ( this.destroyed ) { return ; }
	
	this.destroyed = true ;
	this.active = false ;
	
	// Remove the context from its parent's children set
	if ( this.parent ) { this.parent.children.delete( this ) ; }
	else { this.book.ctx = null ; }
} ;



Ctx.prototype.createScope = function createScope()
{
	var ctx = Object.create( this , {
		data: { value: Object.create( this.data ) , writable: true , enumerable: true }
	} ) ;
	
	// Reference local now, it should be preserved to that object, whatever the super context's local is becoming
	ctx.data.local = this.data.local ;
	
	return ctx ;
} ;



// Import a scope into the current, typically a scope created from this one using .createScope()
Ctx.prototype.importScopeData = function importScopeData( scope )
{
	Object.keys( scope.data ).forEach( key => {
		switch ( key )
		{
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



// Restore a scope of the current ctx from serialized data
Ctx.prototype.restoreScope = function restoreScope( raw )
{
	// First, restore the data inheritance
	raw.data = tree.extend( null , Object.create( this.data ) , raw.data ) ;
	
	// Then restore the ctx inheritance
	var ctx = tree.extend( null , Object.create( this ) , raw ) ;
	
	return ctx ;
} ;



Ctx.prototype.serialize = function serialize()
{
	throw new Error( "Cannot serialize Ctx superclass" ) ;
} ;



Ctx.prototype.eventBusEmit = function eventBusEmit( eventName , data , ctx , callback )
{
	//log.error( "Api emit: %I" , arguments ) ;
	//this.eventBus.emit( -1 , eventName , data ) ;
	this.eventBus.emit( eventName , data , ctx , callback ) ;
} ;



Ctx.prototype.eventBusOn = function eventBusOn( eventName , tag )
{
	var listener ;
	
	//log.error( "Api on: %I" , arguments ) ;
	
	// Event emitting is serialized:
	// async listeners are called one at a time, because the 'script' context is serialized
	
	listener = {
		//nice: -1 ,
		event: eventName ,
		id: tag.id ,
		async: true ,
		context: 'script' ,
		fn: ( data , ctx , callback ) => {
			
			//log.error( "Api listener: %I" , arguments ) ;
			
			if ( tag.isDefault && this.eventBus.listenerCount( eventName ) > 1 )
			{
				// Default listener only fire if they are alone
				callback() ;
				return ;
			}
			
			var returnVal = tag.exec( this.book , { data: data , event: eventName } , ctx , ( error ) => {
				
				if ( error )
				{
					switch ( error.break )
					{
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
			
			if ( returnVal )
			{
				switch ( returnVal.break )
				{
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
	
	this.eventBus.on( eventName , listener ) ;
	this.eventBus.listenerMap[ tag.id ] = listener ;
	if ( ! tag.isGlobal ) { this.localListeners.push( listener ) ; }
} ;



Ctx.prototype.eventBusOff = function eventBusOff( id )
{
	if ( ! this.eventBus.listenerMap[ id ] ) { return ; }
	this.eventBus.off( this.eventBus.listenerMap[ id ].event , id ) ;
	delete this.eventBus.listenerMap[ id ] ;
} ;


