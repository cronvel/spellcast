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
var TagContainer = kungFig.TagContainer ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function EndTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof EndTag ) ? this : Object.create( EndTag.prototype ) ;

	switch ( tag ) {
		case 'end' :
		case 'win' :
		case 'lost' :
		case 'draw' :
			break ;

		default :
			tag = 'end' ;
	}

	LabelTag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		label: { value: self.attributes || null , writable: true , enumerable: true } ,
		result: { value: tag , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = EndTag ;
EndTag.prototype = Object.create( LabelTag.prototype ) ;
EndTag.prototype.constructor = EndTag ;



EndTag.prototype.run = function run( book , ctx , callback ) {
	// First check status updater: this is the good timing to do so
	if ( ctx.statusUpdater ) {
		ctx.statusUpdater.exec( book , null , ctx ) ;
	}

	book.end( this.result , { label: this.label } )
		.then(
			() => { callback( { end: true } ) ; } ,
			error => { callback( error ) ; }
		) ;
} ;

