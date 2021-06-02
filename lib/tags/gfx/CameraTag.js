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

const GSceneTag = require( './GSceneTag.js' ) ;
const Camera = require( '../../gfx/Camera.js' ) ;

const Ngev = require( 'nextgen-events' ) ;
const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function CameraTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof CameraTag ) ? this : Object.create( CameraTag.prototype ) ;

	Tag.call( self , 'camera' , attributes , content , shouldParse ) ;

	if ( self.attributes && self.attributes !== 'await' ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the camera syntax." ) ;
	}

	Object.defineProperties( self , {
		await: { value: self.attributes === 'await' , enumerable: true }
	} ) ;

	return self ;
}



module.exports = CameraTag ;
CameraTag.prototype = Object.create( Tag.prototype ) ;
CameraTag.prototype.constructor = CameraTag ;



CameraTag.prototype.run = function( book , ctx , callback ) {
	var uid , data ,
		eventData = {} ,
		gScene = ctx.data._gScene || ctx.gScenes.default ;

	if ( ! gScene ) { gScene = GSceneTag.createDefault( ctx ) ; }

	data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data )  , true ) ;
	gScene.globalCamera.update( data , eventData ) ;
	
	if ( this.await ) {
		Ngev.groupEmit( book.roles , 'camera' , gScene.id , eventData , true , callback ) ;
	}
	else {
		Ngev.groupEmit( book.roles , 'camera' , gScene.id , eventData , false ) ;
		return null ;
	}
} ;

