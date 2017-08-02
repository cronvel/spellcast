/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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
var ActionTag = require( './ActionTag.js' ) ;
var StoryCtx = require( '../../StoryCtx.js' ) ;

//var async = require( 'async-kit' ) ;
var tree = require( 'tree-kit' ) ;

var doormen = require( 'doormen' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SceneTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SceneTag ) ? this : Object.create( SceneTag.prototype ) ;
	
	LabelTag.call( self , 'scene' , attributes , content , shouldParse ) ;
	
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
		groupTag: { value: null , writable: true , enumerable: true } ,
		isStartingScene: { value: tag === 'starting-scene' , enumerable: true } ,
		nextStyle: { value: null , writable: true , enumerable: true } ,
		voteStyle: { value: null , writable: true , enumerable: true } ,
		voteTime: { value: null , writable: true , enumerable: true } ,
		hurryTime: { value: null , writable: true , enumerable: true } ,
		showTimer: { value: null , writable: true , enumerable: true } ,
		theme: { value: null , writable: true , enumerable: true } ,
		image: { value: null , writable: true , enumerable: true } ,
		music: { value: null , writable: true , enumerable: true } ,
		chat: { value: null , writable: true , enumerable: true } ,
		initSub: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = SceneTag ;
SceneTag.prototype = Object.create( LabelTag.prototype ) ;
SceneTag.prototype.constructor = SceneTag ;



SceneTag.prototype.init = function init( book )
{
	this.groupTag = this.getParentTag() ;
	
	if ( ! this.groupTag || ( this.groupTag.name !== 'chapter' && this.groupTag.name !== 'system' ) )
	{
		// /!\ or create a default chapter? /!\
		return new Error( "The [scene] tag should be inside a [chapter] or a [system] tag." ) ;
	}
	
	if ( ! book.scenes[ this.groupTag.id ] ) { book.scenes[ this.groupTag.id ] = {} ; }
	
	book.scenes[ this.groupTag.id ][ this.id ] = this ;
	
	if ( this.isStartingScene || ! book.startingScene ) { book.startingScene = this ; }
	
	// Create the static data for the scene
	book.staticData[ this.uid ] = {} ;
	
	// Do not use *.getRecursiveFinalContent()! it should not be resolved at init step!
	var voteStyle = this.content.getFirstTag( 'vote-style' ) ;
	this.voteStyle = ( voteStyle && voteStyle.content ) || null ;
	
	var voteTime = this.content.getFirstTag( 'vote-time' ) ;
	this.voteTime = ( voteTime && voteTime.content ) || null ;
	
	var hurryTime = this.content.getFirstTag( 'hurry-time' ) ;
	this.hurryTime = ( hurryTime && hurryTime.content ) || null ;

	var showTimer = this.content.getFirstTag( 'show-timer' ) ;
	this.showTimer = showTimer && showTimer.content ;
	
	var nextStyle = this.content.getFirstTag( 'next-style' ) ;
	this.nextStyle = ( nextStyle && nextStyle.content ) || null ;
	
	this.theme = this.content.getFirstTag( 'theme' ) ;
	this.image = this.content.getFirstTag( 'image' ) ;
	this.music = this.content.getFirstTag( 'music' ) ;
	this.chat = this.content.getFirstTag( 'chat' ) ;
	this.initSub = this.content.getFirstTag( 'init-sub' ) ;
	
	return null ;
} ;



SceneTag.prototype.exec = function exec( book , options , ctx , callback )
{
	if ( ! ctx )
	{
		// Create a context if none was provided
		ctx = StoryCtx.create( book , { eventBus: book.initEventBus } ) ;
		
		// Add the default/global [here-actions]
		ctx.sceneConfig.hereActions = book.hereActions ;
	}
	
	// Reset 'nexts'
	// /!\ or at the end of the scene?
	ctx.nexts = [] ;
	ctx.nextGroupBreak = false ;
	
	ctx.activeScene = this ;
	ctx.isRunningHereActions = false ;
	
	// Always reset local for a scene
	ctx.data.local = {} ;
	
	// Always set static data of the scene
	ctx.data.static = book.staticData[ this.uid ] ;
	
	// Always remove here data
	ctx.data.here = null ;
	
	var isGosub = !! ( ctx.data.args && ctx.data.args.__gosub ) ;
	
	Ngev.groupEmit( ctx.roles , 'enterScene' , isGosub ) ;
	this.configure( book , ctx ) ;
	
	if ( isGosub )
	{
		delete ctx.data.args.__gosub ;
		
		if ( this.initSub )
		{
			this.execInitSub( book , options , ctx , callback ) ;
			return ;
		}
	}
	
	this.execScene( book , options , ctx , callback ) ;
} ;



SceneTag.prototype.execInitSub = function execInitSub( book , options , ctx , callback )
{
	book.engine.runCb( this.initSub.content , book , ctx , null , ( error ) => {
		
		if ( error )
		{
			this.endOfScene( book , options , ctx , callback , error ) ;
			return ;
		}
		
		this.execScene( book , options , ctx , callback ) ;
	} ) ;
} ;



SceneTag.prototype.execScene = function execScene( book , options , ctx , callback )
{
	book.engine.runCb( this.content , book , ctx , null , ( error ) => {
		
		if ( error )
		{
			this.endOfScene( book , options , ctx , callback , error ) ;
			return ;
		}
		
		this.execHereActions( book , options , ctx , callback ) ;
	} ) ;
} ;



