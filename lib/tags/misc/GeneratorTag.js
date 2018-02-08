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

var math = require( 'math-kit' ) ;
var Generator = require( 'nomi-ninja/lib/Generator.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function GeneratorTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof GeneratorTag ) ? this : Object.create( GeneratorTag.prototype ) ;

	LabelTag.call( self , 'generator' , attributes , content , shouldParse ) ;

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'generator' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = GeneratorTag ;
GeneratorTag.prototype = Object.create( LabelTag.prototype ) ;
GeneratorTag.prototype.constructor = GeneratorTag ;



GeneratorTag.prototype.init = function init( book ) {
	// The native RNG should be enough for this use-case, with a fastest init
	var rng = new math.random.Native() ;
	//var rng = new math.random.MersenneTwister() ;
	//rng.betterInit() ;

	var data = Object.assign(
		{ sourceSplitter: ',' } ,
		this.getRecursiveFinalContent() ,
		{ rng: rng }
	) ;

	var generator = Generator.create( data ) ;
	generator.addSamples( data.samples ) ;

	book.generators[ this.id ] = generator ;

	return null ;
} ;


