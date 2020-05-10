/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const CasterCtx = require( '../../CasterCtx.js' ) ;
const Ngev = require( 'nextgen-events' ) ;
const ClassicTag = require( 'kung-fig' ).ClassicTag ;

const fs = require( 'fs' ) ;
const pathModule = require( 'path' ) ;
const Promise = require( 'seventh' ) ;
const utils = require( '../../utils.js' ) ;
const minimatch = require( '@cronvel/minimatch' ) ;
const glob = require( 'glob' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SummonTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof SummonTag ) ? this : Object.create( SummonTag.prototype ) ;

	if ( ! options ) { options = {} ; }
	options.keyValueSeparator = ':' ;

	ClassicTag.call( self , 'summon' , attributes , content , shouldParse , options ) ;

	return self ;
}

module.exports = SummonTag ;
SummonTag.prototype = Object.create( ClassicTag.prototype ) ;
SummonTag.prototype.constructor = SummonTag ;



SummonTag.prototype.run = function( book , ctx , callback ) {
	var lastSummoning ;

	log.debug( "Run [summon] for '%s'" , ctx.summoning || ctx.spell ) ;

	var content = this.getRecursiveFinalContent( ctx.data ) ;

	if ( ! Array.isArray( content ) ) {
		callback( new SyntaxError( "The 'summon' tag's content must be an array." ) ) ;
		return ;
	}


	Promise.forEach( content , summoning => {
		log.debug( "Summon '%s'" , summoning ) ;
		lastSummoning = summoning ;
		return SummonTag.exec( book , summoning , null , ctx ) ;
	} ).then(
		() => {
			log.debug( "After [summon] for '%s' -- last casted time: %s ; dependencies time: %s" ,
				ctx.summoning || ctx.spell ,
				utils.debugDate( ctx.lastCastedTime ) ,
				utils.debugDate( ctx.dependenciesTime )
			) ;

			if ( ctx.lastCastedTime >= ctx.dependenciesTime ) {
				//log.debug( '\n\t>>> %I >= %I' , utils.debugDate( ctx.lastCastedTime ) , utils.debugDate( ctx.dependenciesTime ) ) ;

				// an error is used because errors interupt the parent job's list
				if ( ctx.root.again ) {
					log.verbose( "'%s' is already up to date, but forced by 'again' option" , ctx.summoning || ctx.spell ) ;
				}
				else {
					log.verbose( "'%s' is already up to date" , ctx.summoning || ctx.spell ) ;
					var error = new Error( "Already up to date" ) ;
					error.type = 'upToDate' ;
					error.continue = true ;
					callback( error ) ;
					return ;
				}
			}

			//log.debug( "exec callback: %I" , Array.from( arguments ) ) ;
			//log.debug( "After summon, ctx: %I" , ctx ) ;

			callback() ;
		} ,
		dependencyError => {
			log.debug( "After [summon] for '%s' -- last casted time: %s ; dependencies time: %s" ,
				ctx.summoning || ctx.spell ,
				utils.debugDate( ctx.lastCastedTime ) ,
				utils.debugDate( ctx.dependenciesTime )
			) ;

			var error = new Error( "Dependency summoning '" + lastSummoning + "' failed: " + dependencyError.message ) ;
			error.type = 'dependencyFailed' ;
			callback( error ) ;
		}
	) ;
} ;



/* Everything below return a Promise */

SummonTag.exec = function( book , summoningName , options , ctx ) {
	// summoningName as array are only internal, they should not contains glob
	if ( Array.isArray( summoningName ) ) {
		return SummonTag.execMulti( book , summoningName , options , ctx ) ;
	}

	// summoningName can be a template
	if ( typeof summoningName !== 'string' ) { summoningName = summoningName.toString() ; }

	if ( glob.hasMagic( summoningName ) ) {
		return SummonTag.execGlob( book , summoningName , options , ctx ) ;
	}

	return SummonTag.execOne( book , summoningName , options , ctx ) ;
} ;



