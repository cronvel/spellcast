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

var NextTag = require( './NextTag.js' ) ;
var ExecContext = require( '../../AdventureExecContext.js' ) ;

//var async = require( 'async-kit' ) ;
var tree = require( 'tree-kit' ) ;

var doormen = require( 'doormen' ) ;

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
		throw new SyntaxError( "The 'scene' tag's id should be a non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
		chapter: { value: null , writable: true , enumerable: true } ,
		voteStyle: { value: null , writable: true , enumerable: true } ,
		voteTime: { value: null , writable: true , enumerable: true } ,
		hurryTime: { value: null , writable: true , enumerable: true } ,
		showTimer: { value: null , writable: true , enumerable: true } ,
		image: { value: null , writable: true , enumerable: true } ,
		music: { value: null , writable: true , enumerable: true } ,
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
	
	parentTag = this.getParentTag() ;
	
	if ( parentTag && parentTag.name === 'chapter' )
	{
		this.chapter = parentTag ;
	}
	else
	{
		// /!\ or create a default chapter? /!\
		callback( new Error( "The [scene] tag should be inside a [chapter] tag." ) ) ;
		return ;
	}
	
	if ( ! book.scenes[ this.chapter.id ] ) { book.scenes[ this.chapter.id ] = {} ; }
	
	book.scenes[ this.chapter.id ][ this.id ] = this ;
	
	if ( ! book.startingScene ) { book.startingScene = this ; }
	
	// Do not use *.getFinalContent()! it should not be resolved at init step!
	var voteStyle = this.content.getFirstTag( 'vote-style' ) ;
    this.voteStyle = ( voteStyle && voteStyle.content ) || null ;
	
	var voteTime = this.content.getFirstTag( 'vote-time' ) ;
    this.voteTime = ( voteTime && voteTime.content ) || null ;
	
	var hurryTime = this.content.getFirstTag( 'hurry-time' ) ;
    this.hurryTime = ( hurryTime && hurryTime.content ) || null ;

	var showTimer = this.content.getFirstTag( 'show-timer' ) ;
    this.showTimer = showTimer && showTimer.content ;
	
	this.image = this.content.getFirstTag( 'image' ) ;
	this.music = this.content.getFirstTag( 'music' ) ;
	this.chat = this.content.getFirstTag( 'chat' ) ;
	
	callback() ;
} ;



SceneTag.prototype.exec = function exec( book , options , execContext , callback )
{
	var self = this ;
	
	// Create a context if none was provided
	if ( ! execContext ) { execContext = ExecContext.create( book ) ; }
	
	// Reset 'nexts'
	// /!\ or maybe in the Next#exec() function /!\
	//execContext.nexts = [] ;
	
	execContext.activeScene = this ;
	
	Ngev.groupEmit( execContext.roles , 'enterScene' ) ;
	this.configure( book , execContext ) ;
	
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
		
		if ( execContext.nexts.length )
		{
			// Normal 'next' case
			NextTag.selectNextScene( book , options , execContext , function( next ) {
			
				self.leaveScene( book , options , execContext , function() {
					next.exec( book , options , execContext , callback ) ;
				} ) ;
			} ) ;
		}
		else if ( execContext.sceneStack.length > 1 )
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
		chapterId = this.chapter.id ;
		sceneId = tmp[ 0 ] ;
	}
	else
	{
		chapterId = tmp[ 0 ] ;
		sceneId = tmp[ 1 ] ;
	}
	
	return book.scenes[ chapterId ] && book.scenes[ chapterId ][ sceneId ] ;
} ;



SceneTag.prototype.onChat = function onChat( book , execContext , role , roleMessage )
{
	var message = role.label + ' says: “' + roleMessage + '”' ;
	
	Ngev.groupEmit( execContext.roles , 'message' , message , {} ) ;
} ;



SceneTag.prototype.configure = function configure( book , execContext , force )
{
	this.configureChat( book , execContext , force ) ;
	this.configureAmbiance( 'image' , book , execContext , force ) ;
	this.configureAmbiance( 'music' , book , execContext , force ) ;
} ;



SceneTag.prototype.configureAmbiance = function configureAmbiance( type , book , execContext , force )
{
	var element ;
	
	if ( this[ type ] ) { element = this[ type ].getRecursiveFinalContent() ; }
	if ( ! element && this.chapter[ type ] ) { element = this.chapter[ type ].getRecursiveFinalContent() ; }
	
	if ( element && typeof element === 'string' ) { element = { url: element } ; }
	
	if ( ! element || typeof element !== 'object' ) { element = {} ; }
	
	if ( force || ! doormen.isEqual( execContext.sceneConfig[ type ] , element ) )
	{
		execContext.sceneConfig[ type ] = element ;
		Ngev.groupEmit( execContext.roles , type , element ) ;
	}
} ;



SceneTag.prototype.configureChat = function configureChat( book , execContext , force )
{
	var v , chatConfig = {} ;
	
	// First, set up the default chat config
	v = execContext.roles.length > 1 ;
	execContext.roles.forEach( e => chatConfig[ e.id ] = {
		read: v ,
		write: v
	} ) ;
	
	if ( this.chapter.chat )
	{
		tree.extend( { deep: true } , chatConfig , this.expandChatConfig( this.chapter.chat.getRecursiveFinalContent() ) ) ;
	}
	
	if ( this.chat )
	{
		tree.extend( { deep: true } , chatConfig , this.expandChatConfig( this.chat.getRecursiveFinalContent() ) ) ;
	}
	
	log.error( 'chat config: ' , chatConfig ) ;
	
	if ( force || ! doormen.isEqual( execContext.sceneConfig.chatConfig , chatConfig ) )
	{
		execContext.sceneConfig.chatConfig = chatConfig ;
		Ngev.groupEmit( execContext.roles , 'chatConfig' , chatConfig ) ;
	}
} ;



SceneTag.prototype.expandChatConfig = function expandChatConfig( chatConfig , execContext )
{
	var v ;
	
	if ( chatConfig === true || chatConfig === false )
	{
		v = chatConfig ;
		chatConfig = {} ;
		execContext.roles.forEach( e => chatConfig[ e.id ] = {
			read: v ,
			write: v
		} ) ;
	}
	else if ( ! chatConfig || typeof chatConfig !== 'object' )
	{
		return {} ;
	}
	else
	{
		Object.keys( chatConfig ).forEach( k => {
			var role = execContext.roles.get( k ) ;
			
			if ( ! role )
			{
				// Remove role IDs that are not in the current execContext
				delete chatConfig[ k ] ;
			}
			else if ( chatConfig[ k ] === true || chatConfig[ k ] === false )
			{
				chatConfig[ k ] = {
					read: chatConfig[ k ] ,
					write: chatConfig[ k ]
				} ;
			}
			else if ( ! chatConfig[ k ] || typeof chatConfig[ k ] !== 'object' )
			{
				// If it doesn't make sense, remove the entry
				delete chatConfig[ k ] ;
			}
			else
			{
				chatConfig[ k ] = {
					read: !! chatConfig[ k ].read ,
					write: !! chatConfig[ k ].write
				} ;
			}
		} ) ;
	}
	
	return chatConfig ;
} ;


