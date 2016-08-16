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



var SpellcasterCtx = require( '../../SpellcasterCtx.js' ) ;
var Ngev = require( 'nextgen-events' ) ;
var ClassicTag = require( 'kung-fig' ).ClassicTag ;

var async = require( 'async-kit' ) ;
var fs = require( 'fs' ) ;
var utils = require( '../../utils.js' ) ;
var minimatch = require( '@cronvel/minimatch' ) ;
var glob = require( 'glob' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SummonTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SummonTag ) ? this : Object.create( SummonTag.prototype ) ;
	ClassicTag.call( self , 'summon' , attributes , content , shouldParse , ':' ) ;
	return self ;
}

module.exports = SummonTag ;
SummonTag.prototype = Object.create( ClassicTag.prototype ) ;
SummonTag.prototype.constructor = SummonTag ;
//SummonTag.proxyMode = 'parent' ;



SummonTag.prototype.run = function run( book , ctx , callback )
{
	//var self = this ;
	
	log.debug( "Run [summon] for '%s'" , ctx.summoning || ctx.spell ) ;
	
	var content = this.getFinalContent() ;
	
	if ( ! Array.isArray( content ) )
	{
		callback( new SyntaxError( "The 'summon' tag's content must be an array." ) ) ;
		return ;
	}
	
	async.foreach( content , function( summoning , foreachCallback ) {
		
		log.debug( "Summon '%s'" , summoning ) ;
		SummonTag.exec( book , summoning , null , ctx , foreachCallback ) ;
	} )
	.nice( 0 )
	.exec( function( error ) {
		
		//log.debug( "After summon, ctx: %I" , ctx ) ;
		log.debug( "After [summon] for '%s' -- last casted time: %s ; dependencies time: %s" ,
			ctx.summoning || ctx.spell ,
			utils.debugDate( ctx.lastCastedTime ) ,
			utils.debugDate( ctx.dependenciesTime )
		) ;
		
		if ( error ) { callback( error ) ; return ; }
		
		if ( ctx.lastCastedTime >= ctx.dependenciesTime )
		{
			// an error is used because errors interupt the parent job's list
			if ( ctx.root.again )
			{
				log.verbose( "'%s' is already up to date, but forced by 'again' option" , ctx.summoning || ctx.spell ) ;
			}
			else
			{
				log.verbose( "'%s' is already up to date" , ctx.summoning || ctx.spell ) ;
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



SummonTag.exec = function exec( book , summoningName , options , ctx , callback )
{
	// summoningName as array are only internal, they should not contains glob
	if ( Array.isArray( summoningName ) )
	{
		return SummonTag.execMulti( book , summoningName , options , ctx , callback ) ;
	}
	
	// summoningName can be a template
	if ( typeof summoningName !== 'string' ) { summoningName = summoningName.toString() ; }
	
	if ( glob.hasMagic( summoningName ) )
	{
		return SummonTag.execGlob( book , summoningName , options , ctx , callback ) ;
	}
	
	return SummonTag.execOne( book , summoningName , options , ctx , callback ) ;
} ;



SummonTag.execMulti = function execMulti( book , summonings , options , ctx , callback )
{
	async.foreach( summonings , function( summoning , foreachCallback ) {
		SummonTag.exec( book , summoning , options , ctx , function( error ) {
			if ( error && ! error.continue ) { foreachCallback( error ) ; return ; }
			foreachCallback() ;
		} ) ;
	} )
	.exec( callback ) ;
} ;



SummonTag.execGlob = function execGlob( book , summoningGlob , options , ctx , callback )
{
	var self = this ;
	//log.debug( "Summon glob, ctx: %I" , ctx ) ;
	
    glob( summoningGlob , function( error , summonings ) {
		
		if ( error ) { callback( error ) ; return ; }
		//log.debug( "Summon glob matches:" , summonings ) ;
		
		// Find summoning in the glob pattern still not known to 'book.persistent'
		// or deleted summoning matching the glob pattern: both force a rebuild!
		// This MUST be done BEFORE calling execMulti().
		if ( ctx )
		{
			var newSummonings , missingSummonings , mm , type , name , summonMap = book.persistent.summonMap ;
			
			if ( ctx.summoning ) { type = 'summoning' ; name = ctx.summoning ; }
			else { type = 'spell' ; name = ctx.spell ; }
			
			if ( ! summonMap[ type ][ name ] ) { summonMap[ type ][ name ] = {} ; }
			
			// First get missing files
			mm = new minimatch.Minimatch( summoningGlob ) ;
			
			// From the summon list, find those that are not in the resolved glob list BUT should have been...
			missingSummonings = Object.keys( summonMap[ type ][ name ] )
				.filter( e => summonings.indexOf( e ) === -1 && mm.match( e ) ) ;
			
			if ( missingSummonings.length )
			{
				log.debug( "Missing summonings [%s]: %s" , name , missingSummonings ) ;
				missingSummonings.forEach( e => {
					delete summonMap[ type ][ name ][ e ] ;
					delete summonMap.summoning[ e ] ;
				} ) ;
				ctx.dependenciesTime = Infinity ;
			}
			
			// Then get all new files
			newSummonings = summonings.filter( e => ! summonMap[ type ][ name ][ e ] ) ;
			
			if ( newSummonings.length )
			{
				log.debug( "New summonings [%s]: %s" , name , newSummonings ) ;
				newSummonings.forEach( e => summonMap[ type ][ name ][ e ] = true ) ;
				ctx.dependenciesTime = Infinity ;
			}
		}
		
		self.execMulti( book , summonings , options , ctx , function( error ) {
			if ( error ) { callback( error ) ; return ; }
			
			// if ( ! undead mode ) callback return
			
			utils.glob.getUndeadDirectoriesMap( summoningGlob , function( error , dirMap ) {
				if ( error ) { callback( error ) ; return ; }
				Object.keys( dirMap ).forEach( dir => book.castUndead( dir , dirMap[ dir ] ) ) ;
				callback() ;
			} ) ;
		} ) ;
	} ) ;
} ;



SummonTag.execOne = function execOne( book , summoningName , options , parentCtx , callback )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var i , iMax , match , ctx ;
	
	ctx = SpellcasterCtx.create( book , {
		parent: parentCtx ,
		type: 'summoning' ,
		again: !! options.again ,
	} ) ;
	
	// Should we cast undead for all summon? or just for non-summon?
	//if ( ctx.parent ) { book.castUndead( summoningName ) ; }
	
	if (
		ctx.parent &&
		Array.isArray( ctx.parent.summoned ) &&
		ctx.parent.summoned.indexOf( summoningName ) === -1
	)
	{
		ctx.parent.summoned.push( summoningName ) ;
	}
	
	if ( book.summonings[ summoningName ] )
	{
		ctx.summoning = summoningName ;
		book.summonings[ summoningName ].exec( book , null , ctx , callback ) ;
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
					ctx.summoning = summoningName ;
					ctx.summoningMatches = match ;
					book.wildSummonings[ i ].exec( book , null , ctx , callback ) ;
					return ;
				}
				break ;
				
			case 'glob' :
				//log.info( ">>> %I" , book.wildSummonings[ i ] ) ;
				match = minimatch( summoningName , book.wildSummonings[ i ].summoning ) ;
				
				if ( match )
				{
					ctx.summoning = summoningName ;
					book.wildSummonings[ i ].exec( book , null , ctx , callback ) ;
					return ;
				}
				break ;
		}
	}
	
	// If no "wild" summoning is found, then try reverse-summoning until something is found
	for ( i = 0 , iMax = book.reverseSummonings.length ; i < iMax ; i ++ )
	{
		if ( book.reverseSummonings[ i ].targetToSourceMapping[ summoningName ] )
		{
			ctx.summoning = summoningName ;
			ctx.source = book.reverseSummonings[ i ].targetToSourceMapping[ summoningName ] ;
			book.reverseSummonings[ i ].exec( book , null , ctx , callback ) ;
			return ;
		}
	}
	
	ctx.summoning = summoningName ;
	SummonTag.execNoSummon( book , ctx , callback ) ;
} ;



// When summoning a file that has no Summoning tag.
// Those files are normal use case: they are starting point, sources for builds.
SummonTag.execNoSummon = function execNoSummon( book , ctx , callback )
{
	fs.stat( ctx.summoning , function( statError , stats ) {
		
		var time , error ;
		
		if ( statError )
		{
			if ( statError.code === 'ENOENT' )
			{
				log.debug( "File not found, and don't know how to summon '%s'. %E" , ctx.summoning , statError ) ;
				Ngev.groupEmit( ctx.roles , 'coreMessage' , "^rDon't know how to summon ^/%s.^:\n" , ctx.summoning ) ;
				
				error = new Error( "Don't know how to summon '" + ctx.summoning + "'." ) ;
				error.type = 'notFound' ;
				callback( error ) ;
			}
			else
			{
				log.debug( "Can't access file. %E" , ctx.summoning , statError ) ;
				Ngev.groupEmit( ctx.roles , 'coreMessage' , "^rCan't access file ^/%s^:^r.^:\n" , ctx.summoning ) ;
				callback( new Error( "Can't access file '" + ctx.summoning + "'." ) ) ;
			}
		}
		else
		{
			time = stats.mtime.getTime() ;
			
			if ( ctx.parent )
			{
				//log.debug( "ctx: %I" , ctx ) ;
				ctx.parent.dependenciesTime = Math.max(
					ctx.parent.dependenciesTime ,
					time || Infinity
				) ;
				
				// Only watch if this is not the parent summon, i.e. this summon exec come from a [summon] tag
				book.castUndead( ctx.summoning ) ;
				
				if ( ctx.parent.summoning )
				{
					if ( ! book.persistent.summonMap.summoning[ ctx.parent.summoning ] ) { book.persistent.summonMap.summoning[ ctx.parent.summoning ] = {} ; }
					book.persistent.summonMap.summoning[ ctx.parent.summoning ][ ctx.summoning ] = true ;
				}
				else
				{
					if ( ! book.persistent.summonMap.spell[ ctx.parent.spell ] ) { book.persistent.summonMap.spell[ ctx.parent.spell ] = {} ; }
					book.persistent.summonMap.spell[ ctx.parent.spell ][ ctx.summoning ] = true ;
				}
			}
			else
			{
				log.debug( "SummonTag.execNoSummon() without parent" ) ;
			}
			
			log.debug( "File '%s' last-modified time: %s" , ctx.summoning , utils.debugDate( time ) ) ;
			
			callback( undefined ) ;
		}
	} ) ;
} ;


