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



const log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	Data:
		id: (mandatory) the unique ID for that font
		regularUrl: (mandatory) the URL for that font in the basic/regular form
		boldUrl: the URL for the bold variant
		italicUrl: the URL for the italic variant
		boldItalicUrl: the URL for the bold+italic variant
*/
// !CHANGE HERE MUST BE REFLECTED IN CLIENT's FontPack! E.g.: spellcast-ext-web-client/lib/FontPack.js
function FontPack( book , data = {} ) {
	if ( ! data.id || typeof data.id !== 'string' ) {
		throw new Error( "FontPack: 'id' property is mandatory" ) ;
	}

	if ( ! data.variants?.regular ) {
		throw new Error( "FontPack: .variants.regular property is mandatory" ) ;
	}

	this.id = data.id ;		// unique
	
	this.variants = {} ;
	for ( let variantName in data.variants ) {
		this.variants[ variantName ] = new Variant( data.variants[ variantName ] ) ;
	}
	
	log.hdebug( "FontPack: %[5]I" , this ) ;
}

module.exports = FontPack ;

FontPack.prototype.__prototypeUID__ = 'spellcast/FontPack' ;
FontPack.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



function Variant( data = {} ) {
	if ( typeof data === 'string' ) { data = { url: data } ; }

	if ( ! data.url || typeof data.url !== 'string' ) {
		throw new Error( "FontPack Variant: 'url' property is mandatory" ) ;
	}

	this.url = data.url ;
	
	// Not enumerable properties
	Object.defineProperties( this , {
		font: { value: null , writable: true }		// The actual font
	} ) ;
}

Variant.prototype.__prototypeUID__ = 'spellcast/FontPack.Variant' ;
Variant.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;
FontPack.Variant = Variant ;

