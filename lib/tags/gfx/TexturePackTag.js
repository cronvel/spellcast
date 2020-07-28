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
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;

const Ngev = require( 'nextgen-events' ) ;

const TexturePack = require( '../../gfx/TexturePack.js' ) ;
const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function TexturePackTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof TexturePackTag ) ? this : Object.create( TexturePackTag.prototype ) ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	return self ;
}



module.exports = TexturePackTag ;
TexturePackTag.prototype = Object.create( Tag.prototype ) ;
TexturePackTag.prototype.constructor = TexturePackTag ;



TexturePackTag.prototype.run = function( book , ctx , callback ) {
	var key , data , pack ;

	data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;

	try {
		pack = new TexturePack( book , data ) ;
	}
	catch ( error ) {
		callback( new Error( "[texture-pack] tag: bad or missing properties: " + error ) ) ;
		return ;
	}

	key = pack.id + '/' + pack.theme ;
	ctx.texturePacks[ key ] = pack ;

	Ngev.groupEmit( book.roles , 'texturePack' , pack , callback ) ;
} ;

