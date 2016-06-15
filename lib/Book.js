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
var TagContainer = kungFig.TagContainer ;



function Book() { throw new Error( "Use Book.create() instead." ) ; }
module.exports = Book ;



Book.create = function createBook( script )
{
	if ( ! ( script instanceof TagContainer ) ) { throw new Error( 'Book.create() arguments #0 should be a TagContainer' ) ; }
	
	var self = Object.create( Book.prototype , {
		script: { value: script , enumerable: true } ,
		world: { value: {} , enumerable: true } ,
		spells: { value: {} , enumerable: true } ,
		summonings: { value: {} , enumerable: true } ,
		regexSummonings: { value: [] , enumerable: true } ,
	} ) ;
	
	self.init( script ) ;
	
	return self ;
} ;



Book.load = function load( path )
{
	var script = kungFig.load( path , {
		tags: {
			startup: require( './StartupTag.js' ) ,
			formula: require( './FormulaTag.js' ) ,
			spell: require( './SpellTag.js' ) ,
			summoning: require( './SummoningTag.js' ) ,
			cast: require( './CastTag.js' ) ,
			summon: require( './SummonTag.js' ) ,
			scroll: require( './ScrollTag.js' ) ,
		}
	} ) ;
	
	var book = Book.create( script ) ;
	
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
	
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	if ( ! this.spells[ spellName ] )
	{
		error = new Error( "Spell '" + spellName + "' not found." ) ;
		error.type = 'notFound' ;
		throw error ;
	}
	
	this.world.this = [ spellName ] ;
	
	// /!\ What is that 'index'? /!\
	Object.defineProperty( this.world.this , 'index' , { value: 0 , writable: true } ) ;
	
	this.spells[ spellName ].run( this , context , callback ) ;
} ;



Book.prototype.summon = function summon( summoningName , context , callback )
{
	var i , iMax , error , matches ;
	
	if ( typeof context === 'function' ) { callback = context ; context = null ; }
	
	if ( this.summonings[ summoningName ] )
	{
		this.world.this = [ summoningName ] ;
		
		// /!\ What is that 'index'? /!\
		Object.defineProperty( this.world.this , 'index' , { value: 0 , writable: true } ) ;
		
		this.summonings[ summoningName ].run( this , context , callback ) ;
		
		return ;
	}
	
	// If no summoning are found, then try each regex summoning until something is found
	for ( i = 0 , iMax = this.regexSummonings.length ; i < iMax ; i ++ )
	{
		matches = summoningName.match( this.regexSummonings[ i ] ) ;
		
		if ( matches )
		{
			context.matches = matches.slice( 0 ) ;
			
			// /!\ What is that 'index'? /!\
			Object.defineProperty( this.world.this , 'index' , { value: 0 , writable: true } ) ;
			
			this.regexSummonings[ i ].run( this , context , callback ) ;
			return ;
		}
	}
	
	// Nothing found...
	error = new Error( "Don't know how to summon '" + summoningName + "'." ) ;
	error.type = 'notFound' ;
	throw error ;
} ;


