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



chatBot.addToTree = function addToTree( tree , patterns , tag , options )
{
	patterns.forEach( pattern => {
		
		var pointer = tree ;
		
		// Turn the pattern into an array of tokens
		chatBot.simplifyTokens( chatBot.tokenize( pattern , options ) ).forEach( token => {
			if ( ! pointer[ token ] ) { pointer[ token ] = {} ; }
			pointer = pointer[ token ] ;
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



chatBot.query = function query( tree , sentence , patternOrder , state )
{
	var found ,
		stars = {} ,
		tokens = chatBot.tokenize( sentence ) ,
		simplifiedTokens = chatBot.simplifyTokens( tokens ) ;
	
	//log.error( "sentence: %I\ntokens: %I" , sentence , tokens ) ;
	
	patternOrder.forEach( type => stars[ type ] = [] ) ;
	
	found = chatBot.graphWalk( tree , 0 , simplifiedTokens , tokens , stars , patternOrder , 0 ) ;
	
	if ( ! found ) { return ; }
	
	// the graph walker populate stars depth-first
	patternOrder.forEach( type => stars[ type ].reverse() ) ;
	
	state.stars = stars ;
	
	//log.error( "Stars: %I" , stars ) ;
	
	return found ;
} ;



chatBot.graphWalk = function graphWalk( tree , index , simplifiedTokens , tokens , stars , patternOrder , segment )	// jshint ignore:line
{
	var found , nextIndex ,
		sToken = simplifiedTokens[ index ] ;
	
	//log.info( "graphWalk %i %s %s" , index , tokens[ index ] , sToken ) ;
	if ( index >= simplifiedTokens.length )
	{
		//log.info( "end %Y" , tree[''] ) ;
		// We reached the end of the sentence, if the node has the terminator, we matched something!
		return tree[''] ;
	}
	
	if ( tree['**'] && sToken !== '|' )
	{
		//log.info( "super star ** %Y" , tree['**'] ) ;
		// A greedy wild card exist: try matching it before fixed token
		// Try matching recursively, eating all remaining token, then leaving one, leaving two, etc...
		// But do not eat after |
		nextIndex = simplifiedTokens.indexOf( '|' , index ) ;
		if ( nextIndex === -1 ) { nextIndex = simplifiedTokens.length ; }
		
		for ( ; nextIndex > index ; nextIndex -- )
		{
			found = chatBot.graphWalk( tree['**'] , nextIndex , simplifiedTokens , tokens , stars , patternOrder , segment ) ;
			
			if ( found )
			{
				stars[ patternOrder[ segment ] ].push( tokens.slice( index , nextIndex ).join( ' ' ) ) ;
				return found ;
			}
		}
	}
	
	if ( tree[ sToken ] && sToken !== '*' && sToken !== '**' )
	{
		//log.info( "fixed '%s' %Y" , sToken , tree[ sToken ] ) ;
		// Found the correct fixed token, walk the graph...
		found = chatBot.graphWalk( tree[ sToken ] , index + 1 , simplifiedTokens , tokens , stars , patternOrder ,
			sToken === '|' ? segment + 1 : segment ) ;
		
		if ( found ) { return found ; }
	}
	
	if ( tree['*'] && sToken !== '|' )
	{
		//log.info( "star * %Y" , tree['*'] ) ;
		// No fixed match found, but a wild card was found
		// Try matching recursively, in a non-greedy fashion, eating one token, then two, etc...
		nextIndex = index + 1 ;
		
		for ( ; nextIndex <= simplifiedTokens.length && simplifiedTokens[ nextIndex - 1 ] !== '|' ; nextIndex ++ )
		{
			found = chatBot.graphWalk( tree['*'] , nextIndex , simplifiedTokens , tokens , stars , patternOrder , segment ) ;
			
			if ( found )
			{
				//log.warning( "push stars %Y" , tokens.slice( index , nextIndex ) ) ;
				stars[ patternOrder[ segment ] ].push( tokens.slice( index , nextIndex ).join( ' ' ) ) ;
				return found ;
			}
		}
	}
	
	//log.info( "nothing found" ) ;
	// Nothing found: it does not match!
	return ;
} ;



// Match '...' , '!!' , '!!!' , '??' and the like
const punctuationRepetitionRegex = string.XRegExp( '^(\\pP)\\1+$' ) ;
// Detect punctuation and match the first and following punctuation
const multiplePunctuationRegex = string.XRegExp( '^(\\pP)(\\pP*)$' ) ;



// Turn a sentence into an array of tokens
chatBot.simplifyTokens = function simplifyTokens( tokens )
{
	return tokens.map( token => {
		var match ;
		
		// Replace multiple punctuation by the first one
		if ( ( match = token.match( multiplePunctuationRegex ) ) ) { return match[ 1 ] ; }
		
		// Letters
		return string.latinize( token ).toLowerCase() ;
	} ) ;
} ;



// using XRegExp, \pL matches unicode letters, \pN matches unicode numbers, \pP matches unicode punctuation
const tokenizerWithPunctuation = string.XRegExp( '[*|\\pL\\pN]+|\\pP+' , 'g' ) ;
const tokenizerWithoutPunctuation = string.XRegExp( '[*|\\pL\\pN]+' , 'g' ) ;



// Turn a sentence into an array of tokens
chatBot.tokenize = function tokenize( sentence , options )
{
	var tokenizer , matches , tokens = [] , token ;
	
	options = options || {} ;
	
	tokenizer = [ '[*|\\pL\\pN]+' ] ;
	if ( options.punctuation ) { tokenizer.push( '\\pP+' ) ; }
	if ( options.symbols ) { tokenizer.push( '[=]+' ) ; }
	
	tokenizer = string.XRegExp( tokenizer.join( '|' ) , 'g' ) ;
	
	while ( ( matches = tokenizer.exec( sentence ) ) )
	{
		// Substitutions may take place here
		tokens.push( matches[ 0 ] ) ;
	}
	
	return tokens ;
} ;



// Split into an array of array, first splitting into sentences, then into tokens
chatBot.split = function split( str )
{
	return chatBot.splitIntoSentences( str ).map( e => chatBot.tokenize( e ) ) ;
} ;



// Turn a string into an array of sentences
chatBot.splitIntoSentences = function splitIntoSentences( str )
{
	return (
		str.split( /(?:\.+(?=(?:[\s!?]|$))|[!?])+/ )
			.filter( e => ! e.match( /^\s*$/ ) )
	) ;
} ;


