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



/*
	TODO:
		* turn arguments using hyphen in spellbooks into camelCase (e.g. write-formula should be writeFormula in code)
		* automatically check date versus the 'spellbook' file (just like if 'spellbook' was added to all 'summon' block)
		* escape formula variable substitution
		* new blocks:
			- spellbook
			- wand
			- zap
			- sscroll : like scroll but remotely (sh->ssh)
		* find the right regexp for split(/,/) because '\,' should not split
	
	BUGS:
		* escape of spaces in arguments
*/



// Load modules
var spellcastPackage = require( '../package.json' ) ;

var fs = require( 'fs' ) ;
var chokidar = require( 'chokidar' ) ;
var minimatch = require( '@cronvel/minimatch' ) ;

var utils = require( './utils.js' ) ;

//var string = require( 'string-kit' ) ;
//var tree = require( 'tree-kit' ) ;
var async = require( 'async-kit' ) ;
var doormen = require( 'doormen' ) ;
var kungFig = require( 'kung-fig' ) ;
var NextGenEvents = require( 'nextgen-events' ) ;

var TagContainer = kungFig.TagContainer ;

var CastTag = require( './tags/spellcaster/CastTag.js' ) ;
var SummonTag = require( './tags/spellcaster/SummonTag.js' ) ;

var Logfella = require( 'logfella' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true } ,
	]
} ) ;

var log = Logfella.global.use( 'spellcast' ) ;

function noop() {}



function Book() { throw new Error( "Use Book.create() instead." ) ; }
Book.prototype = Object.create( NextGenEvents.prototype ) ;
Book.prototype.constructor = Book ;

module.exports = Book ;



var bookType = {
	spellbook: true ,
	"adventure-book": true
} ;



