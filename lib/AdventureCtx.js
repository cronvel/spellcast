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



function AdventureCtx() { throw new Error( 'Use AdventureCtx.create() instead.' ) ; }
AdventureCtx.prototype = Object.create( Ctx.prototype ) ;
AdventureCtx.prototype.constructor = AdventureCtx ;

module.exports = AdventureCtx ;



AdventureCtx.create = function create( book , options , self )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( self instanceof AdventureCtx ) ) { self = Object.create( AdventureCtx.prototype ) ; }
	
	Ctx.create( book , options , self ) ;
	
	Object.defineProperties( self , {
		nexts: { value: options.nexts || [] , writable: true , enumerable: true } ,
		nextTriggeringRoles: { value: null , writable: true , enumerable: true } ,
		nextTriggeringSpecial: { value: null , writable: true , enumerable: true } ,
		sceneStack: { value: options.sceneStack || [] , writable: true , enumerable: true } ,
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

		// activeScene getter/setter
		activeScene: {
			get: function() {
				if ( ! this.sceneStack.length ) { return ; }
				return this.sceneStack[ this.sceneStack.length - 1 ] ;
			} ,
			set: function( scene ) {
				if ( this.sceneStack.length )
				{
					if ( scene ) { this.sceneStack[ this.sceneStack.length - 1 ] = scene ; }
					//else { this.sceneStack.length -- ; }
				}
				else if ( scene ) { this.sceneStack[ 0 ] = scene ; }
			}
		}
	} ) ;
	
	self.onChat = AdventureCtx.onChat.bind( self ) ;
	self.onAction = AdventureCtx.onAction.bind( self ) ;
	
	Ngev.groupOn( self.roles , 'chat' , self.onChat ) ;
	Ngev.groupOn( self.roles , 'action' , self.onAction ) ;
	
	return self ;
} ;



AdventureCtx.prototype.destroy = function destroy()
{
	Ngev.groupOff( this.roles , 'chat' , this.onChat ) ;
	Ngev.groupOff( this.roles , 'action' , this.onAction ) ;
} ;



AdventureCtx.onChat = function onChat( role , message )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onChat( this.book , this , role , message ) ;
} ;



AdventureCtx.onAction = function onAction( role , actionData )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onAction( this.book , this , role , actionData ) ;
} ;


