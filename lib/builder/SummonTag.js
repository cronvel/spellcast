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



var ClassicTag = require( 'kung-fig' ).ClassicTag ;

var async = require( 'async-kit' ) ;
var fs = require( 'fs' ) ;
var utils = require( '../utils.js' ) ;
var minimatch = require( 'minimatch' ) ;
var glob = require( 'glob' ) ;

var term = require( 'terminal-kit' ).terminal ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SummonTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof SummonTag ) ? this : Object.create( SummonTag.prototype ) ;
	
	ClassicTag.call( self , 'summon' , attributes , content , proxy , shouldParse , ':' ) ;
	
	if ( ! Array.isArray( content ) )
	{
		throw new SyntaxError( "The 'summon' tag's content must be an array." ) ;
	}
	
	return self ;
}

module.exports = SummonTag ;
SummonTag.prototype = Object.create( ClassicTag.prototype ) ;
SummonTag.prototype.constructor = SummonTag ;
SummonTag.proxyMode = 'parent' ;



SummonTag.prototype.run = function run( book , execContext , callback )
{
	//var self = this ;
	
	log.debug( "Run [summon] for '%s'" , execContext.summoning || execContext.spell ) ;
	
	async.foreach( this.content , function( summoning , foreachCallback ) {
		
		log.debug( "Summon '%s'" , summoning ) ;
		SummonTag.exec( book , summoning , null , execContext , foreachCallback ) ;
	} )
	.nice( 0 )
	.exec( function( error ) {
		
		//log.debug( "After summon, execContext: %I" , execContext ) ;
		log.debug( "After [summon] for '%s' -- last casted time: %s ; dependencies time: %s" ,
			execContext.summoning || execContext.spell ,
			utils.debugDate( execContext.lastCastedTime ) ,
			utils.debugDate( execContext.dependenciesTime )
		) ;
		
		if ( error ) { callback( error ) ; return ; }
		
		if ( execContext.lastCastedTime >= execContext.dependenciesTime )
		{
			// an error is used because errors interupt the parent job's list
			if ( execContext.root.again )
			{
				log.verbose( "'%s' is already up to date, but forced by 'again' option" , execContext.summoning || execContext.spell ) ;
			}
			else
			{
				log.verbose( "'%s' is already up to date" , execContext.summoning || execContext.spell ) ;
				error = new Error( "Already up to date" ) ;
				error.type = 'upToDate' ;
				error.continue = true ;
				callback( error ) ;
				return ;
			}
		}
		
		callback() ;
	} ) ;
} ;



SummonTag.exec = function exec( book , summoningName , options , execContext , callback )
{
	// summoningName as array are only internal, they should not contains glob
	if ( Array.isArray( summoningName ) )
	{
		return SummonTag.execMulti( book , summoningName , options , execContext , callback ) ;
	}
	
	// summoningName can be a template
	if ( typeof summoningName !== 'string' ) { summoningName = summoningName.toString() ; }
	
	if ( glob.hasMagic( summoningName ) )
	{
		return SummonTag.execGlob( book , summoningName , options , execContext , callback ) ;
	}
	
	return SummonTag.execOne( book , summoningName , options , execContext , callback ) ;
} ;



SummonTag.execMulti = function execMulti( book , summonings , options , execContext , callback )
{
	async.foreach( summonings , function( summoning , foreachCallback ) {
		SummonTag.exec( book , summoning , options , execContext , function( error ) {
			if ( error && ! error.continue ) { foreachCallback( error ) ; return ; }
			foreachCallback() ;
		} ) ;
	} )
	.exec( callback ) ;
} ;



SummonTag.execGlob = function execGlob( book , summoningGlob , options , execContext , callback )
{
	var self = this ;
	//log.debug( "Summon glob, execContext: %I" , execContext ) ;
	
	glob( summoningGlob , function( error , summonings ) {
		//log.debug( "Summon glob matches:" , summonings ) ;
		self.execMulti( book , summonings , options , execContext , callback ) ;
	} ) ;
} ;



