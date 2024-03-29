/*
	Spellcast

	Copyright (c) 2014 - 2021 Cédric Ronvel

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



const kungFig = require( 'kung-fig' ) ;
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ElseTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ElseTag ) ? this : Object.create( ElseTag.prototype ) ;

	if ( content === undefined ) {
		content = new TagContainer( undefined , self ) ;
	}

	Tag.call( self , 'else' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'else' tag's content should be a TagContainer." ) ;
	}

	return self ;
}

module.exports = ElseTag ;
ElseTag.prototype = Object.create( Tag.prototype ) ;
ElseTag.prototype.constructor = ElseTag ;



ElseTag.prototype.init = function( book ) {
	var ifTag ,
		index = this.parent.children.indexOf( this ) - 1 ;

	if ( index < 0 ) { return null ; }

	switch ( this.parent.children[ index ].name ) {
		case 'if' :
			ifTag = this.parent.children[ index ] ;
			break ;
		case 'elsif' :
			ifTag = this.parent.children[ index ].ifTag ;
			break ;
		default :
			return null ;
	}

	// Set the current tag as the elseTag of the [if] tag
	ifTag.elseTag = this ;

	return null ;
} ;

