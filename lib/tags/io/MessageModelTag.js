/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



function MessageModelTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof MessageModelTag ) ? this : Object.create( MessageModelTag.prototype ) ;

	LabelTag.call( self , 'message-model' , attributes , content , shouldParse ) ;

	if ( ! content || typeof content !== 'object' ) {
		throw new SyntaxError( "The 'message-model' tag's content should be an object." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'message-model' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = MessageModelTag ;
MessageModelTag.prototype = Object.create( LabelTag.prototype ) ;
MessageModelTag.prototype.constructor = MessageModelTag ;



MessageModelTag.prototype.run = function run( book , ctx ) {
	var data = this.getRecursiveFinalContent( ctx.data ) ;

	if ( data && typeof data === 'object' ) {
		book.messageModels[ this.id ] = data ;
	}
	else {
		delete book.messageModels[ this.id ] ;
	}

	return null ;
} ;


