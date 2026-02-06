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



const VARIANT = {
	pop: { end: true , many: false } ,
	"pop-last": { end: true , many: false } ,
	"pop-last-many": { end: true , many: true } ,
	"pop-first": { end: false , many: false } ,
	"pop-first-many": { end: false , many: true } ,
} ;



function PopTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof PopTag ) ? this : Object.create( PopTag.prototype ) ;

	var matches , variant = VARIANT[ tag ] ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)(?: *=> *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The 'pop*' tag's attribute should validate the pop syntax." ) ;
	}

	Object.defineProperties( self , {
		sourceRef: {
			value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true
		} ,
		targetRef: {
			value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true
		} ,
		many: {
			value: variant.many , writable: true , enumerable: true
		} ,
		end: {
			value: variant.end , writable: true , enumerable: true
		} ,
	} ) ;

	return self ;
}

module.exports = PopTag ;
PopTag.prototype = Object.create( Tag.prototype ) ;
PopTag.prototype.constructor = PopTag ;



PopTag.prototype.run = function( book , ctx ) {
    var extracted ,
    	value = this.sourceRef.get( ctx.data ) ;

    if ( ! Array.isArray( value ) ) {
        // Warn, but do nothing at all
        scriptLog.warning( '[pop*] tag used on a non-array value (%s)' , this.location ) ;
        return null ;
    }

    if ( this.many ) {
    	let count = + ( this.extractContent( ctx.data ) ?? 1 ) || 0 ;

		if ( this.end ) {
			// Splice with negative value starts counting from the end
			extracted = value.splice( - count , count ) ;
		}
		else {
			extracted = value.splice( 0 , count ) ;
		}
	}
	else {
		if ( this.end ) {
			extracted = value.pop() ;
		}
		else {
			extracted = value.shift() ;
		}
	}

	if ( this.targetRef ) {
		this.targetRef.set( ctx.data , extracted ) ;
	}

	return null ;
} ;

