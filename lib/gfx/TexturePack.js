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



/*
	Data:
		theme: the theme of the texture pack (default: default)
		id: the ID for thar texture, theme+id IS UNIQUE
		usage: the usage for this texture pack, e.g.:
			- default: normal texture pack
			- tileset: variants are structured for a tileset (e.g.: contains keys: base, corner-nw, corner-sw, 1-side-n, etc)
			...
		variants: an object containing the variant name as key, and a Variant instance as value
		autoVariants: a string used to compute variants auto-magically
		engine: object, engine-specific data, e.g.:
			css: for the HTML/CSS engine
			shader: for WebGL engines
			light: if the texture is subject to lighting (e.g.: light-emissive are not: they are always put at the same intensity)
			...
*/
// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GEntity! E.g.: spellcast-ext-web-client/lib/TexturePack.js
function TexturePack( book , data = {} ) {
	if ( ! data.id || typeof data.id !== 'string' ) {
		throw new Error( "TexturePack: 'id' property is mandatory" ) ;
	}

	this.theme = data.theme || 'default' ;
	this.id = data.id ;		// theme+id is unique

	this.engine = {} ;
	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}

	this.usage = data.usage || 'default' ;

	this.variants = {} ;

	if ( data.autoVariants ) {
		this.autoVariants( book , data.autoVariants ) ;
	}
	else if ( data.single ) {
		this.setVariant( 'default' , { frames: data.single } ) ;
	}
	else if ( data.variants && typeof data.variants === 'object' ) {
		for ( let name in data.variants ) {
			this.setVariant( name , data.variants[ name ] ) ;
		}
	}
	
	if ( ! Object.keys( this.variants ).length ) {
		throw new Error( "TexturePack: at least one variant is required" ) ;
	}
}

module.exports = TexturePack ;

TexturePack.prototype.__prototypeUID__ = 'spellcast/TexturePack' ;
TexturePack.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



TexturePack.prototype.setVariant = function( name , data ) {
	this.variants[ name ] = new Variant( data ) ;
} ;



TexturePack.prototype.autoVariants = function( book , templateUrl ) {
	/*
		TODO.

		templateUrl is something like /images/grass-<tileset>.png
		where "tileset" is the id of an existing [tpack-auto-variants] tag store on the book,
		which is an array of string defining both the replacement pattern and the name of the variant
	*/
} ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GEntity! E.g.: spellcast-ext-web-client/lib/TexturePack.js
function Variant( data = {} ) {
	this.animate = data.type || null ;		// null: static image, other can be: 'loop' for looping animation, and so on...
	this.engine = data.engine || null ;		// engine-specific, like shaders?

	this.frames =
		Array.isArray( data.frames ) ? data.frames.map( f => new Frame( f ) ) :
		[ new Frame( data.frames ) ] ;
}

Variant.prototype.__prototypeUID__ = 'spellcast/TexturePack.Variant' ;
Variant.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;
TexturePack.Variant = Variant ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GEntity! E.g.: spellcast-ext-web-client/lib/TexturePack.js
function Frame( data = {} ) {
	if ( typeof data === 'string' ) { data = { url: data } ; }

	this.url = data.url ;
	this.maskUrl = data.maskUrl || null ;	// only few type of engine+usage combo support mask, most of them relying on SVG
	this.engine = data.engine || null ;		// engine-specific, like shaders?
	this.origin = data.origin || null ;		// the origin used for this image
	this.duration = data.duration || 100 ;	// the duration of this frame in ms
}

Frame.prototype.__prototypeUID__ = 'spellcast/TexturePack.Frame' ;
Frame.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;
TexturePack.Frame = Frame ;

