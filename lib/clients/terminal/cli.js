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



var WsClient = require( '../../WsClient.js' ) ;

var path = require( 'path' ) ;

var async = require( 'async-kit' ) ;
var term = require( 'terminal-kit' ).terminal ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'spellcast-client' ) ;

var spellcastPackage = require( '../../../package.json' ) ;



function cli()
{
	var book , bookPath , client , clientOptions , hasConnected = false ;
	
	// Intro
	term.bold.magenta( 'Spellcast! Terminal client' ).dim( ' v%s by Cédric Ronvel\n' , spellcastPackage.version ) ;
	term.italic.brightBlack( "“Make: your own adventure!”\n\n" ) ;
	
	// Manage uncaughtException
	process.on( 'uncaughtException' , function( error ) {
		term.red( "uncaughtException: %E" , error ) ;
		throw error ;
	} ) ;
	
	// Parse command line arguments
	var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;
	
	if ( args.h || args.help || ! args._.length )
	{
		cli.usage() ;
		cli.exit( 0 ) ;
	}
	
	var url = args._[ 0 ] ;
	
	// Init Logfella logger
	var logLevel = 'info' ;
	
	if ( args.debug ) { logLevel = 'debug' ; }
	else if ( args.verbose ) { logLevel = 'verbose' ; }
	
	Logfella.global.setGlobalConfig( {
		minLevel: logLevel ,
		overrideConsole: true ,
		transports: [
			{ "type": "console" , "timeFormatter": "time" , "color": true } ,
		]
	} ) ;
	
	if ( ! args.ui ) { args.ui = 'classic' ; }
	
	
	client = WsClient.create( url ) ;
	
	client.run( function() {
		hasConnected = true ;
		term( '\n' ).bgBrightGreen.black( 'CONNECTED!' )( '\n\n\n\n' ) ;
		
		client.proxy.remoteServices.book.on( 'exit' , cli.exit ) ;
		
		if ( args.ui )
		{
			cli.createUI(
				client.proxy.remoteServices.book ,
				client.proxy.remoteServices.bookInput ,
				args.ui
			) ;
		}
	} ) ;
	
	client.ws.on( 'close' , function() {
		if ( hasConnected )
		{
			term( '\n\n' ).bgRed.black( 'Connection unexpectedly closed.' )( '\n\n' ) ;
		}
		else
		{
			term( '\n\n' ).bgRed.black( 'Cannot connect to server.' )( '\n\n' ) ;
		}
		
		cli.exit( 1 ) ;
	} ) ;
}

module.exports = cli ;



cli.usage = function usage()
{
	term.blue( 'Usage is: ' ).cyan( 'spellcast-client <url> [option1] [option2] [...]\n\n' ) ;
	term.blue( "Available options:\n" ) ;
	term.blue( "  --help , -h                Show this help\n" ) ;
	term.blue( "  --ui <name>                Set the UI to use\n" ) ;
	//term.blue( "  --token <token>            Use this token for the connection\n" ) ;
	term( "\n" ) ;
} ;



cli.createUI = function createUI( input , output , ui )
{
	try {
		if ( ui.indexOf( '/' ) === -1 && ui.indexOf( '.' ) === -1 )
		{
			// No slash and no dot: this is a built-in ui
			ui = '../../ui/' + ui + '.js' ;
		}
		else if ( ! path.isAbsolute( ui ) )
		{
			ui = process.cwd() + '/' + ui ;
		}
		
		require( ui )( input , output ) ;
	}
	catch ( error ) {
		// Continue on error, simply skip this ui
		console.error( "Error loading this UI:" , ui , error ) ;
	}
} ;



cli.exit = function exit( code )
{
	async.exit( code , 1000 ) ;
} ;


