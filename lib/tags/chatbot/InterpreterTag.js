/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var chatBot = require( '../../chatBot.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



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
		id: { value: self.attributes , enumerable: true } ,
		patternOrder: { value: null , writable: true , enumerable: true } ,
		substitutions: { value: { input: {} } , writable: true , enumerable: true } ,
		punctuation: { value: false , writable: true , enumerable: true } ,
		symbols: { value: false , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = InterpreterTag ;
InterpreterTag.prototype = Object.create( LabelTag.prototype ) ;
InterpreterTag.prototype.constructor = InterpreterTag ;



InterpreterTag.prototype.init = function init( book ) {
	var key , simplifiedKey , tokens , simplifiedTokens ;

	book.interpreters[ this.id ] = this ;
	book.queryPatternTree[ this.id ] = {} ;

	var patternOrder = this.content.getFirstTag( 'pattern-list' ) ;
	this.patternOrder = ( patternOrder && patternOrder.getRecursiveFinalContent() ) || [] ;

	var substitutions = this.content.getFirstTag( 'substitutions' ) ;
	substitutions = substitutions && substitutions.getRecursiveFinalContent() || {} ;

	if ( ! substitutions.input ) { substitutions.input = {} ; }

	for ( key in substitutions.input ) {
		simplifiedKey = chatBot.simplifyToken( key ) ;
		tokens = [] ;
		simplifiedTokens = [] ;
		chatBot.tokenize( substitutions.input[ key ] , { all: true } , tokens , simplifiedTokens ) ;
		this.substitutions.input[ simplifiedKey ] = tokens ;
	}

	// Input is mandatory, nothing would work without it!
	if ( this.patternOrder.indexOf( 'input' ) === -1 ) { this.patternOrder.unshift( 'input' ) ; }

	var punctuation = this.content.getFirstTag( 'punctuation' ) ;
	this.punctuation = !! ( punctuation && punctuation.getRecursiveFinalContent() ) ;

	var symbols = this.content.getFirstTag( 'symbols' ) ;
	this.symbols = !! ( symbols && symbols.getRecursiveFinalContent() ) ;

	return null ;
} ;


