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

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function EmitTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof EmitTag ) ? this : Object.create( EmitTag.prototype ) ;
	
	LabelTag.call( self , 'emit' , attributes , content , proxy , shouldParse ) ;
	
	Object.defineProperties( self , {
		event: { value: self.attributes , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = EmitTag ;
EmitTag.prototype = Object.create( LabelTag.prototype ) ;
EmitTag.prototype.constructor = EmitTag ;
//EmitTag.proxyMode = 'parent' ;



EmitTag.prototype.run = function run( book , execContext , callback )
{
	book.apiEmit( this.event , this.getFinalContent() ) ;
	callback() ;
} ;


