/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const string = require( 'string-kit' ) ;
const XRegExp = require( 'xregexp' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function InputInterpreter( options = {} ) {
	this.patternOrder = options.patternOrder || [] ;
	this.substitutions = options.substitutions || {} ;
	this.queryPatternTree = {} ;
	
	// Input is mandatory, nothing would work without it!
	if ( this.patternOrder.indexOf( 'input' ) === -1 ) { this.patternOrder.unshift( 'input' ) ; }
	
	if ( ! this.substitutions.input ) { this.substitutions.input = {} ; }
}

module.exports = InputInterpreter ;


InputInterpreter.prototype.simplifySubstitutions = function() {
    var type , key , simplifiedKey , tokens , simplifiedTokens ;
    
    for ( type in this.substitutions ) {
		group = this.substitutions[ type ] ;
		if ( ! group || typeof group !== 'object' ) {
			delete this.substitutions[ type ] ;
			continue ;
		}
		
		for ( key in group ) {
			simplifiedKey = InputInterpreter.simplify( key ) ;
			tokens = [] ;
			simplifiedTokens = [] ;
			InputInterpreter.tokenize( group[ key ] , { all: true } , tokens , simplifiedTokens ) ;
			group[ simplifiedKey ] = tokens ;
		}
    }
} ;


InputInterpreter.addToTree = function( tree , patterns , tag , options ) {
	patterns.forEach( pattern => {

		var tokens = [] , simplifiedTokens = [] , pointer = tree ;

		// Turn the pattern into an array of tokens
		InputInterpreter.tokenize( pattern , options , tokens , simplifiedTokens ) ;

		simplifiedTokens.forEach( token => {
			if ( ! pointer[ token ] ) { pointer[ token ] = {} ; }
			pointer = pointer[ token ] ;
		} ) ;

		// Empty marks the end
		pointer[''] = tag ;
	} ) ;

} ;



InputInterpreter.combinePatterns = function( flatPatterns , patternObject , order , index , combo ) {
	index = index || 0 ;
	combo = combo || [] ;

	var type = order[ index ] ;

	if ( ! patternObject[ type ] ) { patternObject[ type ] = [ '*' ] ; }
	else if ( ! patternObject[ type ].length ) { patternObject[ type ].push( '*' ) ; }

	patternObject[ type ].forEach( pattern => {
		combo.push( pattern ) ;

		if ( index >= order.length - 1 ) {
			flatPatterns.push( combo.join( ' | ' ) ) ;
		}
		else {
			InputInterpreter.combinePatterns( flatPatterns , patternObject , order , index + 1 , combo ) ;
		}

		combo.pop() ;
	} ) ;
} ;



InputInterpreter.query = function( tree , state , options ) {
	var fullInput , found ,
		stars = {} ,
		tokens = [] ,
		simplifiedTokens = [] ;

	// Create the full input string
	state.input = state.input.replace( /[*|]/g , match => '\\' + match ) ;
	fullInput = options.patternOrder.map( type => state[ type ] || ( state[ type ] = '*' ) ).join( ' | ' ) ;

	InputInterpreter.tokenize( fullInput , options , tokens , simplifiedTokens , true ) ;

	//log.error( "fullInput: %I\ntokens: %I" , fullInput , tokens ) ;

	options.patternOrder.forEach( type => stars[ type ] = [] ) ;

	found = InputInterpreter.graphWalk( tree , 0 , simplifiedTokens , tokens , stars , options.patternOrder , 0 ) ;

	if ( ! found ) { return ; }

	// the graph walker populate stars depth-first
	options.patternOrder.forEach( type => stars[ type ].reverse() ) ;

	state.stars = stars ;

	//log.error( "Stars: %I" , stars ) ;

	return found ;
} ;



InputInterpreter.graphWalk = function( tree , index , simplifiedTokens , tokens , stars , patternOrder , segment )	{
	var found , nextIndex ,
		type = patternOrder[ segment ] ,
		sToken = simplifiedTokens[ index ] ;

	//log.info( "graphWalk %i %s %s" , index , tokens[ index ] , sToken ) ;
	if ( index >= simplifiedTokens.length ) {
		//log.info( "end %Y" , tree[''] ) ;
		// We reached the end of the sentence, if the node has the terminator, we matched something!
		return tree[''] ;
	}

	if ( tree['**'] && sToken !== '|' ) {
		//log.info( "super star ** %Y" , tree['**'] ) ;
		// A greedy wild card exist: try matching it before fixed token
		// Try matching recursively, eating all remaining token, then leaving one, leaving two, etc...
		// But do not eat after |
		nextIndex = simplifiedTokens.indexOf( '|' , index ) ;
		if ( nextIndex === -1 ) { nextIndex = simplifiedTokens.length ; }

		for ( ; nextIndex > index ; nextIndex -- ) {
			found = InputInterpreter.graphWalk( tree['**'] , nextIndex , simplifiedTokens , tokens , stars , patternOrder , segment ) ;

			if ( found ) {
				stars[ type ].push( tokens.slice( index , nextIndex ).join( ' ' ) ) ;
				return found ;
			}
		}
	}

	if ( tree[ sToken ] && sToken !== '*' && sToken !== '**' ) {
		//log.info( "fixed '%s' %Y" , sToken , tree[ sToken ] ) ;
		// Found the correct fixed token, walk the graph...
		found = InputInterpreter.graphWalk( tree[ sToken ] , index + 1 , simplifiedTokens , tokens , stars , patternOrder ,
			sToken === '|' ? segment + 1 : segment ) ;

		if ( found ) { return found ; }
	}

	if ( tree['*'] && sToken !== '|' ) {
		//log.info( "star * %Y" , tree['*'] ) ;
		// No fixed match found, but a wild card was found
		// Try matching recursively, in a non-greedy fashion, eating one token, then two, etc...
		nextIndex = index + 1 ;

		for ( ; nextIndex <= simplifiedTokens.length && simplifiedTokens[ nextIndex - 1 ] !== '|' ; nextIndex ++ ) {
			found = InputInterpreter.graphWalk( tree['*'] , nextIndex , simplifiedTokens , tokens , stars , patternOrder , segment ) ;

			if ( found ) {
				//log.warning( "push stars %Y" , tokens.slice( index , nextIndex ) ) ;
				stars[ type ].push( tokens.slice( index , nextIndex ).join( ' ' ) ) ;
				return found ;
			}
		}
	}

	//log.info( "nothing found" ) ;
	// Nothing found: it does not match!
	return ;
} ;



// Match '...' , '!!' , '!!!' , '??' and the like
const punctuationRepetitionRegex = XRegExp( '^(\\pP)\\1+$' ) ;
// Detect punctuation and match the first and following punctuation
const multiplePunctuationRegex = XRegExp( '^(\\pP)(\\pP*)$' ) ;



// Simplify an array of tokens
InputInterpreter.simplifyTokens = function( tokens ) {
	return tokens.map( InputInterpreter.simplifyToken ) ;
} ;



// Turn a sentence into an array of tokens
InputInterpreter.simplifyToken =
InputInterpreter.simplify = function( token ) {
	var match ;

	// Replace multiple punctuation by the first one
	if ( ( match = token.match( multiplePunctuationRegex ) ) ) { return match[ 1 ] ; }

	// Letters
	return string.latinize( token ).toLowerCase() ;
} ;



// using XRegExp, \pL matches unicode letters, \pN matches unicode numbers, \pP matches unicode punctuation
//const tokenizerWithPunctuation = string.XRegExp( '[*|\\pL\\pN]+|\\pP+' , 'g' ) ;
//const tokenizerWithoutPunctuation = string.XRegExp( '[*|\\pL\\pN]+' , 'g' ) ;



// Turn a sentence into an array of tokens
InputInterpreter.tokenize = function( sentence , options , tokens , simplifiedTokens , isInput ) {
	options = options || {} ;

	var tokenizer , matches , token , simplifiedToken ,
		segment = 0 ,
		type = options.patternOrder && options.patternOrder[ segment ] ;

	tokenizer = [ '[*|\\pL\\pN-]+' ] ;
	if ( options.all || options.punctuation ) { tokenizer.push( '\\pP+' ) ; }
	if ( options.all || options.symbols ) { tokenizer.push( '[=+/\\\\*|]+' ) ; }

	tokenizer = XRegExp( tokenizer.join( '|' ) , 'g' ) ;

	while ( ( matches = tokenizer.exec( sentence ) ) ) {
		token = matches[ 0 ] ;
		simplifiedToken = InputInterpreter.simplifyToken( token ) ;

		//log.error( "token: %s" , token ) ;
		if ( token === '|' ) {
			type = options.patternOrder && options.patternOrder[ segment ++ ] ;
			tokens.push( token ) ;
			simplifiedTokens.push( simplifiedToken ) ;
		}
		else if ( isInput && type === 'input' && options.substitutions.input[ simplifiedToken ] ) {
			// Perform substitutions...
			token = options.substitutions.input[ simplifiedToken ] ;
			simplifiedToken = token.map( InputInterpreter.simplifyToken ) ;
			//log.error( "sub: %I\ntoken: %I" , options.substitutions.input , token ) ;

			if ( Array.isArray( token ) ) {
				tokens.splice( tokens.length , 0 , ... token ) ;
				simplifiedTokens.splice( simplifiedTokens.length , 0 , ... simplifiedToken ) ;
			}
			else if ( token ) {
				tokens.push( token ) ;
				simplifiedTokens.push( simplifiedToken ) ;
			}
		}
		else {
			tokens.push( token ) ;
			simplifiedTokens.push( simplifiedToken ) ;
		}
	}

	return tokens ;
} ;

