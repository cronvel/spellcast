/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Listener( options ) {
	//this.nice = -1 ;
	this.book = null ;
	this.fn = null ;

	this.bus = options.bus ;
	this.event = options.event ;
	this.tag = options.tag ;
	this.id = options.tag.id ;
	this.priority = + options.tag.priority || 0 ;
	this.async = true ;
	this.context = 'script' ;

	Object.defineProperty( this , 'book' , { value: options.book } ) ;

	Listener.createListenerFn( this ) ;
}

module.exports = Listener ;



Listener.serializer = function( object ) {
	//log.error( "Listener.serializer" ) ;
	return { args: [ {
		bus: object.bus ,
		event: object.event ,
		tag: object.tag
	} ] } ;
} ;



Listener.unserializeContext = true ;

Listener.unserializer = function( context , data ) {
	return new Listener( {
		bus: data.bus ,
		event: data.event ,
		tag: data.tag ,
		book: context.book
	} ) ;
} ;



Listener.createListenerFn = function( listener ) {
	listener.fn = ( data , $event , emitterCtx , callback ) => {

		/*
			/!\ use emitterCtx or listenerCtx?

			Emitter context is useful because the message tag will not send to role of other branches (split chat).
			But it's somewhat less intuitive.
		*/

		var innerBus = listener.bus || emitterCtx.events ;

		if ( listener.tag.isDefault && innerBus.listenerCount( listener.event ) > 1 ) {
			// Default listener only fire if they are alone
			callback() ;
			return ;
		}

		//log.hdebug( "About to execute listener '%s' with args %Y" , listener.tag.event , data ) ;
		//log.hdebug( "About to execute listener '%s' with emitterCtx %Y" , listener.tag.event , emitterCtx ) ;
		
		var returnVal = listener.tag.exec( listener.book , { data , $event , event: listener.event } , emitterCtx , ( error ) => {
			//log.hdebug( "Listener '%s' callback %Y" , listener.tag.event , error ) ;

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

		//log.hdebug( "Listener '%s' returnVal %Y" , listener.tag.event , returnVal ) ;
		
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
	} ;
} ;

