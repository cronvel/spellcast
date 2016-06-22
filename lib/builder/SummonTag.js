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

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SummonTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SummonTag ) ? this : Object.create( SummonTag.prototype ) ;
	
	ClassicTag.call( self , 'summon' , attributes , content , shouldParse , ':' ) ;
	
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
	.exec( function( error , results ) {
		
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
			log.verbose( "'%s' is already up to date" , execContext.summoning || execContext.spell ) ;
			error = new Error( "Already up to date" ) ;
			error.type = 'upToDate' ;
			error.continue = true ;
			callback( error ) ;
			return ;
		}
		
		callback() ;
	} ) ;
} ;



SummonTag.exec = function exec( book , summoningName , options , parentExecContext , callback )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var i , iMax , error , match , execContext ;
	
	if ( options.useParentContext )
	{
		execContext = parentExecContext ;
	}
	else
	{
		execContext = {
			summoning: null ,
			summoningMatches: null ,
			lastCastedTime: -Infinity ,
			dependenciesTime: -Infinity ,
			outputFile: null ,
			outputFilename: null
		} ;
		
		execContext.parent = parentExecContext ;
		execContext.root = ( parentExecContext && parentExecContext.root ) || execContext ;
		
		if ( ! execContext.root.summoningList ) { execContext.root.summoningList = new Set() ; }
	}
	
	var triggerCallback = function( error ) {
		if ( options.eternal )
		{
			book.eternal(
				execContext.root.summoningList ,
				SummonTag.exec.bind( SummonTag , book , summoningName , { calledByEternal: true } , parentExecContext )
			) ;
		}
		else
		{
			callback( error ) ;
		}
	} ;

	if ( glob.hasMagic( summoningName ) )
	{
		return SummonTag.execGlob( book , summoningName , null , execContext , triggerCallback ) ;
	}
	
	execContext.root.summoningList.add( summoningName ) ;
	//log.info( ">>>\nAdding %s to the summoning list\n%I<<<\n" , summoningName , Array.from( execContext.root.summoningList ) ) ;
	
	if ( book.summonings[ summoningName ] )
	{
		execContext.summoning = summoningName ;
		book.summonings[ summoningName ].exec( book , null , execContext , triggerCallback ) ;
		return ;
	}
	
	// If no summoning are found, then try the glob summoning until something is found
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
					book.wildSummonings[ i ].exec( book , execContext , triggerCallback ) ;
					return ;
				}
				break ;
				
			case 'glob' :
				match = minimatch( summoningName , book.wildSummonings[ i ].summoning ) ;
				
				if ( match )
				{
					execContext.summoning = summoningName ;
					book.wildSummonings[ i ].exec( book , execContext , triggerCallback ) ;
					return ;
				}
				break ;
		}
	}
	
	execContext.summoning = summoningName ;
	
	SummonTag.execNoSummon( execContext , triggerCallback ) ;
} ;



SummonTag.execGlob = function execGlob( book , summoningGlob , options , execContext , callback )
{
	//log.debug( "Summon glob, execContext: %I" , execContext ) ;
	
	glob( summoningGlob , function( error , summonings ) {
		
		//console.log( "Summon glob matches:" , summonings ) ;
		
		async.foreach( summonings , function( summoning , foreachCallback ) {
			SummonTag.exec( book , summoning , { useParentContext: true } , execContext , function( error ) {
				if ( error && ! error.continue ) { foreachCallback( error ) ; return ; }
				foreachCallback() ;
			} ) ;
		} )
		.exec( callback ) ;
	} ) ;
} ;



// When summoning a file that has no Summoning tag.
// Those files are normal use case: they are starting point, sources for builds.
SummonTag.execNoSummon = function execNoSummon( execContext , callback )
{
	fs.stat( execContext.summoning , function( statError , stats ) {
		
		var time ;
		
		if ( statError )
		{
			if ( statError.code === 'ENOENT' )
			{
				log.debug( "File not found, and don't know how to summon '%s'. %E" , execContext.summoning , statError ) ;
				callback( new Error( "Don't know how to summon '" + execContext.summoning + "'." ) ) ;
			}
			else
			{
				log.debug( "Can't access file. %E" , execContext.summoning , statError ) ;
				callback( new Error( "Can't access file '" + execContext.summoning + "'." ) ) ;
			}
		}
		else
		{
			time = stats.mtime.getTime() ;
			
			//log.debug( "execContext: %I" , execContext ) ;
			execContext.parent.dependenciesTime = Math.max(
				execContext.parent.dependenciesTime ,
				time || Infinity
			) ;
			
			log.debug( "File '%s' last-modified time: %s" , execContext.summoning , utils.debugDate( time ) ) ;
			
			callback( undefined ) ;
		}
	} ) ;
} ;
