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



var expect = require( 'expect.js' ) ;
var doormen = require( 'doormen' ) ;
var copyData = require( '../lib/copyData.js' ) ;



			/* Helpers */



function deb( something )
{
	console.log( string.inspect( { style: 'color' , depth: 10 } , something ) ) ;
}



			/* Tests */



describe( ".copyData() tests" , function() {
	
	it( "simple shallow copy" , function() {
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
		expect( cp ).to.eql( a ) ;
		
		a = { a: 1 , b: 2 } ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		
		a = { a: 1 , b: 2 , c: { d: 4 } } ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		expect( cp.c ).to.be( a.c ) ;
		
		a = [] ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		
		a = [ 1 , 2 ] ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		
		a = [ 1 , 2 , [ 3 , 4 ] ] ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		expect( cp[ 2 ] ).to.be( a[ 2 ] ) ;
		
		a = new T() ; cp = copyData( a ) ;
		expect( cp ).to.be( a ) ;
		
		t = new T() ;
		t.e = 5 ;
		a = { a: 1 , b: 2 , t: t } ; cp = copyData( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		expect( cp.t ).to.be( a.t ) ;
	} ) ;
	
	it( "simple deep copy" , function() {
		var a , cp ,t ;
		function T() {}
		
		a = 1 ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;
		
		a = "bob" ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;
		
		a = null ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;
		
		a = {} ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		
		a = { a: 1 , b: 2 } ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		
		a = { a: 1 , b: 2 , c: { d: 4 } } ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		expect( cp.c ).not.to.be( a.c ) ;
		expect( cp.c ).to.eql( a.c ) ;
		
		a = [] ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		
		a = [ 1 , 2 ] ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		
		a = [ 1 , 2 , [ 3 , 4 ] ] ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		expect( cp[ 2 ] ).not.to.be( a[ 2 ] ) ;
		expect( cp[ 2 ] ).to.eql( a[ 2 ] ) ;
		
		a = new T() ; cp = copyData.deep( a ) ;
		expect( cp ).to.be( a ) ;
		
		t = new T() ;
		t.e = 5 ;
		a = { a: 1 , b: 2 , t: t } ; cp = copyData.deep( a ) ;
		expect( cp ).not.to.be( a ) ;
		expect( cp ).to.eql( a ) ;
		expect( cp.t ).to.be( a.t ) ;
	} ) ;
	
	it( "deep copy with multiple references of the same object (and circular)" , function() {
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
		doormen.isEqual( cp , a ) ;
		expect( cp.t ).to.be( t ) ;
		expect( cp.t2 ).to.be( t ) ;
		expect( cp.c2 ).not.to.be( a.c2 ) ;
		expect( cp.c2 ).to.eql( a.c2 ) ;
		
		expect( cp.t2 ).to.be( cp.t ) ;
		expect( cp.c2 ).to.be( cp.c ) ;
		expect( cp.circ ).to.be( cp ) ;
	} ) ;
} ) ;


