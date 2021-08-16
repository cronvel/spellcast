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
const Ref = kungFig.Ref ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function EmitTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof EmitTag ) ? this : Object.create( EmitTag.prototype ) ;

	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^([^ ]+)(?: *=> *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The 'emit' tag's attribute should validate the Emit syntax." ) ;
	}

	Object.defineProperties( self , {
		event: { value: matches[ 1 ] , enumerable: true } ,
		targetRef: { value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
		onSuccessTag: { value: null , writable: true , enumerable: true } ,
		onFailureTag: { value: null , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = EmitTag ;
EmitTag.prototype = Object.create( Tag.prototype ) ;
EmitTag.prototype.constructor = EmitTag ;



EmitTag.prototype.run = function( book , ctx , callback ) {
	if ( ctx.resume ) {
		// The real running tag (i.e. [on-success] or [on-failure]) is stored in syncCodeStack
		return book.engine.run( book.tags[ ctx.syncCodeStack[ ctx.syncCodeDepth ].tagUid ].content , book , ctx , null , callback ) ;
	}

	ctx.emitEvent( this.event , this.extractContent( ctx.data ) , ctx , ( cancelValue , $event ) => {
		if ( this.targetRef ) { this.targetRef.set( ctx.data , cancelValue ) ; }

		// For regular [emit], success is the default when not interrupted, failure is the default when interrupted
		if ( $event.success === null ) {
			$event.success = ! cancelValue ;
		}

		if ( $event.success && this.onSuccessTag ) {
			if ( book.engine.run( this.onSuccessTag.content , book , ctx , null , callback ) !== undefined ) {
				callback() ;
			}
			return ;
		}

		if ( ! $event.success && this.onFailureTag ) {
			if ( book.engine.run( this.onFailureTag.content , book , ctx , null , callback ) !== undefined ) {
				callback() ;
			}
			return ;
		}

		callback() ;
	} ) ;
} ;

