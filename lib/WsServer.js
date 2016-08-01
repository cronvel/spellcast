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



var Client = require( './Client.js' ) ;
var WebSocket = require( 'ws' ) ;
var Ngev = require( 'nextgen-events' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function WsServer() { throw new Error( 'Use WsServer.create() instead.' ) ; }
module.exports = WsServer ;



WsServer.create = function create( book , options )
{
	if ( ! options.port || typeof options.port !== 'number' ) { options.port = 57311 ; }
	
	var self = Object.create( WsServer.prototype , {
		book: { value: book , enumerable: true } ,
		acceptTokens: { value: {} , enumerable: true }
	} ) ;
	
	if ( Array.isArray( options.tokens ) ) { options.tokens.forEach( t => self.acceptTokens[ t ] = true ) ; }
	
	self.createWebSocketServer( options.port ) ;
	
	// /!\ !!! Temporary hack: force a 500ms delay before closing the app, so message can be sent !!! /!\
	book.on( 'exit' , {
		async: true ,
		fn: function( code , timeout , callback ) {
			setTimeout( callback , 500 ) ;
		}
	} ) ;
	
	return self ;
} ;



WsServer.prototype.createWebSocketServer = function createWebSocketServer( port )
{
	var self = this ;
	
	var server = new WebSocket.Server( { port: port } ) ;
	
	server.on( 'connection' , function connection( websocket ) {
		
		//log.info( 'client connected: %I' , websocket ) ;
		
		var client ;
		var token = websocket.upgradeReq.url.slice( 1 ) ;
		
		log.info( 'Client connected: %s' , token ) ;
		
		if ( self.book.clients.get( token ) )
		{
			log.warning( 'Client rejected: token already connected' ) ;
			websocket.close() ;
			return ;
		}
		
		if ( ! self.acceptTokens[ token ] )
		{
			console.log( 'Client rejected: token not authorized' ) ;
			websocket.close() ;
			return ;
		}
		
		
		// Add the current websocket to the list of clients
		client = Client.create( token , { connection: websocket } ) ;
		
		if ( ! self.book.addClient( client ) )
		{
			console.log( 'Client rejected: not enough roles' ) ;
			websocket.close() ;
			return ;
		}
		
		//log.warning( self.book.clients ) ;
		
		var proxy = new Ngev.Proxy() ;
		
		// Add the local services and grant listen rights
		proxy.addLocalService( 'bus' , client , { emit: true , listen: true , ack: true } ) ;

		websocket.on( 'message' , function incoming( message ) {
			
			//console.log('received: %s', message ) ;
			
			try {
				message = JSON.parse( message ) ;
			}
			catch ( error ) {
				console.error( 'Parse error (client data): ' + error ) ;
				return ;
			}
			
			log.info( 'Received message: %I' , message ) ;
			proxy.receive( message ) ;
		} ) ;
		
		// Define the send method
		proxy.send = function send( message ) {
			//log.warning( 'Sent: %s' , JSON.stringify( message ) ) ;
			websocket.send( JSON.stringify( message ) ) ;
		} ;
		
		// Clean up after everything is done
		websocket.on( 'close' , function close() {
			log.info( 'Client %s closed' , token ) ;
			proxy.destroy() ;
			self.book.removeClient( client ) ;
			client = null ;
		} ) ;

		websocket.on( 'error' , function( error ) {
			log.info( 'Client %s error: %E' , token , error ) ;
			// What should be done here?
		} ) ;

	} ) ;
} ;


