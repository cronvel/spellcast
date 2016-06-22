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



SummonTag.prototype.run = function run( book , castExecution , callback )
{
	//var self = this ;
	
	log.debug( "Run [summon] for '%s'" , castExecution.summoning || castExecution.spell ) ;
	
	async.foreach( this.content , function( summoning , foreachCallback ) {
		
		log.debug( "Summon '%s'" , summoning ) ;
		book.summon( summoning , castExecution , foreachCallback ) ;
	} )
	.nice( 0 )
	.exec( function( error , results ) {
		
		//log.debug( "After summon, castExecution: %I" , castExecution ) ;
		log.debug( "After [summon] for '%s' -- last casted time: %s ; dependencies time: %s" ,
			castExecution.summoning || castExecution.spell ,
			utils.debugDate( castExecution.lastCastedTime ) ,
			utils.debugDate( castExecution.dependenciesTime )
		) ;
		
		if ( error ) { callback( error ) ; return ; }
		
		if ( castExecution.lastCastedTime >= castExecution.dependenciesTime )
		{
			// an error is used because errors interupt the parent job's list
			log.verbose( "'%s' is already up to date" , castExecution.summoning || castExecution.spell ) ;
			error = new Error( "Already up to date" ) ;
			error.type = 'upToDate' ;
			error.continue = true ;
			callback( error ) ;
			return ;
		}
		
		callback() ;
	} ) ;
} ;


