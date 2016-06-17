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



function CastTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof CastTag ) ? this : Object.create( CastTag.prototype ) ;
	ClassicTag.call( self , 'cast' , attributes , content , shouldParse , ':' ) ;
	
	if ( ! Array.isArray( content ) )
	{
		throw new SyntaxError( "The 'cast' tag's content must be an array." ) ;
	}
	
	return self ;
}

module.exports = CastTag ;
CastTag.prototype = Object.create( ClassicTag.prototype ) ;
CastTag.prototype.constructor = CastTag ;
CastTag.proxyMode = 'parent' ;



CastTag.prototype.run = function run( book , castExecution , callback )
{
	//var self = this ;
	
	async.map( this.content , function( spellName , mapCallback ) {
		
		if ( ! book.spells[ spellName ] ) { mapCallback( new Error( 'Cannot find spell: ' + spellName ) ) ; return ; }
		//console.log( 'About to subcast' , spellName ) ;
		book.cast( spellName , castExecution , mapCallback ) ;
	} )
	.nice( 0 )
	.parallel( 1 )
	.fatal()
	.exec( callback ) ;
} ;


