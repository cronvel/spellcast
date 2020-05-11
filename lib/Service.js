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



const StoryBook = require( './StoryBook.js' ) ;
const Client = require( './Client.js' ) ;

const serverKit = require( 'server-kit' ) ;
const hash = require( 'hash-kit' ) ;
const Ngev = require( 'nextgen-events' ) ;

const path = require( 'path' ) ;
const fsKit = require( 'fs-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;

function noop() {}



function Service( serviceOptions , bookOptions ) {
	// Force the story mode, do not let remote user cast anything!
	bookOptions.type = 'story' ;

	this.port = typeof serviceOptions.port === 'number' ? serviceOptions.port : 57311 ;
	this.basePath = serviceOptions.basePath ;	// path in the filesystem
	this.hostname = serviceOptions.hostname ;
	this.path = serviceOptions.path ;	// path exposed
	this.bookOptions = bookOptions || {} ;
	this.availableBooks = {} ;
	this.bookInstances = {} ;
	this.started = false ;

	// Enforce trailing slash
	if ( this.path[ this.path.length - 1 ] !== '/' ) {
		this.path += '/' ;
	}
}

module.exports = Service ;



Service.prototype.start = async function() {
	if ( this.started ) { return ; }

	var directories = await fsKit.readdir( this.basePath , { directories: true , files: false , slash: false } ) ;
	//console.log( "Directories:" , directories ) ;

	directories.forEach( name => this.createBookData( name ) ) ;
	this.createServer() ;
} ;



Service.prototype.createBookData = function( name ) {
	this.availableBooks[ name ] = {
		name: name ,
		mediaRouter: this.createRouter( name )
	} ;
} ;



Service.prototype.createServer = function() {
	var match , bookId , bookInstanceId , mediaPath ;
	log.info( "Service: %Y" , this ) ;

	new serverKit.Server( {
		port: this.port ,
		ws: true ,
		http: true ,
		verbose: true ,
		catchErrors: false
	} , client => {

		// Garbage connection, just kill it
		if ( client.hostname !== this.hostname ) { return this.drop( client ) ; }

		// OPTIONS = CORS
		if ( client.type === 'http' && client.request.method === 'OPTIONS' ) { return this.cors( client ) ; }

		// The request point to a non-supported path
		if ( client.path.length < this.path.length || ! client.path.startsWith( this.path ) ) {
			return this.badPath( client , "bad root path" ) ;
		}

		// /!\ !!!Use client.pathPart instead!!! /!\
		//this.path has a trailing slash
		match = client.path.slice( this.path.length ).match( /^(?:([^/]+)(?:\/([^/]+)((?:\/[^/~]+)*))?)?\/?$/ ) ;

		if ( ! match ) { return this.badPath( client , "bad path scheme" ) ; }

		bookId = match[ 1 ] ;
		bookInstanceId = match[ 2 ] ;
		mediaPath = match[ 3 ] ;

		log.debug( "New client -- bookId: %s - bookInstanceId: %s - mediaPath: %s" , bookId , bookInstanceId , mediaPath ) ;

		if ( ! bookId ) {
			if ( client.type !== 'http' ) { return this.badPath( client , "Nothing found for this protocol+path combo" ) ; }

			if ( client.request.method === 'GET' ) {
				return this.httpBookList( client ) ;
			}

			return this.badPath( client , "Nothing found for this method+path combo" ) ;
		}

		if ( ! this.availableBooks[ bookId ] ) { return this.badPath( client , "book not found" ) ; }

		if ( ! bookInstanceId ) {
			if ( client.type !== 'http' ) { return this.badPath( client , "Nothing found for this protocol+path combo" ) ; }

			if ( client.request.method === 'POST' ) {
				// POSTing here create a new book instance
				return this.httpCreateBook( client , bookId ) ;
			}

			if ( client.request.method === 'GET' ) {
				return this.httpBookInfo( client , bookId ) ;
			}

			return this.badPath( client , "Nothing found for this method+path combo" ) ;
		}

		if ( ! this.bookInstances[ bookInstanceId ] || this.bookInstances[ bookInstanceId ].id !== bookId ) {
			// Bad bookInstanceId or unmatching bookInstanceId-bookId
			return this.badPath( client , "instance not found" ) ;
		}

		if ( client.type === 'http' ) {
			// So we are trying to get media/CSS content
			return this.httpMedia( client , this.availableBooks[ bookId ] , mediaPath ) ;
		}

		if ( client.type === 'http.upgrade' ) {
			// Happens in http+ws server context
			return this.httpConnectBook( client , this.bookInstances[ bookInstanceId ] ) ;
		}

		if ( client.type === 'ws' ) {
			return this.wsConnectBook( client , this.bookInstances[ bookInstanceId ] ) ;
		}

		// Not supported type... drop it!
		return this.drop( client ) ;
	} ) ;
} ;



Service.prototype.createInstanceId = function() {
	var id ;

	do {
		id = hash.tinyId() ;
	} while ( this.bookInstances[ id ] ) ;

	return id ;
} ;



// Simple webpage, just for debugging purpose
Service.prototype.httpBookList = function( client ) {
	log.debug( "httpBookList" ) ;

	var html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf8" />\n<title>Spellcast! book list</title>\n</head>\n<body>\n' ;

	html += '<form>\n' ;

	Object.keys( this.availableBooks ).forEach( bookName => {
		html += '<button type="submit" formmethod="post" formaction="/' + bookName + '">' + bookName + '</button><br />' ;
	} ) ;

	html += '</form>\n' ;

	html += '</body>\n</html>\n' ;
	client.response.end( html ) ;
} ;



// Simple webpage, just for debugging purpose
Service.prototype.httpBookInfo = function( client , bookId ) {
	log.debug( "httpBookInfo" ) ;
	client.response.end( 'TODO...' ) ;
} ;



Service.prototype.httpCreateBook = async function( client , bookId ) {
	var accepted ;

	log.debug( "httpCreateBook" ) ;

	if ( client.request.headers.accept ) {
		accepted = client.request.headers.accept.split( ';' )[ 0 ].split( ',' ) ;
	}
	else {
		accepted = [] ;
	}

	var createBookStart = Date.now() ;

	var requestedId = client.request.headers['debug-id'] ;	// For debug purpose, but does not harm anyway
	var instanceId = requestedId && ! this.bookInstances[ requestedId ] ? requestedId : this.createInstanceId() ;

	var bookOptions = Object.assign( {} , this.bookOptions , { id: bookId , iid: instanceId } ) ;

	try {
		var book = await StoryBook.load( this.basePath + '/' + bookId + '/book' , bookOptions ) ;
	}
	catch ( error ) {
		// If this book does not work, just remove it from available books
		this.availableBooks[ bookId ] = null ;
		return this.badBook( client , error ) ;
	}

	// Add this to the running instances
	this.bookInstances[ instanceId ] = book ;

	log.info( "Loaded book (%s-%s)" , bookId , instanceId ) ;

	// TMP
	var stateFile = null ;

	try {
		// Init the book
		await book.initBook( stateFile ) ;
	}
	catch ( initError ) {
		this.cleanUp( book , initError ) ;
		return this.badBook( client , initError ) ;
	}

	log.info( "Book init finished after %fms (%s-%s)" , Date.now() - createBookStart , bookId , instanceId ) ;

	// The client request ENDS HERE
	var location = this.path + bookId + '/' + instanceId + '/' ;
	client.response.setHeader( 'Location' , location ) ;

	if ( accepted.includes( 'text/html' ) ) {
		// If the client accept HTML, it is probably a browser, redirect it to the resource
		client.response.writeHeader( 302 ) ;
	}
	else {
		// Else, it is a webservice, return a 201 Created and JSON
		client.response.writeHeader( 201 ) ;
		client.response.write( JSON.stringify( { location: location } ) ) ;
	}

	client.response.end() ;

	try {
		await book.assignRoles() ;
	}
	catch ( assignError ) {
		this.cleanUp( book , assignError ) ;
		return ;
	}

	Ngev.groupOnceLast( book.clients , 'ready' , async () => {
		try {
			if ( stateFile ) {
				await book.resumeState() ;
			}
			else {
				await book.startStory() ;
			}
		}
		catch ( bookError ) {
			this.cleanUp( book , bookError ) ;
			return ;
		}

		this.cleanUp( book ) ;
	} ) ;
} ;



Service.prototype.httpConnectBook = function( client , book ) {
	// For instance, there is no specific things to do here
	// Everything is checked upfront, so just accept it right now
	client.response.accept( true ) ;
} ;



Service.prototype.wsConnectBook = function( client , book ) {
	// Should we have something to check that the same browser/client is not connecting multiple times?

	// Add the current websocket to the list of clients
	var appClient = new Client( {
		//token: token ,
		book: book ,
		connection: client.websocket
	} ) ;

	if ( ! book.addClient( appClient ) ) {
		log.verbose( 'Client rejected: not enough roles' ) ;
		client.websocket.close() ;
		return ;
	}

	//log.warning( book.clients ) ;

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
			log.verbose( 'Parse error (client data): ' + error ) ;
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
	var cleanUp = () => {
		if ( cleaned ) { return ; }
		cleaned = true ;
		log.info( 'Client %s closed' , appClient.id ) ;
		proxy.destroy() ;
		book.removeClient( appClient ) ;
		appClient = null ;
	} ;

	// Clean up after everything is done
	client.websocket.on( 'close' , cleanUp ) ;
	client.websocket.on( 'end' , cleanUp ) ;

	client.websocket.on( 'error' , ( error ) => {
		log.info( 'Client %s error: %E' , appClient.id , error ) ;
		// What should be done here?
	} ) ;
} ;



Service.prototype.httpMedia = function( client , bookData , mediaPath ) {
	bookData.mediaRouter.handle( client ) ;
} ;



Service.prototype.createRouter = function( name ) {
	var scriptDir = this.basePath + '/' + name ;
	var browserDir = path.dirname( __dirname ) + '/browser' ;

	// Would be faster to hack client.walkIndex (rather clean, faster) to the correct value,
	// or to rewrite client.path (dirty, fastest)

	return new serverKit.BaseRouter( this.path + '/' + name , {
		"*": {
			script: new serverKit.FileRouter( scriptDir ) ,
			'/': new serverKit.File( browserDir + '/app.html' ) ,
			'.': new serverKit.FileRouter( browserDir )
		}
	} ) ;
} ;



// Manage CORS on OPTIONS request
Service.prototype.cors = function( client ) {
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



// Clean-up a book, whether it ends up or it crashes
Service.prototype.cleanUp = function( book , error ) {
	var triggered = false ;

	if ( error ) {
		log.error( "Book %s-%s crashed with error %E" , book.id , book.iid , error ) ;
	}

	var finishCleanUp = () => {
		if ( triggered ) { return ; }
		triggered = true ;
		log.info( "Book %s-%s finished" , book.id , book.iid ) ;
		delete this.bookInstances[ book.iid ] ;
		book.destroy() ;
	} ;

	// Wait for at most 500ms before destroying the book
	book.emitToClients( 'exit' , error ? 1 : 0 , 500 , finishCleanUp ) ;
	setTimeout( finishCleanUp , 500 ) ;
} ;



// 404-like, but most probably due to a messing client
Service.prototype.badPath = function( client , message = '' ) {
	log.verbose( 'Bad path!' , client.path , this.path , message ) ;

	if ( client.type === 'http' || client.type === 'http.upgrade' ) {
		if ( message ) { client.response.setHeader( 'Error' , '' + message ) ; }

		client.response.writeHeader( 404 ) ;
		client.response.end() ;
	}
	else {
		this.drop( client ) ;
	}
} ;



// Unexpected, due to a back-end issue or a bad book
Service.prototype.badBook = function( client , message = '' ) {
	log.verbose( 'Bad book!' , client.path , this.path , message ) ;

	if ( client.type === 'http' || client.type === 'http.upgrade' ) {
		if ( message ) { client.response.setHeader( 'Error' , '' + message ) ; }

		client.response.writeHeader( 400 ) ;
		client.response.end() ;
	}
	else {
		this.drop( client ) ;
	}
} ;



// Drop a connection
Service.prototype.drop = function( client ) {
	log.verbose( 'Drop client!' , client.hostname , this.hostname ) ;
	client.socket.end() ;
} ;

