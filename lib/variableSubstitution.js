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



/*
spellcast.Book.prototype.variableSubstitution = function variableSubstitution( input )
{
	var output , self = this ;
	
	output = input.replace( /\$\{([0-9a-zA-Z_-]+)(:([*0-9a-zA-Z_-]+))?([\\\/0-9a-zA-Z_-]*)?\}/g , function() {
		
		//console.log( 'arguments:' , arguments ) ;
		
		var i , filters , index , value , thirdParty , substitute = self.formulas[ arguments[ 1 ] ] ;
		
		if ( substitute === undefined ) { return '' ; }
		
		if ( arguments[ 3 ] )
		{
			// Find a specific index
			
			if ( arguments[ 3 ] === '*' )
			{
				// This will substitute with the whole formula list, separated by comma
				
				value = [] ;
				for ( i = 0 ; i < substitute.length ; i ++ )
				{
					// Protect comma with a backslash
					value[ i ] = substitute[ i ].replace( ',' , '\\,' ) ;
				}
				
				value = value.join( ',' ) ;
			}
			else if ( arguments[ 3 ].match( /^[0-9]+$/ ) )
			{
				// This is a fixed numeric index
				index = parseInt( arguments[ 3 ] ) ;
			}
			else
			{
				// Get the numeric index of a third party formula
				thirdParty = self.formulas[ arguments[ 3 ] ] ;
				if ( thirdParty === undefined ) { return '' ; }
				index = thirdParty.index ;
			}
		}
		else
		{
			// Normal substitution mode: replace by the variable current index
			index = substitute.index ;
		}
		
		if ( ! value ) { value = substitute[ index ] ; }
		
		// Filters
		if ( arguments[ 4 ] )
		{
			filters = arguments[ 4 ].split( '/' ) ;
			filters.shift() ;
			
			for ( i = 0 ; i < filters.length ; i ++ )
			{
				//console.log( "filter #" + i + ":" , filters[ i ] ) ;
				
				if ( spellcast.filter[ filters[ i ] ] )
				{
					value = spellcast.filter[ filters[ i ] ]( value ) ;
				}
			}
		}
		
		return value ;
	} ) ;
	
	return output ;
} ;



spellcast.filter = {
	'uppercase': function uppercase( str ) { return str.toUpperCase() ; } ,
	'lowercase': function lowercase( str ) { return str.toLowerCase() ; } ,
	'regexp': string.escape.regExp ,
	'shellarg' : string.escape.shellArg
} ;



spellcast.Book.prototype.argsVariableSubstitution = function argsVariableSubstitution( inArgs )
{
	var key , args = {} ;
	
	for ( key in inArgs )
	{
		if ( typeof inArgs[ key ] !== 'string' ) { args[ key ] = inArgs[ key ] ; }
		else { args[ key ] = this.variableSubstitution( inArgs[ key ] ) ; }
	}
	
	return args ;
} ;

*/
