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
const LabelTag = kungFig.LabelTag ;
const TagContainer = kungFig.TagContainer ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// Only serve as a group of scene



function ChapterTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ChapterTag ) ? this : Object.create( ChapterTag.prototype ) ;

	switch ( tag ) {
		case 'chapter' :
		case 'system' :
			break ;
		default :
			throw new Error( "The unknown tag '" + tag + "'." ) ;
	}

	LabelTag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'chapter' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'chapter' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
		theme: {
			value: null , writable: true , enumerable: true
		} ,
		image: {
			value: null , writable: true , enumerable: true
		} ,
		music: {
			value: null , writable: true , enumerable: true
		} ,
		chat: {
			value: null , writable: true , enumerable: true
		}
	} ) ;

	return self ;
}

module.exports = ChapterTag ;
ChapterTag.prototype = Object.create( LabelTag.prototype ) ;
ChapterTag.prototype.constructor = ChapterTag ;



ChapterTag.prototype.init = function( book ) {
	this.theme = this.content.getFirstTag( 'theme' ) ;
	this.image = this.content.getFirstTag( 'image' ) ;
	this.music = this.content.getFirstTag( 'music' ) ;
	this.chat = this.content.getFirstTag( 'chat' ) ;

	return null ;
} ;


