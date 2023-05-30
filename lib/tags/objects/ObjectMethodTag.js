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

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function ObjectMethodTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ObjectMethodTag ) ? this : Object.create( ObjectMethodTag.prototype ) ;

	var matches ;
	
	//VarTag.call( self , tag , attributes , content , shouldParse ) ;
	Tag.call( self , tag , attributes , content , shouldParse ) ;

    if ( ! self.attributes || ! ( matches = self.attributes.match( /^([^ ]+) *(\$[^ ]+) *(?:=> *(\$[^ ]+))?$/ ) ) ) {
        throw new SyntaxError( "The '*' tag's attribute should validate the ObjectMethod syntax." ) ;
    }

	Object.defineProperties( self , {
		method: { value: matches[ 1 ] , writable: true , enumerable: true } ,
		objectRef: { value: Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
        toRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ObjectMethodTag ;
ObjectMethodTag.prototype = Object.create( Tag.prototype ) ;
ObjectMethodTag.prototype.constructor = ObjectMethodTag ;



ObjectMethodTag.prototype.run = function( book , ctx ) {
	var methodName , returnValue ,
		object = this.objectRef.get( ctx.data ) ,
		arg = this.extractContent( ctx.data ) ;

	if ( ! object || typeof object !== 'object' ) {
		scriptLog.error( "[*] tag should be performed on a non-object (%s)" , this.location ) ;
		return null ;
	}
	
	if ( ! object.__SpellcastAPI__  ) {
		scriptLog.error( "[*] tag performed on an object that has no Spellcast API (%s)" , this.location ) ;
		return null ;
	}

	methodName = object.__SpellcastAPI__[ this.method ] ;
	
	if ( ! methodName ) {
		scriptLog.error( "[*] tag tried to call method '%s' of on an object not having this API method (%s)" , this.method , this.location ) ;
		return null ;
	}

	try {
		returnValue = object[ methodName ]( arg ) ;
	}
	catch ( error ) {
		scriptLog.error( "[*] called method '%s' that have raised an exception: %E (script location: %s)" , this.method , error , this.location ) ;
		return null ;
	}

	if ( this.toRef ) { this.toRef.set( ctx.data , returnValue ) ; }

	return null ;
} ;

