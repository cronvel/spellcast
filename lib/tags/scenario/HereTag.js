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



function HereTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof HereTag ) ? this : Object.create( HereTag.prototype ) ;
	
	LabelTag.call( self , 'here' , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		type: { value: self.attributes || 'normal' , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = HereTag ;
HereTag.prototype = Object.create( LabelTag.prototype ) ;
HereTag.prototype.constructor = HereTag ;



HereTag.prototype.run = function run( book , ctx )
{
	var persistent = this.type === 'persistent' ;
	
	if ( persistent && ctx.data.static.here )
	{
		// If persistent and already inside
		ctx.data.here = ctx.data.static.here ;
		return null ;
	}
	
	var hereData = this.getRecursiveFinalContent( ctx.data ) ;
	if ( ! hereData || typeof hereData !== 'object' ) { hereData = {} ; }
	
	if ( hereData.performer === undefined )
	{
		hereData.performer = book.roles[ 0 ].entity ;
	}
	
	ctx.data.here = hereData ;
	
	// Add it to static data now
	if ( persistent ) { ctx.data.static.here = hereData ; }
	
	return null ;
} ;


