/*
	Spellcast

	Copyright (c) 2014 - 2021 Cédric Ronvel

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



const Ngev = require( 'nextgen-events' ) ;
const path = require( 'path' ) ;
const serverKit = require( 'server-kit' ) ;
const exm = require( './exm.js' ) ;
const httpFiles = require( './httpFiles.js' ) ;
const Client = require( './Client.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function WsServer( book , options ) {
	Object.defineProperties( this , {
		book: { value: book , enumerable: true } ,
		server: { value: null , writable: true , enumerable: true } ,
		port: { value: typeof options.port === 'number' ? options.port : 57311 , enumerable: true } ,
		acceptTokens: { value: {} , enumerable: true } ,
		hasHttp: { value: !! options.httpStaticPath , writable: true , enumerable: true } ,
		httpStaticPath: { value: options.httpStaticPath , writable: true , enumerable: true } ,
		httpRouter: { value: null , writable: true , enumerable: true } ,
		speechProxyConfig: { value: options.speechProxyConfig || null , writable: true , enumerable: true } ,
		exitOnDisconnect: { value: options.exitOnDisconnect , writable: true , enumerable: true } ,
		started: { value: false , writable: true , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true }
	} ) ;

	if ( Array.isArray( options.tokens ) ) { options.tokens.forEach( t => this.acceptTokens[ t ] = true ) ; }

	// /!\ !!! Temporary hack: force a 500ms delay before closing the app, so few last messages can be sent !!! /!\
	process.on( 'asyncExit' , ( code , timeout , callback ) => setTimeout( callback , 500 ) ) ;
}

module.exports = WsServer ;



WsServer.prototype.start = function() {
	if ( this.started ) { return ; }
	if ( this.hasHttp ) { this.createRouter() ; }
	this.createWebSocketServer() ;
	this.started = true ;
} ;



WsServer.prototype.destroy = function() {
	if ( ! this.started || this.destroyed ) { return ; }
	this.server.close() ;

	if ( typeof this.exitOnDisconnect === 'function' ) {
		this.exitOnDisconnect() ;
	}

	this.destroyed = true ;
} ;



WsServer.prototype.createRouter = function() {
	var name ,
		extensionRoutes = {} ,
		rootPath = httpFiles.routes['.'] ,
		builtinMediaPath = path.join( path.dirname( __dirname ) , 'media' ) ,
		builtinMediaRouter = new serverKit.FileRouter( builtinMediaPath , { includePreviousPart: true } ) ;

	// Add a router for all extensions, e.g. for extension "3dgws", the path will be /ext/3dgws/
	for ( name in httpFiles.routes ) {
		if ( name === '.' || name === '/' ) { continue ; }
		extensionRoutes[ name ] = new serverKit.FileRouter( httpFiles.routes[ name ] ) ;
	}

	this.httpRouter = new serverKit.Router( {
		'/': new serverKit.File( rootPath + '/app.html' ) ,
		script: new serverKit.FileRouter( this.httpStaticPath ) ,
		speech: this.speechProxyConfig ? new serverKit.HttpProxy( this.speechProxyConfig ) : null ,

		// builtin media
		backgrounds: builtinMediaRouter ,
		boxes: builtinMediaRouter ,
		fonts: builtinMediaRouter ,
		icons: builtinMediaRouter ,
		logo: builtinMediaRouter ,
		musics: builtinMediaRouter ,
		sounds: builtinMediaRouter ,
		sprites: builtinMediaRouter ,
		textures: builtinMediaRouter ,

		// Extensions
		ext: new serverKit.Router( extensionRoutes ) ,

		// Any other things are root
		'.': new serverKit.FileRouter( rootPath ) ,
	} ) ;
} ;



WsServer.prototype.createWebSocketServer = function() {
	var token ;

	this.server = new serverKit.Server(
		{
			port: this.port ,
			ws: true ,
			http: this.hasHttp ,
			verbose: true ,
			catchErrors: false
		} ,
		client => {
			if ( client.type === 'http' && this.hasHttp ) {
				/*
				// Auth for HTTP content?
				token = client.path.split( '/' ).slice( 1 ).unshift() ;
				log.info( 'HTTP client token: %s' , token ) ;

				if ( ! this.acceptTokens[ token ] ) {
					console.log( 'HTTP client rejected: token not authorized' ) ;
					client.response.writeHeader( 403 ) ;
					client.response.end() ;
					return ;
				}
				*/

				if ( client.method === 'OPTIONS' ) { this.cors( client ) ; }
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
	var appClient ;
	var token = client.request.url.slice( 1 ) ;

	log.info( 'Client connected: %s' , token ) ;

	if ( this.book.clients.getToken( token ) ) {
		log.warning( 'Client rejected: token already connected' ) ;
		client.websocket.close() ;
		return ;
	}

	if ( ! this.acceptTokens[ token ] ) {
		log.warning( 'Client rejected: token not authorized' ) ;
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
		log.warning( 'Client rejected: not enough roles' ) ;
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
		
		if ( this.exitOnDisconnect && ! this.book.clients.length ) {
			this.destroy() ;
		}
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
	log.hdebug( "OPTIONS (CORS) for %s" , client.path ) ;

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

