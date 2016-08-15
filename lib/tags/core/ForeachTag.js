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



function ForeachTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof ForeachTag ) ? this : Object.create( ForeachTag.prototype ) ;
	
	var matches ;
	
	if ( content === undefined )
	{
		content = new TagContainer( undefined , self ) ;
	}
	
	Tag.call( self , 'foreach' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'foreach' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^\$([^ ]+) *=>(?: *\$([^ ]+) *:)? *\$([^ ]+)$/ ) ) )
	{
		throw new SyntaxError( "The 'foreach' tag's attribute should validate the foreach syntax." ) ;
	}
	
	Object.defineProperties( self , {
		sourcePath: { value: matches[ 1 ] , writable: true , enumerable: true } ,
		asKeyPath: { value: typeof matches[ 2 ] === 'string' ? matches[ 2 ] : null , writable: true , enumerable: true } ,
		asValuePath: { value: matches[ 3 ] , writable: true , enumerable: true } ,
	} ) ;
	
	//log.debug( "Foreach tag: %I" , self ) ;
	
	return self ;
}

module.exports = ForeachTag ;
ForeachTag.prototype = Object.create( Tag.prototype ) ;
ForeachTag.prototype.constructor = ForeachTag ;
ForeachTag.proxyMode = 'inherit' ;



ForeachTag.prototype.run = function run( book , ctx , callback )
{
	var self = this ;
	
	var iterable = tree.path.get( this.proxy.data , this.sourcePath ) ;
	
	//log.debug( "Foreach iterable: %I" , iterable ) ;
	
	if ( ! iterable || typeof iterable !== 'object' )
	{
		callback( new Error( "The variable is not iterable" ) ) ;
		return ;
	}
	
	async.foreach( iterable , function( value , key , foreachCallback ) {
		//log.debug( "Foreach item %s: %I" , key , value ) ;
		if ( self.asKeyPath !== null ) { tree.path.set( self.proxy.data , self.asKeyPath , key ) ; }
		tree.path.set( self.proxy.data , self.asValuePath , value ) ;
		//log.debug( "Foreach item proxy: %I" , self.proxy.data ) ;
		book.run( self.content , ctx , foreachCallback ) ;
	} )
	.exec( callback ) ;
} ;


