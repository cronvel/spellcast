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



var cliStart = Date.now() ;

var Ngev = require( 'nextgen-events' ) ;

//var fs = require( 'fs' ) ;
var path = require( 'path' ) ;
var querystring = require( 'querystring' ) ;
var exec = require( 'child_process' ).exec ;

var Book = require( './Book.js' ) ;
var Client = require( './Client.js' ) ;

var async = require( 'async-kit' ) ;
//var tree = require( 'tree-kit' ) ;
var string = require( 'string-kit' ) ;
var term = require( 'terminal-kit' ).terminal ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'spellcast' ) ;

var spellcastPackage = require( '../package.json' ) ;



function cli()
{
	var book , bookPath , server , serverOptions ;
	
	// Intro
	term.bold.magenta( 'Spellcast!' ).dim( ' v%s by Cédric Ronvel\n' , spellcastPackage.version ) ;
	
	// Manage uncaughtException
	process.on( 'uncaughtException' , function( error ) {
		term.red( "uncaughtException: %E" , error ) ;
		throw error ;
	} ) ;
	
	// Manage command line arguments
	var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;
	
	if ( args.h || args.help )
	{
		cli.usage() ;
		cli.exit( 0 ) ;
	}
	
	// Set the spellbook path
	bookPath = args.book || 'spellbook' ;
	
	args.browser = args.browser || args.B ;
	
	if ( args.browser )
	{
		//args.ui = 'websocket' ;
		args['ws-server'] = true ;
	}
	
	if ( args.token && ! Array.isArray( args.token ) ) { args.token = [ args.token ] ; }
	
	if ( ! args.ui && ! args['ws-server'] ) { args.ui = 'classic' ; }
	
	
	// Load the book
	try {
		book = Book.load( bookPath ) ;
	}
	catch ( error ) {
		//throw error ;
		term( "^rCannot read the spellbook '^R^+^/%s^:^R. %s\n" , bookPath , error ) ;
		return ;
	}
	
	// Init Logfella logger
	var logLevel = 'info' ;
	var scriptLogLevel = 'info' ;
	
	if ( args.debug ) { logLevel = 'debug' ; }
	else if ( args.verbose ) { logLevel = 'verbose' ; }
	
	if ( args['script-debug'] ) { scriptLogLevel = 'debug' ; }
	else if ( args['script-verbose'] ) { scriptLogLevel = 'verbose' ; }
	
	Logfella.global.setGlobalConfig( {
		minLevel: logLevel ,
		overrideConsole: true ,
		transports: [
			{ "type": "console" , "timeFormatter": "time" , "color": true } ,
		]
	} ) ;
	
	Logfella.userland.setGlobalConfig( {
		minLevel: scriptLogLevel ,
		overrideConsole: true ,
		transports: [
			{ "type": "console" , "timeFormatter": "time" , "color": true } ,
		]
	} ) ;
	
	switch ( book.type )
	{
		case 'spellcaster' :
			term.italic.brightBlack( "“It's like 'make', but with a touch of Wizardry!”\n\n" ) ;
			break ;
		case 'adventurer' :
			term.italic.brightBlack( "“Make: your own adventure!”\n\n" ) ;
			break ;
		default:
			term.red( "Unsupported book type: %s.\n" , book.type ) ;
			cli.exit( 1 ) ;
	}
	
	
	book.data.options = args ;
	
	if ( args['locale-list'] )
	{
		term.yellow( "Available locales: %s\n\n" , book.getLocales() ) ;
		return cli.exit( 1 ) ;
	}
	
	if ( args.locale ) { book.setLocale( args.locale ) ; }
	
	// Init the book
	book.initBook( function( error ) {
		
		var addLocalClient = false ;
		
		log.debug( "Book init finished after %fms" , Date.now() - cliStart ) ;
		
		if ( error ) { term.red( "%E\n" , error ) ; cli.exit( 1 ) ; return ; }
		
		// Create a server?
		if ( args['ws-server'] )
		{
			serverOptions = {
				port: args['ws-server']
			} ;
			
			if ( args.token ) { serverOptions.tokens = args.token ; }
			
			server = cli.createWsServer( book , serverOptions ) ;
		}
		else
		{
			addLocalClient = true ;
		}
		
		book.assignRoles( function( error ) {
			
			if ( error ) { term.red( "%E\n" ) ; cli.exit( 1 ) ; return ; }
					
			switch ( book.type )
			{
				case 'spellcaster' :
					Ngev.groupGlobalOnceAll( book.clients , 'ready' , function() { cli.spellcaster( book , args ) ; } ) ;
					break ;
				
				case 'adventurer' :
					//console.log( book.clients ) ;
					//setTimeout( () => console.log( book.clients ) , 1000 ) ;
					Ngev.groupGlobalOnceAll( book.clients , 'ready' , function() { cli.adventurer( book , args ) ; } ) ;
					break ;
				
				default:
					term.red( "Unsupported book type: %s.\n" , book.type ) ;
					cli.exit( 1 ) ;
			}
		} ) ;
		
		// Local client should be added AFTER calling book.assignRoles(), or many event would be lost.
		if ( addLocalClient )
		{
			book.addClient( Client.create( { name: 'default' } ) ) ;
			
			// Instanciate a UI?
			if ( args.ui ) { cli.createUI( book.clients[ 0 ] , args.ui ) ; }
			
			// This must be done, or some events will be missing
			book.clients[ 0 ].authenticate( {} ) ;
		}
		
		// Open a browser?
		if ( args.browser )
		{
			cli.openBrowser( book , server , args.browser , args ) ;
		}
	} ) ;
}

