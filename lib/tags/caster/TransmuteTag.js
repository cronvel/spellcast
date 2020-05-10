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



// TODO

/*
spellcast.Book.prototype.castTransmute = function( transmute , ctx , callback )
{
	var i , j , pattern , replace , formula = Object.keys( transmute.args )[ 0 ] ;

	if ( ! this.formulas[ formula ] )
	{
		callback( new Error( 'Undefined formula: ' + formula ) ) ;
		return ;
	}

	for ( i = 0 ; i < this.formulas[ formula ].length ; i ++ )
	{
		for ( j = 0 ; j < transmute.regexp.length ; j ++ )
		{
			//console.log( 'regexp:' , transmute.regexp[ j ].pattern , transmute.regexp[ j ].flags , transmute.regexp[ j ].replace ) ;
			//console.log( 'before:' , this.formulas[ formula ][ i ] ) ;

			pattern = this.variableSubstitution( transmute.regexp[ j ].pattern ) ;
			replace = this.variableSubstitution( transmute.regexp[ j ].replace ) ;

			this.formulas[ formula ][ i ] = this.formulas[ formula ][ i ].replace(
				new RegExp( pattern , transmute.regexp[ j ].flags ) ,
				replace
			) ;
			//console.log( 'after:' , this.formulas[ formula ][ i ] ) ;
		}
	}

	callback() ;
} ;



spellcast.Book.prototype.castTransmuteFile = function( transmuteFile , ctx , callback )
{
	var j , content , pattern , replace , file = this.variableSubstitution( Object.keys( transmuteFile.args )[ 0 ] ) ;

	try {
		content = fs.readFileSync( file ).toString() ;
	}
	catch ( error ) {
		callback( error ) ;
		return ;
	}

	//console.log( 'content:' , content ) ;

	for ( j = 0 ; j < transmuteFile.regexp.length ; j ++ )
	{
		//console.log( 'regexp:' , transmuteFile.regexp[ j ].pattern , transmuteFile.regexp[ j ].flags , transmuteFile.regexp[ j ].replace ) ;
		//console.log( 'before:' , this.formulas[ formula ][ i ] ) ;

		pattern = this.variableSubstitution( transmuteFile.regexp[ j ].pattern ) ;
		replace = this.variableSubstitution( transmuteFile.regexp[ j ].replace ) ;

		content = content.replace(
			new RegExp( pattern , transmuteFile.regexp[ j ].flags ) ,
			replace
		) ;
	}

	try {
		fs.writeFileSync( file , content ) ;
	}
	catch ( error ) {
		callback( error ) ;
		return ;
	}

	callback() ;
} ;
*/
