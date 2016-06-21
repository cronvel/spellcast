/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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

/* jshint unused:false */
/* global describe, it, before, after */


var Book = require( '../lib/Book.js' ) ;
var string = require( 'string-kit' ) ;



			/* Tests */


function deb( something )
{
	console.log( string.inspect( { style: 'color' , depth: 10 } , something ) ) ;
}



describe( "..." , function() {
	
	it( "..." , function( done ) {
		
		var book = Book.load( __dirname + '/../sample/spellbook' ) ;
		//deb( book ) ;
		
		book.cast( 'ls' , done ) ;
	} ) ;
} ) ;


