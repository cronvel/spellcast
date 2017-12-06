/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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
var CastTag = require( './tags/caster/CastTag.js' ) ;
var SummonTag = require( './tags/caster/SummonTag.js' ) ;

var Role = require( './Role.js' ) ;
var Client = require( './Client.js' ) ;
var Ctx = require( './Ctx.js' ) ;

var Logfella = require( 'logfella' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{ type: 'console' , timeFormatter: 'time' , color: true , output: 'stderr' } ,
	]
} ) ;

Logfella.userland = Logfella.create( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{ type: 'console' , timeFormatter: 'time' , color: true , output: 'stderr' } ,
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
	else if ( ! ( options.api instanceof Ngev ) )
	{
		log.debug( "If provided, API should be an instance of NextGenEvents" ) ;
		throw new TypeError( "Book.create() arguments #2 (if provided) should be an instance of NextGenEvents" ) ;
	}
	
	// The event bus should be interruptible, so the [cancel] tag will works
	options.api.setInterruptible( true ) ;
	options.api.serializeListenerContext( 'script' ) ;
	
	if ( ! options.type ) { options.type = 'story' ; }
	
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
		initEvents: { value: null , writable: true , enumerable: true } ,
		api: { value: options.api , enumerable: true } ,
		//apiListeners: { value: {} , enumerable: true } ,
		exitSent: { value: false , writable: true , enumerable: true } ,
		
		// Caster mode
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
		
		// Story mode
		ended: { value: false , writable: true , enumerable: true } ,
		scenes: { value: {} , enumerable: true } ,
		startingScene: { value: null , writable: true , enumerable: true } ,
		entityModels: { value: {} , writable: true , enumerable: true } ,
		itemModels: { value: {} , writable: true , enumerable: true } ,
		entityClasses: { value: {} , writable: true , enumerable: true } ,
		entityCompoundStats: { value: {} , writable: true , enumerable: true } ,
		usageCompoundStats: { value: {} , writable: true , enumerable: true } ,
		hereActions: { value: null , writable: true , enumerable: true } ,
		statusUpdater: { value: null , writable: true , enumerable: true } ,
		nextPanel: { value: null , writable: true , enumerable: true } ,
		generators: { value: {} , writable: true , enumerable: true } ,
		
		// Chatbot
		interpreters: { value: {} , writable: true , enumerable: true } ,
		queryPatternTree: { value: {} , writable: true , enumerable: true } ,
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



const KFG_MODULE_PATH = {
	core: pathModule.normalize( __dirname + '/../script-lib/core' ) ,
	rpg: pathModule.normalize( __dirname + '/../script-lib/rpg' )
} ;



Book.load = function load( path , options )
{
	var doctype , regex , availableTags = {} , script ;
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	switch ( options.type )
	{
		case 'story' :
			doctype = 'spellcast/book' ;
			break ;
		case 'caster' :
			doctype = 'spellcast/spellbook' ;
			break ;
		default :
			doctype = [ 'spellcast/book' , 'spellcast/spellbook' ] ;
			break ;
	}
	
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
	
	
	script = kungFig.load( path , {
		kfgFiles: {
			basename: [ 'spellbook' , 'book' ]
		} ,
		noKfgCache: true ,
		modulePath: KFG_MODULE_PATH ,
		doctype: doctype ,
		metaHook: function( meta , parseOptions ) {
			var localesMeta , assetsMeta , locale ;
			
			if ( ! parseOptions.isInclude )
			{
				// This is the top-level KFG!
				doctype = meta.getUniqueTag( 'doctype' ).attributes ;
				
				switch ( doctype )
				{
					case 'spellcast/book' :
						options.type = 'story' ;
						break ;
					case 'spellcast/spellbook' :
						options.type = 'caster' ;
						break ;
				}
				
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
				if (
					pathModule.isAbsolute( assetsMeta.attributes ) ||
					assetsMeta.attributes[ 0 ] === '~' ||
					assetsMeta.attributes.indexOf( '..' ) !== -1
				)
				{
					// For security sake...
					throw new Error( "Asset tag's path should be relative to the book and should not contain any '../'" ) ;
				}
				
				options.assetBaseUrl = fs.realpathSync( pathModule.dirname( path ) + '/' + assetsMeta.attributes ) ;
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
	this.busy( ( busyCallback ) => {
		
		this.prepareDotSpellcastDirectory( ( initError ) => {
		
			if ( initError ) { busyCallback( initError ) ; return ; }
			
			// Script init
			this.engine.init( this.script , this , ( initError ) => {
			
				if ( initError ) { busyCallback( initError ) ; return ; }
				
				// Run the top-level
				var initCtx = Ctx.create( this ) ;
				
				this.engine.runCb( this.script , this , initCtx , null , ( runError ) => {
					
					// Save the events used for init
					this.initEvents = initCtx.events ;
					
					// Destroy the init context now!
					initCtx.destroy() ;
					
					if ( runError ) { busyCallback( runError ) ; return ; }
					
					// Create at least one role
					if ( ! this.roles.length )
					{
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



Book.prototype.loadPersistent = function loadPersistent( callback )
{
	fs.readFile( this.cwd + '/.spellcast/persistent.json' , 'utf8' , ( error , content ) => {
		// Not found is not an error
		if ( error )
		{
			log.verbose( "'persistent.json' not found" ) ;
			this.persistent = doormen( persistentJsonSchema , {} ) ;
			callback() ;
			return ;
		}
		
		try {
			this.persistent = doormen( persistentJsonSchema , JSON.parse( content ) ) ;
		}
		catch ( error ) {
			log.error( "Parse 'persistent.json': %E" , error ) ;
			this.persistent = doormen( persistentJsonSchema , {} ) ;
		}
		
		if ( ! utils.isCompatible( this.persistent.version ) )
		{
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
			modulePath: KFG_MODULE_PATH ,
			metaHook: ( meta , parseOptions ) => {
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
	
	fs.writeFile( this.cwd + '/.spellcast/persistent.json' , content , 'utf8' , ( error ) => {
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
	if ( this.exitSent ) { callback() ; return ; }
	this.exitSent = true ;
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
	async.foreach( this.reverseSummonings , ( reverseSummoning , foreachCallback ) => {
		reverseSummoning.reset( this , foreachCallback ) ;
	} )
	.exec( callback ) ;
} ;



			/* Book/Spellbook main API */



Book.prototype.cast = function cast( spellName , options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( options && options.again ) { this.persistent.summoned = {} ; }
	
	if ( options && options.undead )
	{
		this.initUndeadMode( options.undead , this.cast.bind( this , spellName , null ) ) ;
	}
	
	this.busy( '^MAll casting done.^:\n\n' , ( busyCallback ) => {
		
		CastTag.exec( this , spellName , options , null , ( error ) => {
			if ( error ) { busyCallback( error ) ; return ; }
			this.savePersistent( busyCallback ) ;
		} ) ;
		
	} , callback ) ;
} ;



Book.prototype.summon = function summon( summoningName , options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( options && options.again ) { this.persistent.summoned = {} ; }
	
	if ( options && options.undead )
	{
		this.initUndeadMode( options.undead , this.summon.bind( this , summoningName , null ) ) ;
	}
	
	this.busy( '^MAll summoning done.^:\n\n' , ( busyCallback ) => {
		
		SummonTag.exec( this , summoningName , options , null , ( error ) => {
			if ( error ) { busyCallback( error ) ; return ; }
			this.savePersistent( busyCallback ) ;
		} ) ;
		
	} , callback ) ;
} ;



Book.prototype.prologue = function prologue( options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( ! this.activePrologue ) { callback() ; return ; }
	
	this.busy( ( busyCallback ) => {
		this.activePrologue.exec( this , options , null , busyCallback ) ;
	} , callback ) ;
} ;



Book.prototype.epilogue = function epilogue( options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( ! this.activeEpilogue ) { callback() ; return ; }
	
	this.busy( ( busyCallback ) => {
		this.activeEpilogue.exec( this , options , null , busyCallback ) ;
	} , callback ) ;
} ;



Book.prototype.sendMessageToAll = function sendMessageToAll( ctx , text , options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	else if ( ! options || typeof options !== 'object' ) { options = null ; }
	
	if ( typeof callback !== 'function' ) { callback = noop ; }
	
	if ( typeof text !== 'string' ) { throw new TypeError( "Book#sendMessage() 'text' argument should be a string" ) ; }
	
	//log.error( "Book#sendMessageToAll() text: %s, roles: %Y" , text , ctx.roles.map( r => r.label ) ) ;
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
	var rolesAssigned , triggeredCallback = false ;
	
	// Manage arguments
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	// First, add all roles to the book data, make it non-enumerable (not needed to be saved)
	if ( ! this.data.roles || typeof this.data.roles !== 'object' )
	{
		Object.defineProperty( this.data , 'roles' , { value: {} } ) ;
	}
	
	this.roles.forEach( e => Object.defineProperty( this.data.roles , e.id , { value: e , writable: true } ) ) ;
	
	
	var update = () => {
		
		var assignedClients ;
		
		rolesAssigned = this.checkRoles( options ) ;
		
		if ( rolesAssigned )
		{
			assignedClients = this.clients.filter( e => e.role ) ;
			Ngev.groupOff( assignedClients , 'selectRole' , onSelectRole ) ;
			Ngev.groupOff( assignedClients , 'chat' , onChat ) ;
		}
		
		if ( rolesAssigned || this.roles.length >= 2 )
		{
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
		
		if ( rolesAssigned && ! triggeredCallback )
		{
			triggeredCallback = true ;
			callback() ;
		}
	} ;
	
	var onSelectRole = ( client , roleIndex ) => {
		if ( roleIndex === null )
		{
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
	
	this.undeadWatchers[ path ].on( 'error' , ( error ) => {
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
	log.debug( "Canceling respawn for '%s'" , path ) ;
	delete this.undeadRespawnMap[ path ] ;
	
	// Because of race conditions, the filesystem watch event can happened slightly after the cancel action
	setTimeout( () => {
		log.debug( "Delayed canceling respawn for '%s'" , path ) ;
		delete this.undeadRespawnMap[ path ] ;
	} , 10 ) ;
} ;



Book.onFsWatchEvent = function onFsWatchEvent( watchPath , event , path )
{
	var i , iMax , discoveryPathObject , discoveryList , found ;
	
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
	
	
	var clear = () => {
		if ( this.undeadRespawnTimer )
		{
			clearTimeout( this.undeadRespawnTimer ) ;
			this.undeadRespawnTimer = null ;
		}
	} ;
	
	this.undeadRespawnMap[ path ] = true ;
	
	log.debug( "About to raise undead: '%s' ('%s' event on '%s')" , path , event , watchPath ) ;
	
	clear() ;
	this.idle( () => {
		clear() ;
		this.undeadRespawnTimer = setTimeout( () => {
			clear() ;
			this.idle( () => {
				clear() ;
				var undeadList = Object.keys( this.undeadRespawnMap ) ;
				this.undeadRespawnMap = {} ;
				
				if ( undeadList.length )
				{
					// Some respawn may have been canceled
					this.emit( 'undeadRaised' , undeadList ) ;
				}
				else
				{
					log.debug( "undeadRaised canceled: all respawn were canceled" ) ;
				}
			} ) ;
		} , this.undeadRespawnTime ) ;
	} ) ;
} ;



Book.onUndeadRaised = function onUndeadRaised( undeadList )
{
	var date = new Date() ;
	
	log.debug( "Undeads raised: %s" , undeadList ) ;
	
	Ngev.groupEmit(
		this.clients ,
		'coreMessage' ,
		"^MIt's %s, the hour the DEAD are walking!!!^:\n" ,
		( '0' + date.getHours() ).slice( -2 ) + ':' + ( '0' + date.getMinutes() ).slice( -2 ) + ':' + ( '0' + date.getSeconds() ).slice( -2 )
	) ;
	
	this.reset( ( error ) => {
		
		if ( error ) { log.error( "Undead raised, reset error: %E" , error ) ; }
		
		this.undeadBoundFn( ( error ) => {
			log.debug( "Undead raised: %s" , error || 'ok' ) ;
		} ) ;
	} ) ;
} ;





			/* Story mode */



Book.prototype.startStory = function startStory( options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( typeof callback !== 'function' ) { callback = noop ; }
	
	if ( ! this.startingScene ) { callback() ; return ; }
	
	this.busy( ( busyCallback ) => {
		
		this.startingScene.exec( this , options , null , ( error ) => {
			if ( error && ( error instanceof Error ) )
			{
				log.fatal( "Error: %E" , error ) ;
			}
			
			this.end( null , null , busyCallback ) ;
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



// How API events should be managed? (particularly during [split])

/*
Book.prototype.apiEmit = function apiEmit( eventName , data , callback )
{
	//log.error( "Api emit: %I" , arguments ) ;
	//this.api.emit( -1 , eventName , data ) ;
	this.api.emit( eventName , data , callback ) ;
} ;



Book.prototype.apiOn = function apiOn( eventName , tag , ctx , options )
{
	options = options || {} ;
	
	var listener ,
		id = options.id || undefined ,
		once = options.once ;
	
	//log.error( "Api on: %I" , arguments ) ;
	
	// Event emitting is serialized:
	// async listeners are called one at a time, because the 'script' context is serialized
	
	listener = {
		//nice: -1 ,
		event: eventName ,
		id: id ,
		async: true ,
		context: 'script' ,
		once: once ,
		fn: ( data , callback ) => {
			
			//log.error( "Api listener: %I" , arguments ) ;
			
			if ( tag.isDefault && this.api.listenerCount( eventName ) > 1 )
			{
				// Default listener only fire if they are alone
				callback() ;
				return ;
			}
			
			var returnVal = tag.exec( this , { data: data , event: eventName } , ctx , ( error ) => {
				if ( once ) { delete this.apiListeners[ id ] ; }
				
				if ( error )
				{
					switch ( error.break )
					{
						case 'cancel' :
							//log.error( "Async returnval: %I" , error ) ;
							callback( error.cancel ) ;
							return ;
						default :
							log.error( '[on] tag execution returned error: %E' , error ) ;
							//callback( error ) ;	// or not???
							break ;
					}
				}
				
				//log.error( "[on] tag finished" ) ;
				
				callback() ;
			} ) ;
			
			// When the return value is undefined, it means this was an async tag execution
			if ( returnVal === undefined ) { return ; }
			
			// Sync variant...
			
			if ( once ) { delete this.apiListeners[ id ] ; }
			
			if ( returnVal )
			{
				switch ( returnVal.break )
				{
					case 'cancel' :
						//log.error( "Returnval: %I" , returnVal ) ;
						callback( returnVal.cancel ) ;
						return ;
					default :
						log.error( '[on] tag execution returned error: %E' , returnVal ) ;
						//callback( error ) ;	// or not???
						break ;
				}
			}
			
			callback() ;
		}
	} ;
	
	this.api.on( eventName , listener ) ;
	
	this.apiListeners[ id ] = listener ;
	if ( options.scene ) { options.scene.apiListeners[ id ] = listener ; }
} ;



Book.prototype.apiOff = function apiOff( id )
{
	if ( ! this.apiListeners[ id ] ) { return ; }
	
	this.api.off( this.apiListeners[ id ].event , id ) ;
	delete this.apiListeners[ id ] ;
} ;
*/

