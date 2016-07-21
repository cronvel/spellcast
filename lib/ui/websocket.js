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



var ws = require( 'ws' ) ;
var NextGenEvents = require( 'nextgen-events' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function UI( book , self )
{
	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			book: { value: book , enumerable: true } ,
			ws: { value: {} , enumerable: true } ,
		} ) ;
	}
	
	self.createWebSocketServer( 57311 ) ;
	
	
	// /!\ !!! Temporary hack !!! /!\
	book.on( 'exit' , {
		async: true ,
		fn: function( code , timeout , callback ) {
			setTimeout( callback , 500 ) ;
		}
	} ) ;
	
	return self ;
}

module.exports = UI ;



UI.prototype.createWebSocketServer = function createWebSocketServer( port )
{
	var self = this ;
	
	var server = new ws.Server( { port: port } ) ;
	
	server.on( 'connection' , function connection( websocket ) {
		
		//log.info( 'client connected: %I' , websocket ) ;
		
		var token = websocket.upgradeReq.url.slice( 1 ) ;
		
		log.info( 'Client connected: %s' , token ) ;
		
		if ( self.ws[ token ] )
		{
			log.warning( 'Client rejected: token already connected' ) ;
			websocket.close() ;
			return ;
		}
		
		if ( self.book.acceptTokens )
		{
			if ( ! self.book.acceptTokens[ token ] )
			{
				console.log( 'Client rejected: token not authorized' ) ;
				websocket.close() ;
				return ;
			}
			
			delete self.book.acceptTokens[ token ] ;
		}
		
		// Add the current websocket to the list of clients
		self.ws[ token ] = websocket ;
		
		var proxy = new NextGenEvents.Proxy() ;
		
		// Add the local service and grant listen rights
		proxy.addLocalService( 'book' , self.book , { listen: true , ack: true } ) ;
		proxy.addLocalService( 'bookInput' , self.book.input , { emit: true , ack: true } ) ;

		websocket.on( 'message' , function incoming( message ) {
			
			//console.log('received: %s', message ) ;
			
			try {
				message = JSON.parse( message ) ;
				//cli.restorePrototype( message.args ) ;
			}
			catch ( error ) {
				console.error( 'Parse error (client data): ' + error ) ;
				return ;
			}
			
			log.info( 'Received message: %I' , message ) ;
			proxy.receive( message ) ;
			
			//console.log( [ message.event ].concat( message.args ) ) ;
			
			/*
			if ( message.event === 'exit' )
			{
				console.log( 'exit event!!!' ) ;
				self.book.input.emit( 'exit' , function() {
					console.log( 'wsClientExit event!!!' ) ;
					book.emit( 'clientExit' ) ;
				} ) ;
			}
			*/
			
			//self.book.input.emit.apply( self.book.input , [ message.event ].concat( message.args ) ) ;
		} ) ;
		
		// Define the send method
		proxy.send = function send( message ) {
			websocket.send( JSON.stringify( message ) ) ;
		} ;
		
		// Clean up after everything is done
		websocket.on( 'close' , function close() {
			proxy.destroy() ;
		} ) ;

	} ) ;
} ;


