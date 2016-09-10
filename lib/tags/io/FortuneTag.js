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



var Ngev = require( 'nextgen-events' ) ;
var ClassicTag = require( 'kung-fig' ).ClassicTag ;



function FortuneTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof FortuneTag ) ? this : Object.create( FortuneTag.prototype ) ;
	ClassicTag.call( self , 'fortune' , attributes , content , shouldParse , ':' ) ;
	
	if ( ! Array.isArray( self.content ) ) { self.content = [ self.content ] ; }
	
	return self ;
}

module.exports = FortuneTag ;
FortuneTag.prototype = Object.create( ClassicTag.prototype ) ;
FortuneTag.prototype.constructor = FortuneTag ;
//FortuneTag.proxyMode = 'parent' ;



FortuneTag.prototype.run = function run( book , ctx , callback )
{
	//Ngev.groupEmit( ctx.roles , 'message' , this.content[ Math.floor( Math.random() * this.content.length ) ] + '\n' , null ) ;
	book.sendMessageToAll( ctx , this.content[ Math.floor( Math.random() * this.content.length ) ] + '\n' ) ;
	callback() ;
} ;


