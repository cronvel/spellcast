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



// Load modules
var spellcastPackage = require( '../package.json' ) ;

var fs = require( 'fs' ) ;
var pathModule = require( 'path' ) ;

var utils = require( './utils.js' ) ;

//var string = require( 'string-kit' ) ;

var async = require( 'async-kit' ) ;

// Set Async-kit's max recursion protection to 50
global.__ASYNC_KIT__.defaultMaxRecursion = 50 ;

var doormen = require( 'doormen' ) ;
var kungFig = require( 'kung-fig' ) ;
var Ngev = require( 'nextgen-events' ) ;

var TagContainer = kungFig.TagContainer ;

var Role = require( './Role.js' ) ;
var Ctx = require( './Ctx.js' ) ;

var Logfella = require( 'logfella' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{
			type: 'console' , timeFormatter: 'time' , color: true , output: 'stderr'
		}
	]
} ) ;

Logfella.userland = Logfella.create( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{
			type: 'console' , timeFormatter: 'time' , color: true , output: 'stderr'
		}
	]
} ) ;

var log = Logfella.global.use( 'spellcast' ) ;

function noop() {}



function Book() { throw new Error( "Use Book.create() instead." ) ; }
Book.prototype = Object.create( Ngev.prototype ) ;
Book.prototype.constructor = Book ;

module.exports = Book ;



Book.prototype.engine = require( './engine.js' ) ;



Book.create = function createBook( script , options , book ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( ! ( script instanceof TagContainer ) ) {
		log.debug( "Script is not a TagContainer, but: %I" , script ) ;
		throw new TypeError( "Book.create() arguments #0 should be a TagContainer" ) ;
	}

	if ( options.cwd ) { options.cwd = pathModule.normalize( options.cwd ) ; }
	else { options.cwd = process.cwd() ; }

	if ( ! options.api ) {
		options.api = new Ngev() ;
	}
	else if ( ! ( options.api instanceof Ngev ) ) {
		log.debug( "If provided, 'api' should be an instance of NextGenEvents" ) ;
		throw new TypeError( "Book.create() arguments #2 (if provided) should be an instance of NextGenEvents" ) ;
	}

	// The event bus should be interruptible, so the [cancel] tag will works
	options.api.setInterruptible( true ) ;
	options.api.serializeListenerContext( 'script' ) ;

	Object.defineProperties( book , {
		script: { value: script , enumerable: true } ,
		tags: { value: {} , enumerable: true } ,
		cwd: { value: options.cwd , enumerable: true } ,
		type: { value: options.type , enumerable: true } ,
		locales: { value: options.locales || {} , enumerable: true } ,
		clients: { value: [] , writable: true , enumerable: true } ,
		roles: { value: [] , writable: true , enumerable: true } ,
		persistent: { value: null , writable: true , enumerable: true } ,
		ctx: { value: null , writable: true , enumerable: true } ,
		data: { value: options.data || {} , writable: true , enumerable: true } ,
		staticData: { value: options.staticData || {} , writable: true , enumerable: true } ,
		maxTicks: { value: options.maxTicks || Infinity , writable: true , enumerable: true } ,
		allowJsTag: { value: options.allowJsTag !== undefined ? !! options.allowJsTag : true , writable: true , enumerable: true } ,
		assetBaseUrl: { value: options.assetBaseUrl || '' , writable: true , enumerable: true } ,
		functions: { value: {} , enumerable: true } ,
		input: { value: new Ngev() , enumerable: true } ,
		initEvents: { value: null , writable: true , enumerable: true } ,
		api: { value: options.api , enumerable: true } ,
		//apiListeners: { value: {} , enumerable: true } ,
		exitSent: { value: false , writable: true , enumerable: true } ,

		onProcessAsyncExit: { value: Book.onProcessAsyncExit.bind( book ) }
	} ) ;

	book.defineStates( 'ready' ) ;
	book.defineStates( 'idle' , 'busy' ) ;

	// This will DESYNC .emit() callback
	book.setNice( -100 ) ;

	// Extend roles and clients array
	book.roles.get = utils.get ;
	book.clients.get = utils.get ;
	book.clients.getToken = utils.getToken ;

	Object.defineProperties( book.data , {
		// /!\ Anything here should be added to loadState.js too! /!\

		// Bind global var
		global: { value: book.data } 	// not done by Ctx.js anymore

		// Add to data some interesting things?
		/*
		__functions__: { value: book.functions } ,
		__staticData__: { value: book.staticData } ,
		//book.entityModels
		//book.itemModels
		*/
	} ) ;

	process.on( 'asyncExit' , book.onProcessAsyncExit ) ;

	return book ;
} ;



