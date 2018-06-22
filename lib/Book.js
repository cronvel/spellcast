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



require( './patches.js' ) ;
var spellcastPackage = require( '../package.json' ) ;

var fs = require( 'fs' ) ;
var pathModule = require( 'path' ) ;

var utils = require( './utils.js' ) ;

//var string = require( 'string-kit' ) ;

var Promise = require( 'seventh' ) ;

// Set Async-kit's max recursion protection to 50
global.__ASYNC_KIT__.defaultMaxRecursion = 50 ;

var doormen = require( 'doormen' ) ;
var kungFig = require( 'kung-fig' ) ;
var Ngev = require( 'nextgen-events' ) ;

var TagContainer = kungFig.TagContainer ;

var Role = require( './Role.js' ) ;
var Ctx = require( './Ctx.js' ) ;

var Logfella = require( 'logfella' ) ;

var log = Logfella.global.use( 'spellcast' ) ;

function noop() {}



function Book( script , options ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( ! ( script instanceof TagContainer ) ) {
		log.debug( "Script is not a TagContainer, but: %I" , script ) ;
		throw new TypeError( "Book() arguments #0 should be a TagContainer" ) ;
	}

	this.id = options.id || null ;		// source ID
	this.iid = options.iid || null ;	// Instance ID
	this.script = script ;
	this.runningTasks = 0 ;
	this.tags = {} ;
	this.cwd = options.cwd ? pathModule.normalize( options.cwd ) : process.cwd() ;
	this.type = options.type ;
	this.locales = options.locales || {} ;
	this.clients = [] ;
	this.roles = [] ;
	this.persistent = null ;
	this.ctx = null ;
	this.data = options.data || {} ;
	this.staticData = options.staticData || {} ;
	this.maxTicks = options.maxTicks || Infinity ;
	this.allowJsTag = options.allowJsTag !== undefined ? !! options.allowJsTag : true ;
	this.assetBaseUrl = options.assetBaseUrl || '' ;
	this.functions = {} ;
	this.input = new Ngev() ;
	this.initEvents = null ;
	this.api = options.api ;
	this.messageModels = {} ;
	this.destroyed = false ;

	if ( ! this.api ) {
		this.api = new Ngev() ;
	}
	else if ( ! ( this.api instanceof Ngev ) ) {
		log.debug( "If provided, 'api' should be an instance of NextGenEvents" ) ;
		throw new TypeError( "Book() arguments #2 (if provided) should be an instance of NextGenEvents" ) ;
	}

	// The event bus should be interruptible, so the [cancel] tag will works
	this.api.setInterruptible( true ) ;
	this.api.serializeListenerContext( 'script' ) ;

	this.defineStates( 'ready' ) ;
	this.defineStates( 'idle' , 'busy' ) ;

	// This will DESYNC .emit() callback
	this.setNice( Ngev.DESYNC ) ;

	// Extend roles and clients array
	this.roles.get = utils.get ;
	this.clients.get = utils.get ;
	this.clients.getToken = utils.getToken ;

	Object.defineProperties( this.data , {
		// /!\ Anything here should be added to loadState.js too! /!\

		// Bind global var
		global: { value: this.data } 	// not done by Ctx.js anymore

		// Add to data some interesting things?
		/*
		__functions__: { value: this.functions } ,
		__staticData__: { value: this.staticData } ,
		//this.entityModels
		//this.itemModels
		*/
	} ) ;
}



Book.prototype = Object.create( Ngev.prototype ) ;
Book.prototype.constructor = Book ;

module.exports = Book ;



Book.prototype.engine = require( './engine.js' ) ;



Book.prototype.initBook = async function initBook( stateFile ) {

	if ( stateFile ) {
		throw new Error( "State files not supported" ) ;
	}

	this.startTask() ;

	try {
		await this.prepareDotSpellcastDirectory() ;

		// Script init
		await this.engine.initAsync( this.script , this ) ;

		// Run the top-level
		var initCtx = Ctx.create( this ) ;

		await this.engine.runAsync( this.script , this , initCtx , null ) ;

		// Save the events used for init
		this.initEvents = initCtx.events ;

		// Destroy the init context now!
		initCtx.destroy() ;

		if ( ! this.roles.length ) {
			this.roles.push( new Role( 'default' , {
				name: 'main role' ,
				noChat: true
			} ) ) ;
		}

		this.emit( 'ready' ) ;
	}
	catch ( error ) {
		this.endTask() ;
		throw error ;
	}

	this.endTask() ;
} ;



