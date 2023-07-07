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

const FontPack = require( '../../gfx/FontPack.js' ) ;
const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function FontPackTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof FontPackTag ) ? this : Object.create( FontPackTag.prototype ) ;

	LabelTag.call( self , 'font-pack' , attributes , content , shouldParse ) ;

	if ( ! content || typeof content !== 'object' ) {
		throw new SyntaxError( "The 'entity-class' tag's content should be an object." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'font-pack' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes || null , enumerable: true }
	} ) ;

	return self ;
}



module.exports = FontPackTag ;
FontPackTag.prototype = Object.create( LabelTag.prototype ) ;
FontPackTag.prototype.constructor = FontPackTag ;



FontPackTag.prototype.run = function( book , ctx , callback ) {
	var variantsData , fontPack ;

	variantsData = this.extractContent( ctx.data ) ;

	if ( variantsData && typeof variantsData === 'object' ) {
		variantsData = camel.inPlaceDashToCamelProps( variantsData , true ) ;
	}
	else {
		variantsData = { regular: variantsData } ;
	}

	var data = {
		id: this.id ,
		variants: variantsData
	} ;

	fontPack = new FontPack( book , data ) ;
	/*
	try {
		fontPack = new FontPack( book , data ) ;
	}
	catch ( error ) {
		callback( new Error( "[font-pack] tag: bad or missing properties: " + error ) ) ;
		return ;
	}
	*/

	book.fontPacks[ this.id ] = fontPack ;

	Ngev.groupEmit( book.roles , 'fontPack' , this.id , fontPack , callback ) ;
} ;

