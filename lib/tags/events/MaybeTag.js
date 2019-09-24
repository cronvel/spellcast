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



const kungFig = require( 'kung-fig' ) ;
const Tag = kungFig.Tag ;
const Event = require( '../../Event.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function MaybeTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof MaybeTag ) ? this : Object.create( MaybeTag.prototype ) ;
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	var success =
		tag === 'maybe-success' ? true :
		tag === 'maybe-failure' ? false :
		null ;
	
	Object.defineProperties( self , {
		success: { value: success , enumerable: true } ,
		onTag: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = MaybeTag ;
MaybeTag.prototype = Object.create( Tag.prototype ) ;
MaybeTag.prototype.constructor = MaybeTag ;



MaybeTag.prototype.init = function( book ) {
	this.onTag = this.findAncestor( 'check' ) || this.findAncestor( 'on' ) ;
	return null ;
} ;



MaybeTag.prototype.run = function( book , ctx ) {
	if ( ! ( ctx.data.event instanceof Event ) ) { return null ; }

	if ( this.onTag.priority > ctx.data.event.successPriority ) {
		ctx.data.event.success = this.success ;
		ctx.data.event.successPriority = this.onTag.priority ;
	}
	
	return null ;
} ;

