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
var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Chat( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof Chat ) ? this : Object.create( Chat.prototype ) ;
	
	Tag.call( self , 'chat' , attributes , content , proxy , shouldParse ) ;
	
	Object.defineProperties( self , {
		//id: { value: self.attributes , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = Chat ;
Chat.prototype = Object.create( Tag.prototype ) ;
Chat.prototype.constructor = Chat ;
//Chat.proxyMode = 'parent' ;



Chat.prototype.run = function run( book , execContext , callback )
{
	var v ,
		content = this.getRecursiveFinalContent() ;
	
	if ( content === true || content === false )
	{
		v = content ;
		content = {} ;
		execContext.roles.forEach( e => e.chatStatus = {
			read: v ,
			write: v
		} ) ;
	}
	else if ( ! content || typeof content !== 'object' )
	{
		callback( new Error( 'The content of a [chat] tag should be an object of object or a boolean.' ) ) ;
		return ;
	}
	else
	{
		Object.keys( content ).forEach( k => {
			var role = execContext.roles.get( k ) ;
			
			// Remove role IDs that are not in the current execContext
			if ( ! role ) { return ; }
			
			if ( content[ k ] === true || content[ k ] === false )
			{
				role.chatStatus = {
					read: content[ k ] ,
					write: content[ k ]
				} ;
			}
			else if ( ! content[ k ] || typeof content[ k ] !== 'object' )
			{
				// If it doesn't make sense, remove the entry
				return ;
			}
			else
			{
				role.chatStatus = {
					read: !! content[ k ].read ,
					write: !! content[ k ].write
				} ;
			}
		} ) ;
	}
	
	book.sendChatStatus( execContext.roles ) ;
	
	callback() ;
} ;