SceneTag.prototype.execHereActions = function execHereActions( book , options , ctx , callback )
{
	if ( ! ctx.sceneConfig.hereActions || ! ctx.data.here )
	{
		this.endOfScene( book , options , ctx , callback ) ;
		return ;
	}
	
	// Run [here-actions]
	ctx.isRunningHereActions = true ;
	
	book.engine.runCb( ctx.sceneConfig.hereActions.content , book , ctx , null , ( error ) => {
		
		ctx.isRunningHereActions = false ;
		// /!\ Ignore error or not? ignore error.break?
		// Not sure if it's a good idea to allow goto/gosub inside [here-actions]
		this.endOfScene( book , options , ctx , callback , error ) ;
	} ) ;
} ;



SceneTag.prototype.resetHereActions = function resetHereActions( book , options , ctx , callback )
{
	ctx.nexts = ctx.nexts.filter( e => ! e.isHereAction ) ;
	this.execHereActions( book , options , ctx , callback ) ;
} ;



// What to do once the scene is rendered
SceneTag.prototype.endOfScene = function endOfScene( book , options , ctx , callback , error )
{
	if ( error )
	{
		switch ( error.break )
		{
			case 'goto' :
				this.leaveScene( book , options , ctx , () => {
					error.goto.exec( book , options , ctx , callback ) ;
				} ) ;
				return ;
			default :
				callback( error ) ;
				return ;
		}
	}
	
	if ( ctx.nexts.length )
	{
		// Normal 'next' case
		NextTag.selectNextScene( book , options , ctx , ( error , next ) => {
			
			if ( error ) { callback( error ) ; return ; }
			
			next.exec( book , options , ctx , ( error ) => {
				
				if ( error )
				{
					switch ( error.break )
					{
						case 'goto' :
							this.leaveScene( book , options , ctx , () => {
								error.goto.exec( book , options , ctx , callback ) ;
							} ) ;
							return ;
						case 'cancel' :
							// either a [fake-next] tag was selected, or a [cancel] tag aborted the process
							if ( ctx.resetHereActions )
							{
								this.resetHereActions( book , options , ctx , callback ) ;
							}
							else
							{
								this.endOfScene( book , options , ctx , callback ) ;
							}
							
							return ;
						default :
							callback( error ) ;
							return ;
					}
				}
				
				this.leaveScene( book , options , ctx , () => {
					callback( error ) ;
				} ) ;
			} ) ;
		} ) ;
	}
	else if ( ctx.parent )
	{
		// Return from sub-scene, no pause
		log.debug( 'No next tag: return from subscene (%s)' , this.location ) ;
		Ngev.groupEmit( ctx.roles , 'leaveScene' , true , callback ) ;
	}
	else
	{
		// Nothing more to do: this is either the end or wait for event
		log.debug( 'No next tag: end or wait for event (%s)' , this.location ) ;
		callback() ;
	}
} ;



SceneTag.prototype.resume = function resume( book , ctx , callback )
{
	// Set static data?
	ctx.data.static = book.staticData[ this.uid ] ;
	
	book.engine.runCb(
		this.content , book , ctx , null , this.endOfScene.bind( this , book , null , ctx , callback )
	) ;
} ;



SceneTag.prototype.leaveScene = function leaveScene( book , options , ctx , callback )
{
	ctx.localListeners.forEach( listener => ctx.eventBusOff( listener.id ) ) ;
	ctx.localListeners.length = 0 ;
	Ngev.groupEmit( ctx.roles , 'leaveScene' , false , callback ) ;
} ;



SceneTag.prototype.getScene = function getScene( book , target )
{
	var tmp , groupId , sceneId ;
	
	tmp = target.split( '/' ) ;
	
	if ( tmp.length <= 1 )
	{
		groupId = this.groupTag.id ;
		sceneId = tmp[ 0 ] ;
	}
	else
	{
		groupId = tmp[ 0 ] ;
		sceneId = tmp[ 1 ] ;
	}
	
	return book.scenes[ groupId ] && book.scenes[ groupId ][ sceneId ] ;
} ;



SceneTag.prototype.onCommand = function onCommand( book , ctx , role , command )
{
	//book.apiEmit( 'command' , { role: role , entity: role.entity , command: command } , ( cancel ) => {
	ctx.eventBusEmit( 'command' , { role: role , entity: role.entity , command: command } , ctx , ( cancel ) => {
		// Useful?
	} ) ;
} ;



SceneTag.prototype.configure = function configure( book , ctx , force )
{
	this.configureAmbiance( 'theme' , book , ctx , force ) ;
	this.configureAmbiance( 'image' , book , ctx , force ) ;
	this.configureAmbiance( 'music' , book , ctx , force ) ;
} ;



SceneTag.prototype.configureAmbiance = function configureAmbiance( type , book , ctx , force )
{
	var element ;
	
	if ( this[ type ] ) { element = this[ type ].getRecursiveFinalContent( ctx.data ) ; }
	if ( ! element && this.groupTag[ type ] ) { element = this.groupTag[ type ].getRecursiveFinalContent( ctx.data ) ; }
	
	if ( element && typeof element === 'string' ) { element = { url: element } ; }
	
	if ( ! element || typeof element !== 'object' ) { element = {} ; }
	
	if ( element.url && type === 'theme' && element.url.indexOf( '/' ) === -1 )
	{
		element.url = '/themes/' + element.url + '/main.css' ;
	}
	
	if ( force || ! doormen.isEqual( ctx.sceneConfig[ type ] , element ) )
	{
		ctx.sceneConfig[ type ] = element ;
		Ngev.groupEmit( ctx.roles , type , element ) ;
	}
} ;


