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



const tree = require( 'tree-kit' ) ;
const copyData = require( '../copyData.js' ) ;
const Ngev = require( 'nextgen-events' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function TexturePack( book , data = {} ) {
	this.theme = data.theme || 'default' ;
	this.id = data.id ;		// theme+id is unique

	// Engine contains engine-specific data, e.g.:
	// engine.light (bool) could be used to specify that the texture is sensible to light, false=non-sensible (e.g.: light emissive)
	// engine.shader could be used to specify which shader to use for WebGL engines
	this.engine = {} ;
	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}

	this.usage = data.usage || 'default' ;	// Usage of the pack, e.g. 'sprite', or 'tileset', only useful for the engine

	this.variants = {} ;

	if ( data.autoVariants ) {
		this.autoVariants( book , data.autoVariants ) ;
	}
	else if ( data.variants && typeof data.variants === 'object' ) {
		for ( let name in data.variants ) {
			this.setVariant( name , data.variants[ name ] ) ;
		}
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



function Variant( data = {} ) {
	this.animate = data.type || null ;		// null: static image, other can be: 'loop' for looping animation, and so on...
	this.engine = data.engine || null ;		// engine-specific, like shaders?
	this.frames = data.frames.map( f => new Frame( f ) ) ;
}

Variant.prototype.__prototypeUID__ = 'spellcast/TexturePackVariant' ;
Variant.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



function Frame( data = {} ) {
	this.url = data.url ;
	this.engine = data.engine || null ;		// engine-specific, like shaders?
	this.origin = data.origin || null ;		// the origin used for this image
	this.duration = data.duration || 100 ;	// the duration of this frame in ms
}

Frame.prototype.__prototypeUID__ = 'spellcast/TexturePackFrame' ;
Frame.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

