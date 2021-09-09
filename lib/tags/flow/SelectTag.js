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

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// It just stores a string as attribute, which will be prepended to subsequent if/elsif expressions,
// so this is a pure syntactic sugar for emulating switch/case with if/elsif/else.

function SelectTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof SelectTag ) ? this : Object.create( SelectTag.prototype ) ;
	
	// Enclose attributes in parens and add a space at the end,
	// it will be prepended to if/elsif condition string before those conditions are parsed
	attributes = '( ' + attributes + ' ) ' ;
	
	Tag.call( self , 'select' , attributes , content , shouldParse , options ) ;
	return self ;
}

module.exports = SelectTag ;
SelectTag.prototype = Object.create( Tag.prototype ) ;
SelectTag.prototype.constructor = SelectTag ;