Book.create = function createBook( script , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( script instanceof TagContainer ) )
	{
		log.debug( "Script is not a TagContainer, but: %I" , script ) ;
		throw new TypeError( "Book.create() arguments #0 should be a TagContainer" ) ;
	}
	
	if ( ! options.api ) { options.api = new NextGenEvents() ; }
	
	if ( ! ( options.api instanceof NextGenEvents ) )
	{
		log.debug( "If provided, API should be an instance of NextGenEvents" ) ;
		throw new TypeError( "Book.create() arguments #2 (if provided) should be an instance of NextGenEvents" ) ;
	}
	
	if ( ! options.type ) { options.type = 'spellbook' ; }
	
	if ( ! bookType[ options.type ] )
	{
		throw new Error( "This is an unsupported type: '" + options.type + "'." ) ;
	}
	
	var self = Object.create( Book.prototype , {
		script: { value: script , enumerable: true } ,
		type: { value: options.type , enumerable: true } ,
		api: { value: options.api , enumerable: true } ,
		persistent: { value: null , writable: true , enumerable: true } ,
		masterProxy: { value: options.proxy , enumerable: true } ,
		data: { value: ( options.proxy && options.proxy.data ) || {} , enumerable: true } ,
		wands: { value: {} , enumerable: true } ,
		input: { value: new NextGenEvents() , enumerable: true } ,
		activePrologue: { value: null , writable: true , enumerable: true } ,
		activeEpilogue: { value: null , writable: true , enumerable: true } ,
		spells: { value: {} , enumerable: true } ,
		summonings: { value: {} , enumerable: true } ,
		wildSummonings: { value: [] , enumerable: true } ,
		reverseSummonings: { value: [] , enumerable: true } ,
		
		// Server mode
		acceptTokens: { value: {} , enumerable: true } ,
		
		// New undead mode
		isIdle: { value: true , writable: true , enumerable: true } ,
		undeadMode: { value: false , writable: true , enumerable: true } ,
		undeadWatchers: { value: {} , enumerable: true } ,
		undeadRespawnTime: { value: 500 , writable: true , enumerable: true } ,
		undeadRespawnTimer: { value: null , writable: true , enumerable: true } ,
		undeadRespawnMap: { value: {} , writable: true , enumerable: true } ,
		undeadBoundFn: { value: null , writable: true , enumerable: true } ,
		
		// Adventure mode
		sceneStack: { value: [] , enumerable: true } ,
		activeScene: {
			get: function() {
				if ( ! this.sceneStack.length ) { return ; }
				return this.sceneStack[ this.sceneStack.length - 1 ] ;
			} ,
			set: function( scene ) {
				if ( this.sceneStack.length )
				{
					if ( scene ) { this.sceneStack[ this.sceneStack.length - 1 ] = scene ; }
					//else { this.sceneStack.length -- ; }
				}
				else if ( scene ) { this.sceneStack[ 0 ] = scene ; }
			}
		} ,
		nexts: { value: [] , writable: true , enumerable: true } ,
		scenes: { value: {} , enumerable: true } ,
		startingScene: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	Object.defineProperties( self , {
		onFsWatchEvent: { value: Book.onFsWatchEvent.bind( self ) } ,
		onUndeadRaised: { value: Book.onUndeadRaised.bind( self ) } ,
	} ) ;
	
	process.on( 'asyncExit' , function( code , timeout , callback ) {
		self.emit( 'exit' , code , timeout , callback ) ;
	} ) ;
	
	return self ;
} ;



Book.load = function load( path , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	options.proxy = options.proxy || {} ;
	options.proxy.data = options.proxy.data || {} ;
	
	// /!\ Should implement lazy loading here /!\
	
	var tags = {
		formula: require( './tags/spellcaster/FormulaTag.js' ) ,
		spell: require( './tags/spellcaster/SpellTag.js' ) ,
		summoning: require( './tags/spellcaster/SummoningTag.js' ) ,
		"reverse-summoning": require( './tags/spellcaster/ReverseSummoningTag.js' ) ,
		cast: require( './tags/spellcaster/CastTag.js' ) ,
		summon: require( './tags/spellcaster/SummonTag.js' ) ,
		scroll: require( './tags/spellcaster/ScrollTag.js' ) ,
		wand: require( './tags/spellcaster/WandTag.js' ) ,
		zap: require( './tags/spellcaster/ZapTag.js' ) ,
		epilogue: require( './tags/spellcaster/EpilogueTag.js' ) ,
		prologue: require( './tags/spellcaster/PrologueTag.js' ) ,
		glob: require( './tags/spellcaster/GlobTag.js' ) ,
		chant: require( './tags/io/MessageTag.js' ) ,	// Alias of [message]
		
		foreach: require( './tags/core/ForeachTag.js' ) ,
		set: require( './tags/core/SetTag.js' ) ,
		clone: require( './tags/core/CloneTag.js' ) ,
		append: require( './tags/core/AppendTag.js' ) ,
		concat: require( './tags/core/ConcatTag.js' ) ,
		"if": require( './tags/core/IfTag.js' ) ,
		"elsif": require( './tags/core/ElsifTag.js' ) ,
		"elseif": require( './tags/core/ElsifTag.js' ) ,
		"else": require( './tags/core/ElseTag.js' ) ,
		js: require( './tags/core/JsTag.js' ) ,
		
		message: require( './tags/io/MessageTag.js' ) ,
		fortune: require( './tags/io/FortuneTag.js' ) ,
		input: require( './tags/io/InputTag.js' ) ,
		
		debug: require( './tags/misc/DebugTag.js' ) ,
		
		// Adventure mode
		chapter: require( './tags/adventure/ChapterTag.js' ) ,
		scene: require( './tags/adventure/SceneTag.js' ) ,
		next: require( './tags/adventure/NextTag.js' ) ,
		include: require( './tags/adventure/IncludeTag.js' ) ,
		subscene: require( './tags/adventure/SubsceneTag.js' ) ,
		emit: require( './tags/adventure/EmitTag.js' ) ,
		on: require( './tags/adventure/OnTag.js' ) ,
		once: require( './tags/adventure/OnTag.js' ) ,
	} ;
	
	var script = kungFig.load( path , {
		kfgFiles: {
			basename: [ 'spellbook' ]
		} ,
		metaHook: function( meta ) {
			var doctypeMeta ;
			
			if ( ! meta || ! ( doctypeMeta = meta.getUniqueTag( 'doctype' ) ) )
			{
				throw new Error( "No [[doctype]] meta tag found." ) ;
			}
			
			if ( ! bookType[ doctypeMeta.attributes ] || ( options.type && options.type !== doctypeMeta.attributes ) )
			{
				throw new Error( "This is an unsupported doctype: '" + doctypeMeta.attributes + "'." ) ;
			}
			
			options.type = doctypeMeta.attributes ;
		} ,
		proxy: options.proxy ,
		operators: require( './operators.js' ) ,
		tags: tags
	} ) ;
	
	var book = Book.create( script , options ) ;
	
	return book ;
} ;



Book.prototype.initBook = function initBook( callback )
{
	var self = this ;
	
	this.busy( function( busyCallback ) {
		
		self.prepareDotSpellcastDirectory( function( initError ) {
		
			if ( initError ) { busyCallback( initError ) ; return ; }
			
			// Run call init too, if it has not been called yet
			self.run( self.script , function( runError ) {
				if ( runError ) { busyCallback( runError ) ; return ; }
				busyCallback() ;
			} ) ;
		} ) ;
	} , callback ) ;
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
	
	var directories = [ '.spellcast' , '.spellcast/casted' , '.spellcast/fizzled' , '.spellcast/tmp' ] ;
	
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
	
	fs.readFile( '.spellcast/persistent.json' , 'utf8' , function( error , content ) {
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
	
	fs.writeFile( '.spellcast/persistent.json' , content , 'utf8' , function( error ) {
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
		if ( doneMessage ) { self.emit( 'coreMessage' , doneMessage ) ; }
		
		self.setIdle( true ) ;
		callback.apply( self , arguments ) ;
	} ) ;
} ;	



Book.prototype.init = function init( tagContainer , callback )
{
	if ( ! tagContainer.init )
	{
		tagContainer.asyncCallEach( 'init' , this , function( error ) {
			if ( error ) { callback( error ) ; return ; }
			tagContainer.init = true ;
			callback() ;
		} ) ;
	}
	else
	{
		callback() ;
	}
} ;



Book.prototype.run = function run( tagContainer , context , callback )
{
	var self = this ;
	
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	if ( ! tagContainer.init )
	{
		self.init( tagContainer , function( error ) {
			if ( error ) { callback( error ) ; return ; }
			tagContainer.asyncCallEach( 'run' , self , context , callback ) ;
		} ) ;
	}
	else
	{
		tagContainer.asyncCallEach( 'run' , self , context , callback ) ;
	}
} ;



Book.prototype.reset = function reset( callback )
{
	this.resetReverseSummonings( callback ) ;
} ;



Book.prototype.resetReverseSummonings = function resetReverseSummonings( callback )
{
	var self = this ;
	
	async.foreach( self.reverseSummonings , function( reverseSummoning , foreachCallback ) {
		reverseSummoning.reset( foreachCallback ) ;
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
	var self = this ;
	
	log.debug( "Undeads raised: %s" , undeadList ) ;
	
	self.emit( 'coreMessage' , "^MThe DEAD are walking!!!^:\n" ) ;
	
	self.reset( function( error ) {
		
		if ( error ) { log.error( "Undead raised, reset error: %E" , error ) ; }
		
		self.undeadBoundFn( function( error ) {
			log.debug( "Undead raised: %s" , error || 'ok' ) ;
		} ) ;
	} ) ;
} ;





			/* Adventure mode */



Book.prototype.startAdventure = function startAdventure( options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( typeof callback !== 'function' ) { callback = noop ; }
	
	if ( ! this.startingScene ) { callback() ; return ; }
	
	this.busy( function( busyCallback ) {
		self.startingScene.exec( self , options , null , function() {
			self.emit( 'end' , busyCallback ) ;
		} ) ;
	} , callback ) ;
} ;



Book.prototype.apiEmit = function apiEmit( event , data )
{
	//log.error( "Api emit: %I" , arguments ) ;
	this.api.emit( -1 , event , data ) ;
} ;



Book.prototype.apiOn = function apiOn( event , tag , execContext , options )
{
	var self = this ;
	
	//log.error( "Api on: %I" , arguments ) ;
	
	this.api.on( event , {
		nice: -1 ,
		once: options && options.once ,
		fn: function( data ) {
			//log.error( "Api listener: %I" , arguments ) ;
			setImmediate( function() {
				tag.exec( self , { data: data , event: event } , execContext , function( error ) {
					if ( error ) { log.error( '[on] tag execution returned error: %E' , error ) ; }
					//log.error( "[on] tag finished" ) ;
				} ) ;
			} ) ;
		}
	} ) ;
} ;

