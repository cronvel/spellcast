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
var SpellcasterCtx = require( '../../SpellcasterCtx.js' ) ;

var async = require( 'async-kit' ) ;

var utils = require( '../../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function EpilogueTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof EpilogueTag ) ? this : Object.create( EpilogueTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer( undefined , self ) ;
	}
	
	LabelTag.call( self , 'epilogue' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'epilogue' tag's content should be a TagContainer." ) ;
	}
	
	return self ;
}

module.exports = EpilogueTag ;
EpilogueTag.prototype = Object.create( LabelTag.prototype ) ;
EpilogueTag.prototype.constructor = EpilogueTag ;
//EpilogueTag.proxyMode = 'inherit+links' ;



EpilogueTag.prototype.run = function run( book , ctx )
{
	book.activeEpilogue = this ;
	return null ;
} ;



EpilogueTag.prototype.exec = function exec( book , options , ctx , callback )
{
	if ( ! ctx )
	{
		ctx = SpellcasterCtx.create( book , {
			again: !! ( options && options.again )
		} ) ;
	}
	
	book.engine.runCb( this.content , book , ctx , callback ) ;
} ;


