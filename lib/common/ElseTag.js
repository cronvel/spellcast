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
var TagContainer = kungFig.TagContainer ;

var tree = require( 'tree-kit' ) ;
var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ElseTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof ElseTag ) ? this : Object.create( ElseTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	Tag.call( self , 'else' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'else' tag's content should be a TagContainer." ) ;
	}
	
	Object.defineProperties( self , {
		master: { value: null , writable: true , enumerable: true } ,
		lastEval: { value: null , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ElseTag ;
ElseTag.prototype = Object.create( Tag.prototype ) ;
ElseTag.prototype.constructor = ElseTag ;
ElseTag.proxyMode = 'inherit' ;



ElseTag.prototype.init = function init( book , tagContainer )
{
	var index = tagContainer.children.indexOf( this ) - 1 ;
	
	if ( index < 0 ) { this.master = null ; }
	
	switch ( tagContainer.children[ index ].name )
	{
		case 'if' :
		case 'elsif' :
			this.master = tagContainer.children[ index ] ;
			break ;
		default :
			this.master = null ;
			break ;
	}
} ;



ElseTag.prototype.run = function run( book , execContext , callback )
{
	this.lastEval = ! this.master.lastEval ;
	
	if ( this.lastEval )
	{
		//log.debug( "ok!" ) ;
		book.run( this.content , execContext , callback ) ;
	}
	else
	{
		//log.debug( "not ok!" ) ;
		callback() ;
	}
} ;

