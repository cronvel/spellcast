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
const Dynamic = kungFig.Dynamic ;
const Expression = kungFig.Expression ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function IfTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof IfTag ) ? this : Object.create( IfTag.prototype ) ;

	if ( content === undefined ) {
		content = new TagContainer( undefined , self ) ;
	}

	Tag.call( self , 'if' , attributes , content , shouldParse , options ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'if' tag's content should be a TagContainer." ) ;
	}

	Object.defineProperties( self , {
		//condition: { value: null , writable: true , enumerable: true } ,
		condition: { value: Expression.parse( self.attributes ) , writable: true , enumerable: true } ,
		elsifTags: { value: null , writable: true , enumerable: true } ,
		elseTag: { value: null , writable: true , enumerable: true } ,
		selectTag: { value: null , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = IfTag ;
IfTag.prototype = Object.create( Tag.prototype ) ;
IfTag.prototype.constructor = IfTag ;



IfTag.prototype.init = function( book ) {
	var index = this.parent.children.indexOf( this ) - 1 ;

	if ( index >= 0 && this.parent.children[ index ].name === 'select' ) {
		this.selectTag = this.parent.children[ index ] ;
		this.condition = Expression.parse( this.selectTag.attributes + this.attributes ) ;
	}
	else {
		this.condition = Expression.parse( this.attributes ) ;
	}

	return null ;
} ;



IfTag.prototype.run = function( book , ctx , callback ) {
	var i , iMax ;

	if ( ctx.resume ) {
		// The real running tag (i.e. [if], [elsif] or [else]) is stored in syncCodeStack
		return book.engine.run( book.tags[ ctx.syncCodeStack[ ctx.syncCodeDepth ].tagUid ].content , book , ctx , null , callback ) ;
	}

	if ( Dynamic.getFinalValue( this.condition , ctx.data ) ) {
		return book.engine.run( this.content , book , ctx , null , callback ) ;
	}

	if ( this.elsifTags ) {
		for ( i = 0 , iMax = this.elsifTags.length ; i < iMax ; i ++ ) {
			if ( Dynamic.getFinalValue( this.elsifTags[ i ].condition , ctx.data ) ) {
				return book.engine.run( this.elsifTags[ i ].content , book , ctx , null , callback ) ;
			}
		}
	}

	if ( this.elseTag ) {
		return book.engine.run( this.elseTag.content , book , ctx , null , callback ) ;
	}

	return null ;
} ;

