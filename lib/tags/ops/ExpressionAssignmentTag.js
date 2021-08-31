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
const Expression = kungFig.Expression ;
const Ref = kungFig.Ref ;
const Dynamic = kungFig.Dynamic ;
const Tag = kungFig.Tag ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	This tag family is used as shorthand, from:
		[set $var] $= <operator> $var <arg1> <arg2> ...
	to:
		[<operator> $var <arg1> <arg2> ...]
*/

function ExpressionAssignmentTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ExpressionAssignmentTag ) ? this : Object.create( ExpressionAssignmentTag.prototype ) ;

	var matches ;

	switch ( tag ) {
		case 'clamp' :
			break ;
		default :
			throw new Error( "Unknown ExpressionAssignmentTag '" + tag + "'" ) ;
	}

	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *(.*)$/ ) ) ) {
		throw new SyntaxError( "The ExpressionAssignmentTag's attribute should validate the ExpressionAssignmentTag syntax." ) ;
	}
	
	Object.defineProperties( self , {
		ref: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		expression: { value: Expression.parse( tag + ' ' + attributes ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ExpressionAssignmentTag ;
ExpressionAssignmentTag.prototype = Object.create( Tag.prototype ) ;
ExpressionAssignmentTag.prototype.constructor = ExpressionAssignmentTag ;



ExpressionAssignmentTag.prototype.run = function( book , ctx , callback ) {
	this.ref.set( ctx.data , Dynamic.getFinalValue( this.expression , ctx.data ) ) ;
	return null ;
} ;

