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



const cliStart = Date.now() ;

require( './patches.js' ) ;

const Ngev = require( 'nextgen-events' ) ;

const fs = require( 'fs' ) ;
const path = require( 'path' ) ;
const querystring = require( 'querystring' ) ;
const exec = require( 'child_process' ).exec ;

const exm = require( './exm.js' ) ;

const Client = require( './Client.js' ) ;

const Promise = require( 'seventh' ) ;

//const tree = require( 'tree-kit' ) ;
const string = require( 'string-kit' ) ;
const kungFig = require( 'kung-fig' ) ;
const term = require( 'terminal-kit' ).terminal ;
const cliManager = require( 'utterminal' ).cli ;

const spellcastPackage = require( '../package.json' ) ;



const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'spellcast' ) ;



async function cli() {
	var BookModule , casterExtension , book , bookPath , defaultBook , bookTypeName , noDir , type ,
		defaultUI , server , serverOptions , fstats , bookOptions = {} ;

	/* eslint-disable indent */
	cliManager.package( spellcastPackage )
		.app( 'Spellcast!' )
		//.baseline( "“Make your own adventure!”" ) // done elsewhere, depending on the typed command
		.description( "The Spellcast Scripting runtime." )
		.usage( "[--option1] [--option2] [...]" )
		//.introIfTTY
		//.helpOption
		.commonOptions
		.camel
		.commonCommands
		.commandRequired

		.opt( 'locale' ).string
			.description( "Set the locale for the script" )
		.opt( 'script-debug' , false ).flag
			.description( "Activate debug-level logs for scripts ([debug] tag)" )
		.opt( 'script-verbose' ).flag
			.description( "Activate verbose-level logs for scripts ([debug verbose] tag)" )
		.opt( 'max-ticks' , 10000 ).integer
			.description( "Max ticks between two user interactions (prevent from infinite loop)" )
		.opt( 'js' , false ).boolean
			.description( "Turn on/off the [js] tags (default: false)" )

		.command( 'story' )
			.usage( "[<book>] [--option1] [--option2] [...]" )
			.description( "It starts playing a story book." )
			.arg( 'book' ).string
				.typeLabel( 'book' )
				.description( "The book file (default to ./book)" )
			//.opt( 'book' ).string.typeLabel( 'book' ).description( "The book file (default to ./book)" )
			.opt( 'load' ).string
				.typeLabel( 'file' )
				.description( "Load a previously saved game" )
			.optionGroup( 'Common client/server options' )
				.opt( 'ui' ).string
					.typeLabel( 'name' )
					.description( "Set the UI to use" )
				.opt( 'locale-list' ).flag
					.description( "List the available locales" )
				.opt( 'assets' ).string
					.typeLabel( 'URL' )
					.description( "Set the asset base URL (default: main book directory)" )
				.opt( 'ws-server' )
					.typeLabel( 'port' )
					.description( "Create a web socket server (default to port 57311)" )
				.opt( 'http' ).flag
					.description( "Create a HTTP server for static content, sharing the port of the web socket server" )
				.opt( 'speech-proxy' ).string
					.typeLabel( 'KFG' )
					.description( "A config file for the speech proxy router service" )
				.opt( 'token' ).arrayOf.string
					.typeLabel( 'token' )
					.description( "Add a token to the server-accepted token list (can be used multiple times)" )
				.opt( [ 'browser' , 'B' ] ).string
					.typeLabel( 'exe' )
					.description( "Open a client browser <exe>, force --ws-server and --http" )
				.opt( [ 'electron' , 'E' ] ).flag
					.description( "Open the Electron client, force --ws-server and --http" )
				.opt( 'client-dev' ).flag
					.description( "Turn client dev tools on (Electron client only)" )
				.opt( 'client-ui' ).string
					.typeLabel( 'name' )
					.description( "Set the UI for the local client (use with --browser)" )
				.opt( 'client-name' ).string
					.typeLabel( 'name' )
					.description( "Set the name of the local client user" )

		.command( 'service' )
			.usage( "[<base-path>] [--option1] [--option2] [...]" )
			.description( "It starts a service hosting books inside the <base-path> subdirectories." )
			.details( "Example:\nspellcast service\n... then open URL http://localhost:57311/ in a browser." )
			.arg( 'base-path' ).string
				.typeLabel( 'base-path' )
				.description( "Set the base path, all books must be located in the first subdirectory level of this path (default to CWD)" )
			//.opt( 'base-path' ).string.typeLabel( 'base-path' ).description( "Set the base path, all books must be located in the first" )
			.opt( 'port' , 57311 ).integer
				.typeLabel( 'port' )
				.description( "Set the service port accepting HTTP and WS (default to port 57311)" )
			.opt( 'hostname' , 'localhost' ).string
				.typeLabel( 'hostname' )
				.description( "Set the server exposed hostname (default to localhost)" )
			.opt( 'path' , '/' ).string
				.typeLabel( 'path' )
				.description( "Set the server exposed URL path (default to /)" )

		.command( 'client' )
			.usage( "<url> [--option1] [--option2] [...]" )
			.description( "It connects to a spellcast server. The URL should be of this form: ws://<hostname>:<port>/<token>" )
			.arg( 'url' ).string.required
				.typeLabel( 'url' )
				.description( "The URL to connect to." )
			.opt( 'name' ).string
				.typeLabel( 'name' )
				.description( "Set the name of your user" )
			.opt( 'ui' ).string
				.typeLabel( 'name' )
				.description( "Set the UI to use" )

		.command( 'cast' )
			.usage( "<spell1> [<spell2>] [...] [--option1] [--option2] [...]" )
			.description( "It casts one or many spells from a spellbook." )
			.restArgs( 'spells' )
				.typeLabel( 'spell' )
				.description( "The spells from the spellbook to cast." )
			.optionGroup( 'Common caster options' )
				.opt( 'book' ).string
					.typeLabel( 'spellbook' )
					.description( "The magical book containing all spells and summonings (default: ./spellbook)" )
				.opt( 'again' ).flag
					.description( "Cast or summon even if it's not needed" )
				.opt( 'undead' )
					.typeLabel( 'respawn time' )
					.description( "Continously raise undead (watch dependencies and cast/summon again and again)\nOptional parameter <respawn time> is the debounce time in ms" )
			.optionGroup( 'Common client/server options' )
				.opt( 'ui' ).string
					.typeLabel( 'name' )
					.description( "Set the UI to use" )
				.opt( 'locale-list' ).flag
					.description( "List the available locales" )
				.opt( 'assets' ).string
					.typeLabel( 'URL' )
					.description( "Set the asset base URL (default: main book directory)" )
				.opt( 'ws-server' )
					.typeLabel( 'port' )
					.description( "Create a web socket server (default to port 57311)" )
				.opt( 'http' ).flag
					.description( "Create a HTTP server for static content, sharing the port of the web socket server" )
				.opt( 'token' ).arrayOf.string
					.typeLabel( 'token' )
					.description( "Add a token to the server-accepted token list (can be used multiple times)" )
				.opt( [ 'browser' , 'B' ] ).string
					.typeLabel( 'exe' )
					.description( "Open a client browser <exe>, force --ws-server and --http" )
				.opt( [ 'electron' , 'E' ] ).flag
					.description( "Open the Electron client, force --ws-server and --http" )
				.opt( 'client-dev' ).flag
					.description( "Turn client dev tools on (Electron client only)" )
				.opt( 'client-ui' ).string
					.typeLabel( 'name' )
					.description( "Set the UI for the local client (use with --browser)" )
				.opt( 'client-name' ).string
					.typeLabel( 'name' )
					.description( "Set the name of the local client user" )

		.command( 'summon' )
			.usage( "<file1> [<file2>] [...] [--option1] [--option2] [...]" )
			.description( "It summons one or many files from a spellbook." )
			.restArgs( 'files' )
				.typeLabel( 'file' )
				.description( "The files to summon, whose rules for the summoning are in spellbook." )
			.optionGroup( 'Common caster options' )
				.opt( 'book' ).string
					.typeLabel( 'spellbook' )
					.description( "The magical book containing all spells and summonings (default: ./spellbook)" )
				.opt( 'again' ).flag
					.description( "Cast or summon even if it's not needed" )
				.opt( 'undead' )
					.typeLabel( 'respawn time' )
					.description( "Continously raise undead (watch dependencies and cast/summon again and again)\nOptional parameter <respawn time> is the debounce time in ms" )
			.optionGroup( 'Common client/server options' )
				.opt( 'ui' ).string
					.typeLabel( 'name' )
					.description( "Set the UI to use" )
				.opt( 'locale-list' ).flag
					.description( "List the available locales" )
				.opt( 'assets' ).string
					.typeLabel( 'URL' )
					.description( "Set the asset base URL (default: main book directory)" )
				.opt( 'ws-server' )
					.typeLabel( 'port' )
					.description( "Create a web socket server (default to port 57311)" )
				.opt( 'http' ).flag
					.description( "Create a HTTP server for static content, sharing the port of the web socket server" )
				.opt( 'token' ).arrayOf.string
					.typeLabel( 'token' )
					.description( "Add a token to the server-accepted token list (can be used multiple times)" )
				.opt( [ 'browser' , 'B' ] ).string
					.typeLabel( 'exe' )
					.description( "Open a client browser <exe>, force --ws-server and --http" )
				.opt( [ 'electron' , 'E' ] ).flag
					.description( "Open the Electron client, force --ws-server and --http" )
				.opt( 'client-dev' ).flag
					.description( "Turn client dev tools on (Electron client only)" )
				.opt( 'client-ui' ).string
					.typeLabel( 'name' )
					.description( "Set the UI for the local client (use with --browser)" )
				.opt( 'client-name' ).string
					.typeLabel( 'name' )
					.description( "Set the name of the local client user" )

		.command( 'summon-makefile' )
			.description( "It summons a Makefile having one rule for each spell/summoning of the spellbook." ) ;
	/* eslint-enable indent */

	var args = cliManager.run() ;
	//console.log( args ) ;


	// Init Logfella main logger
	Logfella.global.configure( {
		minLevel: args.log ,
		overrideConsole: true ,
		transports: [
			{
				type: 'console' , timeFormatter: 'time' , color: true , output: 'stderr'
			}
		]
	} ) ;

	// Manage uncaughtException
	process.on( 'uncaughtException' , error => {
		log.fatal( "uncaughtException: %E" , error ) ;
		term.grabInput( false ) ;
		throw error ;
	} ) ;

	process.on( 'unhandledRejection' , error => {
		log.fatal( 'unhandledRejection: %E' , error ) ;
		term.grabInput( false ) ;
		throw error ;
	} ) ;


	switch ( args.command ) {
		case 'story' :
			type = 'story' ;
			BookModule = require( './StoryBook.js' ) ;
			bookTypeName = 'story book' ;
			bookPath = args.book ;
			defaultBook = 'book' ;
			defaultUI = 'classic' ;
			break ;

		case 'service' :
			type = 'story' ;
			BookModule = require( './StoryBook.js' ) ;
			bookTypeName = 'story book' ;
			break ;

		case 'client' :
			if ( ! args.name ) { args.name = 'unknown_' + Math.floor( Math.random() * 10000 ) ; }
			defaultUI = 'classic' ;
			break ;

		case 'cast' :
			if ( ! args.spells.length ) {
				cliManager.displayHelp() ;
				return ;
			}

			args.what = args.spells ;
			type = 'caster' ;

			try {
				casterExtension = exm.requireExtension( 'caster' ) ;
			}
			catch ( error ) {
				if ( error.code === 'notFound' ) {
					term.red( "%s\n" , error ) ;
					await exm.installExtension( 'caster' ) ;
				}
				else {
					throw error ;
				}
			}

			BookModule = casterExtension.require( './CasterBook.js' ) ;
			bookTypeName = 'spellbook' ;
			bookPath = args.book ;
			defaultBook = 'spellbook' ;
			defaultUI = 'inline' ;
			break ;

		case 'summon' :
			if ( ! args.files.length ) {
				cliManager.displayHelp() ;
				return ;
			}

			args.what = args.files ;
			type = 'caster' ;

			try {
				casterExtension = exm.requireExtension( 'caster' ) ;
			}
			catch ( error ) {
				if ( error.code === 'notFound' ) {
					term.red( "%s\n" , error ) ;
					await exm.installExtension( 'caster' ) ;
				}
				else {
					throw error ;
				}
			}

			BookModule = casterExtension.require( './CasterBook.js' ) ;
			bookTypeName = 'spellbook' ;
			bookPath = args.book ;
			defaultBook = 'spellbook' ;
			defaultUI = 'inline' ;
			break ;

		case 'summon-makefile' :
			type = 'caster' ;

			try {
				casterExtension = exm.requireExtension( 'caster' ) ;
			}
			catch ( error ) {
				if ( error.code === 'notFound' ) {
					term.red( "%s\n" , error ) ;
					await exm.installExtension( 'caster' ) ;
				}
				else {
					throw error ;
				}
			}

			BookModule = casterExtension.require( './CasterBook.js' ) ;
			bookTypeName = 'spellbook' ;
			bookPath = args.book ;
			defaultBook = 'spellbook' ;
			defaultUI = 'inline' ;
			break ;
	}

	if ( args.electron || typeof args.browser === 'string' ) {
		args.wsServer = true ;
		args.http = true ;
		//args.ui = 'websocket' ;
	}
	else {
		args.browser = false ;
	}

	if ( args.wsServer && typeof args.wsServer !== 'number' ) { args.wsServer = 57311 ; }
	if ( ! args.ui && ! args.wsServer ) { args.ui = defaultUI ; }


	// This is a terminal client!
	if ( args.command === 'client' ) {
		cli.client( args ) ;
		return ;
	}


	// Book options
	bookOptions.type = type ;
	bookOptions.maxTicks = args.maxTicks ;
	bookOptions.allowJsTag = args.js ;


	// Init Logfella script logger
	var scriptLogLevel = 'info' ;

	if ( args.scriptDebug ) { scriptLogLevel = 'debug' ; }
	else if ( args.scriptVerbose ) { scriptLogLevel = 'verbose' ; }

	Logfella.defineOrConfig( 'userland' , {
		minLevel: scriptLogLevel ,
		overrideConsole: true ,
		transports: [
			{
				type: 'console' , timeFormatter: 'time' , color: true , output: 'stderr'
			}
		]
	} ) ;



	// This is a service
	if ( args.command === 'service' ) {
		cli.service( args , bookOptions ) ;
		return ;
	}


	// Check the book path
	if ( ! bookPath ) { bookPath = defaultBook ; noDir = true ; }

	try {
		bookPath = await fs.promises.realpath( bookPath ) ;
		fstats = await fs.promises.stat( bookPath ) ;

		if ( ! fstats.isFile() ) {
			if ( ! noDir && fstats.isDirectory() ) {
				bookPath += '/' + defaultBook ;
				try {
					fstats = await fs.promises.stat( bookPath ) ;
				}
				catch ( error ) {
					term( "^rCan't access book ^/^R%s^:^r: %s\n" , bookPath , error ) ;
					process.exit( 1 ) ;
				}
			}
			else {
				term( "^/^R%s^:^r is not a file\n" , bookPath ) ;
				process.exit( 1 ) ;
			}
		}
	}
	catch ( error ) {
		term( "^rCan't access book ^/^R%s^:^r: %s\n" , bookPath , error ) ;
		process.exit( 1 ) ;
	}

	bookOptions.assetBaseUrl = args.assets || path.dirname( bookPath ) ;


	// Load the book
	try {
		book = await BookModule.load( bookPath , bookOptions ) ;
	}
	catch ( error ) {
		//throw error ;
		if ( error.code === 'doctypeMismatch' && type ) {
			term( "^rThis is not a ^/%s^:^r!\n" , bookTypeName ) ;
		}
		else {
			term( "^rCannot read the spellbook '^R^+^/%s^:^R'. %s\n" , bookPath , error ) ;
		}
		return ;
	}

	switch ( book.type ) {
		case 'story' :
			term.italic.brightBlack( "“Make your own adventure!”\n\n" ) ;
			break ;
		case 'caster' :
			term.italic.brightBlack( "“It's like 'make', but with a touch of Wizardry!”\n\n" ) ;
			break ;
		default :
			term.red( "Unsupported book type: %s.\n" , book.type ) ;
			return cli.asyncExit( 1 ) ;
	}


	Object.defineProperty( book.data , 'options' , { value: args } ) ;

	if ( args.localeList ) {
		term.yellow( "Available locales: %s\n\n" , book.getLocales() ) ;
		return cli.asyncExit( 1 ) ;
	}

	if ( args.locale ) { await book.setLocale( args.locale ) ; }

	try {
		// Init the book
		await book.initBook( args.load ) ;
	}
	catch ( error ) {
		term.red( "%E\n" , error ) ;
		return cli.asyncExit( 1 ) ;
	}

	var addLocalClient = false ;

	log.debug( "Book init finished after %fms" , Date.now() - cliStart ) ;

	// Create a server?
	if ( args.wsServer ) {
		//console.log( "book.assetBaseUrl: " , book.assetBaseUrl ) ;

		if ( args.speechProxy ) {
			//let speechConfigPath = await fs.promises.realpath( args.speechProxy ) ;
			args.speechProxy = await kungFig.loadAsync( args.speechProxy ) ;
			book.hasSpeechService = true ;
		}

		serverOptions = {
			port: args.wsServer ,
			httpStaticPath: args.http && book.assetBaseUrl ,
			speechProxyConfig: args.speechProxy
		} ;

		if ( args.token ) { serverOptions.tokens = args.token ; }

		server = cli.createWsServer( book , serverOptions ) ;
	}
	else {
		addLocalClient = true ;
	}

	book.assignRoles().then( () => {
		switch ( args.command ) {
			case 'story' :
				//console.log( book.clients ) ;
				//setTimeout( () => console.log( book.clients ) , 1000 ) ;
				Ngev.groupOnceLast( book.clients , 'ready' , () => { cli.story( book , args ) ; } ) ;
				break ;

			case 'cast' :
				Ngev.groupOnceLast( book.clients , 'ready' , () => { cli.cast( book , args ) ; } ) ;
				break ;

			case 'summon' :
				Ngev.groupOnceLast( book.clients , 'ready' , () => { cli.summon( book , args ) ; } ) ;
				break ;

			case 'summon-makefile' :
				Ngev.groupOnceLast( book.clients , 'ready' , () => { cli.summonMakefile( book , args ) ; } ) ;
				break ;

			default :
				term.red( "Unsupported book type: %s.\n" , book.type ) ;
				cli.asyncExit( 1 ) ;
		}
	} )
		.catch( error => {
			term.red( "%E\n" ) ;
			cli.asyncExit( 1 ) ;
		} ) ;

	process.on( 'asyncExit' , ( code , timeout , callback ) => book.emitToClients( 'exit' , code , timeout , callback ) ) ;

	// Local client should be added AFTER calling book.assignRoles(), or many event would be lost.
	if ( addLocalClient ) {
		book.addClient( new Client( { name: 'default' } ) ) ;

		// Instanciate a UI?
		if ( args.ui ) { cli.createUI( book.clients[ 0 ] , args.ui ) ; }

		// This must be done, or some events will be missing
		book.clients[ 0 ].authenticate( {} ) ;
	}

	// Open Electron?
	if ( args.electron ) {
		cli.openElectron( book , server , args ) ;
	}
	// Open a browser?
	else if ( args.browser ) {
		cli.openBrowser( book , server , args.browser , args ) ;
	}
}

