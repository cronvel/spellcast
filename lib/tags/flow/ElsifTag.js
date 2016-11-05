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

var tree = require( 'tree-kit' ) ;
var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ElsifTag( tag , attributes , content , shouldParse , options )
{
	var self = ( this instanceof ElsifTag ) ? this : Object.create( ElsifTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer( undefined , self ) ;
	}
	
	ExpressionTag.call( self , 'elsif' , attributes , content , shouldParse , options ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'elsif' tag's content should be a TagContainer." ) ;
	}
	
	Object.defineProperties( self , {
		master: { value: null , writable: true , enumerable: true } ,
		condition: { value: self.attributes , writable: true , enumerable: true } ,
		alreadySelected: { value: false , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = ElsifTag ;
ElsifTag.prototype = Object.create( ExpressionTag.prototype ) ;
ElsifTag.prototype.constructor = ElsifTag ;
//ElsifTag.proxyMode = 'inherit' ;



ElsifTag.prototype.init = function init( book )
{
	var index = this.parent.children.indexOf( this ) - 1 ;
	
	if ( index < 0 ) { this.master = null ; }
	
	switch ( this.parent.children[ index ].name )
	{
		case 'if' :
		case 'elsif' :
			this.master = this.parent.children[ index ] ;
			break ;
		default :
			this.master = null ;
			break ;
	}
	
	return null ;
} ;



ElsifTag.prototype.run = function run( book , ctx , callback )
{
	if ( ! this.master || this.master.alreadySelected )
	{
		//log.debug( "not ok!" ) ;
		this.alreadySelected = true ;
		callback() ;
	}
	else if ( this.condition.getFinalValue( ctx.data ) )
	{
		//log.debug( "ok!" ) ;
		this.alreadySelected = true ;
		book.run( this.content , ctx , callback ) ;
	}
	else
	{
		//log.debug( "not ok!" ) ;
		this.alreadySelected = false ;
		callback() ;
	}
} ;

