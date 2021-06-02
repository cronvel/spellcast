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
const FnTag = require( '../flow/FnTag.js' ) ;

const InputInterpreter = require( '../../InputInterpreter.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function QueryTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof QueryTag ) ? this : Object.create( QueryTag.prototype ) ;

	LabelTag.call( self , 'query' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'query' tag's content should be a TagContainer." ) ;
	}

	/*
	Object.defineProperties( self , {
		interpreter: { value: null , writable: true , enumerable: true }
	} ) ;
	*/

	return self ;
}

module.exports = QueryTag ;
QueryTag.prototype = Object.create( LabelTag.prototype ) ;
QueryTag.prototype.constructor = QueryTag ;



QueryTag.prototype.init = function( book ) {
	var patternObject = {} ;

	var interpreterTag = this.getParentTag() ;

	if ( ! interpreterTag || interpreterTag.name !== 'interpreter' ) {
		// /!\ or create a default interpreter? /!\
		return new Error( "The [query] tag should be inside an [interpreter] tag." ) ;
	}

	//if ( ! book.queryPatternTree[ this.interpreterTag.id ] ) { book.queryPatternTree[ this.interpreterTag.id ] = {} ; }

	this.content.getTags( 'pattern' ).forEach( tag => {
		var type = tag.attributes || 'input' ;

		// Create the local pattern arrays
		if ( ! patternObject[ type ] ) { patternObject[ type ] = [] ; }
		patternObject[ type ].push( tag.content ) ;
	} ) ;

	var interpreter = book.interpreters[ interpreterTag.id ] ;

	interpreter.addPatterns( patternObject , this ) ;

	return null ;
} ;



// Same than [fn] tag, it just exec its content, with some resuming magic...
// A “maybe async” exec()
QueryTag.prototype.exec = FnTag.prototype.exec ;

