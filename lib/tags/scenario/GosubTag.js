/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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



var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var Ref = kungFig.Ref ;
var Dynamic = kungFig.Dynamic ;
var TagContainer = kungFig.TagContainer ;

var StoryCtx = require( '../../StoryCtx.js' ) ;

//var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function GosubTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof GosubTag ) ? this : Object.create( GosubTag.prototype ) ;

	var matches ;

	if ( ! content ) { content = new TagContainer( undefined , self ) ; }

	if ( ! ( content instanceof TagContainer ) && ( ! content || typeof content !== 'object' ) ) {
		throw new SyntaxError( "The 'gosub' tag's content should be a TagContainer or an object." ) ;
	}

	Tag.call( self , 'gosub' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^([^$ ]+)(?: *=> *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The 'gosub' tag's attribute should validate the gosub syntax." ) ;
	}

	Object.defineProperties( self , {
		target: {
			value: matches[ 1 ] , writable: true , enumerable: true
		} ,
		returnRef: {
			value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true
		} ,
		args: {
			value: null , writable: true , enumerable: true
		} ,
		roles: {
			value: null , writable: true , enumerable: true
		} ,
		alt: {
			value: null , writable: true , enumerable: true
		}
	} ) ;

	return self ;
}

module.exports = GosubTag ;
GosubTag.prototype = Object.create( Tag.prototype ) ;
GosubTag.prototype.constructor = GosubTag ;



GosubTag.prototype.init = function init( book ) {
	if ( ! ( this.content instanceof TagContainer ) ) {
		// The gosub tag itself contains its args
		this.args = this ;
		//this.args = this.content ;
		return null ;
	}

	this.args = this.content.getFirstTag( 'args' ) ;
	//if ( this.args ) { this.args = this.args.content ; }

	// Used by [split]
	this.roles = this.content.getFirstTag( 'roles' ) ;

	// The *alt* tag is used to indicate to the client that the sub-scene and all its descendant should be rendered
	// inside the *alternate buffer*.
	this.alt = this.content.getFirstTag( 'alt' ) ;

	return null ;
} ;



GosubTag.prototype.run = function run( book , ctx , callback ) {
	this.runInContext( book , ctx , null , callback ) ;
} ;



GosubTag.prototype.runInContext = function runInContext( book , ctx , subSceneCtx , callback ) {
	var self = this ,
		altBuffer = false ,
		outsideControle = !! subSceneCtx ,
		scene = ctx.activeScene ,
		subScene = ctx.activeScene.getScene( book , this.target ) ;

	if ( ! subScene ) { callback( new Error( 'Gosub: cannot find scene: ' + this.target ) ) ; return ; }

	// Gosub into the alternate buffer?
	if ( ctx.altBuffer ) {
		altBuffer = true ;
	}
	else if ( this.alt ) {
		altBuffer = this.alt.getRecursiveFinalContent( ctx.data ) ;
		if ( altBuffer === undefined ) { altBuffer = true ; }
		else { altBuffer = !! altBuffer ; }
	}

	// What to do when we return from the upper layer
	var subSceneCallback = ( error ) => {

		var returnValue ;

		if ( ! outsideControle ) {
			// TURN THE PARENT CONTEXT ON AGAIN!
			ctx.active = true ;
		}

		subSceneCtx.destroy() ;

		if ( error ) {
			switch ( error.break ) {
				case 'return' :
					returnValue = error.return ;
					break ;
				default :
					callback( error ) ;
					return ;
			}
		}

		if ( self.returnRef ) {
			self.returnRef.set( ctx.data , returnValue ) ;
		}

		// Restore back the original scene config, if needed
		ctx.activeScene.configure( book , ctx ) ;

		callback() ;
	} ;


	if ( ctx.resume ) {
		if ( ! outsideControle ) {
			if ( ctx.children.size !== 1 ) {
				log.error( "%Y" , Array.from( ctx.children ).map( e => e.activeScene ) ) ;
				callback( new Error( 'Cannot resume: ctx must have exactly one child (has ' + ctx.children.size + ')' ) ) ;
				return ;
			}

			// Get the unique child
			subSceneCtx = Array.from( ctx.children )[ 0 ] ;
		}

		subScene.resume( book , subSceneCtx , subSceneCallback ) ;
	}
	else {
		if ( ! outsideControle ) {
			subSceneCtx = StoryCtx.create( book , {
				parent: ctx ,
				events: ctx.events ,
				roles: ctx.roles ,
				hereActions: ctx.hereActions ,
				statusUpdater: ctx.statusUpdater ,
				nextPanel: ctx.nextPanel ,
				sceneConfig: ctx.sceneConfig
			} ) ;

			// TURN THE PARENT CONTEXT OFF!
			ctx.active = false ;
		}

		subSceneCtx.active = true ;
		subSceneCtx.altBuffer = altBuffer ;

		// Set the gosub arguments
		subSceneCtx.data.args = this.args && this.args.getRecursiveFinalContent( ctx.data ) || {} ;
		subSceneCtx.data.args.__gosub = true ;

		subScene.exec( book , null , subSceneCtx , subSceneCallback ) ;
	}
} ;