module.exports = cli ;



cli.usage = function usage( noBaseline )
{
	if ( ! noBaseline ) { term.italic.brightBlack( "“It's like 'make', but with a touch of Wizardry!”\n\n" ) ; }
	
	term.blue( 'Usage is: ' ).cyan( 'spellcast [--book <book file>] <spell|summoning> [option1] [option2] [...]\n\n' ) ;
	term.blue( "Available options:\n" ) ;
	term.blue( "  --help , -h                Show this help\n" ) ;
	term.blue( "  --book <spellbook>         The magical book containing all spells and summonings (default: spellbook)\n" ) ;
	term.blue( "  --again                    Cast or summon even if it's not needed\n" ) ;
	term.blue( "  --undead [<respawn time>]  Continously raise undead (watch dependencies and cast/summon again and again)\n" ) ;
	term.blue( "                             Optional parameter <respawn time> is the debounce time in ms\n" ) ;
	term.blue( "  --summon-makefile          Summon a Makefile having one rule for each spell/summoning of the spellbook\n" ) ;
	term.blue( "  --ui <name>                Set the UI to use\n" ) ;
	term.blue( "  --locale <locale>          Set the locale for the script\n" ) ;
	term.blue( "  --locale-list              List the available locales\n" ) ;
	term.blue( "  --ws-server [<port>]       Create a web socket server (default to port 57311)\n" ) ;
	term.blue( "  --token <token>            Add a token to server accepted token list (can be used multiple times)\n" ) ;
	term.blue( "  --browser , - B <exe>      Open the browser <exe>, force --ws-server\n" ) ;
	term.blue( "  --client-ui <name>         Set the UI for the local client (use with --browser)\n" ) ;
	term.blue( "  --client-name <name>       Set the name of the local client user\n" ) ;
	term.blue( "  --script-debug             Activate debug-level logs for scripts ([debug] tag)\n" ) ;
	term.blue( "  --script-verbose           Activate verbose-level logs for scripts ([debug verbose] tag)\n" ) ;
	term( "\n" ) ;
} ;



cli.createWsServer = function createWsServer( book , options )
{
	var WsServer = require( './WsServer.js' ) ;
	return WsServer.create( book , options ) ;
} ;



cli.createUI = function createUI( bus , ui )
{
	try {
		if ( ui.indexOf( '/' ) === -1 && ui.indexOf( '.' ) === -1 )
		{
			// No slash and no dot: this is a built-in ui
			ui = './ui/' + ui + '.js' ;
		}
		else if ( ! path.isAbsolute( ui ) )
		{
			ui = process.cwd() + '/' + ui ;
		}
		
		require( ui )( bus ) ;
	}
	catch ( error ) {
		// Continue on error, simply skip this ui
		console.error( "Error loading this UI:" , ui , error ) ;
		log.error( "%E" , error ) ;
	}
} ;



