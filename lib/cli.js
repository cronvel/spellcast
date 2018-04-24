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



var cliStart = Date.now() ;

var Ngev = require( 'nextgen-events' ) ;

var fs = require( 'fs' ) ;
var path = require( 'path' ) ;
var querystring = require( 'querystring' ) ;
var exec = require( 'child_process' ).exec ;

var Client = require( './Client.js' ) ;

var async = require( 'async-kit' ) ;
//var tree = require( 'tree-kit' ) ;
var string = require( 'string-kit' ) ;
var term = require( 'terminal-kit' ).terminal ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'spellcast' ) ;

var spellcastPackage = require( '../package.json' ) ;



function cli() {
	var BookModule , book , bookPath , defaultBook , bookTypeName , noDir , type ,
		defaultUI , server , serverOptions , fstats , bookOptions = {} ;

	// Intro
	term.bold.magenta( 'Spellcast!' ).dim( ' v%s by Cédric Ronvel\n' , spellcastPackage.version ) ;

	// Manage uncaughtException
	process.on( 'uncaughtException' , error => {
		term.red( "uncaughtException: %E" , error ) ;
		term.grabInput( false ) ;
		throw error ;
	} ) ;

	process.on( 'unhandledRejection' , error => {
		term.red( 'unhandledRejection: %E' , error ) ;
		term.grabInput( false ) ;
		throw error ;
	} ) ;

	// Manage command line arguments
	var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;

	args.command = args._[ 0 ] ;

	switch ( args.command ) {
		case 'help' :
			cli.help( args._[ 1 ] ) ;
			return cli.asyncExit( 0 ) ;
		case 'story' :
			type = 'story' ;
			BookModule = require( './StoryBook.js' ) ;
			bookTypeName = 'story book' ;
			bookPath = args.book || args._[ 1 ] ;
			defaultBook = 'book' ;
			defaultUI = 'classic' ;
			break ;
		case 'service' :
			type = 'story' ;
			BookModule = require( './StoryBook.js' ) ;
			bookTypeName = 'story book' ;
			bookPath = args.book || args._[ 1 ] ;
			defaultBook = 'book' ;
			defaultUI = 'classic' ;
			break ;
		case 'client' :
			args.url = args._[ 1 ] ;
			if ( ! args.name ) { args.name = 'unknown_' + Math.floor( Math.random() * 10000 ) ; }
			defaultUI = 'classic' ;
			break ;
		case 'cast' :
		case 'summon' :
			args.what = args._.slice( 1 ) ;
			type = 'caster' ;
			BookModule = require( './CasterBook.js' ) ;
			bookTypeName = 'spellbook' ;
			bookPath = args.book ;
			defaultBook = 'spellbook' ;
			defaultUI = 'inline' ;
			break ;
		case 'summon-makefile' :
			type = 'caster' ;
			BookModule = require( './CasterBook.js' ) ;
			bookTypeName = 'spellbook' ;
			bookPath = args.book ;
			defaultBook = 'spellbook' ;
			defaultUI = 'inline' ;
			break ;
		default :
			cli.help() ;
			return cli.asyncExit( 0 ) ;
	}

	if ( args.h || args.help ) {
		cli.help( args.command ) ;
		return cli.asyncExit( 0 ) ;
	}

	args.electron = args.electron || args.E ;
	args.browser = args.browser || args.B ;

	if ( args.electron || typeof args.browser === 'string' ) {
		//args.ui = 'websocket' ;
		args['ws-server'] = true ;
		args.http = true ;
	}
	else {
		args.browser = false ;
	}

	if ( args.token && ! Array.isArray( args.token ) ) { args.token = [ args.token ] ; }

	if ( ! args.ui && ! args['ws-server'] ) { args.ui = defaultUI ; }
	
	
	// This is a terminal client!
	if ( args.command === 'client' ) {
		cli.client( args ) ;
		return ;
	}

	
	// Book options
	bookOptions.type = type ;

	if ( args['max-ticks'] !== undefined ) { bookOptions.maxTicks = args['max-ticks'] ; }
	else { bookOptions.maxTicks = 10000 ; }

	if ( args.js !== undefined ) { bookOptions.allowJsTag = args.js ; }

	
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
			{
				type: 'console' , timeFormatter: 'time' , color: true , output: 'stderr'
			}
		]
	} ) ;

	Logfella.userland.setGlobalConfig( {
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
		bookPath = fs.realpathSync( bookPath ) ;
		fstats = fs.statSync( bookPath ) ;

		if ( ! fstats.isFile() ) {
			if ( ! noDir && fstats.isDirectory() ) {
				bookPath += '/' + defaultBook ;
				try {
					fstats = fs.statSync( bookPath ) ;
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
		book = BookModule.load( bookPath , bookOptions ) ;
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

	if ( args['locale-list'] ) {
		term.yellow( "Available locales: %s\n\n" , book.getLocales() ) ;
		return cli.asyncExit( 1 ) ;
	}

	if ( args.locale ) { book.setLocale( args.locale ) ; }

	// Init the book
	book.initBook( args.load , ( error ) => {

		var addLocalClient = false ;

		log.debug( "Book init finished after %fms" , Date.now() - cliStart ) ;

		if ( error ) { term.red( "%E\n" , error ) ; return cli.asyncExit( 1 ) ; }

		// Create a server?
		if ( args['ws-server'] ) {
			//console.log( "book.assetBaseUrl: " , book.assetBaseUrl ) ;

			serverOptions = {
				port: args['ws-server'] ,
				httpStaticPath: args.http && book.assetBaseUrl
			} ;

			if ( args.token ) { serverOptions.tokens = args.token ; }

			server = cli.createWsServer( book , serverOptions ) ;
		}
		else {
			addLocalClient = true ;
		}

		book.assignRoles( ( error_ ) => {

			if ( error_ ) { term.red( "%E\n" ) ; return cli.asyncExit( 1 ) ; }

			switch ( args.command ) {
				case 'story' :
					//console.log( book.clients ) ;
					//setTimeout( () => console.log( book.clients ) , 1000 ) ;
					Ngev.groupGlobalOnceAll( book.clients , 'ready' , () => { cli.story( book , args ) ; } ) ;
					break ;

				case 'cast' :
					Ngev.groupGlobalOnceAll( book.clients , 'ready' , () => { cli.cast( book , args ) ; } ) ;
					break ;

				case 'summon' :
					Ngev.groupGlobalOnceAll( book.clients , 'ready' , () => { cli.summon( book , args ) ; } ) ;
					break ;

				case 'summon-makefile' :
					Ngev.groupGlobalOnceAll( book.clients , 'ready' , () => { cli.summonMakefile( book , args ) ; } ) ;
					break ;

				default :
					term.red( "Unsupported book type: %s.\n" , book.type ) ;
					return cli.asyncExit( 1 ) ;
			}
		} ) ;

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
	} ) ;
}

module.exports = cli ;



cli.help = function help( command , noBaseline ) {
	var commonOptions = false , commonCasterOptions ;

	if ( ! noBaseline ) { term.italic.brightBlack( "“Make your own adventure!”\n\n" ) ; }

	switch ( command ) {
		case 'help' :
			term( "^bUsage is: ^cspellcast help <command>\n" ) ;
			term( "^bIt shows the help for that particular ^/command^:^b.\n\n" ) ;
			break ;
		case 'story' :
			term( "^bUsage is: ^cspellcast story [<book>] [<options1>] [<options2>] [...]\n" ) ;
			term( "^bIt starts playing a story book.\n" ) ;
			term( "^bWithout a book argument, it tries ^/./book^:^b.\n\n" ) ;
			commonOptions = true ;
			break ;
		case 'service' :
			term( "^bUsage is: ^cspellcast service [<options1>] [<options2>] [...]\n" ) ;
			term( "^bIt starts a story book service.\n" ) ;
			break ;
		case 'client' :
			term( "^bUsage is: ^cspellcast client <url> [<options1>] [<options2>] [...]\n" ) ;
			term( "^bIt connects to a spellcast server.\n" ) ;
			term( "^bThe URL should be of this form: ws://<domain>:<port>/<token>\n\n" ) ;
			term( "^bOptions:\n" ) ;
			term( "^b  --name <name>              Set the name of your user\n" ) ;
			term( "^b  --ui <name>                Set the UI to use\n" ) ;
			break ;
		case 'cast' :
			term( "^bUsage is: ^cspellcast cast <spell1> [<spell2>] [...] [<options1>] [<options2>] [...]\n" ) ;
			term( "^bIt casts one or many ^/spells^:^b from a spellbook.\n" ) ;
			term( "^bWithout a ^/--book^:^b option, it tries ^/./spellbook^:^b.\n\n" ) ;
			term( "^bOptions:\n" ) ;
			commonOptions = commonCasterOptions = true ;
			break ;
		case 'summon' :
			term( "^bUsage is: ^cspellcast summon <file> [<file2>] [...] [<options1>] [<options2>] [...]\n" ) ;
			term( "^bIt summons one or many ^/files^:^b from a spellbook.\n" ) ;
			term( "^bWithout a ^/--book^:^b option, it tries ^/./spellbook^:^b.\n\n" ) ;
			term( "^bOptions:\n" ) ;
			commonOptions = commonCasterOptions = true ;
			break ;
		case 'summon-makefile' :
			term( "^bUsage is: ^cspellcast summon-makefile\n" ) ;
			term( "^bIt summons a Makefile having one rule for each spell/summoning of the spellbook\n\n" ) ;
			break ;
		default :
			term( "^bUsage is: ^cspellcast <command> [<args>]\n\n" ) ;
			term( "^bAvailable commands:\n" ) ;
			term( "^b  story [<book>]             Start playing a story book\n" ) ;
			term( "^b  client <url>               Connect to a spellcast server\n" ) ;
			term( "^b  service                    Start a spellcast story book service\n" ) ;
			term( "^b  cast <spell>               Cast a spell from a spellbook\n" ) ;
			term( "^b  summon <file>              Summon a file from a spellbook\n" ) ;
			term( "^b  summon-makefile            Summon a Makefile having one rule for each spell/summoning of the spellbook\n" ) ;
			term( "^b  help <command>             Show the help for that particular command\n" ) ;
	}

	if ( commonCasterOptions ) {
		term( "^b  --book <spellbook>         The magical book containing all spells and summonings (default: ^/./spellbook^:^b)\n" ) ;
		term( "^b  --again                    Cast or summon even if it's not needed\n" ) ;
		term( "^b  --undead [<respawn time>]  Continously raise undead (watch dependencies and cast/summon again and again)\n" ) ;
		term( "^b                             Optional parameter <respawn time> is the debounce time in ms\n" ) ;
	}

	if ( commonOptions ) {
		term( "^bCommon options:\n" ) ;
		term( "^b  --help , -h                Show this help\n" ) ;
		term( "^b  --ui <name>                Set the UI to use\n" ) ;
		term( "^b  --locale <locale>          Set the locale for the script\n" ) ;
		term( "^b  --locale-list              List the available locales\n" ) ;
		term( "^b  --assets <URL>             Set the asset base URL (default: main book directory)\n" ) ;
		term( "^b  --ws-server [<port>]       Create a web socket server (default to port 57311)\n" ) ;
		term( "^b  --http                     Create a HTTP server for static content, sharing the port of the web socket server\n" ) ;
		term( "^b  --token <token>            Add a token to server accepted token list (can be used multiple times)\n" ) ;
		term( "^b  --browser , -B <exe>       Open a client browser <exe>, force --ws-server and --http\n" ) ;
		term( "^b  --electron , -E            Open the Electron client, force --ws-server and --http\n" ) ;
		term( "^b  --client-ui <name>         Set the UI for the local client (use with --browser)\n" ) ;
		term( "^b  --client-name <name>       Set the name of the local client user\n" ) ;
		term( "^b  --script-debug             Activate debug-level logs for scripts ([debug] tag)\n" ) ;
		term( "^b  --script-verbose           Activate verbose-level logs for scripts ([debug verbose] tag)\n" ) ;
		term( "^b  --max-ticks                Max ticks between two user interactions (prevent from infinite loop, default: 10000)\n" ) ;
		term( "^b  --js / --no-js             Turn on/off the [js] tags\n" ) ;
	}

	term( "\n" ) ;
} ;



cli.createWsServer = function createWsServer( book , options ) {
	var WsServer = require( './WsServer.js' ) ;
	var server = new WsServer( book , options ) ;
	server.start() ;
	return server ;
} ;



cli.createUI = function createUI( bus , ui ) {
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



cli.story = function story( book , args ) {
	var cb = function( error ) {

		// Give some time to the UI to clean things up...
		setTimeout( () => {
			if ( error ) {
				log.error( "%E\n" , error ) ;
				cli.asyncExit( 1 ) ;
				return ;
			}

			cli.asyncExit( 0 ) ;
		} , 50 ) ;
	} ;

	if ( args.load ) {
		book.resumeState( cb ) ;
	}
	else {
		book.startStory( cb ) ;
	}
} ;



cli.summonMakefile = function summonMakefile( book , args ) {
	require( './makefile.js' )( book , null , ( error ) => {
		if ( error ) {
			term.red( "summon-makefile failed: %E\n" , error ) ;
			return cli.asyncExit( 1 ) ;
		}

		term( "^GThe ^g^/Makefile^:^G was successfully summoned.^:\n" ) ;
		return cli.asyncExit( 0 ) ;
	} ) ;
} ;



cli.cast = function cast( book , args ) {
	var options = {
		undead: typeof args.undead === 'number' ? args.undead : !! args.undead ,
		again: !! args.again
	} ;

	if ( args.what === null ) { cli.help( args.command , true ) ; return cli.asyncExit( 0 ) ; }

	book.prologue( ( error ) => {
		if ( error ) {
			setTimeout( () => { cli.asyncExit( 1 ) ; } , 50 ) ;
			return ;
		}

		book.cast( args.what , options , ( error_ ) => {

			if ( error_ ) {
				if ( error_ instanceof Error ) {
					if ( error_.type === 'upToDate' ) {}	// eslint-disable-line
					else if ( error_.type === 'notFound' ) {
						term( "^rNo such spell (^/^+^R%s^:^r) in this spellbook.^:\n" , args.what ) ;
						setTimeout( () => cli.asyncExit( 1 ) , 50 ) ;
						return ;
					}
					else {
						setTimeout( () => cli.asyncExit( 1 ) , 50 ) ;
						return ;
					}
				}
				else {
					setTimeout( () => cli.asyncExit( typeof error_ === 'number' ? error_ : 1 ) , 50 ) ;
					return ;
				}
			}

			if ( options.undead ) { return ; }

			book.epilogue( ( error__ ) => {
				setTimeout( () => {
					if ( error__ ) { cli.asyncExit( 1 ) ; return ; }
					cli.asyncExit( 0 ) ;
				} , 50 ) ;
			} ) ;
		} ) ;
	} ) ;
} ;



cli.summon = function summon( book , args ) {
	var options = {
		undead: typeof args.undead === 'number' ? args.undead : !! args.undead ,
		again: !! args.again
	} ;

	if ( args.what === null ) { cli.help( args.command , true ) ; return cli.asyncExit( 0 ) ; }

	book.prologue( ( error ) => {
		if ( error ) {
			setTimeout( () => { cli.asyncExit( 1 ) ; } , 50 ) ;
			return ;
		}

		book.summon( args.what , options , ( error_ ) => {

			if ( error_ ) {
				if ( error_ instanceof Error ) {
					if ( error_.type === 'upToDate' ) {}	// eslint-disable-line
					else if ( error_.type === 'notFound' ) {
						term( "^rNo such summoning (^/^+^R%s^:^r) in this spellbook.^:\n" , args.what ) ;
						setTimeout( () => cli.asyncExit( 1 ) , 50 ) ;
						return ;
					}
					else {
						setTimeout( () => cli.asyncExit( 1 ) , 50 ) ;
						return ;
					}
				}
				else {
					setTimeout( () => cli.asyncExit( typeof error_ === 'number' ? error_ : 1 ) , 50 ) ;
					return ;
				}
			}

			if ( options.undead ) { return ; }

			book.epilogue( ( error__ ) => {
				setTimeout( () => {
					if ( error__ ) { cli.asyncExit( 1 ) ; return ; }
					cli.asyncExit( 0 ) ;
				} , 50 ) ;
			} ) ;
		} ) ;
	} ) ;
} ;



cli.client = function client_( args ) {
	var WsClient = require( './WsClient.js' ) ,
		hasConnected = false , client ;

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



cli.service = function service( args , bookOptions ) {
	var serviceOptions = {
		port: args.port ,
		basePath: args.basePath || process.cwd() ,
		serverDomain: args.serverDomain || 'localhost' ,
		serverBasePath: args.serverBasePath || '/' ,
	} ;
	
	var Service = require( './Service.js' ) ;
	var service = new Service( serviceOptions , bookOptions ) ;
	service.start() ;
	return service ;
} ;



cli.openBrowser = function openBrowser( book , server , exePath , options ) {
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



cli.openElectron = function openElectron( book , server , options ) {
	var exePath , appPath , token , qs , url , execOptions = {} ;

	exePath = __dirname + '/../node_modules/.bin/electron' ;
	appPath = __dirname + '/../electron' ;

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

	exec( exePath + ' ' + appPath + ' --url ' + string.escape.shellArg( url ) , execOptions , ( error , stdout , stderr ) => {

		if ( error ) {
			console.error( "Electron ERROR:" , error ) ;
			process.exit( 1 ) ;
		}
		//console.log( "Browser STDOUT:" , stdout ) ;
		//console.log( "Browser STDERR:" , stderr ) ;
	} ) ;
} ;



cli.asyncExit = function asyncExit( code ) {
	async.exit( code , 1000 ) ;
} ;


