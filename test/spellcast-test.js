/*
	The Cedric's Swiss Knife (CSK) - CSK Spellcast test suite
	
	The MIT License (MIT)
	
	Copyright (c) 2014 Cédric Ronvel 
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

/* jshint unused:false */
/* global describe, it, before, after */


var spellcast = require( '../lib/spellcast.js' ) ;
var expect = require( 'expect.js' ) ;
var fs = require( 'fs' ) ;





			/* Helper functions */



function fn()
{
}





			/* Tests */



describe( "Sample file" , function() {
	
	it( "1" , function() {
		var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
		console.log( book.ingredients ) ;
		console.log( book.spells.fireball ) ;
		console.log( book.spells.fireball.casting[ 0 ] ) ;
	} ) ;
	
	it( "2" , function( done ) {
		var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
		book.cast( 'fireball' , done ) ;
	} ) ;
	
	it( "3" , function( done ) {
		var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
		book.cast( 'nova' , done ) ;
	} ) ;
	
	it( "4" , function( done ) {
		var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
		book.cast( 'blah' , done ) ;
	} ) ;
	
	it( "5" , function( done ) {
		var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
		book.cast( 'depend' , done ) ;
	} ) ;
} ) ;



