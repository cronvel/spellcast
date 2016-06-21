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
	var error , nextContext ;
	
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	nextContext = { parent: context } ;
	nextContext.root = ( nextContext.parent && nextContext.parent.root ) || nextContext ;
	
	if ( ! this.spells[ spellName ] )
	{
		error = new Error( "Spell '" + spellName + "' not found." ) ;
		error.type = 'notFound' ;
		throw error ;
	}
	
	nextContext.spell = spellName ;
	
	this.spells[ spellName ].exec( this , nextContext , callback ) ;
} ;



Book.prototype.summon = function summon( summoningName , context , callback )
{
	var i , iMax , error , match , nextContext , triggerCallback ;
	
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	if ( context && context.eternal )
	{
		triggerCallback = function( error ) {
			console.log( "Eternal list:" , nextContext.root.summoningList ) ;
			callback( error ) ;
		} ;
	}
	else
	{
		triggerCallback = callback ;
	}
	
	nextContext = { parent: context } ;
	nextContext.root = ( nextContext.parent && nextContext.parent.root ) || nextContext ;
	
	if ( ! nextContext.root.summoningList ) { nextContext.root.summoningList = [] ; }
	if ( glob.hasMagic( summoningName ) )
	{
		return this.summonGlob( summoningName , nextContext , triggerCallback ) ;
	}
	
	nextContext.root.summoningList.push( summoningName ) ;
	
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
	SummoningTag.noTagExec( this , nextContext , triggerCallback ) ;
} ;



Book.prototype.summonGlob = function summonGlob( summoningGlob , context , callback )
{
	var self = this ;
	
	//console.log( "Summon glob" ) ;
	
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


