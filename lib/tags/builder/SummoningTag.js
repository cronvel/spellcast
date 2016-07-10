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



//var fs = require( 'fs' ) ;
var glob = require( 'glob' ) ;
var fs = require( 'fs' ) ;
var kungFig = require( 'kung-fig' ) ;

var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;
var SpellTag = require( './SpellTag' ) ;

//var term = require( 'terminal-kit' ).terminal ;

var utils = require( '../../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SummoningTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof SummoningTag ) ? this : Object.create( SummoningTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	// Do not call SpellTag constructor, only call the Tag one
	Tag.call( self , 'summoning' , attributes , content , proxy , shouldParse ) ;
	
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
SummoningTag.proxyMode = 'inherit+links' ;



SummoningTag.prototype.init = function init( book , tagContainer , callback )
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
	
	callback() ;
} ;



SummoningTag.prototype.exec = function exec( book , options , execContext , callback )
{
	var self = this ;
	
	//log.warning( "Summoning exec(): %s" , execContext.summoning ) ;
	
	this.proxy.data.this = {
		summoned: execContext.summoned ,
		summoning: execContext.summoning ,
		summoningMatches: execContext.summoningMatches
	} ;
	
	if ( execContext.source ) { this.proxy.data.this.source = execContext.source ; }
	
	this.prepare( execContext , function( error ) {
		
		//log.warning( "Prepare: %I" , arguments ) ;
		if ( error ) { callback( error ) ; return ; }
		
		book.run( self.content , execContext , function( error ) {
			
			//log.debug( self.proxy.data.this ) ;
			
			if ( execContext.parent )
			{
				// -Infinity = not set/no dependency, leading to a +Infinity dependency (i.e. force rebuild)
				execContext.parent.dependenciesTime = Math.max(
					execContext.parent.dependenciesTime ,
					execContext.dependenciesTime === -Infinity ? Infinity : execContext.dependenciesTime
				) ;
				
				log.debug( "Dependencies time for '%s': %s." , execContext.summoning , utils.debugDate( execContext.dependenciesTime ) ) ;
			}
			else
			{
				log.debug( "No parent context to store dependencies time" ) ;
			}
			
			if ( error && ! error.continue ) { self.fizzled( execContext , error , callback ) ; return ; }
			
			self.wasReallySummoned( book , options , execContext , function( reallyError ) {
				if ( error || reallyError ) { self.fizzled( execContext , error || reallyError , callback ) ; }
				else { self.casted( execContext , callback ) ; }
			} ) ;
		} ) ;
	} ) ;
} ;



SummoningTag.prototype.wasReallySummoned = function wasReallySummoned( book , options , execContext , callback )
{
	fs.stat( execContext.summoning , function( error , stats ) {
		
		if ( error )
		{
			term( "^r^/%s^:^R: the ritual was successful, yet nothing happened." ) ;
			callback( error ) ;
			return ;
		}
		
		if ( ! book.persistent.summoned ) { book.persistent.summoned = {} ; }
		
		//log.debug( "Adding '%s' to persistent.json's summoned map" , execContext.summoning ) ;
		book.persistent.summoned[ execContext.summoning ] = true ;
		book.cancelUndeadRespawn( execContext.summoning ) ;
		
		callback() ;
	} ) ;
} ;