Book.prototype.initBook = function initBook( stateFile , callback ) {

	if ( typeof stateFile === 'function' ) {
		callback = stateFile ;
		stateFile = null ;
	}

	this.busy( ( busyCallback ) => {

		this.prepareDotSpellcastDirectory( ( initError ) => {

			if ( initError ) { busyCallback( initError ) ; return ; }

			// Script init
			this.engine.init( this.script , this , ( initError_ ) => {

				if ( initError_ ) { busyCallback( initError_ ) ; return ; }

				if ( stateFile ) {
					busyCallback( new Error( "State files not supported" ) ) ;
					return ;
				}

				// Run the top-level
				var initCtx = Ctx.create( this ) ;

				this.engine.runCb( this.script , this , initCtx , null , ( runError ) => {

					// Save the events used for init
					this.initEvents = initCtx.events ;

					// Destroy the init context now!
					initCtx.destroy() ;

					if ( runError ) { busyCallback( runError ) ; return ; }

					if ( ! this.roles.length ) {
						this.roles.push( Role.create( 'default' , {
							label: 'main role' ,
							noChat: true
						} ) ) ;
					}

					this.emit( 'ready' ) ;

					busyCallback() ;
				} ) ;
			} ) ;
		} ) ;
	} , callback ) ;
} ;



Book.prototype.destroy = function destroy() {
	process.removeListener( 'asyncExit' , this.onProcessAsyncExit ) ;
} ;



var persistentJsonSchema = {
	sanitize: 'removeExtraProperties' ,
	properties: {
		version: { type: 'string' , default: spellcastPackage.version } ,
		summonMap: {
			properties: {
				spell: {
					type: 'strictObject' ,
					default: {}
				} ,
				summoning: {
					type: 'strictObject' ,
					default: {}
				}
			} ,
			default: { spell: {} , summoning: {} }
		}
	}
} ;



Book.prototype.prepareDotSpellcastDirectory = function prepareDotSpellcastDirectory( callback ) {
	var directories = [
		this.cwd + '/.spellcast' ,
		this.cwd + '/.spellcast/casted' ,
		this.cwd + '/.spellcast/fizzled' ,
		this.cwd + '/.spellcast/tmp'
	] ;

	async.foreach( directories , ( path , foreachCallback ) => {
		fs.stat( path , ( error ) => {
			if ( ! error ) { foreachCallback() ; }
			else { fs.mkdir( path , foreachCallback ) ; }
		} ) ;
	} )
	.exec( ( error ) => {
		if ( error ) { callback( error ) ; return ; }
		this.loadPersistent( callback ) ;
	} ) ;
} ;



Book.prototype.loadPersistent = function loadPersistent( callback ) {
	fs.readFile( this.cwd + '/.spellcast/persistent.json' , 'utf8' , ( error , content ) => {
		// Not found is not an error
		if ( error ) {
			log.verbose( "'persistent.json' not found" ) ;
			this.persistent = doormen( persistentJsonSchema , {} ) ;
			callback() ;
			return ;
		}

		try {
			this.persistent = doormen( persistentJsonSchema , JSON.parse( content ) ) ;
		}
		catch ( error_ ) {
			log.error( "Parse 'persistent.json': %E" , error_ ) ;
			this.persistent = doormen( persistentJsonSchema , {} ) ;
		}

		if ( ! utils.isCompatible( this.persistent.version ) ) {
			log.warning(
				"'persistent.json' version (%s) is not compatible with current version (%s) and will be reset." ,
				this.persistent.version ,
				spellcastPackage.version
			) ;

			this.persistent = doormen( persistentJsonSchema , {} ) ;
		}

		log.debug( "'persistent.json' loaded %I" , this.persistent ) ;
		callback() ;
	} ) ;
} ;



