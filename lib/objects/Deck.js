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



/*
	A deck is a collection of cards.
*/



const BaseObject = require( './BaseObject.js' ) ;
const kungFig = require( 'kung-fig' ) ;
const copyData = require( '../copyData.js' ) ;

const Card = require( './Card.js' ) ;
//const svgKit = require( 'svg-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Deck( book , id , params ) {
	if ( ! params || typeof params !== 'object' ) {
		params = {} ;
	}
	else {
		// Clone params to avoid parts to be shared
		params = copyData.deep( params ) ;
	}

	if ( ! id ) { id = 'card_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , params ) ;

	this.cards = new Set() ;
	
	if ( Array.isArray( params.cards ) ) {
		this.setCards( params.cards ) ;
	}
}

module.exports = Deck ;

Deck.prototype = Object.create( BaseObject.prototype ) ;
Deck.prototype.constructor = Deck ;
Deck.prototype.__prototypeUID__ = 'spellcast/Deck' ;
Deck.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Deck.serializer = function( place ) {
	return { override: place } ;
} ;



Deck.unserializeContext = true ;

Deck.unserializer = function( context ) {
	var place = Object.create( Deck.prototype ) ;
	Object.defineProperty( place , 'book' , { value: context.book } ) ;
	//log.error( "Deck.unserializer: %I" , context ) ;
	return place ;
} ;

