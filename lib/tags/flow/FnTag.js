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



var Ngev = require( 'nextgen-events' ) ;
var kungFig = require( 'kung-fig' ) ;
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var NextTag = require( './NextTag.js' ) ;
var ActionTag = require( './ActionTag.js' ) ;
var Ctx = require( '../../AdventurerCtx.js' ) ;

//var async = require( 'async-kit' ) ;
var tree = require( 'tree-kit' ) ;

var doormen = require( 'doormen' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function FnTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof FnTag ) ? this : Object.create( FnTag.prototype ) ;
	
	LabelTag.call( self , 'fn' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'fn' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'fn' tag's id should be a non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = FnTag ;
FnTag.prototype = Object.create( LabelTag.prototype ) ;
FnTag.prototype.constructor = FnTag ;
//FnTag.proxyMode = 'inherit+links' ;



FnTag.prototype.init = function init( book , callback )
{
	book.functions[ this.id ] = this ;
	callback() ;
} ;



FnTag.prototype.exec = function exec( book , options , ctx , callback )
{
	var self = this ;
	
	// Always reset local for a function
	ctx.data.local = {} ;
	
	book.run( this.content , ctx , function( error ) {
		if ( error )
		{
			switch ( error.break )
			{
				case 'return' :
					callback() ;
					return ;
				default :
					callback( error ) ;
					return ;
			}
		}
	} ) ;
} ;