Book.prototype.getLocales = function getLocales() {
	return Object.keys( this.locales ).filter( e => this.locales[ e ].length ) ;
} ;



Book.prototype.setLocale = function setLocale( locale ) {
	var i , iMax , object , localeData ;

	if ( ! this.locales[ locale ] || ! this.locales[ locale ].length ) {
		log.error( "Locale '%s' not found" , locale ) ;
		return ;
	}

	this.locales[ locale ].forEach( localePath => {

		localeData = kungFig.load( localePath , {
			noKfgCache: true ,
			metaHook: ( meta /*, parseOptions */ ) => {
				var doctypeMeta , localeMeta ;

				if ( ! meta ) { throw new Error( "Missing meta tags." ) ; }

				if ( ! ( doctypeMeta = meta.getUniqueTag( 'doctype' ) ) ) {
					throw new Error( "No [[doctype]] meta tag found." ) ;
				}

				if ( doctypeMeta.attributes !== 'locale' ) {
					throw new Error( "Not a 'locale' KFG file." ) ;
				}

				if ( ! ( localeMeta = meta.getUniqueTag( 'locale' ) ) ) {
					throw new Error( "No [[locale]] meta tag found." ) ;
				}

				if ( localeMeta.attributes !== locale ) {
					throw new Error( "Locale mismatch: wanted '" + locale + "' but got '" + localeMeta.attributes + "'." ) ;
				}
			}
		} ) ;

		if ( Array.isArray( localeData.sentences ) ) {
			object = {} ;

			for ( i = 0 , iMax = localeData.sentences.length - localeData.sentences.length % 2 ; i < iMax ; i += 2 ) {
				object[ localeData.sentences[ i ] ] = localeData.sentences[ i + 1 ] ;
			}

			localeData.sentences = object ;
		}

		this.data.__babel.extendLocale( locale , localeData ) ;
	} ) ;

	this.data.__babel.setLocale( locale ) ;
} ;



Book.prototype.savePersistent = function savePersistent( callback ) {
	var content ;

	try {
		//content = JSON.stringify( this.persistent ) ;
		content = JSON.stringify( this.persistent , null , '\t' ) ;
	}
	catch ( error ) {
		log.error( "Stringify 'persistent.json': %E" , error ) ;
		callback( error ) ;
		return ;
	}

	fs.writeFile( this.cwd + '/.spellcast/persistent.json' , content , 'utf8' , ( error ) => {
		// Not found is not an error
		if ( error ) {
			log.error( "Cannot save 'persistent.json': %E" , error ) ;
			callback( error ) ;
			return ;
		}

		log.debug( "'persistent.json' saved" ) ;
		callback() ;
	} ) ;
} ;



Book.onProcessAsyncExit = function onProcessAsyncExit( code , timeout , callback ) {
	// Emit on both clients and the book itself
	if ( this.exitSent ) { callback() ; return ; }
	this.exitSent = true ;
	Ngev.groupEmit( [ this ].concat( this.clients ) , 'exit' , code , timeout , callback ) ;
} ;



Book.prototype.idle = function idle( callback ) {
	if ( this.isIdle ) { callback() ; }
	else { this.once( 'idle' , callback ) ; }
} ;



Book.prototype.setIdle = function setIdle( v ) {
	var old = this.isIdle ;
	this.isIdle = !! v ;

	if ( this.isIdle && ! old ) {
		log.debug( "SWITCH TO IDLE!" ) ;
		this.emit( 'idle' ) ;
	}
	else if ( ! this.isIdle && old ) {
		log.debug( "SWITCH TO BUSY!" ) ;
		this.emit( 'busy' ) ;
	}
} ;



