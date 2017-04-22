/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;
var FnTag = require( '../flow/FnTag.js' ) ;

var chatBot = require( '../../chatBot.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function QueryTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof QueryTag ) ? this : Object.create( QueryTag.prototype ) ;
	
	LabelTag.call( self , 'query' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'query' tag's content should be a TagContainer." ) ;
	}
	
	Object.defineProperties( self , {
		interpreterTag: { value: null , writable: true , enumerable: true } ,
		patterns: { value: [] , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = QueryTag ;
QueryTag.prototype = Object.create( LabelTag.prototype ) ;
QueryTag.prototype.constructor = QueryTag ;



QueryTag.prototype.init = function init( book )
{
	this.interpreterTag = this.getParentTag() ;
	
	if ( ! this.interpreterTag || this.interpreterTag.name !== 'interpreter' )
	{
		// /!\ or create a default interpreter? /!\
		return new Error( "The [query] tag should be inside a [interpreter] tag." ) ;
	}
	
	if ( ! book.queryPatternTree[ this.interpreterTag.id ] ) { book.queryPatternTree[ this.interpreterTag.id ] = {} ; }
	
	this.content.getTags( 'pattern' ).forEach( tag => {
		var type = tag.attributes || 'input' ;
		var pattern = tag.content ;
		
		// Temp...
		if ( type !== 'input' ) { return ; }
		
		// Create the local pattern arrays
		this.patterns.push( pattern ) ;
	} ) ;
	
	/*
		Here we should combine other patterns together to build entry like:
		<topic> | <mood> | <replied> | <input>
		and produce one big array of combined patterns
	*/
	
	chatBot.addToTree( book.queryPatternTree[ this.interpreterTag.id ] , this.patterns , this ) ;
	
	//log.error( 'Init: %I\n%I' , this.patterns , book.queryPatterns ) ;
	//log.error( 'Init: %[5]I' , book.queryPatternTree ) ;
	
	return null ;
} ;



// Same than [fn] tag, it just exec its content, with some resuming magic...
// A “maybe async” exec()
QueryTag.prototype.exec = FnTag.prototype.exec ;


