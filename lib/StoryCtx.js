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



const Ctx = require( './Ctx.js' ) ;
const NextTag = require( './tags/scenario/NextTag.js' ) ;
const Ngev = require( 'nextgen-events' ) ;
const tree = require( 'tree-kit' ) ;
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function StoryCtx( book , options = {} ) {
	options.type = 'story' ;

	Ctx.call( this , book , options ) ;

	Object.defineProperties( this , {
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

		// gfx stuffs: g-scenes, sprites, VGs, markers, cards, etc...
		gScenes: { value: {} , writable: true , enumerable: true } ,
		gEntities: { value: {} , writable: true , enumerable: true } ,

		activeScene: { value: null , writable: true , enumerable: true } ,
		activeNext: { value: null , writable: true , enumerable: true } ,
		sceneRunLevel: { value: null , writable: true , enumerable: true } ,
		isSubscene: { value: false , writable: true , enumerable: true } ,
		resetHereActions: { value: false , writable: true , enumerable: true }
	} ) ;

	this.onCommand = StoryCtx.onCommand.bind( this ) ;
	this.onSaveState = StoryCtx.onSaveState.bind( this ) ;

	Ngev.groupOn( this.roles , 'command' , this.onCommand ) ;
	Ngev.groupOn( this.roles , 'saveState' , this.onSaveState ) ;
}

StoryCtx.prototype = Object.create( Ctx.prototype ) ;
StoryCtx.prototype.constructor = StoryCtx ;

module.exports = StoryCtx ;



StoryCtx.serializer = function( ctx ) {
	return { override: ctx } ;
} ;



StoryCtx.unserializeContext = true ;

StoryCtx.unserializer = function( context ) {
	var ctx = Object.create( StoryCtx.prototype ) ;
	ctx.book = context.book ;
	return ctx ;
} ;



StoryCtx.unserializeFinalizer = function( ctx ) {

	// /!\ Useless? since all events are unserialized with those options anyway... /!\
	ctx.events.setInterruptible( true ) ;
	ctx.events.setNice( Ngev.DESYNC ) ;
	ctx.events.desyncUseNextTick( true ) ;
	ctx.events.serializeListenerContext( 'script' ) ;

	// We only unserialize in the resume context, so always set those:
	ctx.resume = true ;
	ctx.syncCodeDepth = 0 ;

	ctx.onCommand = StoryCtx.onCommand.bind( ctx ) ;
	ctx.onSaveState = StoryCtx.onSaveState.bind( ctx ) ;

	Ngev.groupOn( ctx.roles , 'command' , ctx.onCommand ) ;
	Ngev.groupOn( ctx.roles , 'saveState' , ctx.onSaveState ) ;
} ;




StoryCtx.prototype.destroy = function() {
	if ( this.destroyed ) { return ; }

	Ngev.groupOff( this.roles , 'command' , this.onCommand ) ;
	Ngev.groupOff( this.roles , 'saveState' , this.onSaveState ) ;

	// Call the super-class .destroy() method
	Ctx.prototype.destroy.call( this ) ;
} ;



StoryCtx.onCommand = function( role , command ) {
	//log.error( "StoryCtx#onCommand(): active: %s, role: %s, command: %s, ctx.roles: %Y" , this.active , role.name , command , this.roles.map( r => r.name ) ) ;
	if ( ! this.active ) { return ; }
	this.activeScene.onCommand( this.book , this , role , command ) ;
} ;



StoryCtx.onSaveState = async function( role ) {
	log.error( "StoryCtx#onSaveState() -- active: %s, role: %s" , this.active , role.name ) ;
	if ( ! this.active ) { return ; }

	await this.book.saveState( 'state.jsdat' , this ) ;
	log.info( 'Save done' ) ;
} ;

