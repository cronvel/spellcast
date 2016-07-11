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

var CastTag = require( './tags/builder/CastTag.js' ) ;
var SummonTag = require( './tags/builder/SummonTag.js' ) ;

var Logfella = require( 'logfella' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true } ,
	]
} ) ;

var log = Logfella.global.use( 'spellcast' ) ;

var term = require( 'terminal-kit' ).terminal ;



function Book() { throw new Error( "Use Book.create() instead." ) ; }
Book.prototype = Object.create( NextGenEvents.prototype ) ;
Book.prototype.constructor = Book ;

module.exports = Book ;



Book.create = function createBook( script , proxy )
{
	if ( ! ( script instanceof TagContainer ) )
	{
		log.debug( "Script is not a TagContainer, but: %I" , script ) ;
		throw new Error( 'Book.create() arguments #0 should be a TagContainer' ) ;
	}
	
	var self = Object.create( Book.prototype , {
		script: { value: script , enumerable: true } ,
		persistent: { value: null , writable: true , enumerable: true } ,
		masterProxy: { value: proxy , enumerable: true } ,
		data: { value: ( proxy && proxy.data ) || {} , enumerable: true } ,
		wands: { value: {} , enumerable: true } ,
		activePrologue: { value: null , writable: true , enumerable: true } ,
		activeEpilogue: { value: null , writable: true , enumerable: true } ,
		spells: { value: {} , enumerable: true } ,
		summonings: { value: {} , enumerable: true } ,
		wildSummonings: { value: [] , enumerable: true } ,
		reverseSummonings: { value: [] , enumerable: true } ,
		
		deletedSummonings: { value: null , writable: true , enumerable: true } ,
		
		// New undead mode
		isIdle: { value: true , writable: true , enumerable: true } ,
		undeadMode: { value: false , writable: true , enumerable: true } ,
		undeadWatchers: { value: {} , enumerable: true } ,
		undeadRespawnTime: { value: 500 , writable: true , enumerable: true } ,
		undeadRespawnTimer: { value: null , writable: true , enumerable: true } ,
		undeadRespawnMap: { value: {} , writable: true , enumerable: true } ,
		undeadBoundFn: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	Object.defineProperties( self , {
		onChokidarWatch: { value: Book.onChokidarWatch.bind( self ) } ,
		onUndeadRaised: { value: Book.onUndeadRaised.bind( self ) } ,
	} ) ;
	
	return self ;
} ;



Book.load = function load( path )
{
	var proxy = { data: {} } ;
	
	var script = kungFig.load( path , {
		kfgFiles: {
			basename: [ 'spellbook' ]
		} ,
		metaHook: function( meta ) {
			var doctype ;
			
			if ( meta && ( doctype = meta.getUniqueTag( 'doctype' ) ) && doctype.attributes !== 'spellbook' )
			{
				throw new Error( "This is not a spellbook, but a '" + doctype.attributes + "' file." ) ;
			}
		} ,
		proxy: proxy ,
		tags: {
			formula: require( './tags/builder/FormulaTag.js' ) ,
			spell: require( './tags/builder/SpellTag.js' ) ,
			summoning: require( './tags/builder/SummoningTag.js' ) ,
			"reverse-summoning": require( './tags/builder/ReverseSummoningTag.js' ) ,
			cast: require( './tags/builder/CastTag.js' ) ,
			summon: require( './tags/builder/SummonTag.js' ) ,
			chant: require( './tags/builder/ChantTag.js' ) ,
			fortune: require( './tags/builder/FortuneTag.js' ) ,
			scroll: require( './tags/builder/ScrollTag.js' ) ,
			wand: require( './tags/builder/WandTag.js' ) ,
			zap: require( './tags/builder/ZapTag.js' ) ,
			epilogue: require( './tags/builder/EpilogueTag.js' ) ,
			prologue: require( './tags/builder/PrologueTag.js' ) ,
			
			glob: require( './tags/builder/GlobTag.js' ) ,
			
			foreach: require( './tags/core/ForeachTag.js' ) ,
			set: require( './tags/core/SetTag.js' ) ,
			clone: require( './tags/core/CloneTag.js' ) ,
			append: require( './tags/core/AppendTag.js' ) ,
			concat: require( './tags/core/ConcatTag.js' ) ,
			"if": require( './tags/core/IfTag.js' ) ,
			"elsif": require( './tags/core/ElsifTag.js' ) ,
			"elseif": require( './tags/core/ElsifTag.js' ) ,
			"else": require( './tags/core/ElseTag.js' ) ,
			
			debug: require( './tags/misc/DebugTag.js' ) ,
		}
	} ) ;
	
	var book = Book.create( script , proxy ) ;
	
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
		content = JSON.stringify( this.persistent ) ;
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



Book.prototype.summoned = function summoned( path , forSummoning , forSpell )
{
	var summonMap = this.persistent.summonMap ;
	
	// Remove all occurences of this summoning to deleteMap
	Object.keys( this.deleteMap.summoning ).forEach( summoning => {
		delete this.deleteMap.summoning[ summoning ][ path ] ;
	} ) ;
	
	Object.keys( this.deleteMap.spell ).forEach( spell => {
		delete this.deleteMap.spell[ spell ][ path ] ;
	} ) ;
	
	if ( forSummoning )
	{
		//log.error( "Adding to summonMap: summoning -> %s -> %s" , forSummoning , path ) ;
		if ( ! summonMap.summoning[ forSummoning ] ) { summonMap.summoning[ forSummoning ] = {} ; }
		summonMap.summoning[ forSummoning ][ path ] = true ;
	}
	
	if ( forSpell )
	{
		//log.error( "Adding to summonMap: spell -> %s -> %s" , forSummoning , path ) ;
		if ( ! summonMap.spell[ forSpell ] ) { summonMap.spell[ forSpell ] = {} ; }
		summonMap.spell[ forSpell ][ path ] = true ;
	}
} ;



Book.prototype.unsummoned = function unsummoned( path , forSummoning , forSpell )
{
	var summonMap = this.persistent.summonMap ;
	
	// Add to the deleteMap for each summoning/spell that has this in its summonMap
	Object.keys( summonMap.summoning ).forEach( summoning => {
		if ( summonMap.summoning[ summoning ][ path ] )
		{
			if ( ! this.deleteMap.summoning[ summoning ] ) { this.deleteMap.summoning[ summoning ] = {} ; }
			this.deleteMap.summoning[ summoning ][ path ] = true ;
		}
	} ) ;
	
	Object.keys( summonMap.spell ).forEach( spell => {
		if ( summonMap.spell[ spell ][ path ] )
		{
			if ( ! this.deleteMap.spell[ spell ] ) { this.deleteMap.spell[ spell ] = {} ; }
			this.deleteMap.spell[ spell ][ path ] = true ;
		}
	} ) ;
	
	if ( forSummoning ) { delete summonMap.summoning[ forSummoning ][ path ] ; }
	if ( forSpell ) { delete summonMap.spell[ forSpell ][ path ] ; }
	
	// Anyway, remove the summonMap for an eventual summoning of this path
	delete summonMap.summoning[ path ] ;
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
	else if ( ! this.isIdle && old ) { log.debug( "SWITCH TO BUSY!" ) ; }
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
		if ( doneMessage ) { term( doneMessage ) ; }
		
		self.setIdle( true ) ;
		callback.apply( self , arguments ) ;
	} ) ;
} ;	



Book.prototype.init = function init( tagContainer , callback )
{
	if ( ! tagContainer.init )
	{
		tagContainer.asyncCallEach( 'init' , this , tagContainer , function( error ) {
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



Book.prototype.populateDeletedSummonings = function populateDeletedSummonings( callback )
{
	var self = this ;
	
	// Already populated...
	if ( this.deleteMap ) { callback() ; return ; }
	
	this.deleteMap = {
		spell: {} ,
		summoning: {}
	} ;
	
	if ( ! this.persistent.summonMap ) { callback() ; return ; }
	
	var summonMap = this.persistent.summonMap ;
	var summonedMap = {} ;
	var summonedList = [] ;
	var deleted = {} ;
	
	// First, group summoned files, to avoid stating the same files multiple times
	
	Object.keys( summonMap.summoning ).forEach( summoning => {
		Object.keys( summonMap.summoning[ summoning ] ).forEach( summoned => summonedMap[ summoned ] = true ) ;
	} ) ;
	
	Object.keys( summonMap.spell ).forEach( spell => {
		Object.keys( summonMap.spell[ spell ] ).forEach( summoned => summonedMap[ summoned ] = true ) ;
	} ) ;
	
	summonedList = Object.keys( summonedMap ) ;
	
	if ( ! summonedList.length ) { callback() ; return ; }
	
	
	// Now stat everything
	async.foreach( summonedList , function( path , foreachCallback ) {
		fs.stat( path , function( error ) {
			if ( error )
			{
				// This is NOT an error
				log.debug( "Detected deleted summoning: '%s'" , path ) ;
				deleted[ path ] = true ;
			}
			
			foreachCallback() ;
		} ) ;
	} )
	.exec( function( error ) {
		if ( error ) { callback( error ) ; return ; }
		
		Object.keys( summonMap.summoning ).forEach( summoning => {
			if ( ! self.deleteMap.summoning[ summoning ] ) { self.deleteMap.summoning[ summoning ] = {} ; }
			
			Object.keys( summonMap.summoning[ summoning ] ).forEach( summoned => {
				if ( deleted[ summoned ] ) { self.deleteMap.summoning[ summoning ][ summoned ] = true ; }
			 } ) ;
		} ) ;
		
		Object.keys( summonMap.spell ).forEach( spell => {
			if ( ! self.deleteMap.spell[ spell ] ) { self.deleteMap.spell[ spell ] = {} ; }
			
			Object.keys( summonMap.spell[ spell ] ).forEach( summoned => {
				if ( deleted[ summoned ] ) { self.deleteMap.spell[ spell ][ summoned ] = true ; }
			} ) ;
		} ) ;
		
		callback() ;
	} ) ;
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
		
		self.populateDeletedSummonings( function( error ) {
			if ( error ) { busyCallback( error ) ; return ; }
			
			CastTag.exec( self , spellName , options , null , function( error ) {
				if ( error ) { busyCallback( error ) ; return ; }
				self.savePersistent( busyCallback ) ;
			} ) ;
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
		
		self.populateDeletedSummonings( function( error ) {
			if ( error ) { busyCallback( error ) ; return ; }
			
			SummonTag.exec( self , summoningName , options , null , function( error ) {
				if ( error ) { busyCallback( error ) ; return ; }
				self.savePersistent( busyCallback ) ;
			} ) ;
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
	
	this.undeadWatchers[ path ].on( 'all' , this.onChokidarWatch.bind( this , path ) ) ;
	
	
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



Book.onChokidarWatch = function onChokidarWatch( watchPath , event , path )
{
	var self = this , i , iMax , discoveryPathObject , discoveryList , found ;
	
	if ( ! this.undeadMode ) { return ; }
	
	log.verbose( "onChokidarWatch(): '%s' '%s' '%s'" , watchPath , event , path ) ;
	
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
	
	term( "^MThe DEAD are walking!!!^:\n" ) ;
	
	self.reset( function( error ) {
		
		if ( error ) { log.error( "Undead raised, reset error: %E" , error ) ; }
		
		self.undeadBoundFn( function( error ) {
			log.debug( "Undead raised: %s" , error || 'ok' ) ;
		} ) ;
	} ) ;
} ;


