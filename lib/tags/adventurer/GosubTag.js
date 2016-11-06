/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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
var TagContainer = kungFig.TagContainer ;

var AdventurerCtx = require( '../../AdventurerCtx.js' ) ;

//var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function GosubTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof GosubTag ) ? this : Object.create( GosubTag.prototype ) ;
	
	var matches ;
	
	if ( ! content ) { content = new TagContainer( undefined , self ) ; }
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'gosub' tag's content should be a TagContainer." ) ;
	}
	
	Tag.call( self , 'gosub' , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^([^$ ]+)(?: *=> *(\$[^ ]+))?$/ ) ) )
	{
		throw new SyntaxError( "The 'gosub' tag's attribute should validate the gosub syntax." ) ;
	}
	
	Object.defineProperties( self , {
		target: { value: matches[ 1 ] , writable: true , enumerable: true } ,
		returnRef: { value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
		//roles: { value: null , writable: true , enumerable: true } ,
		"this": { value: null , writable: true , enumerable: true } ,
		args: { value: null , writable: true , enumerable: true } ,
		roles: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = GosubTag ;
GosubTag.prototype = Object.create( Tag.prototype ) ;
GosubTag.prototype.constructor = GosubTag ;
//GosubTag.proxyMode = 'parent' ;



GosubTag.prototype.init = function init( book )
{
	this.this = this.content.getFirstTag( 'this' ) ;
	this.args = this.content.getFirstTag( 'args' ) ;
	
	// Used by [split]
	this.roles = this.content.getFirstTag( 'roles' ) ;
	
	return null ;
} ;



GosubTag.prototype.run = function run( book , ctx , callback )
{
	this.runInContext( book , ctx , null , callback ) ;
} ;



GosubTag.prototype.runInContext = function runInContext( book , ctx , subSceneCtx , callback )
{
	var self = this ,
		outsideControle = !! subSceneCtx ,
		scene = ctx.activeScene ,
		subScene = ctx.activeScene.getScene( book , this.target ) ;
	
	if ( ! subScene ) { callback( new Error( 'Cannot find scene to subScene: ' + this.target ) ) ; return ; }
	
	if ( ! outsideControle )
	{
		subSceneCtx = AdventurerCtx.create( book , {
			parent: ctx ,
			roles: ctx.roles ,
			sceneConfig: ctx.sceneConfig
		} ) ;
		
		// TURN THE PARENT CONTEXT OFF!
		ctx.active = false ;
	}
	
	subSceneCtx.active = true ;
	
	// Set the gosub arguments
	subSceneCtx.data.args = this.args ? this.args.getRecursiveFinalContent( ctx.data ) : null ;
	//log.error( 'this.args: %I' , this.args.content ) ;
	//log.error( 'data.args: %I' , subSceneCtx.data.args ) ;
	
	// Update the this context if it is specifically set to overide the current one
	if ( this.this ) { subSceneCtx.data.this = this.this.getRecursiveFinalContent( ctx.data ) ; }
	
	subScene.exec( book , null , subSceneCtx , function( error ) {
		
		var returnValue ;
		
		if ( ! outsideControle )
		{
			// TURN THE PARENT CONTEXT ON AGAIN!
			ctx.active = true ;
		}
		
		subSceneCtx.destroy() ;
		
		if ( error )
		{
			switch ( error.break )
			{
				case 'return' :
					returnValue = error.return ;
					break ;
				default :
					callback( error ) ;
					return ;
			}
		}
		
		if ( self.returnRef )
		{
			self.returnRef.set( ctx.data , returnValue ) ;
		}
		
		// Restore back the original scene config, if needed
		ctx.activeScene.configure( book , ctx ) ;
		
		callback() ;
	} ) ;
} ;


