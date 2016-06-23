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

//var async = require( 'async-kit' ) ;
//var term = require( 'terminal-kit' ).terminal ;
var fs = require( 'fs' ) ;

var utils = require( '../utils.js' ) ;

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



SpellTag.prototype.exec = function exec( book , options , execContext , callback )
{
	var self = this ;
	
	this.prepare( execContext , function( error ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		book.run( self.content , execContext , function( error ) {
			
			if ( execContext.parent )
			{
				// -Infinity = not set/no dependency, leading to a +Infinity dependency (i.e. force rebuild)
				execContext.parent.dependenciesTime = Math.max(
					execContext.parent.dependenciesTime ,
					execContext.dependenciesTime === -Infinity ? Infinity : execContext.dependenciesTime
				) ;
				
				log.debug( "Dependencies time for '%s': %s." , execContext.spell , utils.debugDate( execContext.dependenciesTime ) ) ;
				
				if ( error && ! error.continue ) { callback( error ) ; return ; }
				callback() ;
			}
			else
			{
				// This is the top-level spell
				if ( error ) { self.fizzled( execContext , error , callback ) ; }
				else { self.casted( execContext , callback ) ; }
			}
		} ) ;
	} ) ;
} ;



SpellTag.prototype.prepare = function prepare( execContext , callback )
{
	var openListener , errorListener , statPath ;
	
	if ( execContext.summoning ) //|| execContext.type === 'regexp-summon' )
	{
		execContext.outputFilename = '%' + execContext.summoning.replace( '/' , '%' ) ;
		statPath = execContext.summoning ;
	}
	else
	{
		execContext.outputFilename = execContext.spell ;
		statPath = '.spellcast/casted/' + execContext.spell ;
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
				callback( new Error( "Can't access file '" + execContext.summoning + "'." ) ) ;
				return ;
			}
		}
		else
		{
			execContext.lastCastedTime = stats.mtime.getTime() ;
			
			if ( execContext.summoning )
			{
				log.debug( "File '%s' last-modified time: %s" , execContext.summoning , utils.debugDate( execContext.lastCastedTime ) ) ;
			}
			else
			{
				log.debug( "Last time '%s' was casted: %s." , execContext.spell , utils.debugDate( execContext.lastCastedTime ) ) ;
			}
		}
		
		execContext.outputFile = fs.createWriteStream( '.spellcast/tmp/' + execContext.outputFilename ) ;
		
		var triggered = false ;
		
		var triggerCallback = function( error ) {
			if ( triggered ) { return ; }
			execContext.outputFile.removeListener( 'open' , openListener ) ;
			execContext.outputFile.removeListener( 'error' , errorListener ) ;
			triggered = true ;
			callback( error ) ;
		} ;
		
		// Define listeners
		openListener = function( fd ) {
			execContext.outputFileFd = fd ;
			triggerCallback() ;
		} ;
		
		errorListener = function( error ) {
			triggerCallback( error ) ;
		} ;
		
		// Bind them
		execContext.outputFile.once( 'open' , openListener ) ;
		execContext.outputFile.once( 'error' , errorListener ) ;
	} ) ;
} ;



SpellTag.prototype.casted = function casted( execContext , callback )
{
	log.verbose( "The %s '%s' was successfully casted." ,
		execContext.spell ? 'spell' : 'summoning of' ,
		execContext.summoning || execContext.spell
	) ;
	
	execContext.outputFile.end( function() {
		fs.close( execContext.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + execContext.outputFilename , '.spellcast/casted/' + execContext.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; return ; }
				callback() ;
				//callback() ;
			} ) ;
		} ) ;
	} ) ;
} ;



// callback( error )
SpellTag.prototype.fizzled = function fizzled( execContext , fizzledError , callback )
{
	if ( ! fizzledError ) { fizzledError = new Error( 'The spell fizzled' ) ; }
	
	log.verbose( "The %s '%s' fizzled: %s" ,
		execContext.spell ? 'spell' : 'summoning of' ,
		execContext.summoning || execContext.spell , fizzledError
	) ;
	
	execContext.outputFile.end( function() {
		fs.close( execContext.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + execContext.outputFilename , '.spellcast/fizzled/' + execContext.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; }
				callback( fizzledError ) ;
			} ) ;
		} ) ;
	} ) ;
} ;


