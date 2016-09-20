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



var Ctx = require( './Ctx.js' ) ;
var Ngev = require( 'nextgen-events' ) ;
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function AdventurerCtx() { throw new Error( 'Use AdventurerCtx.create() instead.' ) ; }
AdventurerCtx.prototype = Object.create( Ctx.prototype ) ;
AdventurerCtx.prototype.constructor = AdventurerCtx ;

module.exports = AdventurerCtx ;



AdventurerCtx.create = function create( book , options , self )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( self instanceof AdventurerCtx ) ) { self = Object.create( AdventurerCtx.prototype ) ; }
	
	Ctx.create( book , options , self ) ;
	
	Object.defineProperties( self , {
		nexts: { value: options.nexts || [] , writable: true , enumerable: true } ,
		nextTriggeringRoles: { value: null , writable: true , enumerable: true } ,
		nextTriggeringSpecial: { value: null , writable: true , enumerable: true } ,
		sceneConfig: {
			writable: true ,
			enumerable: true ,
			value: options.sceneConfig || {
                chatConfig: null ,
                actionConfig: null ,
                image: {} ,
                music: {}
            }
		} ,
		
		activeScene: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	self.onChat = AdventurerCtx.onChat.bind( self ) ;
	self.onAction = AdventurerCtx.onAction.bind( self ) ;
	
	Ngev.groupOn( self.roles , 'chat' , self.onChat ) ;
	Ngev.groupOn( self.roles , 'action' , self.onAction ) ;
	
	return self ;
} ;



AdventurerCtx.prototype.destroy = function destroy()
{
	this.active = false ;
	Ngev.groupOff( this.roles , 'chat' , this.onChat ) ;
	Ngev.groupOff( this.roles , 'action' , this.onAction ) ;
} ;



AdventurerCtx.onChat = function onChat( role , message )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onChat( this.book , this , role , message ) ;
} ;



AdventurerCtx.onAction = function onAction( role , actionData )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onAction( this.book , this , role , actionData ) ;
} ;