module.exports = cli ;



cli.createWsServer = function( book , options ) {
	var WsServer = require( './WsServer.js' ) ;
	var server = new WsServer( book , options ) ;
	server.start() ;
	return server ;
} ;



cli.createUI = function( bus , ui ) {
	try {
		if ( ui.indexOf( '/' ) === -1 && ui.indexOf( '.' ) === -1 ) {
			// No slash and no dot: this is a built-in ui
			ui = './ui/' + ui + '.js' ;
		}
		else if ( ! path.isAbsolute( ui ) ) {
			ui = process.cwd() + '/' + ui ;
		}

		require( ui )( bus ) ;
	}
	catch ( error ) {
		// Continue on error, simply skip this ui
		log.error( "Error loading the UI %i: %E" , ui , error ) ;
	}
} ;



cli.story = async function( book , args ) {
	var returnCode = 0 ;

	try {
		if ( args.load ) {
			await book.resumeState() ;
		}
		else {
			await book.startStory() ;
		}
	}
	catch ( bookError ) {
		log.error( "Book error(): %E\n" , bookError ) ;
		returnCode = 1 ;
	}

	// Give some time to the UI to clean things up...
	await Promise.resolveTimeout( 50 ) ;
	cli.asyncExit( returnCode ) ;
} ;



