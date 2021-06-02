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
const LabelTag = kungFig.LabelTag ;
const TagContainer = kungFig.TagContainer ;

const InputInterpreter = require( '../../InputInterpreter.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function InterpreterTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof InterpreterTag ) ? this : Object.create( InterpreterTag.prototype ) ;

	LabelTag.call( self , 'interpreter' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'interpreter' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'interpreter' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = InterpreterTag ;
InterpreterTag.prototype = Object.create( LabelTag.prototype ) ;
InterpreterTag.prototype.constructor = InterpreterTag ;



InterpreterTag.prototype.init = function( book ) {
	var key , simplifiedKey , tokens , simplifiedTokens ;

	var patternOrder = this.content.getFirstTag( 'pattern-list' ) ;
	patternOrder = ( patternOrder && patternOrder.getRecursiveFinalContent() ) ;

	var substitutions = this.content.getFirstTag( 'substitutions' ) ;
	substitutions = substitutions && substitutions.getRecursiveFinalContent() ;

	var punctuations = this.content.getFirstTag( 'punctuations' ) ;
	punctuations = !! ( punctuations && punctuations.getRecursiveFinalContent() ) ;

	var symbols = this.content.getFirstTag( 'symbols' ) ;
	symbols = !! ( symbols && symbols.getRecursiveFinalContent() ) ;

	var interpreter = new InputInterpreter( {
		patternOrder , substitutions , punctuations , symbols
	} ) ;
	book.interpreters[ this.id ] = interpreter ;

	return null ;
} ;