Book.prototype.busy = function busy( doneMessage , busyFn , callback ) {
	if ( typeof doneMessage === 'function' ) {
		callback = busyFn ;
		busyFn = doneMessage ;
		doneMessage = null ;
	}

	this.setIdle( false ) ;

	busyFn( ( ... args ) => {
		if ( doneMessage ) { Ngev.groupEmit( this.clients , 'coreMessage' , doneMessage ) ; }

		this.setIdle( true ) ;
		callback( ... args ) ;
	} ) ;
} ;



Book.prototype.reset = function reset( callback ) { callback() ; } ;



Book.prototype.prologue = function prologue( options , callback ) {
	if ( typeof options === 'function' ) { callback = options ; options = null ; }

	if ( ! this.activePrologue ) { callback() ; return ; }

	this.busy( ( busyCallback ) => {
		this.activePrologue.exec( this , options , null , busyCallback ) ;
	} , callback ) ;
} ;



Book.prototype.epilogue = function epilogue( options , callback ) {
	if ( typeof options === 'function' ) { callback = options ; options = null ; }

	if ( ! this.activeEpilogue ) { callback() ; return ; }

	this.busy( ( busyCallback ) => {
		this.activeEpilogue.exec( this , options , null , busyCallback ) ;
	} , callback ) ;
} ;



Book.prototype.sendMessageToAll = function sendMessageToAll( ctx , text , options , callback ) {
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	else if ( ! options || typeof options !== 'object' ) { options = null ; }

	if ( typeof callback !== 'function' ) { callback = noop ; }

	if ( typeof text !== 'string' ) { throw new TypeError( "Book#sendMessage() 'text' argument should be a string" ) ; }

	//log.error( "Book#sendMessageToAll() text: %s, roles: %Y" , text , ctx.roles.map( r => r.label ) ) ;
	Ngev.groupEmit( ctx.roles , 'message' , text , options , callback ) ;
} ;



// Mostly used by userland (wands, etc)
Book.prototype.emitToAll = function emitToAll( ctx , ... rest ) {
	if ( typeof rest[ rest.length - 1 ] !== 'function' ) { rest.push( noop ) ; }
	Ngev.groupEmit( ctx.roles , ... rest ) ;
} ;





/* Assign Roles to Clients */



Book.prototype.addClient = function addClient( client ) {
	// Already enough client, reject it
	if ( this.clients.length >= this.roles.length ) { return false ; }

	this.clients.push( client ) ;

	client.once( 'ready' , () => {
		this.emit( 'newClient' , client ) ;

		// Init the client
		client.emit( 'clientConfig' , {
			assetBaseUrl: this.assetBaseUrl
		} ) ;

		client.local.once( 'authenticated' , () => {
			// Send the new user list to all clients
			Ngev.groupEmit(
				this.clients ,
				'userList' ,
				this.clients.map( e => {
					return {
						id: e.id ,
						name: e.user.name
					} ;
				} )
			) ;

			// Emit newUser AFTER, because it will trigger immediately a roleList event in most cases
			this.emit( 'newUser' , client ) ;
		} ) ;
	} ) ;

	return true ;
} ;



Book.prototype.removeClient = function removeClient( client ) {
	var indexOf = this.clients.indexOf( client ) ;

	if ( indexOf === -1 ) { return ; }

	// Unassign client to its role
	this.roles.forEach( e => {
		if ( e.client === client ) { e.client = null ; }
	} ) ;

	this.clients.splice( indexOf , 1 ) ;
	this.emit( 'removeClient' , client ) ;
} ;



Book.prototype.addRole = function addRole( role ) {
	// /!\ should check if this is too late or not to add a role
	//if ( book is running ) { return ; }
	this.roles.push( role ) ;
} ;



