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
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function AdventureExecContext() { throw new Error( 'Use AdventureExecContext.create() instead.' ) ; }
//AdventureExecContext.prototype = Object.create( Ngev.prototype ) ;
//AdventureExecContext.prototype.constructor = AdventureExecContext ;

module.exports = AdventureExecContext ;



AdventureExecContext.create = function create( book , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	var self = Object.create( AdventureExecContext.prototype , {
		
		book: { value: book , enumerable: true } ,
		parent: { value: options.parent || null , writable: true , enumerable: true } ,
		active: { value: options.active !== undefined ? options.active : true , writable: true , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true } ,
		nexts: { value: options.nexts || [] , writable: true , enumerable: true } ,
		roles: { value: options.roles || book.roles , writable: true , enumerable: true } ,
		
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

		sceneStack: { value: options.sceneStack || [] , writable: true , enumerable: true } ,
		
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
	
	self.onChat = AdventureExecContext.onChat.bind( self ) ;
	self.onAction = AdventureExecContext.onAction.bind( self ) ;
	
	Ngev.groupOn( self.roles , 'chat' , self.onChat ) ;
	Ngev.groupOn( self.roles , 'action' , self.onAction ) ;
	
	return self ;
} ;



AdventureExecContext.prototype.destroy = function destroy()
{
	Ngev.groupOff( this.roles , 'chat' , this.onChat ) ;
	Ngev.groupOff( this.roles , 'action' , this.onAction ) ;
} ;



AdventureExecContext.onChat = function onChat( role , message )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onChat( this.book , this , role , message ) ;
} ;



AdventureExecContext.onAction = function onAction( role , actionData )
{
	if ( ! this.active ) { return ; }
	this.activeScene.onAction( this.book , this , role , actionData ) ;
} ;


