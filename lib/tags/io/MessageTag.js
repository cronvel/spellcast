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
var async = require( 'async-kit' ) ;

var kungFig = require( 'kung-fig' ) ;
var Dynamic = kungFig.Dynamic ;
var ClassicTag = kungFig.ClassicTag ;



function MessageTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof MessageTag ) ? this : Object.create( MessageTag.prototype ) ;
	ClassicTag.call( self , 'message' , attributes , content , shouldParse , ':' ) ;
	return self ;
}

module.exports = MessageTag ;
MessageTag.prototype = Object.create( ClassicTag.prototype ) ;
MessageTag.prototype.constructor = MessageTag ;
//MessageTag.proxyMode = 'parent' ;



MessageTag.prototype.run = function run( book , ctx , callback )
{
	var self = this ;
	
	if ( ! Array.isArray( this.content ) )
	{
		this.sendMessage( book , ctx , this.content , callback ) ;
		return ;
	}
	
	async.foreach( this.content , function( message , foreachCallback ) {
		self.sendMessage( book , ctx , message , foreachCallback ) ;
	} )
	.exec( callback ) ;
} ;



MessageTag.prototype.sendMessage = function sendMessage( book , ctx , message , callback )
{
	var text , options = null ;
	
	message = Dynamic.getRecursiveFinalValue( message , ctx.data ) ;
	
	if ( message && typeof message === 'object' )
	{
		options = message ;
		text = message.text ;
		delete message.text ;
	}
	else
	{
		text = message ;
	}
	
	if ( typeof text !== 'string' ) { callback( new TypeError( '[message] tag text should be a string' ) ) ; return ; }
	
	Ngev.groupEmit( ctx.roles , 'message' , text , options , callback ) ;
} ;