SummonTag.execMulti = function( book , summonings , options , ctx ) {
	return Promise.forEach( summonings , summoning =>
		SummonTag.exec( book , summoning , options , ctx )
			.catch( error => { if ( ! error.continue ) { throw error ; } } )
	) ;
} ;



SummonTag.execGlob = async function( book , summoningGlob , options , ctx ) {
	//log.debug( "Summon glob, ctx: %I" , ctx ) ;

	var summonMap = book.persistent.summonMap ;
	var cwdSummoningGlob = book.cwd + '/' + summoningGlob ;
	//log.error( "summonMap: %I" , summonMap ) ;

	var cwdSummonings = await glob.async( cwdSummoningGlob ) ;
	//log.debug( "Summon glob matches:" , cwdSummonings ) ;

	// Without the CWD prefix
	var newSummonings , missingSummonings , mm , type , name ,
		summonings = cwdSummonings.map( e => pathModule.relative( book.cwd , e ) ) ;


	// Find summoning in the glob pattern still not known to 'book.persistent'
	// or deleted summoning matching the glob pattern: both force a rebuild!
	// This MUST be done BEFORE calling execMulti().
	if ( ctx ) {
		if ( ctx.summoning ) { type = 'summoning' ; name = ctx.summoning ; }
		else { type = 'spell' ; name = ctx.spell ; }

		if ( ! summonMap[ type ][ name ] ) { summonMap[ type ][ name ] = {} ; }

		// First get missing files
		mm = new minimatch.Minimatch( summoningGlob ) ;

		// From the summon list, find those that are not in the resolved glob list BUT should have been...
		missingSummonings = Object.keys( summonMap[ type ][ name ] )
			.filter( e => summonings.indexOf( e ) === -1 && mm.match( e ) ) ;

		if ( missingSummonings.length ) {
			log.debug( "Missing summonings [%s]: %s" , name , missingSummonings ) ;
			missingSummonings.forEach( e => {
				delete summonMap[ type ][ name ][ e ] ;
				delete summonMap.summoning[ e ] ;
			} ) ;
			ctx.dependenciesTime = Infinity ;
		}

		// Then get all new files
		newSummonings = summonings.filter( e => ! summonMap[ type ][ name ][ e ] ) ;

		if ( newSummonings.length ) {
			log.debug( "New summonings [%s]: %s" , name , newSummonings ) ;
			newSummonings.forEach( e => summonMap[ type ][ name ][ e ] = true ) ;
			ctx.dependenciesTime = Infinity ;
		}
	}

	await SummonTag.execMulti( book , summonings , options , ctx ) ;

	var dirMap = await utils.glob.getUndeadDirectoriesMap( cwdSummoningGlob ) ;
	Object.keys( dirMap ).forEach( dir => book.castUndead( dir , dirMap[ dir ] ) ) ;
} ;



