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



var Ctx = require( './Ctx.js' ) ;
var NextTag = require( './tags/scenario/NextTag.js' ) ;
var Ngev = require( 'nextgen-events' ) ;
var tree = require( 'tree-kit' ) ;
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function StoryCtx() { throw new Error( 'Use StoryCtx.create() instead.' ) ; }
StoryCtx.prototype = Object.create( Ctx.prototype ) ;
StoryCtx.prototype.constructor = StoryCtx ;

module.exports = StoryCtx ;

// Tmp:
//var ctxId = 0 ;



StoryCtx.create = function create( book , options , self ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	options.type = 'story' ;

	if ( ! ( self instanceof StoryCtx ) ) { self = Object.create( StoryCtx.prototype ) ; }

	Ctx.create( book , options , self ) ;

	Object.defineProperties( self , {
		// Tmp:
		//id: { value: ctxId ++ } ,
		nexts: { value: options.nexts || [] , writable: true , enumerable: true } ,
		nextGroupBreak: { value: false , writable: true , enumerable: true } ,
		nextTriggeringRoles: { value: null , writable: true , enumerable: true } ,
		nextTriggeringSpecial: { value: null , writable: true , enumerable: true } ,
		altBuffer: { value: false , writable: true , enumerable: true } ,
		hereActions: { value: options.hereActions , writable: true , enumerable: true } ,
		statusUpdater: { value: options.statusUpdater , writable: true , enumerable: true } ,
		nextPanel: { value: options.nextPanel , writable: true , enumerable: true } ,
		sceneConfig: {
			writable: true ,
			enumerable: true ,
			value: options.sceneConfig || {
				image: {} ,
				music: {}
			}
		} ,

		// UI-like
		sprites: { value: {} , writable: true , enumerable: true } ,
		uis: { value: {} , writable: true , enumerable: true } ,
		markers: { value: {} , writable: true , enumerable: true } ,
		cards: { value: {} , writable: true , enumerable: true } ,

		activeScene: { value: null , writable: true , enumerable: true } ,
		activeNext: { value: null , writable: true , enumerable: true } ,
		sceneRunLevel: { value: null , writable: true , enumerable: true } ,
		isSubscene: { value: false , writable: true , enumerable: true } ,
		resetHereActions: { value: false , writable: true , enumerable: true }
	} ) ;

	self.onCommand = StoryCtx.onCommand.bind( self ) ;
	self.onSaveState = StoryCtx.onSaveState.bind( self ) ;

	Ngev.groupOn( self.roles , 'command' , self.onCommand ) ;
	Ngev.groupOn( self.roles , 'saveState' , self.onSaveState ) ;

	return self ;
} ;



StoryCtx.serializer = function serializer( ctx ) {
	return { overide: ctx } ;
} ;



StoryCtx.unserializeContext = true ;

StoryCtx.unserializer = function unserializer( context ) {
	var ctx = Object.create( StoryCtx.prototype ) ;
	ctx.book = context.book ;
	return ctx ;
} ;



StoryCtx.unserializeFinalizer = function unserializeFinalizer( ctx ) {
	// Events options
	ctx.events.setInterruptible( true ) ;
	ctx.events.setNice( Ngev.DESYNC ) ;
	ctx.events.serializeListenerContext( 'script' ) ;

	// We only unserialize in the resume context, so always set those:
	ctx.resume = true ;
	ctx.syncCodeDepth = 0 ;

	ctx.onCommand = StoryCtx.onCommand.bind( ctx ) ;
	ctx.onSaveState = StoryCtx.onSaveState.bind( ctx ) ;

	Ngev.groupOn( ctx.roles , 'command' , ctx.onCommand ) ;
	Ngev.groupOn( ctx.roles , 'saveState' , ctx.onSaveState ) ;
} ;




StoryCtx.prototype.destroy = function destroy() {
	if ( this.destroyed ) { return ; }

	Ngev.groupOff( this.roles , 'command' , this.onCommand ) ;
	Ngev.groupOff( this.roles , 'saveState' , this.onSaveState ) ;

	// Call the super-class .destroy() method
	Ctx.prototype.destroy.call( this ) ;
} ;



StoryCtx.onCommand = function onCommand( role , command ) {
	//log.error( "StoryCtx#onCommand(): active: %s, role: %s, command: %s, ctx.roles: %Y" , this.active , role.label , command , this.roles.map( r => r.label ) ) ;
	if ( ! this.active ) { return ; }
	this.activeScene.onCommand( this.book , this , role , command ) ;
} ;



StoryCtx.onSaveState = function onSaveState( role ) {
	log.error( "StoryCtx#onSaveState() -- active: %s, role: %s" , this.active , role.label ) ;
	if ( ! this.active ) { return ; }

	this.book.saveState( 'state.jsdat' , this , () => {
		console.log( 'Save done' ) ;
		/*
		this.loadState( 'state.jsdat' , () => {
			console.log( 'Load done' ) ;
		} ) ;
		*/
	} ) ;
} ;

