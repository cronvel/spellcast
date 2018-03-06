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



var Ngev = require( 'nextgen-events' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Client() { throw new Error( 'Use Client.create() instead.' ) ; }
Client.prototype = Object.create( Ngev.prototype ) ;
Client.prototype.constructor = Client ;

module.exports = Client ;



var nextId = 0 ;



Client.create = function create( options ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var self = Object.create( Client.prototype , {
		id: { value: '' + nextId ++ , enumerable: true } ,
		token: { value: options.token , enumerable: true } ,
		local: { value: new Ngev() , enumerable: true } ,
		authenticated: { value: false , writable: true , enumerable: true } ,
		name: { value: options.name || '(undefined)' , writable: true , enumerable: true } ,
		role: { value: null , writable: true , enumerable: true } ,
		user: { value: {} , writable: true , enumerable: true } ,
		connection: { value: options.connection || null , writable: true , enumerable: true }
	} ) ;

	self.user.name = '#' + self.id ;

	self.defineStates( 'ready' ) ;
	self.defineStates( 'authenticated' ) ;
	self.defineStates( 'user' ) ;
	self.defineStates( 'userList' ) ;
	self.defineStates( 'roleList' ) ;
	self.defineStates( 'end' ) ;

	self.on( 'authenticate' , self.authenticate.bind( self ) , { id: self.authenticate } ) ;

	return self ;
} ;



// /!\ WARNING: client emitter is owned by the real client, do not trust it!
// This method is TOTALLY TEMP!
Client.prototype.authenticate = function authenticate( data ) {
	if ( this.authenticated ) { return ; }

	this.user = data ;
	this.user.id = this.id ;
	this.user.name = data.name ||
		( data.login && '@' + data.login ) ||
		( data.id && '_' + data.id ) ||
		'#' + this.id ;

	this.authenticated = true ;

	// Emit the user back to the client
	this.emit( 'user' , this.user ) ;

	this.local.emit( 'authenticated' ) ;
} ;


