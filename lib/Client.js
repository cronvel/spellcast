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



function Client() { throw new Error( 'Use Client.create() instead.' ) ; }
Client.prototype = Object.create( Ngev.prototype ) ;
Client.prototype.constructor = Client ;

module.exports = Client ;



var nextId = 0 ;



Client.create = function create( token , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	var self = Object.create( Client.prototype , {
		id: { value: nextId ++ , enumerable: true } ,
		token: { value: token , enumerable: true } ,
		name: { value: options.name || '(undefined)' , writable: true , enumerable: true } ,
		role: { value: null , writable: true , enumerable: true } ,
		user: { value: null , writable: true , enumerable: true } ,
		userName: { value: '#' + id , writable: true , enumerable: true } ,
		connection: { value: options.connection || null , writable: true , enumerable: true }
	} ) ;
	
	Object.defineProperties( self , {
		onUser: { value: Client.onUser.bind( self ) } ,
	} ) ;
	
	self.defineStates( 'ready' ) ;
	self.defineStates( 'user' ) ;
	self.defineStates( 'roleList' ) ;
	self.defineStates( 'end' ) ;
	
	self.on( 'authenticate' , self.onAuthenticate ) ;
	
	return self ;
} ;



// /!\ WARNING: client emitter is owned by the real client, do not trust it!
Client.onAuthenticate = function onAuthenticate( data )
{
	this.user = user ;
	this.userName = user.name ||
		( user.login && '@' + user.login ) ||
		( user.id && '@' + user.id ) ||
		'#' + this.id ;
} ;


