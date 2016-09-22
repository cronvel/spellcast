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
var ExpressionTag = kungFig.ExpressionTag ;
var TagContainer = kungFig.TagContainer ;

var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function WhileTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof WhileTag ) ? this : Object.create( WhileTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer( undefined , self ) ;
	}
	
	ExpressionTag.call( self , 'while' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'while' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'while' tag's attribute should be an expression." ) ;
	}
	
	Object.defineProperties( self , {
		condition: { value: self.attributes , writable: true , enumerable: true } ,
	} ) ;
	
	//log.debug( "While tag: %I" , self ) ;
	
	return self ;
}

module.exports = WhileTag ;
WhileTag.prototype = Object.create( ExpressionTag.prototype ) ;
WhileTag.prototype.constructor = WhileTag ;
//WhileTag.proxyMode = 'inherit' ;



WhileTag.prototype.run = function run( book , ctx , callback )
{
	var self = this ;
	
	async.while( function( error , result , whileCallback ) {
		
		if ( error )
		{
			switch ( error.break )
			{
				case 'continue' :
					// Ok, just evaluate the conditions again
					break ;
				default : 
					whileCallback( error , false ) ;
					return ;
			}
		}
		
		whileCallback( undefined , self.condition.getFinalValue( ctx.data ) ) ;
	} )
	.do( [
		function( doCallback ) {
			book.run( self.content , ctx , doCallback ) ;
		}
	] )
	.exec( function( error ) {
		
		if ( error )
		{
			switch ( error.break )
			{
				case 'break' :
					callback() ;
					return ;
				default : 
					callback( error ) ;
					return ;
			}
		}
		
		callback() ;
	} ) ;
} ;


