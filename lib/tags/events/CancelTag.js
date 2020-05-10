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

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CancelTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof CancelTag ) ? this : Object.create( CancelTag.prototype ) ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	var success =
		tag === 'success' ? true :
		tag === 'failure' ? false :
		null ;

	Object.defineProperties( self , {
		success: { value: success , enumerable: true }
	} ) ;

	return self ;
}

module.exports = CancelTag ;
CancelTag.prototype = Object.create( Tag.prototype ) ;
CancelTag.prototype.constructor = CancelTag ;



CancelTag.prototype.run = function( book , ctx ) {
	//log.hdebug( "cancel: %Y" , ctx.data ) ;
	if ( this.success !== null && ctx.data.event && typeof ctx.data.event === 'object' ) {
		ctx.data.event.success = this.success ;
		//log.hdebug( "ctx.data.event: %Y" , ctx.data.event ) ;
	}

	return {
		break: 'cancel' ,
		cancel: this.getRecursiveFinalContent( ctx.data ) || true
	} ;
} ;

