/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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

const tree = require( 'tree-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function OnEmitStatusTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof OnEmitStatusTag ) ? this : Object.create( OnEmitStatusTag.prototype ) ;

	if ( content === undefined ) {
		content = new TagContainer( undefined , self ) ;
	}

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'on-success'/'on-failure' tag's content should be a TagContainer." ) ;
	}

	Object.defineProperties( self , {
		emitTag: { value: null , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = OnEmitStatusTag ;
OnEmitStatusTag.prototype = Object.create( Tag.prototype ) ;
OnEmitStatusTag.prototype.constructor = OnEmitStatusTag ;



OnEmitStatusTag.prototype.init = function( book ) {
	var index = this.parent.children.indexOf( this ) - 1 ;

	if ( index < 0 ) { return null ; }

	switch ( this.parent.children[ index ].name ) {
		case 'emit' :
			this.emitTag = this.parent.children[ index ] ;
			break ;
		case 'on-success' :
		case 'on-failure' :
			this.emitTag = this.parent.children[ index ].emitTag ;
			break ;
		default :
			return null ;
	}

	// Add the current tag to the elsifTags array of the [if] tag
	if ( this.name === 'on-success' ) {
		this.emitTag.onSuccessTag = this ;
	}
	else if ( this.name === 'on-failure' ) {
		this.emitTag.onFailureTag = this ;
	}

	return null ;
} ;

