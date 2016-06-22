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
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var async = require( 'async-kit' ) ;
var fs = require( 'fs' ) ;
var term = require( 'terminal-kit' ).terminal ;

var utils = require( '../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Prologue( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof Prologue ) ? this : Object.create( Prologue.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	LabelTag.call( self , 'prologue' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'prologue' tag's content should be a TagContainer." ) ;
	}
	
	return self ;
}

module.exports = Prologue ;
Prologue.prototype = Object.create( LabelTag.prototype ) ;
Prologue.prototype.constructor = Prologue ;
Prologue.proxyMode = 'inherit+links' ;



Prologue.prototype.run = function run( book , execContext , callback )
{
	book.activePrologue = this ;
	callback() ;
} ;



Prologue.prototype.exec = function exec( book , options , execContext , callback )
{
	var execContext = {} ;
	
	execContext.parent = parentExecContext ;
	execContext.root = ( parentExecContext && parentExecContext.root ) || execContext ;
	
	book.run( this.content , execContext , callback ) ;
} ;


