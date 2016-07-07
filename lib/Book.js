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
var async = require( 'async-kit' ) ;
var fs = require( 'fs' ) ;
//var string = require( 'string-kit' ) ;
//var tree = require( 'tree-kit' ) ;

var kungFig = require( 'kung-fig' ) ;
var NextGenEvents = require( 'nextgen-events' ) ;

var TagContainer = kungFig.TagContainer ;

var CastTag = require( './builder/CastTag.js' ) ;
var SummonTag = require( './builder/SummonTag.js' ) ;

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
		masterProxy: { value: proxy , enumerable: true } ,
		data: { value: ( proxy && proxy.data ) || {} , enumerable: true } ,
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
		undeadRespawnTimer: { value: null , writable: true , enumerable: true } ,
		undeadBoundFn: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	Object.defineProperties( self , {
		onFsWatch: { value: Book.onFsWatch.bind( self ) } ,
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
			formula: require( './builder/FormulaTag.js' ) ,
			spell: require( './builder/SpellTag.js' ) ,
			summoning: require( './builder/SummoningTag.js' ) ,
			"reverse-summoning": require( './builder/ReverseSummoningTag.js' ) ,
			sources: require( './builder/SourcesTag.js' ) ,
			cast: require( './builder/CastTag.js' ) ,
			summon: require( './builder/SummonTag.js' ) ,
			chant: require( './builder/ChantTag.js' ) ,
			fortune: require( './builder/FortuneTag.js' ) ,
			scroll: require( './builder/ScrollTag.js' ) ,
			wand: require( './builder/WandTag.js' ) ,
			zap: require( './builder/ZapTag.js' ) ,
			epilogue: require( './builder/EpilogueTag.js' ) ,
			prologue: require( './builder/PrologueTag.js' ) ,
			
			glob: require( './builder/GlobTag.js' ) ,
			
			foreach: require( './core/ForeachTag.js' ) ,
			set: require( './core/SetTag.js' ) ,
			clone: require( './core/CloneTag.js' ) ,
			append: require( './core/AppendTag.js' ) ,
			concat: require( './core/ConcatTag.js' ) ,
			"if": require( './core/IfTag.js' ) ,
			"elsif": require( './core/ElsifTag.js' ) ,
			"elseif": require( './core/ElsifTag.js' ) ,
			"else": require( './core/ElseTag.js' ) ,
			
			debug: require( './misc/DebugTag.js' ) ,
		}
	} ) ;
	
	var book = Book.create( script , proxy ) ;
	
	return book ;
} ;



Book.prototype.initBook = function initBook( callback )
{
	var self = this ;
	
	this.busy( function( busyCallback ) {
		
		self.prepareDirectories( function( initError ) {
		
			if ( initError ) { busyCallback( initError ) ; return ; }
			
			// Run call init too, if it has not been called yet
			self.run( self.script , function( runError ) {
				if ( runError ) { busyCallback( runError ) ; return ; }
				busyCallback() ;
			} ) ;
		} ) ;
	} , callback ) ;
} ;



Book.prototype.prepareDirectories = function prepareDirectories( callback )
{
	var directories = [ '.spellcast' , '.spellcast/casted' , '.spellcast/fizzled' , '.spellcast/tmp' ] ;
	
	async.foreach( directories , function( path , foreachCallback ) {
		fs.exists( path , function( exists ) {
			if ( exists ) { foreachCallback() ; }
			else { fs.mkdir( path , foreachCallback ) ; }
		} ) ;
	} )
	.exec( callback ) ;
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



Book.prototype.busy = function busy( busyFn , callback )
{
	var self = this ;
	
	this.setIdle( false ) ;
	
	busyFn( function() {
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



			/* Book/Spellbook main API */



Book.prototype.cast = function cast( spellName , options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( options && options.undead )
	{
		this.initUndeadMode( this.cast.bind( this , spellName , null ) ) ;
	}
	
	this.busy( function( busyCallback ) {
		CastTag.exec( self , spellName , options , null , busyCallback ) ;
	} , callback ) ;
} ;



Book.prototype.summon = function summon( summoningName , options , callback )
{
	var self = this ;
	
	if ( typeof options === 'function' ) { callback = options ; options = null ; }
	
	if ( options && options.undead )
	{
		this.initUndeadMode( this.summon.bind( this , summoningName , null ) ) ;
	}
	
	this.busy( function( busyCallback ) {
		SummonTag.exec( self , summoningName , options , null , busyCallback ) ;
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



Book.prototype.initUndeadMode = function initUndeadMode( boundFn )
{
	Object.keys( this.undeadWatchers ).forEach( e => this.dispellUndead( e ) ) ;
	this.on( 'undeadRaised' , this.onUndeadRaised ) ;
	this.undeadBoundFn = boundFn ;
	this.undeadMode = true ;
} ;



Book.prototype.stopUndeadMode = function stopUndeadMode()
{
	Object.keys( this.undeadWatchers ).forEach( e => this.dispellUndead( e ) ) ;
	this.off( 'undeadRaised' , this.onUndeadRaised ) ;
	this.undeadBoundFn = null ;
	this.undeadMode = false ;
} ;



Book.prototype.castUndead = function castUndead( path )
{
	if ( ! this.undeadMode || this.undeadWatchers[ path ] ) { return ; }
	
	log.debug( "New undead: %s" , path ) ;
	this.undeadWatchers[ path ] = fs.watch( path , this.onFsWatch ) ;
	
	this.undeadWatchers[ path ].on( 'error' , function( error ) {
		log.error( "Cast undead error: %E" , error ) ;
	} ) ;
} ;



Book.prototype.dispellUndead = function dispellUndead( path )
{
	if ( ! this.undeadMode || ! this.undeadWatchers[ path ] ) { return ; }
	this.undeadWatchers[ path ].close() ;
	delete this.undeadWatchers[ path ] ;
} ;



Book.onFsWatch = function onFsWatch( event , filename )
{
	var self = this ;
	
	if ( ! this.undeadMode ) { return ; }
	
	log.debug( "onFsWatch(): %s %s" , event , filename ) ;
	
	var clear = function clear() {
		if ( self.undeadRespawnTimer )
		{
			clearTimeout( self.undeadRespawnTimer ) ;
			self.undeadRespawnTimer = null ;
		}
	} ;
	
	clear() ;
	self.idle( function() {
		clear() ;
		self.undeadRespawnTimer = setTimeout( function() {
			clear() ;
			self.idle( function() {
				clear() ;
				log.debug( "Emit undeadRaised" ) ;
				self.emit( 'undeadRaised' ) ;
			} ) ;
		} , 500 ) ;
	} ) ;
} ;



Book.onUndeadRaised = function onUndeadRaised()
{
	var self = this ;
	
	log.debug( "Undead raised!" ) ;
	
	term( "^MThe DEAD are walking!!!^:\n" ) ;
	
	self.reset( function( error ) {
		
		if ( error ) { log.error( "Undead raised, reset error: %E" , error ) ; }
		
		self.undeadBoundFn( function( error ) {
			log.debug( "Undead raised: %s" , error || 'ok' ) ;
		} ) ;
	} ) ;
} ;


