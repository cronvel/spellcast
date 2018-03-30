/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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
var Tag = kungFig.Tag ;
var VarTag = kungFig.VarTag ;

var Accumulator = require( '../../rpg/Accumulator.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function AccumulatorOpTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof AccumulatorOpTag ) ? this : Object.create( AccumulatorOpTag.prototype ) ;

	VarTag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		fn: { value: self[ tag ] , enumerable: true } ,
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = AccumulatorOpTag ;
AccumulatorOpTag.prototype = Object.create( VarTag.prototype ) ;
AccumulatorOpTag.prototype.constructor = AccumulatorOpTag ;



AccumulatorOpTag.prototype.run = function run( book , ctx , callback ) {
	var accumulator = this.ref.get( ctx.data ) ;

	if ( ! accumulator || typeof accumulator !== 'object' || accumulator.__prototypeUID__ !== 'spellcast/Accumulator' ) {
		log.error( "Not an accumulator..." ) ;
		return null ;
	}

	var content = this.getRecursiveFinalContent( ctx.data ) ;

	return this.fn( ctx , accumulator , content , callback ) ;
} ;



AccumulatorOpTag.prototype['add-to-accumulator'] = function( ctx , accumulator , content ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[add-to-accumulator]'s argument should be an object" ) ;
		return null ;
	}

	accumulator.addEvent( content ) ;

	return null ;
} ;
