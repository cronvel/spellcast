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
var Tag = kungFig.Tag ;

//var CompoundStats = require( '../../CompoundStats.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CompoundStatsTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof CompoundStatsTag ) ? this : Object.create( CompoundStatsTag.prototype ) ;
	
	Tag.call( self , 'compound-stats' , attributes , content , shouldParse ) ;
	
	if ( ! content || typeof content !== 'object' )
	{
		throw new SyntaxError( "The 'compound-stats' tag's content should be an object." ) ;
	}
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "Missing mandatory attributes for the 'compound-stats' tag." ) ;
	}
	
	var tmp = self.attributes.split( / +/ ) ;
	
	Object.defineProperties( self , {
		class: { value: tmp[ 0 ] , enumerable: true } ,
		action: { value: tmp[ 1 ] || null , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = CompoundStatsTag ;
CompoundStatsTag.prototype = Object.create( Tag.prototype ) ;
CompoundStatsTag.prototype.constructor = CompoundStatsTag ;
//CompoundStatsTag.proxyMode = 'inherit+links' ;



CompoundStatsTag.prototype.init = function init( book , callback )
{
	if ( ! book.compoundStats[ this.class ] ) { book.compoundStats[ this.class ] = {} ; }
	book.compoundStats[ this.class ][ this.action || 'global' ] = this ;
	log.fatal( book.compoundStats ) ;
	callback() ;
} ;