SummonTag.execOne = function execOne( book , summoningName , options , parentExecContext , callback )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var i , iMax , match , execContext ;
	
	execContext = {
		summoning: null ,
		summoningMatches: null ,
		lastCastedTime: -Infinity ,
		dependenciesTime: -Infinity ,
		again: !! options.again ,
		summoned: [] ,
		outputFile: null ,
		outputFilename: null
	} ;
	
	execContext.parent = parentExecContext ;
	execContext.root = ( parentExecContext && parentExecContext.root ) || execContext ;
	
	// Should we cast undead for all summon? or just for no-summon?
	//if ( execContext.parent ) { book.castUndead( summoningName ) ; }
	
	if (
		execContext.parent &&
		Array.isArray( execContext.parent.summoned ) &&
		execContext.parent.summoned.indexOf( summoningName ) === -1
	)
	{
		execContext.parent.summoned.push( summoningName ) ;
	}
	
	if ( book.summonings[ summoningName ] )
	{
		execContext.summoning = summoningName ;
		book.summonings[ summoningName ].exec( book , null , execContext , callback ) ;
		return ;
	}
	
	// If no summoning is found, then try the "wild" summoning until something is found
	for ( i = 0 , iMax = book.wildSummonings.length ; i < iMax ; i ++ )
	{
		switch ( book.wildSummonings[ i ].type )
		{
			case 'regex' :
				match = summoningName.match( book.wildSummonings[ i ].summoning ) ;
				
				if ( match )
				{
					execContext.summoning = summoningName ;
					execContext.summoningMatches = match ;
					book.wildSummonings[ i ].exec( book , null , execContext , callback ) ;
					return ;
				}
				break ;
				
			case 'glob' :
				//log.info( ">>> %I" , book.wildSummonings[ i ] ) ;
				match = minimatch( summoningName , book.wildSummonings[ i ].summoning ) ;
				
				if ( match )
				{
					execContext.summoning = summoningName ;
					book.wildSummonings[ i ].exec( book , null , execContext , callback ) ;
					return ;
				}
				break ;
		}
	}
	
	// If no "wild" summoning is found, then try reverse-summoning until something is found
	for ( i = 0 , iMax = book.reverseSummonings.length ; i < iMax ; i ++ )
	{
		if ( book.reverseSummonings[ i ].mapping[ summoningName ] )
		{
			execContext.summoning = summoningName ;
			execContext.source = book.reverseSummonings[ i ].mapping[ summoningName ] ;
			book.reverseSummonings[ i ].exec( book , null , execContext , callback ) ;
			return ;
		}
	}
	
	execContext.summoning = summoningName ;
	SummonTag.execNoSummon( book , execContext , callback ) ;
} ;



// When summoning a file that has no Summoning tag.
// Those files are normal use case: they are starting point, sources for builds.
SummonTag.execNoSummon = function execNoSummon( book , execContext , callback )
{
	fs.stat( execContext.summoning , function( statError , stats ) {
		
		var time , error ;
		
		if ( statError )
		{
			if ( statError.code === 'ENOENT' )
			{
				log.debug( "File not found, and don't know how to summon '%s'. %E" , execContext.summoning , statError ) ;
				term( "^rDon't know how to summon ^/%s.^:\n" , execContext.summoning ) ;
				
				error = new Error( "Don't know how to summon '" + execContext.summoning + "'." ) ;
				error.type = 'notFound' ;
				callback( error ) ;
			}
			else
			{
				log.debug( "Can't access file. %E" , execContext.summoning , statError ) ;
				term( "^rCan't access file ^/%s^:^r.^:\n" , execContext.summoning ) ;
				callback( new Error( "Can't access file '" + execContext.summoning + "'." ) ) ;
			}
		}
		else
		{
			time = stats.mtime.getTime() ;
			
			if ( execContext.parent )
			{
				//log.debug( "execContext: %I" , execContext ) ;
				execContext.parent.dependenciesTime = Math.max(
					execContext.parent.dependenciesTime ,
					time || Infinity
				) ;
				
				// Only watch if this is not the parent summon, i.e. this summon exec come from a [summon] tag
				book.castUndead( execContext.summoning ) ;
			}
			else
			{
				log.debug( "SummonTag.execNoSummon() without parent" ) ;
			}
			
			log.debug( "File '%s' last-modified time: %s" , execContext.summoning , utils.debugDate( time ) ) ;
			
			callback( undefined ) ;
		}
	} ) ;
} ;

