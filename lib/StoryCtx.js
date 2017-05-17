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



var Ctx = require( './Ctx.js' ) ;
var NextTag = require( './tags/scenario/NextTag.js' ) ;
var Ngev = require( 'nextgen-events' ) ;
var tree = require( 'tree-kit' ) ;
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function StoryCtx() { throw new Error( 'Use StoryCtx.create() instead.' ) ; }
StoryCtx.prototype = Object.create( Ctx.prototype ) ;
StoryCtx.prototype.constructor = StoryCtx ;

module.exports = StoryCtx ;



StoryCtx.create = function create( book , options , self )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( self instanceof StoryCtx ) ) { self = Object.create( StoryCtx.prototype ) ; }
	
	Ctx.create( book , options , self ) ;
	
	Object.defineProperties( self , {
		nexts: { value: options.nexts || [] , writable: true , enumerable: true } ,
		nextTriggeringRoles: { value: null , writable: true , enumerable: true } ,
		nextTriggeringSpecial: { value: null , writable: true , enumerable: true } ,
		sceneConfig: {
			writable: true ,
			enumerable: true ,
			value: options.sceneConfig || {
				hereActions: null ,
				image: {} ,
				music: {}
			}
		} ,
		
		activeScene: { value: null , writable: true , enumerable: true } ,
		isRunningHereActions: { value: false , writable: true , enumerable: true } ,
		resetHereActions: { value: false , writable: true , enumerable: true } ,
	} ) ;
	
	self.onCommand = StoryCtx.onCommand.bind( self ) ;
	self.onChat = StoryCtx.onChat.bind( self ) ;
	self.onAction = StoryCtx.onAction.bind( self ) ;
	
	Ngev.groupOn( self.roles , 'command' , self.onCommand ) ;
	Ngev.groupOn( self.roles , 'chat' , self.onChat ) ;
	Ngev.groupOn( self.roles , 'action' , self.onAction ) ;
	
	return self ;
} ;



StoryCtx.prototype.destroy = function destroy()
{
	if ( this.destroyed ) { return ; }
	
	Ngev.groupOff( this.roles , 'command' , this.onCommand ) ;
	Ngev.groupOff( this.roles , 'chat' , this.onChat ) ;
	Ngev.groupOff( this.roles , 'action' , this.onAction ) ;
	
	// Call the super-class .destroy() method
	Ctx.prototype.destroy.call( this ) ;
} ;



StoryCtx.onCommand = function onCommand( role , command )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onCommand( this.book , this , role , command ) ;
} ;



StoryCtx.onChat = function onChat( role , message )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onChat( this.book , this , role , message ) ;
} ;



StoryCtx.onAction = function onAction( role , actionData )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onAction( this.book , this , role , actionData ) ;
} ;



StoryCtx.prototype.serialize = function serialize()
{
	var element ;
	
	var serialized = {
		active: this.active ,
		children: [] ,
		syncCodeStack: this.syncCodeStack ,
		activeSceneUid: this.activeScene.uid ,
		sceneConfig: this.sceneConfig ,
		resetHereActions: this.resetHereActions ,
		nexts: this.nexts.map( e => e.serialize() ) ,
		data: this.data ,
	} ;
	
	// Save the UID of the hereActions, if any
	serialized.sceneConfig.hereActions = serialized.sceneConfig.hereActions && serialized.sceneConfig.hereActions.uid ;
	
	for ( element of this.children )
	{
		serialized.children.push( element.serialize() ) ;
	}
	
	return serialized ;
} ;



StoryCtx.unserialize = function unserialize( raw , book , parent )
{
	// Restore hereActions from its UID
	raw.sceneConfig.hereActions = raw.sceneConfig.hereActions && book.tags[ raw.sceneConfig.hereActions ] ;
	
	var options = {
		parent: parent ,
		active: raw.active ,
		sceneConfig: raw.sceneConfig
	} ;
	
	var ctx = StoryCtx.create( book , options ) ;
	
	ctx.activeScene = book.tags[ raw.activeSceneUid ] ;
	ctx.syncCodeStack = raw.syncCodeStack ;
	ctx.syncCodeDepth = 0 ;
	ctx.resume = true ;
	ctx.nexts = raw.nexts.map( e => NextTag.unserialize( e , book , ctx ) ) ;
	ctx.resetHereActions = this.resetHereActions ;
	
	tree.extend( null , ctx.data , raw.data ) ;
	
	// Unserialize children
	raw.children.forEach( e => ctx.children.add( StoryCtx.unserialize( e , book , ctx ) ) ) ;
	
	return ctx ;
} ;



// Import a scope into the current, typically a scope created from this one using .createScope()
StoryCtx.prototype.importScopeData = function importScopeData( scope )
{
	Ctx.prototype.importScopeData.call( this , scope ) ;
	this.resetHereActions = scope.resetHereActions ;
} ;


