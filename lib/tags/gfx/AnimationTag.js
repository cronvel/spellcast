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
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;

const Ngev = require( 'nextgen-events' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function AnimationTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof AnimationTag ) ? this : Object.create( AnimationTag.prototype ) ;

	var matches ;

	Tag.call( self , 'animation' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)|([^$ ]+)$/ ) ) ) {
		throw new SyntaxError( "The 'animation' tag's attribute should validate the animation syntax." ) ;
	}

	Object.defineProperties( self , {
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true }
	} ) ;

	return self ;
}



module.exports = AnimationTag ;
AnimationTag.prototype = Object.create( Tag.prototype ) ;
AnimationTag.prototype.constructor = AnimationTag ;



const camel = require( '../../camel.js' ) ;

AnimationTag.prototype.run = function( book , ctx ) {
	var self = this , id , data ;

	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;

	data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;

	if ( ! data || typeof data !== 'object' ) {
		return new TypeError( '[animation] tag: bad data.' ) ;
	}

	Ngev.groupEmit( ctx.roles , 'defineAnimation' , id , data ) ;
	return null ;
} ;


