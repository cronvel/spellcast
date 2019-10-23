/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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

const svgKit = require( 'svg-kit' ) ;
//const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;
const toClassObject = require( '../../commonUtils.js' ).toClassObject ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function VGTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof VGTag ) ? this : Object.create( VGTag.prototype ) ;
	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the vg-* syntax." ) ;
	}

	Object.defineProperties( self , {
		ref: { value: Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		type: { value: tag , enumerable: true }
	} ) ;

	return self ;
}



module.exports = VGTag ;
VGTag.prototype = Object.create( Tag.prototype ) ;
VGTag.prototype.constructor = VGTag ;



VGTag.prototype.run = function( book , ctx ) {
	var object ,
		//data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;
		data = this.getRecursiveFinalContent( ctx.data ) ;

	switch ( this.type ) {
		case 'vg' :
			object = new svgKit.VG( data ) ;
			log.hdebug( "text: %s" , object.renderText() ) ;
			break ;
	}

	this.ref.set( ctx.data , object ) ;

	return null ;
} ;

