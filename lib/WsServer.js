/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const Client = require( './Client.js' ) ;
const serverKit = require( 'server-kit' ) ;
const Ngev = require( 'nextgen-events' ) ;
const path = require( 'path' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function WsServer( book , options ) {
	Object.defineProperties( this , {
		book: { value: book , enumerable: true } ,
		port: { value: typeof options.port === 'number' ? options.port : 57311 , enumerable: true } ,
		acceptTokens: { value: {} , enumerable: true } ,
		hasHttp: { value: !! options.httpStaticPath , writable: true , enumerable: true } ,
		httpStaticPath: { value: options.httpStaticPath , writable: true , enumerable: true } ,
		httpRouter: { value: null , writable: true , enumerable: true } ,
		started: { value: false , writable: true , enumerable: true }
	} ) ;

	if ( Array.isArray( options.tokens ) ) { options.tokens.forEach( t => this.acceptTokens[ t ] = true ) ; }

	if ( this.httpStaticPath ) { this.createRouter() ; }

	// /!\ !!! Temporary hack: force a 500ms delay before closing the app, so few last messages can be sent !!! /!\
	process.on( 'asyncExit' , ( code , timeout , callback ) => setTimeout( callback , 500 ) ) ;
}

module.exports = WsServer ;



// For backward compatibility
WsServer.create = ( ... args ) => new WsServer( ... args ) ;



WsServer.prototype.start = function() {
	if ( this.started ) { return ; }
	this.createWebSocketServer() ;
} ;



WsServer.prototype.createRouter = function() {
	var browserPath = path.dirname( __dirname ) + '/browser' ;

	this.httpRouter = new serverKit.Router( {
		script: new serverKit.FileRouter( this.httpStaticPath ) ,
		'/': new serverKit.File( browserPath + '/app.html' ) ,
		'.': new serverKit.FileRouter( browserPath )
	} ) ;
} ;



WsServer.prototype.createWebSocketServer = function() {
	var token ;

	new serverKit.Server( {
		port: this.port ,
		ws: true ,
		http: this.httpStaticPath ,
		verbose: true ,
		catchErrors: false
	} , ( client ) => {

		if ( client.type === 'http' && this.hasHttp ) {
			// Auth for HTTP content

			/*
				token = client.path.split( '/' ).slice( 1 ).unshift() ;

				log.info( 'HTTP client token: %s' , token ) ;

				if ( ! this.acceptTokens[ token ] )
				{
					console.log( 'HTTP client rejected: token not authorized' ) ;
					client.response.writeHeader( 403 ) ;
					client.response.end() ;
					return ;
				}
				*/

			if ( client.request.method === 'OPTIONS' ) { this.cors( client ) ; }
			else { this.httpRouter.handle( client ) ; }
		}
		else if ( client.type === 'http.upgrade' && this.hasHttp ) {
			// This happens only when a http+ws server is created.
			// Accept all websocket connection, it will be filtered out in .wsClientHandler() if it needs.
			client.response.accept( true ) ;
		}
		else if ( client.type === 'ws' ) {
			this.wsClientHandler( client ) ;
		}
		else {
			client.response.writeHeader( 400 ) ;
			client.response.end( "This server does not handle " + client.type ) ;
			return ;
		}
	}
	) ;
} ;



WsServer.prototype.wsClientHandler = function( client ) {
	//log.info( 'client connected: %I' , websocket ) ;

	var appClient ;
	var token = client.request.url.slice( 1 ) ;

	log.info( 'Client connected: %s' , token ) ;

	if ( this.book.clients.getToken( token ) ) {
		log.warning( 'Client rejected: token already connected' ) ;
		client.websocket.close() ;
		return ;
	}

	if ( ! this.acceptTokens[ token ] ) {
		console.log( 'Client rejected: token not authorized' ) ;
		client.websocket.close() ;
		return ;
	}


	// Add the current websocket to the list of clients
	appClient = new Client( {
		token: token ,
		book: this.book ,
		connection: client.websocket
	} ) ;

	if ( ! this.book.addClient( appClient ) ) {
		console.log( 'Client rejected: not enough roles' ) ;
		appClient.closeConnection() ;
		return ;
	}

	//log.warning( this.book.clients ) ;

	var proxy = new Ngev.Proxy() ;

	// Add the local services and grant listen rights
	proxy.addLocalService( 'bus' , appClient , {
		emit: true , listen: true , ack: true
	} ) ;

	client.websocket.on( 'message' , ( message ) => {

		//console.log('received: %s', message ) ;

		try {
			message = JSON.parse( message ) ;
		}
		catch ( error ) {
			console.error( 'Parse error (client data): ' + error ) ;
			return ;
		}

		//log.info( 'Received message: %I' , message ) ;
		proxy.receive( message ) ;
	} ) ;

	// Define the send method
	proxy.send = ( message ) => {
		//log.info( 'Sending: %I' , message ) ;

		client.websocket.send( JSON.stringify( message ) ) ;
	} ;

	var cleaned = false ;

	// Clean up after everything is done
	var cleanup = () => {
		if ( cleaned ) { return ; }
		cleaned = true ;
		log.info( 'Client %s closed' , token ) ;
		proxy.destroy() ;
		this.book.removeClient( appClient ) ;
		appClient = null ;
	} ;

	// Clean up after everything is done
	client.websocket.on( 'close' , cleanup ) ;
	client.websocket.on( 'end' , cleanup ) ;

	client.websocket.on( 'error' , ( error ) => {
		log.info( 'Client %s error: %E' , token , error ) ;
		// What should be done here?
	} ) ;
} ;



// Manage CORS on OPTIONS request
WsServer.prototype.cors = function( client ) {
	// Allowed website
	client.response.setHeader( 'Access-Control-Allow-Origin' , '*' ) ;

	// Allowed methods
	client.response.setHeader( 'Access-Control-Allow-Methods' , 'GET, POST, OPTIONS' ) ;

	// Allowed headers
	client.response.setHeader( 'Access-Control-Allow-Headers' , 'Content-Type' ) ;

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	//client.response.setHeader( 'Access-Control-Allow-Credentials' , true ) ;

	client.response.end() ;
} ;