Book.prototype.destroy = function destroy() {
	if ( this.destroyed ) { return ; }
	this.destroyed = true ;
	this.clients.forEach( c => c.closeConnection() ) ;
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



Book.prototype.prepareDotSpellcastDirectory = async function prepareDotSpellcastDirectory() {
	var directories = [
		this.cwd + '/.spellcast' ,
		this.cwd + '/.spellcast/casted' ,
		this.cwd + '/.spellcast/fizzled' ,
		this.cwd + '/.spellcast/tmp'
	] ;

	await Promise.every( directories , async ( path ) => {
		try {
			await fs.statAsync( path ) ;
		}
		catch ( error ) {
			return fs.mkdirAsync( path ) ;
		}
	} ) ;

	await this.loadPersistent() ;
} ;



Book.prototype.loadPersistent = async function loadPersistent() {
	var content ;

	try {
		content = await fs.readFileAsync( this.cwd + '/.spellcast/persistent.json' , 'utf8' ) ;
	}
	catch ( error ) {
		log.verbose( "'persistent.json' not found" ) ;
		this.persistent = doormen( persistentJsonSchema , {} ) ;
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
} ;



Book.prototype.savePersistent = async function savePersistent() {
	var content ;

	try {
		//content = JSON.stringify( this.persistent ) ;
		content = JSON.stringify( this.persistent , null , '\t' ) ;
	}
	catch ( error ) {
		log.error( "Stringify 'persistent.json': %E" , error ) ;
		throw error ;
	}

	try {
		await fs.writeFileAsync( this.cwd + '/.spellcast/persistent.json' , content , 'utf8' ) ;
	}
	catch ( error ) {
		// Not found is not an error
		log.error( "Cannot save 'persistent.json': %E" , error ) ;
		throw error ;
	}

	log.debug( "'persistent.json' saved" ) ;
} ;



Book.prototype.getLocales = function getLocales() {
	return Object.keys( this.locales ).filter( e => this.locales[ e ].length ) ;
} ;



Book.prototype.setLocale = async function setLocale( locale ) {
	var i , iMax , object , localeData ;

	if ( ! this.locales[ locale ] || ! this.locales[ locale ].length ) {
		log.error( "Locale '%s' not found" , locale ) ;
		return ;
	}

	await Promise.forEach( this.locales[ locale ] , async ( localePath ) => {

		localeData = await kungFig.loadAsync( localePath , {
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



Book.prototype.startTask = function startTask() {
	this.runningTasks ++ ;

	if ( this.runningTasks === 1 ) {
		log.debug( "SWITCH TO BUSY!" ) ;
		this.emit( 'busy' ) ;
	}
} ;



Book.prototype.endTask = function endTask() {
	this.runningTasks -- ;

	if ( this.runningTasks === 0 ) {
		log.debug( "SWITCH TO IDLE!" ) ;
		this.emit( 'idle' ) ;
	}
} ;



Book.prototype.reset = function reset() { return ; } ;



Book.prototype.prologue = async function prologue( options ) {
	if ( ! this.activePrologue ) { return ; }

	this.startTask() ;
	await this.activePrologue.execAsync( this , options , null ) ;
	this.endTask() ;
} ;



Book.prototype.epilogue = async function epilogue( options ) {
	if ( ! this.activeEpilogue ) { return ; }

	this.startTask() ;
	await this.activeEpilogue.execAsync( this , options , null ) ;
	this.endTask() ;
} ;



Book.prototype.sendMessageToAll = function sendMessageToAll( ctx , text , options , callback ) {
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	else if ( ! options || typeof options !== 'object' ) { options = null ; }

	if ( typeof callback !== 'function' ) { callback = noop ; }

	if ( typeof text !== 'string' ) { throw new TypeError( "Book#sendMessage() 'text' argument should be a string" ) ; }

	//log.error( "Book#sendMessageToAll() text: %s, roles: %Y" , text , ctx.roles.map( r => r.name ) ) ;
	Ngev.groupEmit( ctx.roles , 'message' , text , options , callback ) ;
} ;



// Mostly used by userland (wands, etc)
// It emits to all active roles
Book.prototype.emitToAll = function emitToAll( ctx , ... args ) {
	if ( typeof args[ args.length - 1 ] !== 'function' ) { args.push( noop ) ; }
	Ngev.groupEmit( ctx.roles , ... args ) ;
} ;



// It emits to all clients (e.g.: 'exit' event)
Book.prototype.emitToClients = function emitToClients( ... args ) {
	if ( typeof args[ args.length - 1 ] !== 'function' ) { args.push( noop ) ; }
	Ngev.groupEmit( this.clients , ... args ) ;
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



Book.prototype.assignRoles = function assignRoles( options ) {
	return new Promise( resolve => {
		var rolesAssigned , triggeredCallback = false ;

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
							name: e.name ,
							clientId: e.client && e.client.id
						} ;
					} ) ,
					this.clients.filter( e => ! e.role ).map( e => e.id ) ,
					rolesAssigned
				) ;
			}

			if ( rolesAssigned && ! triggeredCallback ) {
				triggeredCallback = true ;
				resolve() ;
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
			update() ;
		} ) ;


		// In client-server cases, there is no clients connected ATM,
		// so all listeners should be added to the 'newUser' event handler too.
		Ngev.groupOn( this.clients , 'selectRole' , onSelectRole ) ;
		Ngev.groupOn( this.clients , 'chat' , onChat ) ;

		// Call update() now!
		update() ;
	} ) ;
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


