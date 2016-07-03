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

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Sources( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof Sources ) ? this : Object.create( Sources.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	Tag.call( self , 'sources' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'sources' tag's content should be a TagContainer." ) ;
	}
	
	var regex = kungFig.parse.builtin.RegExp( self.attributes ) ;
	
	if ( ! regex.replacement )
	{
		throw new SyntaxError( "The 'sources' tag's attribute should be RegExp with featuring a substitution string." ) ;
	}
	
	Object.defineProperties( self , {
		regex: { value: regex , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = Sources ;
Sources.prototype = Object.create( Tag.prototype ) ;
Sources.prototype.constructor = Sources ;


