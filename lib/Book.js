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



// Load modules
var spellcastPackage = require( '../package.json' ) ;

var fs = require( 'fs' ) ;
var pathModule = require( 'path' ) ;
var chokidar = require( 'chokidar' ) ;
var minimatch = require( '@cronvel/minimatch' ) ;
var glob = require( 'glob' ) ;

var utils = require( './utils.js' ) ;

//var string = require( 'string-kit' ) ;

var tree = require( 'tree-kit' ) ;
var async = require( 'async-kit' ) ;

// Set Async-kit's max recursion protection to 50
global.__ASYNC_KIT__.defaultMaxRecursion = 50 ;

var doormen = require( 'doormen' ) ;
var kungFig = require( 'kung-fig' ) ;
var Ngev = require( 'nextgen-events' ) ;
var Babel = require( 'babel-tower' ) ;

var TagContainer = kungFig.TagContainer ;

var tags = require( './tags/tags.js' ) ;
var CastTag = require( './tags/spellcaster/CastTag.js' ) ;
var SummonTag = require( './tags/spellcaster/SummonTag.js' ) ;

var Role = require( './Role.js' ) ;
var Client = require( './Client.js' ) ;
var Ctx = require( './Ctx.js' ) ;

var Logfella = require( 'logfella' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true } ,
	]
} ) ;

Logfella.userland = Logfella.create( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true } ,
	]
} ) ;

var log = Logfella.global.use( 'spellcast' ) ;

function noop() {}



function Book() { throw new Error( "Use Book.create() instead." ) ; }
Book.prototype = Object.create( Ngev.prototype ) ;
Book.prototype.constructor = Book ;

module.exports = Book ;



Book.prototype.engine = require( './engine.js' ) ;



