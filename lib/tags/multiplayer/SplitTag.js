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



var Ngev = require( 'nextgen-events' ) ;
var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var AdventurerCtx = require( '../../AdventurerCtx.js' ) ;

var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SplitTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SplitTag ) ? this : Object.create( SplitTag.prototype ) ;
	
	Tag.call( self , 'split' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'split' tag's content should be a TagContainer." ) ;
	}
	
	Object.defineProperties( self , {
		gosubs: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = SplitTag ;
SplitTag.prototype = Object.create( Tag.prototype ) ;
SplitTag.prototype.constructor = SplitTag ;



SplitTag.prototype.init = function init( book )
{
	this.gosubs = this.content.getTags( 'gosub' ) ;
	return null ;
} ;



SplitTag.prototype.run = function run( book , ctx , callback )
{
	var self = this , rolesUsed = [] , count = 0 ;
	
	Ngev.groupEmit( ctx.roles , 'split' ) ;
	
	async.foreach( self.gosubs , function( gosubTag , foreachCallback ) {
		
		if ( ! gosubTag.roles ) { foreachCallback() ; return ; }
		
		var roles = gosubTag.roles.getRecursiveFinalContent( ctx.data ) ;
		
		if ( ! Array.isArray( roles ) ) { foreachCallback() ; return ; }
		
		// A role cannot be used twice
		roles = ctx.roles.filter( e => roles.indexOf( e.id ) !== -1 && rolesUsed.indexOf( e ) === -1 ) ;
		rolesUsed = rolesUsed.concat( roles ) ;
		
		// TURN THE PARENT CONTEXT OFF!
		ctx.active = false ;
		
		var subSceneCtx = AdventurerCtx.create( book , {
			parent: ctx ,
			nexts: ctx.nexts.slice() ,
			roles: roles ,
			sceneConfig: ctx.sceneConfig
		} ) ;
		
		count ++ ;
		
		gosubTag.runInContext( book , ctx , subSceneCtx , function( error ) {
			count -- ;
			
			if ( error ) { foreachCallback( error ) ; return ; }
			
			if ( count )
			{
				Ngev.groupEmit( subSceneCtx.roles , 'wait' , 'otherBranches' ) ;
			}
			
			foreachCallback() ;
		} ) ;
	} )
	.parallel()
	.exec( function( error ) {
		// TURN THE PARENT CONTEXT ON AGAIN!
		ctx.active = true ;
		
		if ( error ) { callback( error ) ; return ; }
		
		Ngev.groupEmit( ctx.roles , 'rejoin' ) ;
		
		// People rejoin from different scenes, hence, no configuration can be held at all
		ctx.activeScene.configure( book , ctx , true ) ;
		
		callback() ;
	} ) ;
} ;


