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



var serverKit = require( 'server-kit' ) ;
var Ngev = require( 'nextgen-events' ) ;
var Book = require( './StoryBook.js' ) ;

var path = require( 'path' ) ;
var fsKit = require( 'fs-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;

function noop() {}



function Service( serviceOptions , bookOptions ) {
	Object.defineProperties( this , {
		port: { value: typeof serviceOptions.port === 'number' ? serviceOptions.port : 57311 , enumerable: true } ,
		basePath: { value: serviceOptions.basePath , enumerable: true } ,
		serverDomain: { value: serviceOptions.serverDomain , writable: true , enumerable: true } ,
		serverBasePath: { value: serviceOptions.serverBasePath , writable: true , enumerable: true } ,
		bookOptions: { value: bookOptions || {} , writable: true , enumerable: true } ,
		availableBookIds: { value: {} , writable: true , enumerable: true } ,
		runningBooks: { value: {} , writable: true , enumerable: true } ,
		started: { value: false , writable: true , enumerable: true }
	} ) ;
	
	// Enforce trailing slash
	if ( this.serverBasePath[ this.serverBasePath.length - 1 ] !== '/' ) {
		this.serverBasePath += '/' ;
	}
} ;

module.exports = Service ;



Service.prototype.start = function start( callback = noop ) {
	if ( this.started ) { return ; }
	
	fsKit.readdir( this.basePath , { directories: true , files: false , slash: false } , ( error , directories ) => {
		if ( error ) { callback( error ) ; return ; }
		
		console.log( "Directories:" , directories ) ;
		directories.forEach( name => this.availableBookIds[ name ] = true ) ;
		
		this.createServer() ;
		callback() ;
	} ) ;
} ;



Service.prototype.createServer = function createServer() {
	var token , match , bookId , runningBookId , mediaPath ;
	console.log( this ) ;
	
	new serverKit.Server( {
		port: this.port ,
		ws: true ,
		http: true ,
		verbose: true ,
		catchErrors: false
	} , ( client ) => {
		
		// Garbage connection, just kill it
		if ( client.domain !== this.serverDomain ) { return this.drop( client ) ; }
		
		// OPTIONS = CORS
		if ( client.type === 'http' && client.request.method === 'OPTIONS' ) { return this.cors( client ) ; }
		
		// The request point to a non-supported path
		if ( client.path.length < this.serverBasePath.length || ! client.path.startsWith( this.serverBasePath ) ) {
			return this.badPath( client ) ;
		}
		
		//this.serverBasePath has a trailing slash
		match = client.path.slice( this.serverBasePath.length ).match( /^([^/]+)(?:\/([^/]+)((?:\/[^/~]+)*))?\/?$/ ) ;
		
		if ( ! match ) { return this.badPath( client ) ; }
		
		bookId = match[ 1 ] ;
		runningBookId = match[ 2 ] ;
		mediaPath = match[ 3 ] ;
		console.log( 'bookId:' , bookId , 'runningBookId:' , runningBookId , 'mediaPath:' , mediaPath ) ;
		
		if ( ! this.availableBookIds[ bookId ] ) { return this.badPath( client , "book not found" ) ; }
		
		if ( runningBookId ) {
			if ( ! this.runningBooks[ runningBookId ] || this.runningBooks[ runningBookId ].id !== bookId ) {
				// Bad runningBookId or unmatching runningBookId-bookId
				return this.badPath( client ) ;
			}
			
			if ( client.type === 'http' ) {
				// So we are trying to get media/CSS content
				
				// Bad mediaPath
				if ( ! mediaPath || mediaPath.indexOf( '..' ) !== -1 ) { return this.badPath( client ) ; }
				
				this.httpMedia( client , mediaPath ) ;
			}
			else if ( client.type === 'http.upgrade' ) {
				// Happens in http+ws server context
				this.httpConnectBook( client , this.runningBooks[ runningBookId ] ) ;
				//client.response.accept( true ) ;
			}
			else if ( client.type === 'ws' ) {
				this.wsConnectBook( client , this.runningBooks[ runningBookId ] ) ;
			}
			else {
				// Not supported type... drop it!
				return this.drop( client ) ;
			}
		}
		else {
			// This is a book creation, it should be a HTTP POST request
			if ( client.type !== 'http' || client.request.method !== 'POST' ) { return this.badPath( client , "Nothing found for this method+path combo" ) ; }
			
			this.httpCreateBook( client , bookId ) ;
		}
	} ) ;
} ;



Service.prototype.httpCreateBook = function httpCreateBook( client , bookId ) {
	console.log( "httpCreateBook" ) ;
	var book = Book.load( this.basePath + '/' + bookId + '/book' , this.bookOptions ) ;
	console.log( book ) ;
	client.response.end() ;
} ;



Service.prototype.wsConnectBook = function wsConnectBook( client , book ) {
	//log.info( 'client request: %I' , client ) ;

	log.info( 'Client connected on path: %s' , client.path ) ;

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
	appClient = Client.create( {
		token: token ,
		book: this.book ,
		connection: client.websocket
	} ) ;

	if ( ! this.book.addClient( appClient ) ) {
		console.log( 'Client rejected: not enough roles' ) ;
		client.websocket.close() ;
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
Service.prototype.cors = function cors( client ) {
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



// 404-like, but most probably due to a messing client
Service.prototype.badPath = function badPath( client , message = '' ) {
	var headers ;
	
	console.log( 'Bad path!' , client.path , this.serverBasePath , message ) ;
	
	if ( client.type === 'http' ) {
		headers = {} ;
		
		if ( message ) { headers.error = message ; }
		
		client.response.writeHeader( 404 , headers ) ;
		client.response.end() ;
	}
	else {
		this.drop( client ) ;
	}
} ;



Service.prototype.drop = function drop( client ) {
	console.log( 'Drop client!' , client.domain , this.serverDomain ) ;
	client.socket.end() ;
} ;



// Unexpected, due to a back-end issue or a bad book
Service.prototype.badBook = function badBook( client ) {
	console.log( 'Bad book!' , client.path , this.serverBasePath ) ;
	if ( client.type === 'http' ) {
		client.response.writeHeader( 400 ) ;
		client.response.end() ;
	}
	else {
		this.drop( client ) ;
	}
} ;














// Useful?


Service.prototype.createRouter = function createRouter() {
	// Root router
	this.httpRouter = serverKit.Router.create( 'mapRouter' ) ;
	this.httpRouter.setLocalRootPath( path.dirname( __dirname ) + '/browser' ) ;
	this.httpRouter.addStaticRoute( '/' , 'app.html' ) ;

	// /script sub-router, the sub-router for userland script assets
	var scriptRouter = serverKit.Router.create( 'simpleStaticRouter' ) ;
	scriptRouter.setLocalRootPath( this.httpStaticPath ) ;
	this.httpRouter.addRoute( /^\/script(?=\/)/ , scriptRouter.requestHandler ) ;

	// Create the sub-router for built-in assets
	var builtinRouter = serverKit.Router.create( 'simpleStaticRouter' ) ;
	builtinRouter.setLocalRootPath( __dirname + '/../browser/' ) ;
	builtinRouter.setIndexFile( 'app.html' ) ;
	// It works as a fallback sub-router
	this.httpRouter.addRoute( null , builtinRouter.requestHandler ) ;
} ;



Service.prototype.wsClientHandler = function wsClientHandler( client ) {
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
	appClient = Client.create( {
		token: token ,
		book: this.book ,
		connection: client.websocket
	} ) ;

	if ( ! this.book.addClient( appClient ) ) {
		console.log( 'Client rejected: not enough roles' ) ;
		client.websocket.close() ;
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



