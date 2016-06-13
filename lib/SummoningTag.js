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



var Tag = require( 'kung-fig' ).Tag ;
var SpellTag = require( './SpellTag' ) ;



function SummoningTag( tag , attributes , content )
{
	var self = ( this instanceof SummoningTag ) ? this : Object.create( SummoningTag.prototype ) ;
	
	// Do not call SpellTag constructor, only call the Tag one
	Tag.call( self , 'summoning' , attributes , content ) ;
	
	// Try to match a regexp
	var match = self.attributes.match( /^\/([^]+)\/([a-z])*$/ ) ;
    
	Object.defineProperties( self , {
		summoning: {
			value: match ?
				new RegExp( match[ 1 ] , match[ 2 ] ) :
				self.attributes.trim() ,
			enumerable: true
		}
	} ) ;
	
	return self ;
}

module.exports = SummoningTag ;
SummoningTag.prototype = Object.create( SpellTag.prototype ) ;
SummoningTag.prototype.constructor = SummoningTag ;



SummoningTag.prototype.init = function init( book )
{
	if ( this.summoning instanceof RegExp )
	{
		book.regexSummonings.push( this ) ;
	}
	else
	{
		book.summonings[ this.summoning ] = this ;
	}
} ;



SummoningTag.prototype.run = function run( book , inheritedExecution , callback )
{
	var self = this ;
	
	var castExecution = {
		type: 'summon' ,
		genericSpell: this.name ,	// Useful?
		lastCastedTime: 0 ,
		outputFile: null ,
		outputFilename: null ,
		somethingHasBeenCasted: false
	} ;
	
	if ( inheritedExecution && typeof inheritedExecution === 'object' ) { castExecution.root = inheritedExecution.root ; }
	else { castExecution.root = castExecution ; }
	
	this.prepare( castExecution , function( error ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		book.run( self.content , castExecution , callback ) ;
	} ) ;
} ;



