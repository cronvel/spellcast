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

var nextId = 0 ;



function Client( options = {} ) {
	Object.defineProperties( this , {
		id: { value: '' + nextId ++ , enumerable: true } ,
		token: { value: options.token , enumerable: true } ,
		local: { value: new Ngev() , enumerable: true } ,
		authenticated: { value: false , writable: true , enumerable: true } ,
		name: { value: options.name || '(undefined)' , writable: true , enumerable: true } ,
		role: { value: null , writable: true , enumerable: true } ,
		user: { value: {} , writable: true , enumerable: true } ,
		connection: { value: options.connection || null , writable: true , enumerable: true }
	} ) ;

	this.user.name = '#' + this.id ;

	this.defineStates( 'ready' ) ;
	this.defineStates( 'authenticated' ) ;
	this.defineStates( 'user' ) ;
	this.defineStates( 'userList' ) ;
	this.defineStates( 'roleList' ) ;
	this.defineStates( 'end' ) ;

	this.on( 'authenticate' , this.authenticate.bind( this ) , { id: this.authenticate } ) ;
}

Client.prototype = Object.create( Ngev.prototype ) ;
Client.prototype.constructor = Client ;

module.exports = Client ;



// Backward compatibility
Client.create = ( ... args ) => new Client( ... args ) ;



Client.prototype.closeConnection = function closeConnection() {
	this.connection.close() ;
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


