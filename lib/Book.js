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
//var async = require( 'async-kit' ) ;
//var string = require( 'string-kit' ) ;
//var tree = require( 'tree-kit' ) ;

var kungFig = require( 'kung-fig' ) ;
var minimatch = require( 'minimatch' ) ;
var TagContainer = kungFig.TagContainer ;

var SummoningTag = require( './SummoningTag.js' ) ;

var Logfella = require( 'logfella' ) ;
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
			startup: require( './StartupTag.js' ) ,
			formula: require( './FormulaTag.js' ) ,
			spell: require( './SpellTag.js' ) ,
			summoning: require( './SummoningTag.js' ) ,
			cast: require( './CastTag.js' ) ,
			summon: require( './SummonTag.js' ) ,
			scroll: require( './ScrollTag.js' ) ,
			wand: require( './WandTag.js' ) ,
			zap: require( './ZapTag.js' ) ,
		}
	} ) ;
	
	var book = Book.create( script , proxy ) ;
	
	return book ;
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
	this.init( tagContainer ) ;
	tagContainer.asyncCallEach( 'run' , this , context , callback ) ;
} ;



Book.prototype.cast = function cast( spellName , context , callback )
{
	var error ;
	
	if ( typeof context === 'function' ) { callback = context ; context = {} ; }
	
	if ( ! this.spells[ spellName ] )
	{
		error = new Error( "Spell '" + spellName + "' not found." ) ;
		error.type = 'notFound' ;
		throw error ;
	}
	
	context.spell = spellName ;
	
	this.spells[ spellName ].run( this , context , callback ) ;
} ;



Book.prototype.summon = function summon( summoningName , context , callback )
{
	var i , iMax , error , match ;
	
	if ( typeof context === 'function' ) { callback = context ; context = {} ; }
	
	if ( this.summonings[ summoningName ] )
	{
		context.summoning = summoningName ;
		context.summoningMatches = null ;
		this.summonings[ summoningName ].run( this , context , callback ) ;
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
					context.summoning = summoningName ;
					context.summoningMatches = match ;
					this.wildSummonings[ i ].run( this , context , callback ) ;
					return ;
				}
				break ;
				
			case 'glob' :
				match = minimatch( summoningName , this.wildSummonings[ i ].summoning ) ;
				
				if ( match )
				{
					context.summoning = summoningName ;
					context.summoningMatches = null ;
					this.wildSummonings[ i ].run( this , context , callback ) ;
					return ;
				}
				break ;
		}
	}
	
	context.summoning = summoningName ;
	SummoningTag.noTagRun( this , context , callback ) ;
	return ;
	
	
	// Nothing found...
	error = new Error( "Don't know how to summon '" + summoningName + "'." ) ;
	error.type = 'notFound' ;
	throw error ;
} ;


