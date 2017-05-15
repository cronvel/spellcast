/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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



var glob = require( 'glob' ) ;
var fs = require( 'fs' ) ;
var kungFig = require( 'kung-fig' ) ;

var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;
var SpellTag = require( './SpellTag' ) ;

var utils = require( '../../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SummoningTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SummoningTag ) ? this : Object.create( SummoningTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer( undefined , self ) ;
	}
	
	// Do not call SpellTag constructor, only call the Tag one
	Tag.call( self , 'summoning' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'summoning' tag's content should be a TagContainer." ) ;
	}
	
	// Try to match a regexp
	var match = self.attributes.match( /^regexp?: *(.+)$/ ) ;
	
	//console.log( "+++ attribute: " + self.attributes ) ;
	if ( match )
	{
		//console.log( "~~~ match: " , match ) ;
		Object.defineProperties( self , {
			type: { value: 'regex' , enumerable: true } ,
			summoning: { value: kungFig.parse.builtin.RegExp( match[ 1 ] ) , enumerable: true }
		} ) ;
	}
	else if ( glob.hasMagic( self.attributes ) )
	{
		//console.log( "--- glob: " , self.attributes ) ;
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
	
	return null ;
} ;



SummoningTag.prototype.exec = function exec( book , options , ctx , callback )
{
	var self = this ;
	
	//log.warning( "Summoning exec(): %s" , ctx.summoning ) ;
	
	ctx.data.this = {
		summoned: ctx.summoned ,
		summoning: ctx.summoning ,
		summoningMatches: ctx.summoningMatches
	} ;
	
	if ( ctx.source ) { ctx.data.this.source = ctx.source ; }
	
	this.prepare( book , ctx , function( error ) {
		
		//log.warning( "Prepare: %I" , arguments ) ;
		if ( error ) { callback( error ) ; return ; }
		
		book.engine.runCb( self.content , book , ctx , null , function( error ) {
			
			//log.debug( ctx.data.this ) ;
			
			if ( ctx.parent )
			{
				//log.debug( "parent (before): %s." , utils.debugDate( ctx.parent.dependenciesTime ) ) ;
				
				// -Infinity = not set/no dependency, leading to a +Infinity dependency (i.e. force rebuild)
				ctx.parent.dependenciesTime = Math.max(
					ctx.parent.dependenciesTime ,
					ctx.dependenciesTime === -Infinity ? Infinity : ctx.dependenciesTime
				) ;
				
				log.debug( "Dependencies time for '%s': %s." , ctx.summoning , utils.debugDate( ctx.dependenciesTime ) ) ;
				//log.debug( "to parent: %s." , utils.debugDate( ctx.parent.dependenciesTime ) ) ;
			}
			else
			{
				log.debug( "No parent context to store dependencies time" ) ;
			}
			
			if ( error && ! error.continue ) { self.fizzled( book , ctx , error , callback ) ; return ; }
			
			self.wasReallySummoned( book , options , ctx , function( reallyError ) {
				//log.debug( "\n\n%I %I" , reallyError , error || reallyError ) ;
				
				if ( error || reallyError )
				{
					self.fizzled( book , ctx , error || reallyError , callback ) ;
				}
				else
				{
					// If something was casted right now, and there is a parent context, force a rebuild of the parent
					if ( ctx.parent ) { ctx.parent.dependenciesTime = Infinity ; }
					self.casted( book , ctx , callback ) ;
				}
			} ) ;
		} ) ;
	} ) ;
} ;



SummoningTag.prototype.wasReallySummoned = function wasReallySummoned( book , options , ctx , callback )
{
	fs.stat( book.cwd + '/' + ctx.summoning , function( error , stats ) {
		
		if ( error )
		{
			error.type = 'noop' ;
			callback( error ) ;
			return ;
		}
		
		
		if ( ctx.parent )
		{
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
		
		book.cancelUndeadRespawn( ctx.summoning ) ;
		
		callback() ;
	} ) ;
} ;