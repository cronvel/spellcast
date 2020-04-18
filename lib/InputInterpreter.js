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
	this.punctuations = !! options.punctuations ;
	this.symbols = !! options.symbols ;
	
	// Input is mandatory, nothing would work without it!
	if ( this.patternOrder.indexOf( 'input' ) === -1 ) { this.patternOrder.unshift( 'input' ) ; }
	
	if ( ! this.substitutions.input ) { this.substitutions.input = {} ; }
	
	this.tokenizeSubstitutions() ;
}

module.exports = InputInterpreter ;



InputInterpreter.prototype.tokenizeSubstitutions = function() {
	var type , group , simplifiedKey , tokens , simplifiedTokens ;
	
	for ( type in this.substitutions ) {
		group = this.substitutions[ type ] ;
		if ( ! group || typeof group !== 'object' ) {
			delete this.substitutions[ type ] ;
			continue ;
		}
		
		Object.keys( group ).forEach( key => {
			simplifiedKey = InputInterpreter.simplify( key ) ;
			tokens = [] ;
			simplifiedTokens = [] ;
			InputInterpreter.tokenize( group[ key ] , { all: true } , tokens , simplifiedTokens ) ;
			delete group[ key ] ;
			group[ simplifiedKey ] = tokens ;
		} ) ;
	}
} ;



InputInterpreter.prototype.addPatterns = function( patternObject , queryTag ) {
	var flatPatterns = [] ;
	this.combinePatterns( flatPatterns , patternObject ) ;
	this.addToTree( flatPatterns , queryTag ) ;
} ;



InputInterpreter.prototype.combinePatterns = function( flatPatterns , patternObject , index = 0 , combo = [] ) {
	var type = this.patternOrder[ index ] ;

	if ( ! patternObject[ type ] ) { patternObject[ type ] = [ '*' ] ; }
	else if ( ! patternObject[ type ].length ) { patternObject[ type ].push( '*' ) ; }

	patternObject[ type ].forEach( pattern => {
		combo.push( pattern ) ;

		if ( index >= this.patternOrder.length - 1 ) {
			flatPatterns.push( combo.join( ' | ' ) ) ;
		}
		else {
			this.combinePatterns( flatPatterns , patternObject , index + 1 , combo ) ;
		}

		combo.pop() ;
	} ) ;
} ;



//InputInterpreter.prototype.addToTree = function( tree , flatPatterns , tag , options ) {
InputInterpreter.prototype.addToTree = function( flatPatterns , queryTag ) {
	//log.hdebug( "queryTag: %Y" , queryTag ) ;
	flatPatterns.forEach( pattern => {
		var tokens = [] , simplifiedTokens = [] , pointer = this.queryPatternTree ;

		// Turn the pattern into an array of tokens
		InputInterpreter.tokenize( pattern , this , tokens , simplifiedTokens ) ;

		simplifiedTokens.forEach( token => {
			if ( ! pointer[ token ] ) { pointer[ token ] = {} ; }
			pointer = pointer[ token ] ;
		} ) ;

		// Empty marks the end
		pointer[''] = queryTag ;
	} ) ;
	//log.hdebug( "this.queryPatternTree:\n%s" , JSON.stringify( this.queryPatternTree , null , '    ' ) ) ;
} ;



InputInterpreter.prototype.query = function( state ) {
	var fullInput , found ,
		stars = {} ,
		tokens = [] ,
		simplifiedTokens = [] ;

	// Create the full input string
	state.input = state.input.replace( /[*|]/g , match => '\\' + match ) ;
	fullInput = this.patternOrder.map( type => state[ type ] || ( state[ type ] = '*' ) ).join( ' | ' ) ;

	InputInterpreter.tokenize( fullInput , this , tokens , simplifiedTokens , true ) ;

	//log.error( "fullInput: %I\ntokens: %I" , fullInput , tokens ) ;
	//log.error( "this.queryPatternTree: %s" , JSON.stringify( this.queryPatternTree , null , '    ' ) ) ;

	this.patternOrder.forEach( type => stars[ type ] = [] ) ;

	found = this.graphWalk( this.queryPatternTree , 0 , simplifiedTokens , tokens , stars , 0 ) ;

	if ( ! found ) { return ; }

	// the graph walker populate stars depth-first
	this.patternOrder.forEach( type => stars[ type ].reverse() ) ;

	state.stars = stars ;

	//log.error( "Stars: %I" , stars ) ;

	return found ;
} ;



InputInterpreter.prototype.graphWalk = function( tree , index , simplifiedTokens , tokens , stars , segment )	{
	var found , nextIndex ,
		type = this.patternOrder[ segment ] ,
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
			found = this.graphWalk( tree['**'] , nextIndex , simplifiedTokens , tokens , stars , segment ) ;

			if ( found ) {
				stars[ type ].push( tokens.slice( index , nextIndex ).join( ' ' ) ) ;
				return found ;
			}
		}
	}

	if ( tree[ sToken ] && sToken !== '*' && sToken !== '**' ) {
		//log.info( "fixed '%s' %Y" , sToken , tree[ sToken ] ) ;
		// Found the correct fixed token, walk the graph...
		found = this.graphWalk( tree[ sToken ] , index + 1 , simplifiedTokens , tokens , stars ,
			sToken === '|' ? segment + 1 : segment ) ;

		if ( found ) { return found ; }
	}

	if ( tree['*'] && sToken !== '|' ) {
		//log.info( "star * %Y" , tree['*'] ) ;
		// No fixed match found, but a wild card was found
		// Try matching recursively, in a non-greedy fashion, eating one token, then two, etc...
		nextIndex = index + 1 ;

		for ( ; nextIndex <= simplifiedTokens.length && simplifiedTokens[ nextIndex - 1 ] !== '|' ; nextIndex ++ ) {
			found = this.graphWalk( tree['*'] , nextIndex , simplifiedTokens , tokens , stars , segment ) ;

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
InputInterpreter.simplifyTokens = tokens => tokens.map( InputInterpreter.simplifyToken ) ;

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
	if ( options.all || options.punctuations ) { tokenizer.push( '\\pP+' ) ; }
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

