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

/* global describe, it, expect */

"use strict" ;



var string = require( 'string-kit' ) ;
var copyData = require( '../lib/copyData.js' ) ;



/* Helpers */



function deb( something ) {
	console.log( string.inspect( { style: 'color' , depth: 10 } , something ) ) ;
}



/* Tests */



describe( ".copyData() tests" , () => {

	it( "simple shallow copy" , () => {
		var a , cp , t ;
		function T() {}

		a = 1 ; cp = copyData( a ) ;
		expect( cp ).to.be( a ) ;

		a = "bob" ; cp = copyData( a ) ;
		expect( cp ).to.be( a ) ;

		a = null ; cp = copyData( a ) ;
		expect( cp ).to.be( a ) ;

		a = {} ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = { a: 1 , b: 2 } ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = { a: 1 , b: 2 , c: { d: 4 } } ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;
		expect( cp.c ).to.be( a.c ) ;

		a = [] ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = [ 1 , 2 ] ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = [ 1 , 2 , [ 3 , 4 ] ] ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;
		expect( cp[ 2 ] ).to.be( a[ 2 ] ) ;

		a = new T() ; cp = copyData( a ) ;
		expect( cp ).to.be( a ) ;

		t = new T() ;
		t.e = 5 ;
		a = { a: 1 , b: 2 , t: t } ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;
		expect( cp.t ).to.be( a.t ) ;
	} ) ;

	it( "simple deep copy" , () => {
		var a , cp , t ;
		function T() {}

		a = 1 ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;

		a = "bob" ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;

		a = null ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;

		a = {} ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = { a: 1 , b: 2 } ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = { a: 1 , b: 2 , c: { d: 4 } } ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;
		expect( cp.c ).not.to.be( a.c ) ;
		expect( cp.c ).to.equal( a.c ) ;

		a = [] ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = [ 1 , 2 ] ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;

		a = [ 1 , 2 , [ 3 , 4 ] ] ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;
		expect( cp[ 2 ] ).not.to.be( a[ 2 ] ) ;
		expect( cp[ 2 ] ).to.equal( a[ 2 ] ) ;

		a = new T() ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;

		t = new T() ;
		t.e = 5 ;
		a = { a: 1 , b: 2 , t: t } ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;
		expect( cp.t ).to.be( a.t ) ;
	} ) ;

	it( "deep copy with multiple references of the same object (and circular)" , () => {
		var a , cp , t ;
		function T() {}


		a = { a: 1 , b: 2 , c: { d: 4 } } ;
		a.c2 = a.c ;
		a.circ = a ;

		t = new T() ;
		t.e = 5 ;
		t.circ = a ;
		a.t = t ;
		a.t2 = t ;

		cp = copyData.deep( a ) ;

		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.equal( a ) ;
		expect( cp.t ).to.be( t ) ;
		expect( cp.t2 ).to.be( t ) ;
		expect( cp.c2 ).not.to.be( a.c2 ) ;
		expect( cp.c2 ).to.equal( a.c2 ) ;

		expect( cp.t2 ).to.be( cp.t ) ;
		expect( cp.c2 ).to.be( cp.c ) ;
		expect( cp.circ ).to.be( cp ) ;
	} ) ;

	it( "simple shallow extend" , () => {
		var a , b , t ;
		function T() {}

		t = new T() ;
		t.e = 5 ;
		a = {
			a: 1 , b: 2 , c: { d: 4 , z: 'ZEE' } , t: t
		} ;
		b = {
			a: 10 , c: { d: 42 , f: 7 } , g: 'G' , t2: t
		} ;

		copyData.extend( a , b ) ;

		expect( a ).to.equal( {
			a: 10 , b: 2 , c: { d: 42 , f: 7 } , g: 'G' , t: t , t2: t
		} ) ;
		expect( a.t ).to.be( a.t2 ) ;
	} ) ;

	it( "simple deep extend" , () => {
		var a , b , t ;
		function T() {}

		t = new T() ;
		t.e = 5 ;
		a = {
			a: 1 , b: 2 , c: { d: 4 , z: 'ZEE' } , t: t
		} ;
		b = {
			a: 10 , c: { d: 42 , f: 7 } , g: 'G' , t2: t
		} ;

		copyData.deep.extend( a , b ) ;

		expect( a ).to.equal( {
			a: 10 , b: 2 , c: { d: 42 , f: 7 , z: 'ZEE' } , g: 'G' , t: t , t2: t
		} ) ;
		expect( a.t ).to.be( a.t2 ) ;
	} ) ;

	it.next( "deep extend with multiple references in the source (behavior to improve)" , () => {
		var a , b , t ;
		function T() {}

		t = new T() ;
		t.e = 5 ;
		a = { a: 1 , b: 2 } ;
		b = { a: 10 , b: { d: 42 , f: 7 } } ;
		b.b2 = b.b ;

		copyData.deep.extend( a , b ) ;

		expect( a ).to.equal( { a: 10 , b: { d: 42 , f: 7 } , b2: { d: 42 , f: 7 } } ) ;
		expect( a.b ).to.be( a.b2 ) ;
	} ) ;
} ) ;


