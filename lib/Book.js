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
var minimatch = require( 'minimatch' ) ;
var glob = require( 'glob' ) ;

var TagContainer = kungFig.TagContainer ;

var SummoningTag = require( './builder/SummoningTag.js' ) ;
var utils = require( './utils.js' ) ;

var Logfella = require( 'logfella' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	overrideConsole: true ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true } ,
	]
} ) ;

var log = Logfella.global.use( 'spellcast' ) ;



function Book() { throw new Error( "Use Book.create() instead." ) ; }
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
	} ) ;
	
	self.init( script ) ;
	
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
			cast: require( './builder/CastTag.js' ) ,
			summon: require( './builder/SummonTag.js' ) ,
			chant: require( './builder/ChantTag.js' ) ,
			fortune: require( './builder/FortuneTag.js' ) ,
			scroll: require( './builder/ScrollTag.js' ) ,
			wand: require( './builder/WandTag.js' ) ,
			zap: require( './builder/ZapTag.js' ) ,
			epilogue: require( './builder/EpilogueTag.js' ) ,
			prologue: require( './builder/PrologueTag.js' )
		}
	} ) ;
	
	var book = Book.create( script , proxy ) ;
	
	return book ;
} ;



Book.prototype.initBook = function initBook( callback )
{
	var self = this ;
	
	this.prepareDirectories( function( initError ) {
	
		if ( initError ) { callback( initError ) ; return ; }
		
		// Run call init too, if it has not been called yet
		self.run( self.script , function( runError ) {
			if ( runError ) { callback( runError ) ; return ; }
			callback() ;
		} ) ;
	} ) ;
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



Book.prototype.init = function init( tagContainer , context )
{
	if ( ! tagContainer.init )
	{
		tagContainer.callEach( 'init' , this , context ) ;
		tagContainer.init = true ;
	}
} ;



Book.prototype.run = function run( tagContainer , context , callback )
{
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	try {
		this.init( tagContainer ) ;
	}
	catch ( error ) {
		callback( error ) ;
		return ;
	}
	
	tagContainer.asyncCallEach( 'run' , this , context , callback ) ;
} ;



Book.prototype.cast = function cast( spellName , context , callback )
{
	var self = this , error , nextContext ;
	
	if ( typeof context === 'function' ) { callback = context ; context = {} ; }
	
	var triggerCallback = function( error ) {
		if ( context && context.eternal )
		{
			delete context.eternal ;
			log.debug( ">>> \n\nCalling ETERNAL\n\n<<<\n" ) ;
			self.eternal( nextContext.root.summoningList , 'cast' , spellName , context , callback ) ;
		}
		else
		{
			callback( error ) ;
		}
	} ;
	
	nextContext = { parent: context.root ? context : null } ;
	nextContext.root = context.root || nextContext ;
	
	if ( ! this.spells[ spellName ] )
	{
		error = new Error( "Spell '" + spellName + "' not found." ) ;
		error.type = 'notFound' ;
		throw error ;
	}
	
	nextContext.spell = spellName ;
	
	this.spells[ spellName ].exec( this , nextContext , triggerCallback ) ;
} ;



Book.prototype.summon = function summon( summoningName , context , callback )
{
	var self = this , i , iMax , error , match , nextContext ;
	
	if ( typeof context === 'function' ) { callback = context ; context = {} ; }
	
	var triggerCallback = function( error ) {
		if ( context && context.eternal )
		{
			delete context.eternal ;
			log.debug( ">>> \n\nCalling ETERNAL\n\n<<<\n" ) ;
			self.eternal( nextContext.root.summoningList , 'summon' , summoningName , context , callback ) ;
			//callback( error ) ;
		}
		else
		{
			callback( error ) ;
		}
	} ;
	
	if ( context.fromSummonGlob )
	{
		nextContext = context ;
	}
	else
	{
		nextContext = { parent: context.root ? context : null } ;
		nextContext.root = context.root || nextContext ;
		if ( ! nextContext.root.summoningList ) { nextContext.root.summoningList = new Set() ; }
	}
	
	if ( glob.hasMagic( summoningName ) )
	{
		return this.summonGlob( summoningName , nextContext , triggerCallback ) ;
	}
	
	nextContext.root.summoningList.add( summoningName ) ;
	//log.info( ">>>\nAdding %s to the summoning list\n%I<<<\n" , summoningName , Array.from( nextContext.root.summoningList ) ) ;
	
	if ( this.summonings[ summoningName ] )
	{
		nextContext.summoning = summoningName ;
		nextContext.summoningMatches = null ;
		this.summonings[ summoningName ].exec( this , nextContext , triggerCallback ) ;
		return ;
	}
	
	// If no summoning are found, then try the glob summoning until something is found
	for ( i = 0 , iMax = this.wildSummonings.length ; i < iMax ; i ++ )
	{
		switch ( this.wildSummonings[ i ].type )
		{
			case 'regex' :
				match = summoningName.match( this.wildSummonings[ i ].summoning ) ;
				
				if ( match )
				{
					nextContext.summoning = summoningName ;
					nextContext.summoningMatches = match ;
					this.wildSummonings[ i ].exec( this , nextContext , triggerCallback ) ;
					return ;
				}
				break ;
				
			case 'glob' :
				match = minimatch( summoningName , this.wildSummonings[ i ].summoning ) ;
				
				if ( match )
				{
					nextContext.summoning = summoningName ;
					nextContext.summoningMatches = null ;
					this.wildSummonings[ i ].exec( this , nextContext , triggerCallback ) ;
					return ;
				}
				break ;
		}
	}
	
	nextContext.summoning = summoningName ;
	//SummoningTag.noTagExec( this , nextContext , triggerCallback ) ;
	this.noSummon( nextContext , triggerCallback ) ;
} ;



Book.prototype.summonGlob = function summonGlob( summoningGlob , context , callback )
{
	var self = this ;
	
	//log.debug( "Summon glob, context: %I" , context ) ;
	context.fromSummonGlob = true ;
	
	glob( summoningGlob , function( error , summonings ) {
		
		//console.log( "Summon glob matches:" , summonings ) ;
		
		async.foreach( summonings , function( summoning , foreachCallback ) {
			self.summon( summoning , context , function( error ) {
				if ( error && ! error.continue ) { foreachCallback( error ) ; return ; }
				foreachCallback() ;
			} ) ;
		} )
		.exec( callback ) ;
	} ) ;
} ;



// When summoning a file that has no Summoning tag.
// Those files are normal use case: they are starting point, sources for builds.
Book.prototype.noSummon = function noSummon( context , callback )
{
	fs.stat( context.summoning , function( statError , stats ) {
		
		var time ;
		
		if ( statError )
		{
			if ( statError.code === 'ENOENT' )
			{
				log.debug( "File not found, and don't know how to summon '%s'. %E" , context.summoning , statError ) ;
				callback( new Error( "Don't know how to summon '" + context.summoning + "'." ) ) ;
			}
			else
			{
				log.debug( "Can't access file. %E" , context.summoning , statError ) ;
				callback( new Error( "Can't access file '" + context.summoning + "'." ) ) ;
			}
		}
		else
		{
			time = stats.mtime.getTime() ;
			
			context.parent.dependenciesTime = Math.max(
				context.parent.dependenciesTime ,
				time || Infinity
			) ;
			
			log.debug( "File '%s' last-modified time: %s" , context.summoning , utils.debugDate( time ) ) ;
			
			callback( undefined ) ;
		}
	} ) ;
} ;



Book.prototype.prologue = function prologue( context , callback )
{
	var error , nextContext ;
	
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	if ( ! this.activePrologue ) { callback() ; return ; }
	
	nextContext = {
		parent: context
	} ;
	
	this.activePrologue.exec( this , nextContext , callback ) ;
} ;



Book.prototype.epilogue = function epilogue( context , callback )
{
	var error , nextContext ;
	
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	if ( ! this.activeEpilogue ) { callback() ; return ; }
	
	nextContext = {
		parent: context
	} ;
	
	this.activeEpilogue.exec( this , nextContext , callback ) ;
} ;



Book.prototype.eternal = function eternal( watchList , method )
{
	var self = this , args , timer , callback ;
	
	if ( ! Array.isArray( watchList ) ) { watchList = Array.from( watchList ) ; }
	
	log.debug( "Eternal watch list: %J" , watchList ) ;
	
	args = Array.prototype.slice.call( arguments , 2 ) ;
	
	if ( typeof args[ args.length - 1 ] === 'function' )
	{
		callback = args[ args.length - 1 ] ;
		
		args[ args.length - 1 ] = function triggerCallback( error ) {
			log.debug( "Eternal: callback triggered: %I" , arguments ) ;
		} ;
	}
	
	var somethingHasChanged = function somethingHasChanged( event , filename ) {
		log.debug( "somethingHasChanged(): %s %s" , event , filename ) ;
		if ( timer ) { clearTimeout( timer ) ; }
		timer = setTimeout( runAgain , 500 ) ;
	} ;
	
	var runAgain = function runAgain() {
		log.debug( "runAgain(): %s" , method ) ;
		self[ method ].apply( self , args ) ;
	} ;
	
	watchList.forEach( file => fs.watch( file , somethingHasChanged ) ) ;
} ;



