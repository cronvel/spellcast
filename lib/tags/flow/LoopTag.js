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
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;
const Dynamic = kungFig.Dynamic ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function LoopTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof LoopTag ) ? this : Object.create( LoopTag.prototype ) ;

	Tag.call( self , 'loop' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'loop' tag's content should be a TagContainer." ) ;
	}

	return self ;
}

module.exports = LoopTag ;
LoopTag.prototype = Object.create( Tag.prototype ) ;
LoopTag.prototype.constructor = LoopTag ;



LoopTag.prototype.run = function( book , ctx , callback ) {
	var returnVal , callCount = 0 ;

	var nextSyncChunk = ( error ) => {

		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check callCount here.
		if ( error && error.break !== 'continue' ) {
			callback( error ) ;
			return ;
		}

		callCount ++ ;

		for ( ;; ) {
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
	} ;

	return nextSyncChunk() ;
} ;

