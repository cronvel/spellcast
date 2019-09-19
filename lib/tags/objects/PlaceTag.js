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
const LabelTag = kungFig.LabelTag ;

const tree = require( 'tree-kit' ) ;

const Place = require( '../../objects/Place.js' ) ;
const copyData = require( '../../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function PlaceTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof PlaceTag ) ? this : Object.create( PlaceTag.prototype ) ;

	LabelTag.call( self , 'place' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = PlaceTag ;
PlaceTag.prototype = Object.create( LabelTag.prototype ) ;
PlaceTag.prototype.constructor = PlaceTag ;



PlaceTag.prototype.init = function( book ) {
	var content = this.getRecursiveFinalContent() ;
	var place = PlaceTag.create( book , content ) ;
	book.places[ this.id ] = place ;
	return null ;
} ;



/*
PlaceTag.prototype.run = function( book , ctx ) {
	var value = this.ref.get( ctx.data ) ;
	var content = this.getRecursiveFinalContent( ctx.data ) ;
	var place = PlaceTag.create( book , ctx , content ) ;

	if ( Array.isArray( value ) ) {
		value.push( place ) ;
	}
	else {
		this.ref.set( ctx.data , place ) ;
	}

	return null ;
} ;
*/


PlaceTag.create = function( book ,  content ) {
	var place , data , model , error ;

	if ( content && typeof content === 'object' ) {
		model = content.model ;
	}
	else {
		error = new TypeError( "'place' tag content should be an object" ) ;
		log.error( '%E' , error ) ;
		//callback( error ) ;
		return ;
	}

	// There is no place-model ATM
	//log.info( model ) ;
	//model = model && book.placesModels[ model ] && book.placeModels[ model ].getRecursiveFinalContent( ctx && ctx.data ) ;
	//log.info( model ) ;
	//if ( model ) { data = copyData.deep.extend( {} , model , content ) ; }

	return new Place( book , this.id , data ) ;
} ;

