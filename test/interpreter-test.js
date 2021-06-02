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

/* global describe, it, expect */

"use strict" ;



const string = require( 'string-kit' ) ;
const InputInterpreter = require( '../lib/InputInterpreter.js' ) ;

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'unit-tests' ) ;



/* Helpers */



function deb( something ) {
	console.log( string.inspect( { style: 'color' , depth: 10 } , something ) ) ;
}



function testTokenize( source , options , expected ) {
	if ( arguments.length <= 2 ) {
		expected = options ;
		options = null ;
	}

	var tokens = [] ;
	var simplifiedTokens = [] ;
	InputInterpreter.tokenize( source , options , tokens , simplifiedTokens ) ;
	expect( tokens ).to.equal( expected ) ;
}





/* Tests */



describe( "Interpreter" , () => {

	describe( "Preprocessing" , () => {

		it( "Splitting basic sentence into tokens" , () => {
			testTokenize( 'One two three' , [ 'One' , 'two' , 'three' ] ) ;
			testTokenize( 'One 2 thr33' , [ 'One' , '2' , 'thr33' ] ) ;
			testTokenize( 'Éâï ôùæÆ ÆØç' , [ 'Éâï' , 'ôùæÆ' , 'ÆØç' ] ) ;

			testTokenize( '* two three' , [ '*' , 'two' , 'three' ] ) ;
			testTokenize( 'One * three' , [ 'One' , '*' , 'three' ] ) ;
			testTokenize( 'One two *' , [ 'One' , 'two' , '*' ] ) ;

			testTokenize( '** two three' , [ '**' , 'two' , 'three' ] ) ;
			testTokenize( 'One ** three' , [ 'One' , '**' , 'three' ] ) ;
			testTokenize( 'One two **' , [ 'One' , 'two' , '**' ] ) ;

			testTokenize( "j'ai" , [ 'j' , 'ai' ] ) ;
			testTokenize( "one-two" , [ 'one-two' ] ) ;

			testTokenize( '* | two | three' , [ '*' , '|' , 'two' , '|' , 'three' ] ) ;
		} ) ;

		it( "Splitting sentence with punctuation into tokens" , () => {
			testTokenize( 'One, two,three' , [ 'One' , 'two' , 'three' ] ) ;
			testTokenize( 'One, two,three' , { punctuations: true } , [ 'One' , ',' , 'two' , ',' , 'three' ] ) ;

			testTokenize( 'One, two... three!!!' , [ 'One' , 'two' , 'three' ] ) ;
			testTokenize( 'One, two... three!!!' , { punctuations: true } , [ 'One' , ',' , 'two' , '...' , 'three' , '!!!' ] ) ;

			testTokenize( 'a=b' , [ 'a' , 'b' ] ) ;
			testTokenize( 'a=b' , { symbols: true } , [ 'a' , '=' , 'b' ] ) ;
		} ) ;

		it( "Simplify tokens" , () => {
			expect( InputInterpreter.simplifyTokens( [ 'One' , 'two' , 'three' ] ) ).to.equal( [ 'one' , 'two' , 'three' ] ) ;
			expect( InputInterpreter.simplifyTokens( [ 'Éâï' , 'ôùæÆ' , 'ÆØç' ] ) ).to.equal( [ 'eai' , 'ouaeae' , 'aeoc' ] ) ;

			expect( InputInterpreter.simplifyTokens( [ '!' , '!!' , '!!!' , '.' , '...' , '!...' , '?!' ] ) ).to.equal( [ '!' , '!' , '!' , '.' , '.' , '!' , '?' ] ) ;
		} ) ;
	} ) ;
} ) ;


