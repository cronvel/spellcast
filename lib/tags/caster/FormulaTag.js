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
const ClassicTag = kungFig.ClassicTag ;
const utils = require( '../../utils.js' ) ;



function FormulaTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof FormulaTag ) ? this : Object.create( FormulaTag.prototype ) ;

	if ( ! options ) { options = {} ; }
	options.keyValueSeparator = ':' ;

	ClassicTag.call( self , 'formula' , attributes , content , shouldParse , options ) ;

	if ( ! utils.isPlainObject( content ) ) {
		throw new SyntaxError( "The 'formula' tag's content must be a plain object." ) ;
	}

	return self ;
}

module.exports = FormulaTag ;
FormulaTag.prototype = Object.create( ClassicTag.prototype ) ;
FormulaTag.prototype.constructor = FormulaTag ;



FormulaTag.prototype.init = function( book ) {
	//console.log( "formula proxy:" , this.proxy ) ;
	kungFig.autoStack( book.data , this.content ) ;
	//console.log( "book data:" , book.data ) ;
	//console.log( "formula proxy:" , this.proxy ) ;

	return null ;
} ;