cli.spellcaster = function spellcaster( book , args )
{	
	var toCast ;
	
	if ( args._.length === 0 ) { toCast = null ; }
	else if ( args._.length === 1 ) { toCast = args._[ 0 ] ; }
	// Cast/summon multiple files (it happens when glob is used without quote in bash)
	else { toCast = args._ ; }
	delete args._ ;
	
	
	var castOptions = {
		undead: typeof args.undead === 'number' ? args.undead : !! args.undead ,
		again: !! args.again
	} ;
	
	
	// If --summon-makefile option is used, build the makefile
	if ( args['summon-makefile'] )
	{
		require( './makefile.js' )( book , args['summon-makefile'] , function( error ) {
			if ( error )
			{
				term.red( "summon-makefile failed: %E\n" , error ) ;
				cli.exit( 1 ) ;
			}
			
			term( "^GThe ^g^/Makefile^:^G was successfully summoned.^:\n" ) ;
			cli.exit( 0 ) ;
		} ) ;
		return ;
	}
	
	if ( toCast === null ) { cli.usage( true ) ; cli.exit( 0 ) ; return ; }
	
	book.prologue( function( error ) {
		if ( error ) { cli.exit( 1 ) ; }
		
		cli.cast( book , toCast , castOptions , function( errorCode ) {
			
			if ( castOptions.undead ) { return ; }
			if ( errorCode ) { cli.exit( errorCode ) ; }
			
			book.epilogue( function( error ) {
				if ( error ) { cli.exit( 1 ) ; }
				cli.exit( 0 ) ;
			} ) ;
		} ) ;
	} ) ;
} ;



cli.adventurer = function adventurer( book , args )
{	
	var toCast ;
	
	book.startAdventure( function( error ) {
		
		if ( error )
		{
			log.error( "%E\n" , error ) ;
			cli.exit( 1 ) ;
		}
		
		cli.exit( 0 ) ;
	} ) ;
} ;



cli.cast = function cast( book , toCast , castOptions , callback )
{	
	if ( book.spells[ toCast ] )
	{
		book.cast( toCast , castOptions , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					if ( error.type === 'upToDate' ) { callback() ; }
					else { callback( 1 ) ; }
				}
				else
				{
					callback( typeof error === 'number' ? error : 1 ) ;
				}
			}
			else
			{
				callback() ;
			}
		} ) ;
		
		return ;
	}
	
	try {
		book.summon( toCast , castOptions , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					if ( error.type === 'upToDate' ) { callback() ; }
					else if ( error.type === 'notFound' )
					{
						term.red( "No such spell or summoning (" )
							.italic.bold.brightRed( toCast )
							.red( ") in this spellbook.\n" ) ;
						callback( 1 ) ;
					}
					else { callback( 1 ) ; }
				}
				else
				{
					callback( typeof error === 'number' ? error : 1 ) ;
				}
			}
			else
			{
				callback() ;
			}
		} ) ;
	}
	catch ( error ) {
		term.red( "Error: \n%E\n" , error ) ;
		callback( 1 ) ;
	}
} ;



cli.openBrowser = function openBrowser( book , server , exePath , options )
{
	var token , qs , url , execOptions = {} ;
	
	token = path.basename( exePath.split( ' ' )[ 0 ] ) + Math.floor( Math.random() * 1000000 ) ;
	
	server.acceptTokens[ token ] = true ;
	
	qs = {
		ui: options['client-ui'] || 'classic' ,
		token: token ,
		name: options['client-name'] || 'local-user'
	} ;
	
	qs = '?' + querystring.stringify( qs ) ;
	url = 'file://' + __dirname + '/../browser/app.html' + qs ;
	
	exec( exePath + ' ' + string.escape.shellArg( url ) , execOptions , function( error , stdout , stderr ) {
		
		if ( error )
		{
			console.error( "Browser ERROR:" , error ) ;
			process.exit( 1 ) ;
		}
		//console.log( "Browser STDOUT:" , stdout ) ;
		//console.log( "Browser STDERR:" , stderr ) ;
	} ) ;
	
	/*
	book.on( 'wsClientExit' , function( ok , fail , skip ) {
		process.exit( fail ? 1 : 0 ) ;
	} ) ;
	*/
} ;



cli.exit = function exit( code )
{
	async.exit( code , 1000 ) ;
} ;