cli.summonMakefile = async function( book , args ) {
	try {
		await require( './makefile.js' )( book , null ) ;
	}
	catch ( error ) {
		term.red( "summon-makefile failed: %E\n" , error ) ;
		return cli.asyncExit( 1 ) ;
	}

	term( "^GThe ^g^/Makefile^:^G was successfully summoned.^:\n" ) ;
	return cli.asyncExit( 0 ) ;
} ;



cli.cast = function( book , args ) {
	return cli.castOrSummon( book , args , true ) ;
} ;



cli.summon = function( book , args ) {
	return cli.castOrSummon( book , args , false ) ;
} ;



cli.castOrSummon = async function( book , args , isCast ) {
	var options = {
		undead: typeof args.undead === 'number' ? args.undead : !! args.undead ,
		again: !! args.again
	} ;

	try {
		await book.prologue() ;
	}
	catch ( error ) {
		log.error( 'Prologue %E' , error ) ;
		await Promise.resolveTimeout( 50 ) ;
		return cli.asyncExit( 1 ) ;
	}

	try {
		if ( isCast ) {
			await book.cast( args.what , options ) ;
		}
		else {
			await book.summon( args.what , options ) ;
		}
	}
	catch ( error ) {
		if ( error instanceof Error ) {
			switch ( error.type ) {
				case 'upToDate' :
				case 'dependencyFailed' :
				case 'nonZeroExit' :
				case 'noop' :
					break ;
				case 'notFound' :
					// Already reported
					//term( "^rNo such spell (^/^+^R%s^:^r) in this spellbook.^:\n" , args.what ) ;
					await Promise.resolveTimeout( 50 ) ;
					return cli.asyncExit( 1 ) ;
				default :
					log.error( 'Cast/Summon %E' , error ) ;
					await Promise.resolveTimeout( 50 ) ;
					return cli.asyncExit( 1 ) ;
			}
		}
		else {
			await Promise.resolveTimeout( 50 ) ;
			return cli.asyncExit( typeof error === 'number' ? error : 1 ) ;
		}
	}

	if ( options.undead ) { return ; }

	try {
		await book.epilogue() ;
	}
	catch ( error ) {
		log.error( 'Epilogue %E' , error ) ;
		await Promise.resolveTimeout( 50 ) ;
		return cli.asyncExit( 1 ) ;
	}

	// Give some time to the UI to clean things up...
	await Promise.resolveTimeout( 50 ) ;
	cli.asyncExit( 0 ) ;
} ;



