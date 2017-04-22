/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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



var string = require( 'string-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var chatBot = {} ;
module.exports = chatBot ;



chatBot.addToTree = function addToTree( tree , patterns , tag )
{
	patterns.forEach( pattern => {
		
		var pointer = tree ;
		
		// Turn the pattern into an array of words
		chatBot.simplifyWords( chatBot.splitIntoWords( pattern ) ).forEach( word => {
			if ( ! pointer[ word ] ) { pointer[ word ] = {} ; }
			pointer = pointer[ word ] ;
		} ) ;
		
		// Empty marks the end
		pointer[''] = tag ;
	} ) ;
	
} ;



chatBot.combinePatterns = function combinePatterns( flatPatterns , patternObject , order , index , combo )
{
	index = index || 0 ;
	combo = combo || [] ;
	
	var type = order[ index ] ;
	
	if ( ! patternObject[ type ] ) { patternObject[ type ] = [ '*' ] ; }
	else if ( ! patternObject[ type ].length ) { patternObject[ type ].push( '*' ) ; }
	
	patternObject[ type ].forEach( pattern => {
		combo.push( pattern ) ;
		
		if ( index >= order.length - 1 )
		{
			flatPatterns.push( combo.join( ' | ' ) ) ;
		}
		else
		{
			chatBot.combinePatterns( flatPatterns , patternObject , order , index + 1 , combo ) ;
		}
		
		combo.pop() ;
	} ) ;
} ;



chatBot.query = function query( tree , sentence , state )
{
	var found ,
		stars = [] ,
		words = chatBot.splitIntoWords( sentence ) ,
		simplifiedWords = chatBot.simplifyWords( words ) ;
	
	//log.error( "words: %I" , words ) ;
	
	found = chatBot.graphWalk( tree , 0 , simplifiedWords , words , stars ) ;
	
	if ( ! found ) { return ; }
	
	// the graph walker populate stars depth-first
	state.stars = stars.reverse() ;
	log.error( "Stars: %I" , stars ) ;
	return found ;
} ;



chatBot.graphWalk = function graphWalk( tree , index , simplifiedWords , words , stars )
{
	var found , nextIndex ;
	
	if ( index >= simplifiedWords.length )
	{
		// We reached the end of the sentence, if the node has the terminator, we matched something!
		return tree[''] ;
	}
	
	if ( tree['**'] )
	{
		// A greedy wild card exist: try matching it before fixed word
		// Try matching recursively, eating all remaining word, then leaving one, leaving two, etc...
		for ( nextIndex = simplifiedWords.length ; nextIndex > index ; nextIndex -- )
		{
			found = chatBot.graphWalk( tree['**'] , nextIndex , simplifiedWords , words , stars ) ;
			
			if ( found )
			{
				stars.push( words.slice( index , nextIndex ).join( ' ' ) ) ;
				return found ;
			}
		}
	}
	
	if ( tree[ simplifiedWords[ index ] ] )
	{
		// Found the correct fixed word, walk the graph...
		found = chatBot.graphWalk( tree[ simplifiedWords[ index ] ] , index + 1 , simplifiedWords , words , stars ) ;
		if ( found ) { return found ; }
	}
	
	if ( tree['*'] )
	{
		// No fixed match found, but a wild card was found
		// Try matching recursively, in a non-greedy fashion, eating one word, then two, etc...
		for ( nextIndex = index + 1 ; nextIndex <= simplifiedWords.length ; nextIndex ++ )
		{
			found = chatBot.graphWalk( tree['*'] , nextIndex , simplifiedWords , words , stars ) ;
			
			if ( found )
			{
				stars.push( words.slice( index , nextIndex ).join( ' ' ) ) ;
				return found ;
			}
		}
	}
	
	// Nothing found: it does not match!
	return ;
} ;



// Turn a sentence into an array of words
chatBot.simplifyWords = function simplifyWords( words )
{
	return words.map( word => string.latinize( word ).toLowerCase() ) ;
} ;



// Turn a sentence into an array of words
chatBot.splitIntoWords = function splitIntoWords( sentence )
{
	return (
		sentence.split( /\s+|(?=,)/ )
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


