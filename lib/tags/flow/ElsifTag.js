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
const ExpressionTag = kungFig.ExpressionTag ;
const TagContainer = kungFig.TagContainer ;

const tree = require( 'tree-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ElsifTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof ElsifTag ) ? this : Object.create( ElsifTag.prototype ) ;

	if ( content === undefined ) {
		content = new TagContainer( undefined , self ) ;
	}

	ExpressionTag.call( self , 'elsif' , attributes , content , shouldParse , options ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'elsif' tag's content should be a TagContainer." ) ;
	}

	Object.defineProperties( self , {
		ifTag: { value: null , writable: true , enumerable: true } ,
		condition: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ElsifTag ;
ElsifTag.prototype = Object.create( ExpressionTag.prototype ) ;
ElsifTag.prototype.constructor = ElsifTag ;



ElsifTag.prototype.init = function( book ) {
	var index = this.parent.children.indexOf( this ) - 1 ;

	if ( index < 0 ) { return null ; }

	switch ( this.parent.children[ index ].name ) {
		case 'if' :
			this.ifTag = this.parent.children[ index ] ;
			break ;
		case 'elsif' :
			this.ifTag = this.parent.children[ index ].ifTag ;
			break ;
		default :
			return null ;
	}

	// Add the current tag to the elsifTags array of the [if] tag
	this.ifTag.elsifTags.push( this ) ;

	return null ;
} ;

