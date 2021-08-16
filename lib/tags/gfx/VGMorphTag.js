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
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const svgKit = require( 'svg-kit' ) ;
//const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;
const toClassObject = require( '../../commonUtils.js' ).toClassObject ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function VGMorph( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof VGMorph ) ? this : Object.create( VGMorph.prototype ) ;
	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the vg-morph syntax." ) ;
	}

	Object.defineProperties( self , {
		ref: { value: Ref.parse( matches[ 1 ] ) , enumerable: true }
	} ) ;

	return self ;
}



module.exports = VGMorph ;
VGMorph.prototype = Object.create( Tag.prototype ) ;
VGMorph.prototype.constructor = VGMorph ;



VGMorph.prototype.run = function( book , ctx ) {
	var vgObject = this.ref.get( ctx.data ) ,
		data = this.extractContent( ctx.data ) ;

	if ( ! ( vgObject instanceof svgKit.VGEntity ) ) {
		scriptLog.error( "[vg-morph] This is not a VGEntity (%s)" , this.location ) ;
		return null ;
	}

	vgObject.morph( data ) ;

	return null ;
} ;

