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



var kungFig = require( 'kung-fig' ) ;
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var async = require( 'async-kit' ) ;
var fs = require( 'fs' ) ;
var term = require( 'terminal-kit' ).terminal ;

var misc = require( './misc.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SpellTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SpellTag ) ? this : Object.create( SpellTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	LabelTag.call( self , 'spell' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'spell' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'spell' tag's id should be non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = SpellTag ;
SpellTag.prototype = Object.create( LabelTag.prototype ) ;
SpellTag.prototype.constructor = SpellTag ;
SpellTag.proxyMode = 'inherit+links' ;



SpellTag.prototype.init = function init( book )
{
	book.spells[ this.id ] = this ;
	//console.log( "spell proxy:" , this.proxy ) ;
} ;



SpellTag.prototype.run = function run( book , context , callback )
{
	var self = this ;
	
	//console.log( "spell proxy:" , this.proxy ) ;
	
	var castExecution = {
		spell: context.spell ,
		lastCastedTime: -Infinity ,
		dependenciesTime: -Infinity ,
		outputFile: null ,
		outputFilename: null
	} ;
	
	castExecution.root = ( context.parent && context.parent.root ) || castExecution ;
	castExecution.parent = context.parent || null ;
	
	this.prepare( castExecution , function( error ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		book.run( self.content , castExecution , function( error ) {
			
			if ( castExecution.parent )
			{
				// -Infinity = not set/no dependency, leading to a +Infinity dependency (i.e. force rebuild)
				castExecution.parent.dependenciesTime = Math.max(
					castExecution.parent.dependenciesTime ,
					castExecution.dependenciesTime === -Infinity ? Infinity : castExecution.dependenciesTime
				) ;
				
				log.debug( "Dependencies time for '%s': %s." , castExecution.spell , misc.debugDate( castExecution.dependenciesTime ) ) ;
				
				if ( error && ! error.continue ) { callback( error ) ; return ; }
				callback() ;
			}
			else
			{
				// This is the top-level spell
				if ( error ) { self.fizzled( castExecution , error , callback ) ; }
				else { self.casted( castExecution , callback ) ; }
			}
		} ) ;
	} ) ;
} ;



SpellTag.prototype.prepare = function prepare( castExecution , callback )
{
	var openListener , errorListener , statPath ;
	
	if ( castExecution.summoning ) //|| castExecution.type === 'regexp-summon' )
	{
		castExecution.outputFilename = '~' + castExecution.summoning.replace( '/' , '~' ) ;
		statPath = castExecution.summoning ;
	}
	else
	{
		castExecution.outputFilename = castExecution.spell ;
		statPath = '.spellcast/casted/' + castExecution.spell ;
	}
	
	fs.stat( statPath , function( statError , stats ) {
		
		if ( statError )
		{
			if ( statError.code === 'ENOENT' )
			{
				log.debug( "Never casted before. Stat: %E" , statError ) ;
			}
			else
			{
				log.debug( "Can't access file. %E" , statError ) ;
				callback( new Error( "Can't access file '" + context.summoning + "'." ) ) ;
				return ;
			}
		}
		else
		{
			castExecution.lastCastedTime = stats.mtime.getTime() ;
			
			if ( castExecution.summoning )
			{
				log.debug( "File '%s' last-modified time: %s" , castExecution.summoning , misc.debugDate( castExecution.lastCastedTime ) ) ;
			}
			else
			{
				log.debug( "Last time '%s' was casted: %s." , castExecution.spell , misc.debugDate( castExecution.lastCastedTime ) ) ;
			}
		}
		
		castExecution.outputFile = fs.createWriteStream( '.spellcast/tmp/' + castExecution.outputFilename ) ;
		
		var triggered = false ;
		
		var triggerCallback = function( error ) {
			if ( triggered ) { return ; }
			castExecution.outputFile.removeListener( 'open' , openListener ) ;
			castExecution.outputFile.removeListener( 'error' , errorListener ) ;
			triggered = true ;
			callback( error ) ;
		} ;
		
		// Define listeners
		openListener = function( fd ) {
			castExecution.outputFileFd = fd ;
			triggerCallback() ;
		} ;
		
		errorListener = function( error ) {
			triggerCallback( error ) ;
		} ;
		
		// Bind them
		castExecution.outputFile.once( 'open' , openListener ) ;
		castExecution.outputFile.once( 'error' , errorListener ) ;
	} ) ;
} ;



SpellTag.prototype.casted = function casted( castExecution , callback )
{
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/casted/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; return ; }
				callback() ;
				//callback() ;
			} ) ;
		} ) ;
	} ) ;
} ;



// callback( error )
SpellTag.prototype.fizzled = function fizzled( castExecution , fizzledError , callback )
{
	if ( ! fizzledError ) { fizzledError = new Error( 'The spell fizzled' ) ; }
	
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/fizzled/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; }
				callback( fizzledError ) ;
			} ) ;
		} ) ;
	} ) ;
} ;


