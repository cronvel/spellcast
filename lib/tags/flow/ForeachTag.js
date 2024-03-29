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
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ForeachTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ForeachTag ) ? this : Object.create( ForeachTag.prototype ) ;

	var matches ;

	if ( content === undefined ) {
		content = new TagContainer( undefined , self ) ;
	}

	Tag.call( self , 'foreach' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'foreach' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *=>(?: *(\$[^ ]+) *:)? *(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The 'foreach' tag's attribute should validate the foreach syntax." ) ;
	}

	Object.defineProperties( self , {
		sourceRef: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		asKeyRef: { value: typeof matches[ 2 ] === 'string' ? Ref.parse( matches[ 2 ] ) : null , writable: true , enumerable: true } ,
		asValueRef: { value: Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;

	//log.debug( "Foreach tag: %I" , self ) ;

	return self ;
}

module.exports = ForeachTag ;
ForeachTag.prototype = Object.create( Tag.prototype ) ;
ForeachTag.prototype.constructor = ForeachTag ;



ForeachTag.prototype.run = function( book , ctx , callback ) {
	var returnVal , callCount = 0 , isArray , isIterable , key , element , lvar ;


	if ( ctx.resume ) {
		lvar = ctx.syncCodeStack[ ctx.syncCodeDepth ].lvar ;
		isArray = Array.isArray( lvar.iterable ) ;

		if ( Array.isArray( lvar.iterable ) ) {
			isArray = true ;
		}
		else if ( lvar.iterable[ Symbol.iterator ] ) {
			isIterable = true ;
		}
	}
	else {
		lvar = {} ;

		lvar.iterable = this.sourceRef.getFinalValue( ctx.data ) ;

		//log.info( "Foreach iterable: %I" , lvar.iterable ) ;

		if ( ! lvar.iterable || typeof lvar.iterable !== 'object' ) {
			log.error( "The variable is not iterable, sourceRef (%s): %I\nctx.data: %I" , this.location , this.sourceRef , ctx.data ) ;
			return new Error( "The variable is not iterable (" + this.location + ")" ) ;
		}

		lvar.index = 0 ;

		if ( Array.isArray( lvar.iterable ) ) {
			lvar.indexMax = lvar.iterable.length ;
			isArray = true ;
		}
		else if ( lvar.iterable[ Symbol.iterator ] ) {
			lvar.keys = [ ... lvar.iterable.keys() ] ;
			lvar.values = [ ... lvar.iterable.values() ] ;
			lvar.indexMax = lvar.keys.length ;
			isIterable = true ;
		}
		else {
			lvar.keys = Object.keys( lvar.iterable ) ;
			lvar.indexMax = lvar.keys.length ;
		}
	}

	var nextSyncChunk = error => {
		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check callCount here.
		if ( error && error.break !== 'continue' ) {
			callback( error ) ;
			return ;
		}

		callCount ++ ;

		while ( ctx.resume || lvar.index < lvar.indexMax ) {
			if ( ! ctx.resume ) {
				key = isArray ? lvar.index : lvar.keys[ lvar.index ] ;
				element = isIterable ? lvar.values[ lvar.index ] : lvar.iterable[ key ] ;
				lvar.index ++ ;

				if ( this.asKeyRef ) { this.asKeyRef.set( ctx.data , key ) ; }

				this.asValueRef.set( ctx.data , element ) ;
			}

			returnVal = book.engine.run( this.content , book , ctx , lvar , nextSyncChunk ) ;

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