Book.create = function createBook( script , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( script instanceof TagContainer ) )
	{
		log.debug( "Script is not a TagContainer, but: %I" , script ) ;
		throw new TypeError( "Book.create() arguments #0 should be a TagContainer" ) ;
	}
	
	if ( options.cwd ) { options.cwd = pathModule.normalize( options.cwd ) ; }
	else { options.cwd = process.cwd() ; }
	
	if ( ! options.api ) { options.api = new Ngev() ; }
	
	if ( ! ( options.api instanceof Ngev ) )
	{
		log.debug( "If provided, API should be an instance of NextGenEvents" ) ;
		throw new TypeError( "Book.create() arguments #2 (if provided) should be an instance of NextGenEvents" ) ;
	}
	
	if ( ! options.type ) { options.type = 'spellcaster' ; }
	
	if ( ! tags[ options.type ] )
	{
		throw new Error( "This is an unsupported type: '" + options.type + "'." ) ;
	}
	
	var self = Object.create( Book.prototype , {
		script: { value: script , enumerable: true } ,
		tags: { value: {} , enumerable: true } ,
		cwd: { value: options.cwd , enumerable: true } ,
		type: { value: options.type , enumerable: true } ,
		locales: { value: options.locales || {} , enumerable: true } ,
		clients: { value: [] , writable: true , enumerable: true } ,
		roles: { value: [] , writable: true , enumerable: true } ,
		persistent: { value: null , writable: true , enumerable: true } ,
		ctx: { value: null , writable: true , enumerable: true } ,
		data: { value: options.data || {} , enumerable: true } ,
		staticData: { value: options.staticData || {} , enumerable: true } ,
		maxTicks: { value: options.maxTicks || Infinity , writable: true , enumerable: true } ,
		allowJsTag: { value: options.allowJsTag !== undefined ? !! options.allowJsTag : true , writable: true , enumerable: true } ,
		assetBaseUrl: { value: options.assetBaseUrl || '' , writable: true , enumerable: true } ,
		functions: { value: {} , enumerable: true } ,
		input: { value: new Ngev() , enumerable: true } ,
		api: { value: options.api , enumerable: true } ,
		apiListeners: { value: [] , enumerable: true } ,
		
		// Spellcaster mode
		wands: { value: {} , enumerable: true } ,
		activePrologue: { value: null , writable: true , enumerable: true } ,
		activeEpilogue: { value: null , writable: true , enumerable: true } ,
		spells: { value: {} , enumerable: true } ,
		summonings: { value: {} , enumerable: true } ,
		wildSummonings: { value: [] , enumerable: true } ,
		reverseSummonings: { value: [] , enumerable: true } ,
		
		// New undead mode
		isIdle: { value: true , writable: true , enumerable: true } ,
		undeadMode: { value: false , writable: true , enumerable: true } ,
		undeadWatchers: { value: {} , enumerable: true } ,
		undeadRespawnTime: { value: 500 , writable: true , enumerable: true } ,
		undeadRespawnTimer: { value: null , writable: true , enumerable: true } ,
		undeadRespawnMap: { value: {} , writable: true , enumerable: true } ,
		undeadBoundFn: { value: null , writable: true , enumerable: true } ,
		
		// Adventurer mode
		ended: { value: false , writable: true , enumerable: true } ,
		scenes: { value: {} , enumerable: true } ,
		startingScene: { value: null , writable: true , enumerable: true } ,
		actions: { value: {} , writable: true , enumerable: true } ,
		entityModels: { value: {} , writable: true , enumerable: true } ,
		itemModels: { value: {} , writable: true , enumerable: true } ,
		entityClasses: { value: {} , writable: true , enumerable: true } ,
		entityCompoundStats: { value: {} , writable: true , enumerable: true } ,
		usageCompoundStats: { value: {} , writable: true , enumerable: true } ,
	} ) ;
	
	self.defineStates( 'ready' ) ;
	self.defineStates( 'idle' , 'busy' ) ;
	
	// Extend roles and clients array
	self.roles.get = utils.get ;
	self.clients.get = utils.get ;
	self.clients.getToken = utils.getToken ;
	
	Object.defineProperties( self.data , {
		// Bind global var
		global: { value: self.data } ,	// not done by Ctx.js anymore
		// Add to data some interesting things?
		/*
		__functions__: { value: self.functions } ,
		__staticData__: { value: self.staticData } ,
		//self.entityModels
		//self.itemModels
		*/
	} ) ;
	
	Object.defineProperties( self , {
		onFsWatchEvent: { value: Book.onFsWatchEvent.bind( self ) } ,
		onUndeadRaised: { value: Book.onUndeadRaised.bind( self ) } ,
		onProcessAsyncExit: { value: Book.onProcessAsyncExit.bind( self ) } ,
	} ) ;
	
	process.on( 'asyncExit' , self.onProcessAsyncExit ) ;
	
	return self ;
} ;



Book.load = function load( path , options )
{
	var regex , availableTags = {} ;
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! options.cwd )
	{
		// Set the CWD for commands, summonings, and persistent
		if ( pathModule.isAbsolute( path ) )
		{
			options.cwd = pathModule.dirname( path ) ;
		}
		else
		{
			options.cwd = process.cwd() + '/' + pathModule.dirname( path ) ;
		}
	}
	
	if ( ! options.data ) { options.data = {} ; }
	
	if ( ! options.data.__babel )
	{
		regex = /(\^)/g ;
        regex.substitution = '$1$1' ;
        Object.defineProperty( options.data , '__babel' , { value: Babel.create( regex ) , writable: true } ) ;
	}
	
	if ( ! options.locales ) { options.locales = {} ; }
	
	var script = kungFig.load( path , {
		kfgFiles: {
			basename: [ 'spellbook' ]
		} ,
		noKfgCache: true ,
		doctype: options.type ? [ options.type ] : Object.keys( tags ) ,
		metaHook: function( meta , parseOptions ) {
			var localesMeta , assetsMeta , locale ;
			
			if ( ! parseOptions.isInclude )
			{
				// This is the top-level KFG!
				options.type = meta.getUniqueTag( 'doctype' ).attributes ;
				
				// Set up tags now that we know what kind of book it is
				tree.extend( null , availableTags , tags[ options.type ] ) ;
			}
			
			localesMeta = meta.getFirstTag( 'locales' ) ;
			assetsMeta = meta.getFirstTag( 'assets' ) ;
			
			if ( localesMeta )
			{
				glob.sync( pathModule.dirname( parseOptions.file ) + '/' + localesMeta.attributes , { absolute: true } ).forEach( e => {
					locale = pathModule.basename( e , '.kfg' ) ;
					if ( ! Array.isArray( options.locales[ locale ] ) ) { options.locales[ locale ] = [] ; }
					options.locales[ locale ].push( e ) ;
				} ) ;
			}
			
			if ( assetsMeta )
			{
				options.assetBaseUrl = fs.realpathSync( assetsMeta.attributes ) ;
				//console.log( "options.assetBaseUrl: " , options.assetBaseUrl ) ;
			}
		} ,
		operators: require( './operators.js' ) ,
		tags: availableTags
	} ) ;
	
	var book = Book.create( script , options ) ;
	
	return book ;
} ;



