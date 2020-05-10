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
const Event = require( '../../Event.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function MaybeTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof MaybeTag ) ? this : Object.create( MaybeTag.prototype ) ;

	var matches , success ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( self.attributes && ! ( matches = self.attributes.match( /^<([a-zA-Z0-9.+-]+)>$/ ) ) ) {
		throw new SyntaxError( "The 'maybe-*' tag's attribute should validate the Maybe syntax." ) ;
	}

	success =
		tag === 'maybe-success' ? true :
		tag === 'maybe-failure' ? false :
		null ;

	Object.defineProperties( self , {
		success: { value: success , enumerable: true } ,
		priority: { value: matches && matches[ 1 ] , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = MaybeTag ;
MaybeTag.prototype = Object.create( Tag.prototype ) ;
MaybeTag.prototype.constructor = MaybeTag ;



MaybeTag.prototype.init = function( book ) {
	var onTag = this.findAncestor( 'check' ) || this.findAncestor( 'on' ) ;

	if ( ! onTag ) {
		throw new SyntaxError( "The [maybe-*] tag must be inside of a [check] or [on] tag" ) ;
	}

	var p = this.priority ;
	this.priority = book.elementPriority( this.priority || onTag.priority , onTag.event , onTag.isCheck ) ;
	log.hdebug( "[%s] priority for %s (%s,%s): %s" , this.name , onTag.event , p , onTag.isCheck , this.priority ) ;

	return null ;
} ;



MaybeTag.prototype.run = function( book , ctx ) {
	if ( ( ctx.data.event instanceof Event ) && this.priority > ctx.data.event.successPriority ) {
		ctx.data.event.success = this.success ;
		ctx.data.event.successPriority = this.priority ;
	}

	return null ;
} ;

