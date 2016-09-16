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
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var Ctx = require( '../../AdventurerCtx.js' ) ;

//var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SubsceneTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SubsceneTag ) ? this : Object.create( SubsceneTag.prototype ) ;
	
	if ( ! content ) { content = new TagContainer( undefined , self ) ; }
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'subscene' tag's content should be a TagContainer." ) ;
	}
	
	LabelTag.call( self , 'subscene' , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'subscene' tag's id should be non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		target: { value: self.attributes , writable: true , enumerable: true } ,
		//roles: { value: null , writable: true , enumerable: true } ,
		"this": { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = SubsceneTag ;
SubsceneTag.prototype = Object.create( LabelTag.prototype ) ;
SubsceneTag.prototype.constructor = SubsceneTag ;
//SubsceneTag.proxyMode = 'parent' ;



SubsceneTag.prototype.init = function init( book , callback )
{
	this.this = this.content.getFirstTag( 'this' ) ;
	this.args = this.content.getFirstTag( 'args' ) ;
	
	// Used by [split]
	this.roles = this.content.getFirstTag( 'roles' ) ;
	
	callback() ;
} ;



SubsceneTag.prototype.run = function run( book , ctx , callback )
{
	return this.runInContext( book , ctx , null , callback ) ;
} ;



SubsceneTag.prototype.runInContext = function runInContext( book , ctx , subSceneCtx , callback )
{
	var self = this ,
		outsideControle = !! subSceneCtx ,
		scene = ctx.activeScene ,
		subScene = ctx.activeScene.getScene( book , this.target ) ;
	
	if ( ! subScene ) { callback( new Error( 'Cannot find scene to subScene: ' + this.target ) ) ; return ; }
	
	if ( ! outsideControle )
	{
		subSceneCtx = Ctx.create( book , {
			parent: ctx ,
			nexts: ctx.nexts ,
			roles: ctx.roles ,
			sceneConfig: ctx.sceneConfig
		} ) ;
		
		// TURN THE PARENT CONTEXT OFF!
		ctx.active = false ;
	}
	
	subSceneCtx.active = true ;
	
	// Update the this context if provided
	if ( this.this ) { subSceneCtx.data.this = this.this.getRecursiveFinalContent() ; }
	
	// Set the subscene arguments
	subSceneCtx.data.args = this.args ? this.args.getRecursiveFinalContent() : null ;
	
	subScene.exec( book , null , subSceneCtx , function( error ) {
		
		if ( ! outsideControle )
		{
			// TURN THE PARENT CONTEXT ON AGAIN!
			ctx.active = true ;
			
			// /!\ Is this a good thing? /!\
			// Maybe for future function [call] tag, if it shares the same class
			ctx.nexts = subSceneCtx.nexts ;
		}
		
		subSceneCtx.destroy() ;
		
		if ( error ) { callback( error ) ; return ; }
		
		// Restore back the original scene config, if needed
		ctx.activeScene.configure( book , ctx ) ;
		
		callback() ;
	} ) ;
} ;