var loadSaveState = require( './loadSaveState.js' ) ;
Book.prototype.saveState = loadSaveState.saveState ;
Book.prototype.loadState = loadSaveState.loadState ;
Book.prototype.resumeState = loadSaveState.resumeState ;



Book.prototype.initBook = function initBook( callback )
{
	var self = this ;
	
	this.busy( function( busyCallback ) {
		
		self.prepareDotSpellcastDirectory( function( initError ) {
		
			if ( initError ) { busyCallback( initError ) ; return ; }
			
			// Script init
			self.engine.init( self.script , self , function( initError ) {
			
				if ( initError ) { busyCallback( initError ) ; return ; }
				
				// Run the top-level
				// Force non-inheritance for data
				
				var initCtx = Ctx.create( self ) ;
				
				self.engine.runCb( self.script , self , initCtx , function( runError ) {
					
					// Destroy the init context now!
					initCtx.destroy() ;
					
					if ( runError ) { busyCallback( runError ) ; return ; }
					
					// Create at least one role
					if ( ! self.roles.length )
					{
						self.roles.push( Role.create( 'default' , {
							label: 'main character' ,
							noChat: true
						} ) ) ;
					}
					
					self.emit( 'ready' ) ;
					busyCallback() ;
				} ) ;
			} ) ;
		} ) ;
	} , callback ) ;
} ;



Book.prototype.destroy = function destroy()
{
	this.stopUndeadMode() ;
	process.removeListener( 'asyncExit' , this.onProcessAsyncExit ) ;
} ;



