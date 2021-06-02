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
const Ref = kungFig.Ref ;
const LabelTag = kungFig.LabelTag ;

const GSceneTag = require( './GSceneTag.js' ) ;
const TexturePack = require( '../../gfx/TexturePack.js' ) ;

const Ngev = require( 'nextgen-events' ) ;
const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function TexturePackTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof TexturePackTag ) ? this : Object.create( TexturePackTag.prototype ) ;
	var id , theme , index ;

	LabelTag.call( self , 'texture-pack' , attributes , content , shouldParse ) ;

	if ( self.attributes ) {
		index = self.attributes.lastIndexOf( '/' ) ;

		if ( index !== -1 ) {
			id = self.attributes.slice( 0 , index ) ;
			theme = self.attributes.slice( index + 1 ) ;
		}
		else {
			id = self.attributes ;
		}
	}

	Object.defineProperties( self , {
		id: { value: id || null , enumerable: true } ,
		theme: { value: theme || null , enumerable: true } ,
	} ) ;

	return self ;
}



module.exports = TexturePackTag ;
TexturePackTag.prototype = Object.create( LabelTag.prototype ) ;
TexturePackTag.prototype.constructor = TexturePackTag ;



const NO_CAMEL_INSIDE = {
	variants: true
} ;



TexturePackTag.prototype.run = function( book , ctx , callback ) {
	var uid , data , texturePack ,
		gScene = ctx.data._gScene || ctx.gScenes.default ;

	if ( ! gScene ) { gScene = GSceneTag.createDefault( ctx ) ; }

	data = this.getRecursiveFinalContent( ctx.data ) ;

	if ( data && typeof data === 'object' ) {
		data = camel.inPlaceDashToCamelProps( data , true , NO_CAMEL_INSIDE ) ;
	}
	else {
		data = { single: data } ;
	}

	if ( this.id ) { data.id = this.id ; }
	if ( this.theme ) { data.theme = this.theme ; }

	try {
		texturePack = new TexturePack( book , data ) ;
	}
	catch ( error ) {
		callback( new Error( "[texture-pack] tag: bad or missing properties: " + error ) ) ;
		return ;
	}

	uid = texturePack.id + '/' + texturePack.theme ;

	gScene.texturePacks[ uid ] = texturePack ;

	Ngev.groupEmit( book.roles , 'texturePack' , gScene.id , uid , texturePack , callback ) ;
} ;

