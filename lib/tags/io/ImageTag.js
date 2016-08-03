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
var async = require( 'async-kit' ) ;
var ClassicTag = require( 'kung-fig' ).ClassicTag ;



function ImageTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof ImageTag ) ? this : Object.create( ImageTag.prototype ) ;
	ClassicTag.call( self , 'image' , attributes , content , proxy , shouldParse , ':' ) ;
	return self ;
}

module.exports = ImageTag ;
ImageTag.prototype = Object.create( ClassicTag.prototype ) ;
ImageTag.prototype.constructor = ImageTag ;
ImageTag.proxyMode = 'parent' ;



ImageTag.prototype.run = function run( book , execContext , callback )
{
	var self = this , image , options ;
	
	image = this.getFinalContent() ;
	
	if ( image && typeof image === 'object' )
	{
		options = image ;
		image = image.image ;
	}
	
	if ( image && typeof image === 'object' && image.__isDynamic__ ) { image = image.getFinalValue() ; }
	
	if ( typeof image !== 'string' ) { callback( new TypeError( '[image] tag image should be an URL (string)' ) ) ; return ; }
	
	Ngev.groupEmit( execContext.roles , 'image' , image , options ) ;
	callback() ;
} ;