Book.prototype.assignRoles = function assignRoles( options , callback ) {
	var rolesAssigned , triggeredCallback = false ;

	// Manage arguments
	if ( typeof options === 'function' ) { callback = options ; options = null ; }

	// First, add all roles to the book data, make it non-enumerable (not needed to be saved)
	if ( ! this.data.roles || typeof this.data.roles !== 'object' ) {
		Object.defineProperty( this.data , 'roles' , { value: {} } ) ;
	}

	this.roles.forEach( e => Object.defineProperty( this.data.roles , e.id , { value: e , writable: true } ) ) ;


	var update = () => {

		var assignedClients ;

		rolesAssigned = this.checkRoles( options ) ;

		if ( rolesAssigned ) {
			assignedClients = this.clients.filter( e => e.role ) ;
			Ngev.groupOff( assignedClients , 'selectRole' , onSelectRole ) ;
			Ngev.groupOff( assignedClients , 'chat' , onChat ) ;
		}

		if ( rolesAssigned || this.roles.length >= 2 ) {
			Ngev.groupEmit(
				this.clients ,
				'roleList' ,
				this.roles.map( e => {
					return {
						id: e.id ,
						label: e.label ,
						clientId: e.client && e.client.id
					} ;
				} ) ,
				this.clients.filter( e => ! e.role ).map( e => e.id ) ,
				rolesAssigned
			) ;
		}

		if ( rolesAssigned && ! triggeredCallback ) {
			triggeredCallback = true ;
			callback() ;
		}
	} ;

	var onSelectRole = ( client , roleIndex ) => {
		if ( roleIndex === null ) {
			if ( client.role ) { client.role.unassignClient() ; }
			update() ;
			return ;
		}

		// Out of bound
		if ( roleIndex < 0 || roleIndex > this.roles.length ) { return ; }

		// The role is already taken by someone else, or the current client itself
		if ( this.roles[ roleIndex ].client ) { return ; }

		// If this client already has a role, unassign it now
		if ( client.role ) { client.role.unassignClient() ; }

		this.roles[ roleIndex ].assignClient( client ) ;

		update() ;
	} ;

	var onChat = ( client , clientMessage ) => {
		var toClients ;

		// If no message, exit now!
		if ( ! clientMessage ) { return ; }

		// The client was assigned from somewhere else... This is not an antechamber chat
		if ( rolesAssigned && client.role ) { client.off( 'chat' , onChat ) ; return ; }

		if ( rolesAssigned ) { toClients = this.clients.filter( e => ! e.role ) ; }	// to unassigned clients
		else { toClients = this.clients ; }

		var message = client.user.name + '> ' + clientMessage ;

		Ngev.groupEmit( toClients , 'message' , message , { antechamber: true } ) ;
	} ;

	this.on( 'newUser' , ( client ) => {
		client.on( 'selectRole' , onSelectRole.bind( undefined , client ) , { id: onSelectRole } ) ;
		client.on( 'chat' , onChat.bind( undefined , client ) ) ;

		// TMP! --------------------------------------------------------------------------------------------------------------
		client.on( 'saveState' , () => {
			if ( ! this.saveState ) { return ; }

			this.saveState( 'state.jsdat' , () => {
				console.log( 'Save done' ) ;
				/*
				this.loadState( 'state.jsdat' , () => {
					console.log( 'Load done' ) ;
				} ) ;
				*/
			} ) ;
		} ) ;

		update() ;
	} ) ;


	// In client-server cases, there is no clients connected ATM,
	// so all listeners should be added to the 'newUser' event handler too.
	Ngev.groupOn( this.clients , 'selectRole' , onSelectRole ) ;
	Ngev.groupOn( this.clients , 'chat' , onChat ) ;

	// Call update() now!
	update() ;
} ;



// Check if roles are correctly assigned, return boolean
Book.prototype.checkRoles = function checkRoles( /* options */ ) {
	var unassignedRoles ;

	unassignedRoles = this.roles.filter( e => ! e.client ) ;
	log.debug( "Roles: %I" , this.roles ) ;
	log.debug( "Unassigned roles: %I" , unassignedRoles ) ;

	if ( ! unassignedRoles.length ) { return true ; }

	// If there is one role and one client, assign the client immediately
	if ( this.roles.length === 1 && this.clients.length === 1 ) {
		this.roles[ 0 ].assignClient( this.clients[ 0 ] ) ;
		return true ;
	}
} ;


