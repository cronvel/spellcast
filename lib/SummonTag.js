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



function SummonTag( tag , attributes , content )
{
	var self = ( this instanceof SummonTag ) ? this : Object.create( SummonTag.prototype ) ;
	ClassicTag.call( self , 'summon' , attributes , content , ':' ) ;
	
	if ( ! Array.isArray( content ) )
	{
		throw new SyntaxError( "The 'summon' tag's content must be an array." ) ;
	}
	
	return self ;
}

module.exports = SummonTag ;
SummonTag.prototype = Object.create( ClassicTag.prototype ) ;
SummonTag.prototype.constructor = SummonTag ;



// callback( error , upToDate )
SummonTag.prototype.run = function run( book , castExecution , callback )
{
	//var self = this ;
	
	async.map( this.content , function( summoning , foreachCallback ) {
		
		try {
			book.summon( summoning , castExecution , function( error , somethingHasBeenCasted ) {
				
				if ( error ) { foreachCallback( error ) ; return ; }
				
				//console.log( "cast summon callback somethingHasBeenCasted" , somethingHasBeenCasted ) ;
				
				// if nothing has been casted, we are up to date
				foreachCallback( undefined , ! somethingHasBeenCasted ) ;
				//foreachCallback( undefined , false ) ;	// false: don't abort the spellcast
			} ) ;
		}
		catch ( error ) {
			
			if ( error.type === 'notFound' )
			{
				fs.stat( summoning , function( error , stats ) {
					
					if ( error ) { foreachCallback( error ) ; return ; }
					
					// abort the spellcast only if the lastCastedTime is newer
					foreachCallback( undefined , castExecution.lastCastedTime >= stats.mtime.getTime() ) ;
				} ) ;
			}
			else
			{
				foreachCallback( error ) ;
			}
		}
	} )
	.nice( 0 )
	.parallel( 1 )
	.fatal()
	.exec( function( error , results ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		//console.log( "castExecution" , castExecution ) ;
		//console.log( castExecution.genericSpell , "somethingHasBeenCasted:" , castExecution.somethingHasBeenCasted ) ;
		//console.log( "root" , castExecution.root.genericSpell , "somethingHasBeenCasted:" , castExecution.root.somethingHasBeenCasted ) ;
		//callback( undefined , args.rootCastExecution.somethingHasBeenCasted ? false : true ) ;
		
		callback( undefined , results.every( e => e ) ) ;
	} ) ;
} ;
