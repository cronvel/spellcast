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



const kungFig = require( 'kung-fig' ) ;
const Tag = kungFig.Tag ;
const Ref = kungFig.Ref ;
const Dynamic = kungFig.Dynamic ;

const tree = require( 'tree-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ApplyTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ApplyTag ) ? this : Object.create( ApplyTag.prototype ) ;

	var matches ;

	Tag.call( self , 'apply' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *=> *(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The 'apply' tag's attribute should validate the foreach syntax." ) ;
	}

	Object.defineProperties( self , {
		sourceRef: {
			value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true
		} ,
		targetRef: {
			value: Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true
		}
	} ) ;

	return self ;
}

module.exports = ApplyTag ;
ApplyTag.prototype = Object.create( Tag.prototype ) ;
ApplyTag.prototype.constructor = ApplyTag ;



ApplyTag.prototype.run = function( book , ctx ) {
	var applyCtx = this.getRecursiveFinalContent( ctx.data ) ;

	var value = this.sourceRef.getValue( ctx.data ) ;
	value = Dynamic.apply( value , applyCtx ) ;
	value = Dynamic.getRecursiveFinalValue( value , ctx.data ) ;
	//value = Dynamic.getRecursiveFinalValue( value , applyCtx ) ;

	this.targetRef.set( ctx.data , value ) ;

	return null ;
} ;


