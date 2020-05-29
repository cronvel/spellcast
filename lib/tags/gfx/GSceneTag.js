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

const GScene = require( '../../gfx/GScene.js' ) ;
const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



const tagOptions = {
	'create-g-scene': { action: 'create' } ,
	'clear-g-scene': { action: 'clear' } ,
	'update-g-scene': { action: 'update' } ,
	'activate-g-scene': { action: 'activate' } ,
	'deactivate-g-scene': { action: 'deactivate' } ,
	'pause-g-scene': { action: 'pause' }
} ;



function GSceneTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof GSceneTag ) ? this : Object.create( GSceneTag.prototype ) ;
	var matches , action , type , eventName ;

	if ( ! tagOptions[ tag ] ) { throw new Error( 'Unknown tag: ' + tag ) ; }

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the *-g-scene syntax." ) ;
	}

	action = tagOptions[ tag ].action ;

	Object.defineProperties( self , {
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		action: { value: action , enumerable: true }
	} ) ;

	return self ;
}



module.exports = GSceneTag ;
GSceneTag.prototype = Object.create( Tag.prototype ) ;
GSceneTag.prototype.constructor = GSceneTag ;



GSceneTag.prototype.run = function( book , ctx , callback ) {
	var id , data , current , area , roles ,
		eventName = this.action + 'GScene' ,
		eventData = null ,
		isSync = false ;

	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	current = ctx.gScenes[ id ] ;
	
	if ( this.action === 'create' || this.action === 'update' ) {
		data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;
		eventData = {} ;
	}

	/*
		This is important to store internally the existing G-scenes in order to manage:

			- replay/reconnection
			- return from gosub/split
			- non-persistent G-scenes should be automatically cleared when leaving the current scene
	*/

	switch ( this.action ) {
		case 'create' :
			roles = data.roles = data.roles || ctx.roles ;
			ctx.gScenes[ id ] = current = new GScene( book , data , eventData ) ;
			break ;

		case 'update' :
			if ( ! current ) {
				scriptLog.debug( 'G-scene %s not found' , id ) ;
				return null ;
			}

			roles = current.roles ;
			current.update( data , eventData ) ;
			break ;

		case 'activate' :
		case 'deactivate' :
			if ( ! current ) {
				scriptLog.debug( 'G-scene %s not found' , id ) ;
				return null ;
			}

			roles = current.roles ;
			break ;

		case 'clear' :
			if ( ! current ) {
				scriptLog.debug( 'G-scene %s not found' , id ) ;
				return null ;
			}

			roles = current.roles ;
			isSync = true ;		// Clear events are immediate, not async
			delete ctx.gScenes[ id ] ;
			break ;
	}


	// Do not use ctx.roles but roles/current.roles, which contains ctx.roles at element creation (show-*)
	if ( isSync ) {
		Ngev.groupEmit( roles , eventName , id , eventData ) ;
		return null ;
	}

	Ngev.groupEmit( roles , eventName , id , eventData , callback ) ;
} ;

