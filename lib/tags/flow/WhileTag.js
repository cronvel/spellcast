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
const ExpressionTag = kungFig.ExpressionTag ;
const TagContainer = kungFig.TagContainer ;
const Dynamic = kungFig.Dynamic ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function WhileTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof WhileTag ) ? this : Object.create( WhileTag.prototype ) ;

	// WTF?
	if ( content === undefined ) { content = new TagContainer( undefined , self ) ; }

	ExpressionTag.call( self , 'while' , attributes , content , shouldParse , options ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'while' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'while' tag's attribute should be an expression." ) ;
	}

	Object.defineProperties( self , {
		condition: {
			value: self.attributes , writable: true , enumerable: true
		}
	} ) ;

	//log.debug( "While tag: %I" , self ) ;

	return self ;
}

module.exports = WhileTag ;
WhileTag.prototype = Object.create( ExpressionTag.prototype ) ;
WhileTag.prototype.constructor = WhileTag ;



WhileTag.prototype.run = function( book , ctx , callback ) {
	var returnVal , callCount = 0 ;

	var nextSyncChunk = ( error ) => {

		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check callCount here.
		if ( error && error.break !== 'continue' ) {
			callback( error ) ;
			return ;
		}

		callCount ++ ;

		while ( ctx.resume || Dynamic.getFinalValue( this.condition , ctx.data ) ) {
			returnVal = book.engine.run( this.content , book , ctx , null , nextSyncChunk ) ;

			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }

			// Truthy value: an error or an interruption had happened
			if ( returnVal && returnVal.break !== 'continue' ) {
				if ( callCount <= 1 ) { return returnVal ; }
				callback( returnVal ) ;
				return ;
			}
		}

		if ( callCount <= 1 ) { return null ; }
		callback() ;
		return ;
	} ;

	return nextSyncChunk() ;
} ;

