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
const Tag = kungFig.Tag ;
const Ref = kungFig.Ref ;

const chatBot = require( '../../chatBot.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function RequestTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof RequestTag ) ? this : Object.create( RequestTag.prototype ) ;

	var matches ;

	Tag.call( self , 'request' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))(?: *=> *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The 'request' tag's attribute should validate the request syntax." ) ;
	}

	Object.defineProperties( self , {
		interpreterRef: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		interpreterId: { value: matches[ 2 ] , writable: true , enumerable: true } ,
		replyRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = RequestTag ;
RequestTag.prototype = Object.create( Tag.prototype ) ;
RequestTag.prototype.constructor = RequestTag ;



RequestTag.prototype.run = function( book , ctx , callback ) {
	var queryTag , returnVal , fullInput , output ,
		state = this.getRecursiveFinalContent( ctx.data ) ;

	if ( typeof state === 'string' ) { state = { input: state } ; }
	else if ( ! state || typeof state !== 'object' ) { callback( new Error( 'The [request] tag content should be an object or a string' ) ) ; return ; }

	state.interpreter = this.interpreterId || this.interpreterRef.get( ctx.data , true ) ;

	returnVal = RequestTag.exec( book , state , ctx , ( error ) => {
		if ( error ) { callback( error ) ; return ; }
		this.replyRef.set( ctx.data , state.reply ) ;
		callback() ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...
	this.replyRef.set( ctx.data , state.reply ) ;
	return returnVal ;
} ;



RequestTag.exec = function( book , state , ctx , callback ) {
	var interpreter , queryTag , returnVal , output ;

	// Reset reply
	state.that = state.reply ;
	state.reply = null ;
	state.stars = null ;

	interpreter = book.interpreters[ state.interpreter ] ;

	// Interpreter not found
	if ( ! interpreter ) { return null ; }

	if ( ctx.resume ) {
		// /!\ Not supported ATM: need to store the query somewhere along the line
		log.error( "Warning: resuming Query/Request is not supported ATM" ) ;
	}

	// Get the query tag
	queryTag = chatBot.query(
		book.queryPatternTree[ state.interpreter ] ,
		state , {
			patternOrder: interpreter.patternOrder ,
			punctuation: interpreter.punctuation ,
			symbols: interpreter.symbols ,
			substitutions: interpreter.substitutions
		}
	) ;

	if ( ! queryTag ) { return null ; }

	returnVal = queryTag.exec( book , state , ctx , ( error ) => {

		// Async variant...

		if ( error ) {
			switch ( error.break ) {
				case 'reply' :
					state.reply = error.reply ;
					callback() ;
					return ;
				default :
					callback( error ) ;
					return ;
			}
		}

		// Ended without a reply...
		callback() ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	if ( returnVal ) {
		switch ( returnVal.break ) {
			case 'reply' :
				state.reply = returnVal.reply ;
				return null ;
			default :
				return returnVal ;
		}
	}

	// Ended without a reply...
	return null ;
} ;


