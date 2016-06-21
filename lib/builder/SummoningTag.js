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



var fs = require( 'fs' ) ;
var glob = require( 'glob' ) ;
var kungFig = require( 'kung-fig' ) ;

var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;
var SpellTag = require( './SpellTag' ) ;

var term = require( 'terminal-kit' ).terminal ;

var utils = require( '../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SummoningTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SummoningTag ) ? this : Object.create( SummoningTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	// Do not call SpellTag constructor, only call the LabelTag one
	LabelTag.call( self , 'summoning' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'summoning' tag's content should be a TagContainer." ) ;
	}
	
	// Try to match a regexp
	var match = self.attributes.match( /^regexp?(?:\(([a-z]+)\))?: *(.+)$/ ) ;
	
	if ( match )
	{
		Object.defineProperties( self , {
			type: { value: 'regex' , enumerable: true } ,
			summoning: { value: new RegExp( match[ 2 ] , match[ 1 ] ) , enumerable: true }
		} ) ;
	}
	else if ( glob.hasMagic( self.attributes ) )
	{
		Object.defineProperties( self , {
			type: { value: 'glob' , enumerable: true } ,
			summoning: { value: self.attributes , enumerable: true }
		} ) ;
	}
	else
	{
		Object.defineProperties( self , {
			type: { value: 'static' , enumerable: true } ,
			summoning: { value: self.attributes , enumerable: true }
		} ) ;
	}
	
	return self ;
}

module.exports = SummoningTag ;
SummoningTag.prototype = Object.create( SpellTag.prototype ) ;
SummoningTag.prototype.constructor = SummoningTag ;
SummoningTag.proxyMode = 'inherit+links' ;



SummoningTag.prototype.init = function init( book )
{
	switch ( this.type )
	{
		case 'static' :
			book.summonings[ this.summoning ] = this ;
			break ;
		case 'regex' :
		case 'glob' :
			book.wildSummonings.push( this ) ;
			break ;
	}
} ;



SummoningTag.prototype.exec = function exec( book , context , callback )
{
	var self = this ;
	
	var castExecution = {
		summoning: context.summoning ,
		summoningMatches: context.summoningMatches ,
		lastCastedTime: -Infinity ,
		dependenciesTime: -Infinity ,
		outputFile: null ,
		outputFilename: null
	} ;
	
	castExecution.root = ( context.parent && context.parent.root ) || castExecution ;
	castExecution.parent = context.parent || null ;
	
	this.proxy.data.summoning = context.summoning ;
	this.proxy.data.summoningMatches = context.summoningMatches ;
	
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
				
				log.debug( "Dependencies time for '%s': %s." , castExecution.summoning , utils.debugDate( castExecution.dependenciesTime ) ) ;
				
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



SummoningTag.noTagExec = function noTagExec( book , context , callback )
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


