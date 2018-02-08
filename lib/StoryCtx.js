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



StoryCtx.create = function create( book , options , self ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	options.type = 'story' ;

	if ( ! ( self instanceof StoryCtx ) ) { self = Object.create( StoryCtx.prototype ) ; }

	Ctx.create( book , options , self ) ;

	Object.defineProperties( self , {
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
		isRunningHereActions: { value: false , writable: true , enumerable: true } ,
		resetHereActions: { value: false , writable: true , enumerable: true }
	} ) ;

	self.onCommand = StoryCtx.onCommand.bind( self ) ;

	Ngev.groupOn( self.roles , 'command' , self.onCommand ) ;

	return self ;
} ;



StoryCtx.prototype.destroy = function destroy() {
	if ( this.destroyed ) { return ; }

	Ngev.groupOff( this.roles , 'command' , this.onCommand ) ;

	// Call the super-class .destroy() method
	Ctx.prototype.destroy.call( this ) ;
} ;



StoryCtx.onCommand = function onCommand( role , command ) {
	//log.error( "StoryCtx#onCommand(): active: %s, role: %s, command: %s, ctx.roles: %Y" , this.active , role.label , command , this.roles.map( r => r.label ) ) ;
	if ( ! this.active ) { return ; }
	this.activeScene.onCommand( this.book , this , role , command ) ;
} ;



StoryCtx.prototype.serialize = function serialize() {
	var element ;

	var serialized = {
		active: this.active ,
		children: [] ,
		syncCodeStack: this.syncCodeStack ,
		activeSceneUid: this.activeScene.uid ,
		sceneConfig: this.sceneConfig ,
		resetHereActions: this.resetHereActions ,
		nexts: this.nexts.map( e => e.serialize() ) ,
		nextGroupBreak: this.nextGroupBreak ,
		data: this.data ,
		altBuffer: this.altBuffer ,
		sprites: this.sprites ,
		uis: this.uis ,
		markers: this.markers ,
		cards: this.cards
	} ;

	// Save the UID, if any
	serialized.hereActions = serialized.hereActions && serialized.hereActions.uid ;
	serialized.statusUpdater = serialized.statusUpdater && serialized.statusUpdater.uid ;
	serialized.nextPanel = serialized.nextPanel && serialized.nextPanel.uid ;

	for ( element of this.children ) {
		serialized.children.push( element.serialize() ) ;
	}

	return serialized ;
} ;



StoryCtx.unserialize = function unserialize( raw , book , parent ) {
	// Restore hereActions from its UID
	raw.hereActions = raw.hereActions && book.tags[ raw.hereActions ] ;
	raw.statusUpdater = raw.statusUpdater && book.tags[ raw.statusUpdater ] ;
	raw.nextPanel = raw.nextPanel && book.tags[ raw.nextPanel ] ;

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
	ctx.nextGroupBreak = raw.nextGroupBreak ;
	ctx.resetHereActions = raw.resetHereActions ;
	ctx.statusUpdater = raw.statusUpdater ;
	ctx.altBuffer = raw.altBuffer ;

	tree.extend( null , ctx.data , raw.data ) ;

	// Unserialize children
	raw.children.forEach( e => ctx.children.add( StoryCtx.unserialize( e , book , ctx ) ) ) ;

	return ctx ;
} ;



// Import a scope into the current, typically a scope created from this one using .createScope()
StoryCtx.prototype.importScopeData = function importScopeData( scope ) {
	Ctx.prototype.importScopeData.call( this , scope ) ;
	this.resetHereActions = scope.resetHereActions ;
} ;


