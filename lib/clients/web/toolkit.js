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



const toolkit = {} ;
module.exports = toolkit ;



const markupMethod = require( 'string-kit/lib/format.js' ).markupMethod ;
const escapeHtml = require( 'string-kit/lib/escape.js' ).html ;



const markupConfig = {
	endingMarkupReset: true ,
	markupReset: function( markupStack ) {
		var str = '</span>'.repeat( markupStack.length ) ;
		markupStack.length = 0 ;
		return str ;
	} ,
	markup: {
		":": function( markupStack ) {
			var str = '</span>'.repeat( markupStack.length ) ;
			markupStack.length = 0 ;
			return str ;
		} ,
		" ": function( markupStack ) {
			var str = '</span>'.repeat( markupStack.length ) ;
			markupStack.length = 0 ;
			return str + ' ' ;
		} ,

		"-": '<span class="dim">' ,
		"+": '<span class="bold">' ,
		"_": '<span class="underline">' ,
		"/": '<span class="italic">' ,
		"!": '<span class="inverse">' ,

		"b": '<span class="blue">' ,
		"B": '<span class="bright blue">' ,
		"c": '<span class="cyan">' ,
		"C": '<span class="bright cyan">' ,
		"g": '<span class="green">' ,
		"G": '<span class="bright green">' ,
		"k": '<span class="black">' ,
		"K": '<span class="grey">' ,
		"m": '<span class="magenta">' ,
		"M": '<span class="bright magenta">' ,
		"r": '<span class="red">' ,
		"R": '<span class="bright red">' ,
		"w": '<span class="white">' ,
		"W": '<span class="bright white">' ,
		"y": '<span class="yellow">' ,
		"Y": '<span class="bright yellow">'
	}
} ;



toolkit.markup = function( ... args ) {
	args[ 0 ] = escapeHtml( args[ 0 ] ).replace( /\n/ , '<br />' ) ;
	return markupMethod.apply( markupConfig , args ) ;
} ;

