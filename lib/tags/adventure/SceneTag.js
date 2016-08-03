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
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

//var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SceneTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof SceneTag ) ? this : Object.create( SceneTag.prototype ) ;
	
	LabelTag.call( self , 'scene' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'scene' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'scene' tag's id should be non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
		chapterId: { value: null , writable: true , enumerable: true } ,
		apiListeners: { value: [] , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = SceneTag ;
SceneTag.prototype = Object.create( LabelTag.prototype ) ;
SceneTag.prototype.constructor = SceneTag ;
SceneTag.proxyMode = 'inherit+links' ;



SceneTag.prototype.init = function init( book , callback )
{
	var parentTag ;
	
	this.chapterId = 'default' ;
	
	parentTag = this.getParentTag() ;
	
	if ( parentTag && parentTag.name === 'chapter' )
	{
		this.chapterId = parentTag.id ;
	}
	
	
	if ( ! book.scenes[ this.chapterId ] ) { book.scenes[ this.chapterId ] = {} ; }
	
	book.scenes[ this.chapterId ][ this.id ] = this ;
	
	if ( ! book.startingScene ) { book.startingScene = this ; }
	
	callback() ;
} ;



SceneTag.prototype.exec = function exec( book , options , execContext , callback )
{
	var self = this ;
	
	if ( ! execContext )
	{
		execContext = {
			nexts: [] ,
			roles: book.roles ,
			nextTriggeringRole: null ,
		} ;
	}
	
	// Reset 'nexts'
	// /!\ or maybe in the Next#exec() function /!\
	//execContext.nexts = [] ;
	
	book.activeScene = this ;
	
	Ngev.groupEmit( execContext.roles , 'enterScene' ) ;
	
	book.run( this.content , execContext , function( error ) {
		if ( error )
		{
			if ( ! error.continue ) { callback( error ) ; return ; }
			
			if ( error.goto )
			{
				self.leaveScene( book , options , execContext , function() {
					error.goto.exec( book , options , execContext , callback ) ;
				} ) ;
				return ;
			}
		}
		
		
		// /!\ 'leaveScene' event
		
		
		if ( execContext.nexts.length )
		{
			// Normal 'next' case
			
			// For instance, the first role to select a 'next' event will trigger the next scene
			//book.input.once( 'selectNext' , function( nextIndex ) {
			Ngev.groupGlobalOnce( execContext.roles , 'selectNext' , function( role , nextIndex ) {
				execContext.nextTriggeringRole = role ;
				
				self.leaveScene( book , options , execContext , function() {
					try {
					execContext.nexts[ nextIndex ].exec( book , options , execContext , callback ) ;
					} catch ( error ) { log.error( "nextIndex: %I\nexecContext.nexts: %I\nError: %E\n" , nextIndex , execContext.nexts , error ) ; throw error ; }
				} ) ;
			} ) ;
			
			Ngev.groupEmit( execContext.roles , 'nextList' , execContext.nexts.map( e => { return {
				target: e.target ,
				label: e.label && e.label.__isDynamic__ ? e.label.getFinalValue() : e.label
			} ; } ) ) ;
		}
		else if ( book.sceneStack.length > 1 )
		{
			// Return from sub-scene, no pause
			log.debug( 'No next tag: return from subscene' ) ;
			Ngev.groupEmit( execContext.roles , 'leaveScene' , callback ) ;
		}
		else
		{
			// Nothing more to do: this is either the end or wait for event
			log.debug( 'No next tag: end or wait for event' ) ;
			callback() ;
		}
	} ) ;
} ;



SceneTag.prototype.leaveScene = function leaveScene( book , options , execContext , callback )
{
	this.apiListeners.forEach( e => book.api.off( e.event , e.id || e.fn ) ) ;
	Ngev.groupEmit( execContext.roles , 'leaveScene' , callback ) ;
} ;



SceneTag.prototype.getScene = function getScene( book , target )
{
	var tmp , chapterId , sceneId ;
	
	tmp = target.split( '/' ) ;
	
	if ( tmp.length <= 1 )
	{
		chapterId = this.chapterId ;
		sceneId = tmp[ 0 ] ;
	}
	else
	{
		chapterId = tmp[ 0 ] ;
		sceneId = tmp[ 1 ] ;
	}
	
	return book.scenes[ chapterId ] && book.scenes[ chapterId ][ sceneId ] ;
} ;

