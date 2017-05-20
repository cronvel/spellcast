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
var Tag = kungFig.Tag ;
//var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function OffTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof OffTag ) ? this : Object.create( OffTag.prototype ) ;
	
	Tag.call( self , 'off' , attributes , content , shouldParse ) ;
	//LabelTag.call( self , 'off' , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		id: { value: null , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = OffTag ;
OffTag.prototype = Object.create( Tag.prototype ) ;
//OffTag.prototype = Object.create( LabelTag.prototype ) ;
OffTag.prototype.constructor = OffTag ;



OffTag.prototype.init = function init( book , ctx )
{
	if ( this.content ) { return null ; }
	
	var onTag = this.findAncestor( 'on' ) ;
	if ( onTag ) { this.id = onTag.id ; }
	
	return null ;
} ;



OffTag.prototype.run = function run( book , ctx )
{
	ctx.eventBusOff( this.id || this.getRecursiveFinalContent( ctx.data ) ) ;
	return null ;
} ;


