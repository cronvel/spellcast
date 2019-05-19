/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



var url = require( 'url' ) ;
var WebSocket = require( 'ws' ) ;
var Ngev = require( 'nextgen-events' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function WsClient( url_ ) {
	this.url = url_ ;
	this.ws = null ;
	this.proxy = null ;
	this.user = null ;
}

module.exports = WsClient ;



// For backward compatibility
WsClient.create = ( ... args ) => new WsClient( ... args ) ;



WsClient.prototype.run = function run( callback ) {
	this.proxy = new Ngev.Proxy() ;

	var parsed = url.parse( this.url ) ;

	// Set the default port
	if ( ! parsed.port ) { parsed.port = 57311 ; }

	// rebuild the url
	this.url = url.format( parsed ) ;

	this.ws = new WebSocket( this.url ) ;

	this.ws.on( 'open' , () => {

		// Add the remote services
		this.proxy.addRemoteService( 'bus' ) ;

		// Send 'ready' to server?
		// No, let the UI send it.
		//this.proxy.remoteServices.bookInput.emit( 'ready' ) ;

		log.debug( 'Connected to server!' ) ;

		if ( typeof callback === 'function' ) { callback() ; }
	} ) ;

	this.ws.on( 'message' , ( message ) => {

		try {
			message = JSON.parse( message ) ;
		}
		catch ( error ) {
			console.error( 'Parse error (server data): ' + error ) ;
			return ;
		}

		log.debug( 'Received message: %I' , message ) ;
		this.proxy.receive( message ) ;
	} ) ;

	// Define the send method
	this.proxy.send = ( message ) => {
		this.ws.send( JSON.stringify( message ) ) ;
	} ;

	// Clean up after everything is done
	this.ws.on( 'close' , () => {
		this.proxy.destroy() ;
		log.debug( 'Websocket closed!' ) ;
	} ) ;

	this.ws.on( 'error' , ( error ) => {
		log.info( 'Websocket error: %E' , error ) ;
		// What should be done here?
	} ) ;
} ;



WsClient.prototype.authenticate = function authenticate( data ) {
	if ( ! data || typeof data !== 'object' || Array.isArray( data ) ) { return ; }
	this.proxy.remoteServices.bus.emit( 'authenticate' , data ) ;
} ;


