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

"use strict" ;



var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var chatBot = {} ;
module.exports = chatBot ;



chatBot.addToTree = function addToTree( tree , patterns , tag )
{
	patterns.forEach( pattern => {
		
		var pointer = tree ;
		
		// Turn the pattern into an array of words
		chatBot.splitIntoWords( pattern ).forEach( word => {
			if ( ! pointer[ word ] ) { pointer[ word ] = {} ; }
			pointer = pointer[ word ] ;
		} ) ;
		
		// Empty marks the end
		pointer[ '' ] = tag ;
	} ) ;
	
} ;



chatBot.findQuery = function findQuery( tree , sentence )
{
	var i , iMax ,
		pointer = tree ,
		words = chatBot.splitIntoWords( sentence ) ;
	
	//log.error( "words: %I" , words ) ;
	
	for ( i = 0 , iMax = words.length ; i < iMax ; i ++ )
	{
		// Nothing found?
		if ( ! pointer[ words[ i ] ] ) { return ; }
		pointer = pointer[ words[ i ] ] ;
	}
	
	// Empty marks the end
	return pointer[ '' ] ;
} ;



// Turn a sentence into an array of words
chatBot.splitIntoWords = function splitIntoWords( sentence )
{
	return (
		sentence.split( /[\s,]+/ )
			.filter( e => ! e.match( /^\s*$/ ) )
	) ;
} ;



// Turn a string into an array of sentences
chatBot.splitIntoSentences = function splitIntoSentences( str )
{
	return (
		str.split( /(?:\.+(?=(?:[\s!?]|$))|[!?])+/ )
			.filter( e => ! e.match( /^\s*$/ ) )
	) ;
} ;



// Split into an array of array, first splitting into sentences, then into words
chatBot.split = function split( str )
{
	return chatBot.splitIntoSentences( str ).map( e => chatBot.splitIntoWords( e ) ) ;
} ;


