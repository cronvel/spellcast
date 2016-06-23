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



function ForeachTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof ForeachTag ) ? this : Object.create( ForeachTag.prototype ) ;
	
	var matches ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	Tag.call( self , 'foreach' , attributes , content , shouldParse , ':' ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'foreach' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^\$?([^ ]+) +as +\$?([^ ]+) +=> +\$?([^ ]+)$/ ) ) )
	{
		throw new SyntaxError( "The 'foreach' tag's attribute should validate the foreach syntax." ) ;
	}
	
	
	Object.defineProperties( self , {
		sourcePath: { value: matches[ 1 ] , writable: true , enumerable: true } ,
		asKeyPath: { value: matches[ 2 ] , writable: true , enumerable: true } ,
		asValuePath: { value: matches[ 2 ] , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = ForeachTag ;
ForeachTag.prototype = Object.create( Tag.prototype ) ;
ForeachTag.prototype.constructor = ForeachTag ;
ForeachTag.proxyMode = 'inherit' ;



ForeachTag.prototype.run = function run( book , execContext , callback )
{
	var self = this ;
	
	var iterable = tree.path.get( this.proxy.data , this.sourcePath ) ;
	
	if ( ! iterable || typeof iterable !== 'object' )
	{
		callback( new Error( "The variable is not iterable" ) ) ;
		return ;
	}
	
	async.foreach( iterable , function( value , key , foreachCallback ) {
		tree.path.set( self.proxy.data , self.asKeyPath , key ) ;
		tree.path.set( self.proxy.data , self.asValuePath , value ) ;
		book.run( self.content , execContext , foreachCallback ) ;
	} )
	.exec( callback ) ;
} ;


// TODO


/*
case 'foreach' :
	var list = self.formulas[ Object.keys( element.args )[ 0 ] ] ;
	
	if ( ! list ) { foreachCallback() ; return ; }
	
	async.foreach( list , function( value , index , foreachCallback2 ) {
		
		list.index = index ;
		self.castExec( castExecution , element.casting , args , false , foreachCallback2 ) ;
	} )
	.exec( function( error ) {
		list.index = 0 ;
		if ( error ) { foreachCallback( error ) ; return ; }
		foreachCallback() ;
	} ) ;
	
	break ;
*/

