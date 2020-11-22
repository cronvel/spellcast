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
const TagContainer = kungFig.TagContainer ;
const GScene = require( '../../gfx/GScene.js' ) ;

const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



const tagOptions = {
	'g-scene': { action: 'container' } ,
	'create-g-scene': { action: 'create' } ,
	'clear-g-scene': { action: 'clear' } ,
	'update-g-scene': { action: 'update' } ,
	'activate-g-scene': { action: 'activate' } ,
	'deactivate-g-scene': { action: 'deactivate' } ,
	'pause-g-scene': { action: 'pause' } ,
	'resume-g-scene': { action: 'resume' } ,
	'g-scene-theme': { action: 'theme' }
} ;



function GSceneTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof GSceneTag ) ? this : Object.create( GSceneTag.prototype ) ;
	var matches , ref_ , id , action , await_ , type , eventName ;

	if ( ! tagOptions[ tag ] ) { throw new Error( 'Unknown tag: ' + tag ) ; }

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( tag === 'update-g-scene' ) {
		if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))( +await)?$/ ) ) ) {
			throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the update-g-scene syntax." ) ;
		}

		ref_ = matches[ 1 ] && Ref.parse( matches[ 1 ] ) ;
		id = matches[ 2 ] ;
		await_ = !! matches[ 3 ] ;
	}
	else if ( self.attributes ) {
		if ( ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))$/ ) ) ) {
			throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the *-g-scene syntax." ) ;
		}
		ref_ = matches[ 1 ] && Ref.parse( matches[ 1 ] ) ;
		id = matches[ 2 ] ;
	}

	action = tagOptions[ tag ].action ;

	Object.defineProperties( self , {
		id: { value: id , enumerable: true } ,
		ref: { value: ref_ , enumerable: true } ,
		action: { value: action , enumerable: true } ,
		await: { value: await_ , enumerable: true }
	} ) ;

	return self ;
}



module.exports = GSceneTag ;
GSceneTag.prototype = Object.create( Tag.prototype ) ;
GSceneTag.prototype.constructor = GSceneTag ;



const SPECIAL_SHORTHANDS = [
	'ambient' , 'colorGrading'
] ;



GSceneTag.prototype.run = function( book , ctx , callback ) {
	var id , data , gScene , roles , key ,
		action = this.action ,
		eventData = null ,
		isSync = false ;

	id =
		this.id !== undefined ? this.id :
		this.ref ? this.ref.get( ctx.data ) :
		action === 'update' && ctx.data._gScene ? ctx.data._gScene.id :
		'default' ;

	gScene = ctx.gScenes[ id ] ;

	if ( action === 'container' ) {
		return this.runContainer( book , ctx , gScene , callback ) ;
	}

	if ( action === 'create' || action === 'update' ) {
		data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;
		eventData = {} ;

		// Shorthands...
		for ( key of SPECIAL_SHORTHANDS ) {
			if ( data[ key ] !== undefined ) {
				if ( ! data.special ) { data.special = {} ; }
				data.special[ key ] = data[ key ] ;
				delete data[ key ] ;
			}
		}
	}
	else if ( action === 'activate' ) {
		action = 'update' ;
		eventData = {} ;
		data = { active: true } ;
	}
	else if ( action === 'deactivate' ) {
		action = 'update' ;
		eventData = {} ;
		data = { active: false } ;
	}
	else if ( action === 'pause' ) {
		action = 'update' ;
		eventData = {} ;
		data = { pause: true } ;
	}
	else if ( action === 'resume' ) {
		action = 'update' ;
		eventData = {} ;
		data = { pause: false } ;
	}
	else if ( action === 'theme' ) {
		action = 'update' ;
		eventData = {} ;
		data = { theme: this.getRecursiveFinalContent( ctx.data ) || 'default' } ;
	}

	/*
		This is important to store internally the existing G-scenes in order to manage:

			- replay/reconnection
			- return from gosub/split
			- non-persistent G-scenes should be automatically cleared when leaving the current scene
	*/

	switch ( action ) {
		case 'create' :
			if ( gScene ) {
				scriptLog.debug( 'G-scene %s already exists, destroying it' , id ) ;
				gScene.destroy() ;
				delete ctx.gScenes[ id ] ;
				Ngev.groupEmit( gScene.roles , 'clearGScene' , id ) ;
			}

			data.id = id ;
			data.roles = data.roles || ctx.roles ;
			ctx.gScenes[ id ] = gScene = new GScene( data , eventData ) ;
			Ngev.groupEmit( gScene.roles , 'createGScene' , id , eventData ) ;
			return null ;

		case 'update' :
			if ( ! gScene ) {
				scriptLog.debug( 'G-scene %s not found' , id ) ;
				return null ;
			}

			gScene.update( data , eventData ) ;

			if ( this.await ) {
				Ngev.groupEmit( gScene.roles , 'updateGScene' , id , eventData , true , callback ) ;
				return ;
			}

			Ngev.groupEmit( gScene.roles , 'updateGScene' , id , eventData , false ) ;
			return null ;

		case 'clear' :
			if ( ! gScene ) {
				scriptLog.debug( 'G-scene %s not found' , id ) ;
				return null ;
			}

			gScene.destroy() ;
			delete ctx.gScenes[ id ] ;
			Ngev.groupEmit( gScene.roles , 'clearGScene' , id ) ;
			return null ;
	}
	
	return null ;
} ;



GSceneTag.prototype.runContainer = function( book , ctx , gScene , callback ) {
	if ( ! ( this.content instanceof TagContainer ) || ! gScene ) { return null ; }

	// If it's a TagContainer, then run its content now

	var lvar , returnVal ;

	if ( ctx.resume ) {
		lvar = ctx.syncCodeStack[ ctx.syncCodeDepth ].lvar ;
	}
	else {
		// backup some context var
		lvar = { parentGScene: ctx.data._gScene } ;
		ctx.data._gScene = gScene ;
	}

	// “maybe async”
	returnVal = book.engine.run( this.content , book , ctx , lvar , ( error ) => {
		// Async variant...
		// restore context
		ctx.data._gScene = lvar.parentGScene ;
		callback( error ) ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	// restore context
	ctx.data._gScene = lvar.parentGScene ;

	return returnVal ;
} ;



GSceneTag.createDefault = function( ctx ) {
	if ( ctx.gScenes.default ) { return ctx.gScenes.default ; }

	var eventData = {} ,
		data = {
			id: 'default' ,	// MANDATORY, because of scope context _gScene does not track its own ID
			roles: ctx.roles ,
			active: true
		} ;

	ctx.gScenes.default = new GScene( data , eventData ) ;
	Ngev.groupEmit( ctx.roles , 'createGScene' , 'default' , eventData ) ;
	
	return ctx.gScenes.default ;
} ;

