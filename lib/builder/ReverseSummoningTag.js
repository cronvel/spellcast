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
var kungFig = require( 'kung-fig' ) ;

var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;
var SpellTag = require( './SpellTag' ) ;

//var term = require( 'terminal-kit' ).terminal ;

var utils = require( '../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ReverseSummoningTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof ReverseSummoningTag ) ? this : Object.create( ReverseSummoningTag.prototype ) ;
	
	var indexOf , label , globPattern ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	// Do not call SpellTag constructor, only call the Tag one
	Tag.call( self , 'reverse-summoning' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'reverse-summoning' tag's content should be a TagContainer." ) ;
	}
	
	indexOf = self.attributes.indexOf( ' ' ) ;
	
	if ( indexOf === -1 )
	{ 
		throw new SyntaxError( "Bad 'reverse-summoning' tag, syntax is [reverse-summoning <label> <globPattern>]." ) ;
	}
	
	label = self.attributes.slice( 0 , indexOf ) ;
	globPattern = self.attributes.slice( indexOf ).trim() ;
	
	if ( ! label || ! globPattern || ! glob.hasMagic( globPattern ) )
	{
		throw new SyntaxError( "Bad 'reverse-summoning' tag, syntax is [reverse-summoning <label> <globPattern>]." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: label , enumerable: true } ,
		globPattern: { value: globPattern , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = ReverseSummoningTag ;
ReverseSummoningTag.prototype = Object.create( SpellTag.prototype ) ;
ReverseSummoningTag.prototype.constructor = ReverseSummoningTag ;
ReverseSummoningTag.proxyMode = 'inherit+links' ;



ReverseSummoningTag.prototype.init = function init( book )
{
	book.reverseSummonings.push( this ) ;
} ;



ReverseSummoningTag.prototype.exec = function exec( book , options , execContext , callback )
{
	var self = this ;
	
	this.proxy.data.this = {
		summonedList: execContext.summoningList ,
		summoning: execContext.summoning ,
		summoningMatches: execContext.summoningMatches
	}
	
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
				
				log.debug( "Dependencies time for '%s': %s." , execContext.summoning , utils.debugDate( execContext.dependenciesTime ) ) ;
			}
			
			if ( error ) { self.fizzled( execContext , error , callback ) ; }
			else { self.casted( execContext , callback ) ; }
		} ) ;
	} ) ;
} ;


