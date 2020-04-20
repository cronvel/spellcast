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



var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var Ref = kungFig.Ref ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function SwapTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SwapTag ) ? this : Object.create( SwapTag.prototype ) ;

	var matches ;

	Tag.call( self , 'swap' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "Swap-type tag's attribute should validate the Swap syntax." ) ;
	}

	Object.defineProperties( self , {
		leftRef: {
			value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true
		} ,
		rightRef: {
			value: Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true
		}
	} ) ;

	return self ;
}

module.exports = SwapTag ;
SwapTag.prototype = Object.create( Tag.prototype ) ;
SwapTag.prototype.constructor = SwapTag ;



SwapTag.prototype.run = function run( book , ctx ) {
	var left = this.leftRef.get( ctx.data ) ;
	var right = this.rightRef.get( ctx.data ) ;
	this.leftRef.set( ctx.data , right ) ;
	this.rightRef.set( ctx.data , left ) ;
	return null ;
} ;