cli.client = function( args ) {
	var WsClient = require( './WsClient.js' ) ,
		hasConnected = false , client ;

	if ( ! args.url ) {
		args.url = 'ws://localhost:57311' ;
	}
	else if ( typeof args.url === 'number' ) {
		args.url = 'ws://localhost:' + args.url ;
	}
	else if ( ! args.url.match( /^[a-z]+:\/\// ) ) {
		args.url = 'ws://' + args.url ;
	}

	client = new WsClient( args.url ) ;

	client.run( () => {
		hasConnected = true ;
		term( '\n' ).bgBrightGreen.black( 'CONNECTED!' )( '\n\n\n\n' ) ;

		client.proxy.remoteServices.bus.on( 'exit' , cli.asyncExit ) ;

		if ( args.ui ) {
			cli.createUI(
				client.proxy.remoteServices.bus ,
				args.ui
			) ;
		}

		client.authenticate( {
			name: args.name
		} ) ;
	} ) ;

	client.ws.on( 'close' , () => {
		if ( hasConnected ) {
			term( '\n\n' ).bgRed.black( 'Connection unexpectedly closed.' )( '\n\n' ) ;
		}
		else {
			term( '\n\n' ).bgRed.black( 'Cannot connect to server.' )( '\n\n' ) ;
		}

		return cli.asyncExit( 1 ) ;
	} ) ;
} ;



cli.service = function( args , bookOptions ) {
	var serviceOptions = {
		port: args.port ,
		basePath: args.basePath || process.cwd() ,
		hostname: args.hostname || 'localhost' ,
		path: args.path || '/'
	} ;

	var Service = require( './Service.js' ) ;
	var service = new Service( serviceOptions , bookOptions ) ;
	service.start() ;
	return service ;
} ;



cli.openBrowser = function( book , server , exePath , options ) {
	var token , qs , url , execOptions = {} ;

	token = path.basename( exePath.split( ' ' )[ 0 ] ) + Math.floor( Math.random() * 1000000 ) ;

	server.acceptTokens[ token ] = true ;

	qs = {
		port: server.port ,
		token: token ,
		ui: options['client-ui'] || 'classic' ,
		name: options['client-name'] || 'local-user'
	} ;

	qs = '?' + querystring.stringify( qs ) ;
	url = 'http://localhost:' + server.port + '/' + qs ;

	exec( exePath + ' ' + string.escape.shellArg( url ) , execOptions , ( error , stdout , stderr ) => {

		if ( error ) {
			console.error( "Browser ERROR:" , error ) ;
			process.exit( 1 ) ;
		}
		//console.log( "Browser STDOUT:" , stdout ) ;
		//console.log( "Browser STDERR:" , stderr ) ;
	} ) ;
} ;



cli.openElectron = function( book , server , options ) {
	var exePath , appPath , token , qs , url , cliOptions = [] , execOptions = {} ;

	exePath = __dirname + '/../node_modules/.bin/electron' ;
	appPath = __dirname + '/../electron' ;

	if ( options['client-dev'] ) { cliOptions.push( '--dev' ) ; }

	token = path.basename( exePath.split( ' ' )[ 0 ] ) + Math.floor( Math.random() * 1000000 ) ;

	server.acceptTokens[ token ] = true ;

	qs = {
		port: server.port ,
		token: token ,
		ui: options['client-ui'] || 'classic' ,
		name: options['client-name'] || 'local-user'
	} ;

	qs = '?' + querystring.stringify( qs ) ;
	url = 'http://localhost:' + server.port + '/' + qs ;

	cliOptions.push( '--url ' + string.escape.shellArg( url ) ) ;

	exec( exePath + ' ' + appPath + ' ' + cliOptions.join( ' ' ) , execOptions , ( error , stdout , stderr ) => {

		if ( error ) {
			console.error( "Electron ERROR:" , error ) ;
			process.exit( 1 ) ;
		}
		//console.log( "Browser STDOUT:" , stdout ) ;
		//console.log( "Browser STDERR:" , stderr ) ;
	} ) ;
} ;



cli.asyncExit = function( code ) {
	Promise.asyncExit( code , 1000 ) ;
} ;