SummonTag.execOne = function( book , summoningName , options , parentCtx ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var i , iMax , match , ctx ;

	//var cwdSummoning = book.cwd + '/' + summoningName ;

	ctx = CasterCtx.create( book , {
		parent: parentCtx ,
		type: 'summoning' ,
		again: !! options.again ,
		events: parentCtx && parentCtx.events || book.initEvents
	} ) ;

	// Should we cast undead for all summon? or just for non-summon?
	//if ( ctx.parent ) { book.castUndead( summoningName ) ; }

	if (
		ctx.parent &&
		Array.isArray( ctx.parent.summoned ) &&
		ctx.parent.summoned.indexOf( summoningName ) === -1
	) {
		ctx.parent.summoned.push( summoningName ) ;
	}

	if ( book.summonings[ summoningName ] ) {
		ctx.summoning = summoningName ;
		return book.summonings[ summoningName ].execAsync( book , null , ctx ) ;
	}

	// If no summoning is found, then try the "wild" summoning until something is found
	for ( i = 0 , iMax = book.wildSummonings.length ; i < iMax ; i ++ ) {
		switch ( book.wildSummonings[ i ].type ) {
			case 'regex' :
				match = summoningName.match( book.wildSummonings[ i ].summoning ) ;

				if ( match ) {
					ctx.summoning = summoningName ;
					ctx.summoningMatches = match ;
					return book.wildSummonings[ i ].execAsync( book , null , ctx ) ;
				}
				break ;

			case 'glob' :
				//log.info( ">>> %I" , book.wildSummonings[ i ] ) ;
				match = minimatch( summoningName , book.wildSummonings[ i ].summoning ) ;

				if ( match ) {
					ctx.summoning = summoningName ;
					return book.wildSummonings[ i ].execAsync( book , null , ctx ) ;
				}
				break ;
		}
	}

	// If no "wild" summoning is found, then try reverse-summoning until something is found
	for ( i = 0 , iMax = book.reverseSummonings.length ; i < iMax ; i ++ ) {
		if ( book.reverseSummonings[ i ].targetToSourceMapping[ summoningName ] ) {
			ctx.summoning = summoningName ;
			ctx.source = book.reverseSummonings[ i ].targetToSourceMapping[ summoningName ] ;
			return book.reverseSummonings[ i ].execAsync( book , null , ctx ) ;
		}
	}

	ctx.summoning = summoningName ;
	return SummonTag.execNoSummon( book , ctx ) ;
} ;



// When summoning a file that has no Summoning tag.
// Those files are normal use case: they are starting points, sources for builds.
SummonTag.execNoSummon = async function( book , ctx ) {
	var time , error ,
		cwdSummoning = book.cwd + '/' + ctx.summoning ;

	try {
		var stats = await fs.statAsync( cwdSummoning ) ;
	}
	catch ( statError ) {
		if ( statError.code === 'ENOENT' ) {
			log.debug( "File not found, and don't know how to summon '%s'. %E" , ctx.summoning , statError ) ;
			Ngev.groupEmit( ctx.roles , 'coreMessage' , "^rDon't know how to summon “^R^+^/%s^:^r”.^:\n" , ctx.summoning ) ;

			error = new Error( "Don't know how to summon '" + ctx.summoning + "'." ) ;
			error.type = 'notFound' ;
			throw error ;
		}
		else {
			log.debug( "Can't access file. %E" , ctx.summoning , statError ) ;
			Ngev.groupEmit( ctx.roles , 'coreMessage' , "^rCan't access file ^/%s^:^r.^:\n" , ctx.summoning ) ;
			throw new Error( "Can't access file '" + ctx.summoning + "'." ) ;
		}
	}

	time = stats.mtime.getTime() ;

	if ( ctx.parent ) {
		//log.debug( "ctx: %I" , ctx ) ;
		ctx.parent.dependenciesTime = Math.max(
			ctx.parent.dependenciesTime ,
			time || Infinity
		) ;

		// Only watch if this is not the parent summon, i.e. this summon exec come from a [summon] tag
		book.castUndead( cwdSummoning ) ;

		if ( ctx.parent.summoning ) {
			if ( ! book.persistent.summonMap.summoning[ ctx.parent.summoning ] ) { book.persistent.summonMap.summoning[ ctx.parent.summoning ] = {} ; }
			book.persistent.summonMap.summoning[ ctx.parent.summoning ][ ctx.summoning ] = true ;
		}
		else {
			if ( ! book.persistent.summonMap.spell[ ctx.parent.spell ] ) { book.persistent.summonMap.spell[ ctx.parent.spell ] = {} ; }
			book.persistent.summonMap.spell[ ctx.parent.spell ][ ctx.summoning ] = true ;
		}
	}
	else {
		log.debug( "SummonTag.execNoSummon() without parent" ) ;
	}

	log.debug( "File '%s' last-modified time: %s" , ctx.summoning , utils.debugDate( time ) ) ;
} ;

