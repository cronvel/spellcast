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
var VarTag = kungFig.VarTag ;

//var tree = require( 'tree-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function FilterTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof FilterTag ) ? this : Object.create( FilterTag.prototype ) ;
	
	VarTag.call( self , 'filter' , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = FilterTag ;
FilterTag.prototype = Object.create( VarTag.prototype ) ;
FilterTag.prototype.constructor = FilterTag ;
//FilterTag.proxyMode = 'parent' ;



FilterTag.prototype.run = function run( book , ctx , callback )
{
	var value = this.ref.get( ctx.data ) ;
	var content = this.getFinalContent( ctx.data ) ;
	
	if ( ! Array.isArray( value ) )
	{
		scriptLog.warning( '[filter] tag used on a non-array value' ) ;
		callback() ;
		return ;
	}
	
	if ( ! content || typeof content !== 'object' )
	{
		value.filter( ( a , b ) => a - b ) ;
	}
	else if ( content.key && typeof content.key === 'object' && content.key.__isDynamic__ )
	{
		switch( content.order )
		{
			case 'asc' :
			case 'ascendant' :
				value.filter( ( a , b ) => content.key.getFinalValue( a ) - content.key.getFinalValue( b ) ) ;
				break ;
			case 'desc' :
			case 'descendant' :
				value.filter( ( a , b ) => content.key.getFinalValue( b ) - content.key.getFinalValue( a ) ) ;
				break ;
			default :
				value.filter( ( a , b ) => content.key.getFinalValue( a ) - content.key.getFinalValue( b ) ) ;
				break ;
		}
	}
	else
	{
		switch( content.order )
		{
			case 'asc' :
			case 'ascendant' :
				value.filter( ( a , b ) => a - b ) ;
				break ;
			case 'desc' :
			case 'descendant' :
				value.filter( ( a , b ) => b - a ) ;
				break ;
			default :
				value.filter( ( a , b ) => a - b ) ;
				break ;
		}
	}
	
	callback() ;
} ;


