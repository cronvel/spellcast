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
var Ref = kungFig.Ref ;
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function FnTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof FnTag ) ? this : Object.create( FnTag.prototype ) ;
	
	var matches ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'fn' tag's content should be a TagContainer." ) ;
	}
	
	Tag.call( self , 'fn' , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)|([^$ ]+)$/ ) ) )
	{
		throw new SyntaxError( "The 'fn' tag's attribute should validate the fn syntax." ) ;
	}
	
	Object.defineProperties( self , {
		namespace: { value: '' , writable: true , enumerable: true } ,
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
	} ) ;
	
	// A bit of optimization here: erase the run() method if there is no ref
	if ( ! self.ref ) { self.run = null ; }
	
	return self ;
}

module.exports = FnTag ;
FnTag.prototype = Object.create( Tag.prototype ) ;
FnTag.prototype.constructor = FnTag ;



FnTag.prototype.init = function init( book )
{
	var groupTag = this.getParentTag() ;
	
	if ( groupTag && ( groupTag.name === 'chapter' || groupTag.name === 'system' ) )
	{
		this.namespace = groupTag.id ;
	}
	
	if ( this.id )
	{
		if ( ! book.functions[ this.namespace ] ) { book.functions[ this.namespace ] = {} ; }
		book.functions[ this.namespace ][ this.id ] = this ;
		
		// Create the static data for the function
		if ( ! book.functionStaticData[ this.namespace ] ) { book.functionStaticData[ this.namespace ] = {} ; }
		book.functionStaticData[ this.namespace ][ this.id ] = {} ;
	}
	
	return null ;
} ;



FnTag.prototype.run = function run( book , ctx )
{
	if ( this.ref ) { this.ref.set( ctx.data , this ) ; }
	return null ;
} ;



// “maybe async” exec()
FnTag.prototype.exec = function exec( book , options , ctx , callback )
{
	var self = this ;
	
	// For instance, everything is done by CallTag#run()
	
	return book.engine.run( this.content , book , ctx , callback ) ;
} ;


