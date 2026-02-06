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



/*
	Syntactic sugar, set a bunch of local variable.
	It's also the best practice to have it at the top of a function to map $args to $local, so functions arguments are displayed.
*/

function LocalTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof LocalTag ) ? this : Object.create( LocalTag.prototype ) ;
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	return self ;
}

module.exports = LocalTag ;
LocalTag.prototype = Object.create( Tag.prototype ) ;
LocalTag.prototype.constructor = LocalTag ;



LocalTag.prototype.run = function( book , ctx ) {
	var data = this.extractContent( ctx.data ) ;

	if ( ! data || typeof data !== 'object' || Array.isArray( data ) ) {
		// Warn, but do nothing at all
		scriptLog.warning( '[local] tag used on a non-object value (%s)' , this.location ) ;
		return null ;
	}

	for ( let localName of Object.keys( data ) ) {
		ctx.data.local[ localName ] = data[ localName ] ;
	}

	return null ;
} ;