var persistentJsonSchema = {
	sanitize: 'removeExtraProperties',
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



Book.prototype.prepareDotSpellcastDirectory = function prepareDotSpellcastDirectory( callback )
{
	var self = this ;
	
	var directories = [
		this.cwd + '/.spellcast' ,
		this.cwd + '/.spellcast/casted' ,
		this.cwd + '/.spellcast/fizzled' ,
		this.cwd + '/.spellcast/tmp'
	] ;
	
	async.foreach( directories , function( path , foreachCallback ) {
		fs.stat( path , function( error ) {
			if ( ! error ) { foreachCallback() ; }
			else { fs.mkdir( path , foreachCallback ) ; }
		} ) ;
	} )
	.exec( function( error ) {
		if ( error ) { callback( error ) ; return ; }
		self.loadPersistent( callback ) ;
	} ) ;
} ;



Book.prototype.loadPersistent = function loadPersistent( callback )
{
	var self = this ;
	
	fs.readFile( this.cwd + '/.spellcast/persistent.json' , 'utf8' , function( error , content ) {
		// Not found is not an error
		if ( error )
		{
			log.verbose( "'persistent.json' not found" ) ;
			self.persistent = doormen( persistentJsonSchema , {} ) ;
			callback() ;
			return ;
		}
		
		try {
			self.persistent = doormen( persistentJsonSchema , JSON.parse( content ) ) ;
		}
		catch ( error ) {
			log.error( "Parse 'persistent.json': %E" , error ) ;
			self.persistent = doormen( persistentJsonSchema , {} ) ;
		}
		
		if ( ! utils.isCompatible( self.persistent.version ) )
		{
			log.warning(
				"'persistent.json' version (%s) is not compatible with current version (%s) and will be reset." ,
				self.persistent.version ,
				spellcastPackage.version
			) ;
			
			self.persistent = doormen( persistentJsonSchema , {} ) ;
		}
		
		log.debug( "'persistent.json' loaded %I" , self.persistent ) ;
		callback() ;
	} ) ;
} ;



Book.prototype.getLocales = function getLocales()
{
	return Object.keys( this.locales ).filter( e => this.locales[ e ].length ) ;
} ;



Book.prototype.setLocale = function setLocale( locale )
{
	var i , iMax , object , localeData ;
	
	if ( ! this.locales[ locale ] || ! this.locales[ locale ].length )
	{
		log.error( "Locale '%s' not found" , locale ) ;
		return ;
	}
	
	this.locales[ locale ].forEach( localePath => {
		
		localeData = kungFig.load( localePath , {
			//kfgFiles: { basename: [ 'spellbook' ] } ,
			noKfgCache: true ,
			metaHook: function( meta , parseOptions ) {
				var doctypeMeta , localeMeta ;
				
				if ( ! meta ) { throw new Error( "Missing meta tags." ) ; }
				
				if ( ! ( doctypeMeta = meta.getUniqueTag( 'doctype' ) ) )
				{
					throw new Error( "No [[doctype]] meta tag found." ) ;
				}
				
				if ( doctypeMeta.attributes !== 'locale' )
				{
					throw new Error( "Not a 'locale' KFG file." ) ;
				}
				
				if ( ! ( localeMeta = meta.getUniqueTag( 'locale' ) ) )
				{
					throw new Error( "No [[locale]] meta tag found." ) ;
				}
				
				if ( localeMeta.attributes !== locale )
				{
					throw new Error( "Locale mismatch: wanted '" + locale + "' but got '" + localeMeta.attributes + "'." ) ;
				}
			}
		} ) ;
		
		if ( Array.isArray( localeData.sentences ) )
		{
			object = {} ;
			
			for ( i = 0 , iMax = localeData.sentences.length - localeData.sentences.length % 2 ; i < iMax ; i += 2 )
			{
				object[ localeData.sentences[ i ] ] = localeData.sentences[ i + 1 ] ;
			}
			
			localeData.sentences = object ;
		}
		
		this.data.__babel.extendLocale( locale , localeData ) ;
	} ) ;
	
	this.data.__babel.setLocale( locale ) ;
} ;



Book.prototype.savePersistent = function savePersistent( callback )
{
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
	
	fs.writeFile( this.cwd + '/.spellcast/persistent.json' , content , 'utf8' , function( error ) {
		// Not found is not an error
		if ( error )
		{
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
	Ngev.groupEmit( [ this ].concat( this.clients ) , 'exit' , code , timeout , callback ) ;
} ;



Book.prototype.idle = function idle( callback )
{
	if ( this.isIdle ) { callback() ; }
	else { this.once( 'idle' , callback ) ; }
} ;



Book.prototype.setIdle = function setIdle( v )
{
	var old = this.isIdle ;
	this.isIdle = !! v ;
	
	if ( this.isIdle && ! old )
	{
		log.debug( "SWITCH TO IDLE!" ) ;
		this.emit( 'idle' ) ;
	}
	else if ( ! this.isIdle && old )
	{
		log.debug( "SWITCH TO BUSY!" ) ;
		this.emit( 'busy' ) ;
	}
} ;



Book.prototype.busy = function busy( doneMessage , busyFn , callback )
{
	var self = this ;
	
	if ( typeof doneMessage === 'function' )
	{
		callback = busyFn ;
		busyFn = doneMessage ;
		doneMessage = null ;
	}
	
	this.setIdle( false ) ;
	
	busyFn( function() {
		if ( doneMessage ) { Ngev.groupEmit( self.clients , 'coreMessage' , doneMessage ) ; }
		
		self.setIdle( true ) ;
		callback.apply( self , arguments ) ;
	} ) ;
} ;	



Book.prototype.reset = function reset( callback )
{
	this.resetReverseSummonings( callback ) ;
} ;



Book.prototype.resetReverseSummonings = function resetReverseSummonings( callback )
{
	var self = this ;
	
	async.foreach( self.reverseSummonings , function( reverseSummoning , foreachCallback ) {
		reverseSummoning.reset( self , foreachCallback ) ;
	} )
	.exec( callback ) ;
} ;



			/* Book/Spellbook main API */



Book.prototype.cast = function cast( spellName , options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( options && options.again ) { this.persistent.summoned = {} ; }
	
	if ( options && options.undead )
	{
		this.initUndeadMode( options.undead , this.cast.bind( this , spellName , null ) ) ;
	}
	
	this.busy( '^MAll casting done.^:\n\n' , function( busyCallback ) {
		
		CastTag.exec( self , spellName , options , null , function( error ) {
			if ( error ) { busyCallback( error ) ; return ; }
			self.savePersistent( busyCallback ) ;
		} ) ;
		
	} , callback ) ;
} ;



Book.prototype.summon = function summon( summoningName , options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( options && options.again ) { this.persistent.summoned = {} ; }
	
	if ( options && options.undead )
	{
		this.initUndeadMode( options.undead , this.summon.bind( this , summoningName , null ) ) ;
	}
	
	this.busy( '^MAll summoning done.^:\n\n' , function( busyCallback ) {
		
		SummonTag.exec( self , summoningName , options , null , function( error ) {
			if ( error ) { busyCallback( error ) ; return ; }
			self.savePersistent( busyCallback ) ;
		} ) ;
		
	} , callback ) ;
} ;



Book.prototype.prologue = function prologue( options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( ! this.activePrologue ) { callback() ; return ; }
	
	this.busy( function( busyCallback ) {
		self.activePrologue.exec( self , options , null , busyCallback ) ;
	} , callback ) ;
} ;



Book.prototype.epilogue = function epilogue( options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( ! this.activeEpilogue ) { callback() ; return ; }
	
	this.busy( function( busyCallback ) {
		self.activeEpilogue.exec( self , options , null , busyCallback ) ;
	} , callback ) ;
} ;



Book.prototype.sendMessageToAll = function sendMessageToAll( ctx , text , options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	else if ( ! options || typeof options !== 'object' ) { options = null ; }
	
	if ( typeof callback !== 'function' ) { callback = noop ; }
	
	if ( typeof text !== 'string' ) { throw new TypeError( "Book#sendMessage() 'text' argument should be a string" ) ; }
	
	Ngev.groupEmit( ctx.roles , 'message' , text , options , callback ) ;
} ;



// Mostly used by userland (wands, etc)
Book.prototype.emitToAll = function emitToAll( ctx )
{
	var args = Array.from( arguments ) ;
	args[ 0 ] = ctx.roles ;
	if ( typeof args[ args.length - 1 ] !== 'function' ) { args.push( noop ) ; }
	Ngev.groupEmit.apply( Ngev , args ) ;
} ;





			/* Assign Roles to Clients */



Book.prototype.addClient = function addClient( client )
{
	var self = this ;
	
	// Already enough client, reject it
	if ( this.clients.length >= this.roles.length ) { return false ; }
	
	this.clients.push( client ) ;
	
	client.once( 'ready' , function() {
		self.emit( 'newClient' , client ) ;
		
		// Init the client
		client.emit( 'clientConfig' , {
			assetBaseUrl: self.assetBaseUrl
		} ) ;
		
		client.local.once( 'authenticated' , function() {
			// Send the new user list to all clients
			Ngev.groupEmit(
				self.clients ,
				'userList' ,
				self.clients.map( e => {
					return {
						id: e.id ,
						name: e.user.name
					} ;
				} )
			) ;
			
			// Emit newUser AFTER, because it will trigger immediately a roleList event in most cases
			self.emit( 'newUser' , client ) ;
		} ) ;
	} ) ;
	
	return true ;
} ;



Book.prototype.removeClient = function removeClient( client )
{
	var indexOf = this.clients.indexOf( client ) ;
	
	if ( indexOf === -1 ) { return ; }
	
	// Unassign client to its role
	this.roles.forEach( e => {
		if ( e.client === client ) { e.client = null ; }
	} ) ;
	
	this.clients.splice( indexOf , 1 ) ;
	this.emit( 'removeClient' , client ) ;
} ;



Book.prototype.addRole = function addRole( role )
{
	// /!\ should check if this is too late or not to add a role
	//if ( book is running ) { return ; }
	this.roles.push( role ) ;
} ;



Book.prototype.assignRoles = function assignRoles( options , callback )
{
	var self = this , rolesAssigned , triggeredCallback = false ;
	
	// Manage arguments
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	// First, add all roles to the book data, make it non-enumerable (not needed to be saved)
	if ( ! this.data.roles || typeof this.data.roles !== 'object' )
	{
		Object.defineProperty( this.data , 'roles' , { value: {} } ) ;
	}
	
	this.roles.forEach( e => Object.defineProperty( this.data.roles , e.id , { value: e , writable: true } ) ) ;
	
	
	var update = function update() {
		
		var assignedClients ;
		
		rolesAssigned = self.checkRoles( options ) ;
		
		if ( rolesAssigned )
		{
			assignedClients = self.clients.filter( e => e.role ) ;
			Ngev.groupOff( assignedClients , 'selectRole' , onSelectRole ) ;
			Ngev.groupOff( assignedClients , 'chat' , onChat ) ;
		}
		
		if ( rolesAssigned || self.roles.length >= 2 )
		{
			Ngev.groupEmit(
				self.clients ,
				'roleList' ,
				self.roles.map( e => {
					return {
						id: e.id ,
						label: e.label ,
						clientId: e.client && e.client.id
					} ;
				} ) ,
				self.clients.filter( e => ! e.role ).map( e => e.id ) ,
				rolesAssigned
			) ;
		}
		
		if ( rolesAssigned && ! triggeredCallback )
		{
			triggeredCallback = true ;
			callback() ;
		}
	} ;
	
	var onSelectRole = function onSelectRole( client , roleIndex ) {
		if ( roleIndex === null )
		{
			if ( client.role ) { client.role.unassignClient() ; }
			update() ;
			return ;
		}
		
		// Out of bound
		if ( roleIndex < 0 || roleIndex > self.roles.length ) { return ; }
		
		// The role is already taken by someone else, or the current client itself
		if ( self.roles[ roleIndex ].client ) { return ; }
		
		// If this client already has a role, unassign it now
		if ( client.role ) { client.role.unassignClient() ; }
		
		self.roles[ roleIndex ].assignClient( client ) ;
		
		update() ;
	} ;
	
	var onChat = function onChat( client , clientMessage ) {
		var toClients ;
		
		// If no message, exit now!
		if ( ! clientMessage ) { return ; }
		
		// The client was assigned from somewhere else... This is not an antechamber chat
		if ( rolesAssigned && client.role ) { client.off( 'chat' , onChat ) ; return ; }
		
		if ( rolesAssigned ) { toClients = self.clients.filter( e => ! e.role ) ; }	// to unassigned clients
		else { toClients = self.clients ; }
		
		var message = client.user.name + '> ' + clientMessage ;
		
		Ngev.groupEmit( toClients , 'message' , message , { antechamber: true } ) ;
	} ;
	
	this.on( 'newUser' , function( client ) {
		client.on( 'selectRole' , onSelectRole.bind( undefined , client ) , { id: onSelectRole } ) ;
		client.on( 'chat' , onChat.bind( undefined , client ) ) ;
		
		// TMP! --------------------------------------------------------------------------------------------------------------
		client.on( 'saveState' , function() {
			self.saveState( 'state.jsdat' , function() {
				console.log( 'Save done' ) ;
				/*
				self.loadState( 'state.jsdat' , function() {
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
Book.prototype.checkRoles = function checkRoles( options )
{
	var unassignedRoles ;
	
	unassignedRoles = this.roles.filter( e => ! e.client ) ;
	log.debug( "Roles: %I" , this.roles ) ;
	log.debug( "Unassigned roles: %I" , unassignedRoles ) ;
	
	if ( ! unassignedRoles.length ) { return true ; }
	
	// If there is one role and one client, assign the client immediately
	if ( this.roles.length === 1 && this.clients.length === 1 )
	{
		this.roles[ 0 ].assignClient( this.clients[ 0 ] ) ;
		return true ;
	}
} ;





			/* Undead Mode */



Book.prototype.initUndeadMode = function initUndeadMode( time , boundFn )
{
	Object.keys( this.undeadWatchers ).forEach( e => this.dispellUndead( e ) ) ;
	if ( typeof time === 'number' ) { this.undeadRespawnTime = time ; }
	this.undeadBoundFn = boundFn ;
	this.undeadMode = true ;
	this.on( 'undeadRaised' , this.onUndeadRaised ) ;
} ;



Book.prototype.stopUndeadMode = function stopUndeadMode()
{
	Object.keys( this.undeadWatchers ).forEach( e => this.dispellUndead( e ) ) ;
	this.off( 'undeadRaised' , this.onUndeadRaised ) ;
	this.undeadBoundFn = null ;
	this.undeadMode = false ;
} ;



/*
	Possible refacto: chokidar watcher supports multiple path at once.
*/
Book.prototype.castUndead = function castUndead( path , discoveryPathObject )
{
	if ( ! this.undeadMode ) { return ; }
	
	if ( this.undeadWatchers[ path ] )
	{
		if ( discoveryPathObject )
		{
			if ( ! this.undeadWatchers[ path ].__discoveryPathObject ) { this.undeadWatchers[ path ].__discoveryPathObject = {} ; }
			Object.keys( discoveryPathObject ).forEach( glob => this.undeadWatchers[ path ].__discoveryPathObject[ glob ] = true ) ;
		}
		
		return ;
	}
	
	log.debug( "New undead: %s" , path ) ;
	
	this.undeadWatchers[ path ] = chokidar.watch( path , { ignoreInitial: true } ) ;
	
	if ( discoveryPathObject )
	{
		this.undeadWatchers[ path ].__discoveryPathObject = {} ;
		Object.keys( discoveryPathObject ).forEach( glob => this.undeadWatchers[ path ].__discoveryPathObject[ glob ] = true ) ;
	}
	
	this.undeadWatchers[ path ].on( 'all' , this.onFsWatchEvent.bind( this , path ) ) ;
	
	this.undeadWatchers[ path ].on( 'error' , function( error ) {
		log.error( "Undead watcher error: %E" , error ) ;
	} ) ;
} ;



Book.prototype.dispellUndead = function dispellUndead( path )
{
	if ( ! this.undeadMode || ! this.undeadWatchers[ path ] ) { return ; }
	this.undeadWatchers[ path ].close() ;
	delete this.undeadWatchers[ path ] ;
} ;



Book.prototype.cancelUndeadRespawn = function cancelUndeadRespawn( path )
{
	var self = this ;
	
	log.debug( "Canceling respawn for '%s'" , path ) ;
	delete self.undeadRespawnMap[ path ] ;
	
	// Because of race conditions, the filesystem watch event can happened slightly after the cancel action
	setTimeout( function() {
		log.debug( "Delayed canceling respawn for '%s'" , path ) ;
		delete self.undeadRespawnMap[ path ] ;
	} , 10 ) ;
} ;



Book.onFsWatchEvent = function onFsWatchEvent( watchPath , event , path )
{
	var self = this , i , iMax , discoveryPathObject , discoveryList , found ;
	
	if ( ! this.undeadMode ) { return ; }
	
	log.verbose( "onFsWatchEvent(): '%s' '%s' '%s'" , watchPath , event , path ) ;
	
	discoveryPathObject = this.undeadWatchers[ watchPath ].__discoveryPathObject ;
	//log.debug( "onFsWatchEvent() disco:\n%I" , discoveryPathObject ) ;
	
	// The file should not be in the include list
	if ( discoveryPathObject )
	{
		if ( event !== 'add' && event !== 'addDir' )
		{
			log.verbose( "discovery: excluding path '%s' (not an 'add' event)" , path ) ;
			return ;
		}
		
		log.verbose( "discovery: path: %s -- %I" , path , discoveryPathObject ) ;
		
		discoveryList = Object.keys( discoveryPathObject ) ;
		
		found = false ;
		
		for ( i = 0 , iMax = discoveryList.length ; i < iMax ; i ++ )
		{
			log.verbose( "discovery: tried '%s'" , discoveryList[ i ] ) ;
			
			if ( minimatch( path , discoveryList[ i ] ) )
			{
				log.verbose( "discovery: including path '%s' by '%s'" , path , discoveryList[ i ] ) ;
				found = true ;
				break ;
			}
		}
		
		if ( ! found )
		{
			log.verbose( "discovery: excluding path '%s' (nothing found)" , path ) ;
			return ;
		}
	}
	
	
	var clear = function clear() {
		if ( self.undeadRespawnTimer )
		{
			clearTimeout( self.undeadRespawnTimer ) ;
			self.undeadRespawnTimer = null ;
		}
	} ;
	
	this.undeadRespawnMap[ path ] = true ;
	
	log.debug( "About to raise undead: '%s' ('%s' event on '%s')" , path , event , watchPath ) ;
	
	clear() ;
	self.idle( function() {
		clear() ;
		self.undeadRespawnTimer = setTimeout( function() {
			clear() ;
			self.idle( function() {
				clear() ;
				var undeadList = Object.keys( self.undeadRespawnMap ) ;
				self.undeadRespawnMap = {} ;
				
				if ( undeadList.length )
				{
					// Some respawn may have been canceled
					self.emit( 'undeadRaised' , undeadList ) ;
				}
				else
				{
					log.debug( "undeadRaised canceled: all respawn were canceled" ) ;
				}
			} ) ;
		} , self.undeadRespawnTime ) ;
	} ) ;
} ;



Book.onUndeadRaised = function onUndeadRaised( undeadList )
{
	var self = this , date = new Date() ;
	
	log.debug( "Undeads raised: %s" , undeadList ) ;
	
	Ngev.groupEmit(
		this.clients ,
		'coreMessage' ,
		"^MIt's %s, the hour the DEAD are walking!!!^:\n" ,
		( '0' + date.getHours() ).slice( -2 ) + ':' + ( '0' + date.getMinutes() ).slice( -2 ) + ':' + ( '0' + date.getSeconds() ).slice( -2 )
	) ;
	
	self.reset( function( error ) {
		
		if ( error ) { log.error( "Undead raised, reset error: %E" , error ) ; }
		
		self.undeadBoundFn( function( error ) {
			log.debug( "Undead raised: %s" , error || 'ok' ) ;
		} ) ;
	} ) ;
} ;





			/* Adventurer mode */



Book.prototype.startAdventure = function startAdventure( options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( typeof callback !== 'function' ) { callback = noop ; }
	
	if ( ! this.startingScene ) { callback() ; return ; }
	
	this.busy( function( busyCallback ) {
		
		self.startingScene.exec( self , options , null , function( error ) {
			if ( error && ( error instanceof Error ) )
			{
				log.fatal( "Error: %E" , error ) ;
			}
			
			self.end( null , null , busyCallback ) ;
		} ) ;
	
	} , callback ) ;
} ;



// End
Book.prototype.end = function end( result , data , callback )
{
	if ( this.ended ) { callback() ; return ; }
	this.ended = true ;
	if ( ! result ) { result = 'end' ; }
	Ngev.groupEmit( this.clients , 'end' , result , data , callback ) ;
} ;



// Sync or async?
Book.prototype.apiEmit = function apiEmit( eventName , data )
{
	//log.error( "Api emit: %I" , arguments ) ;
	//this.api.emit( -1 , eventName , data ) ;
	this.api.emit( eventName , data ) ;
} ;



// Sync or async?
Book.prototype.apiOn = function apiOn( eventName , tag , ctx , options )
{
	var self = this , listener ;
	
	//log.error( "Api on: %I" , arguments ) ;
	
	listener = {
		//nice: -1 ,
		event: eventName ,
		once: options && options.once ,
		fn: function( data ) {
			
			var returnVal ;
			
			//log.error( "Api listener: %I" , arguments ) ;
			
			//setImmediate( function() {
				returnVal = tag.exec( self , { data: data , event: eventName } , ctx , function( error ) {
					if ( error ) { log.error( '[on] tag execution returned error: %E' , error ) ; }
					//log.error( "[on] tag finished" ) ;
				} ) ;
				
				if ( returnVal ) { log.error( '[on] tag execution returned error: %E' , returnVal ) ; }
			//} ) ;
		}
	} ;
	
	this.api.on( eventName , listener ) ;
	
	if ( options.scene )
	{
		options.scene.apiListeners.push( listener ) ;
	}
	else
	{
		this.apiListeners.push( listener ) ;
	}
} ;


