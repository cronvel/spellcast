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



var spellcast = require( './spellcast.js' ) ;
var fs = require( 'fs' ) ;



function cli()
{
	var buffer , book ;
	
	var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;
	
	/*
	if ( args.length < 3 )
	{
		term.yellow( 'Usage is: ' ).cyan( 'spellcast <spell>\n' ) ;
		return ;
	}
	*/
	
	try {
		buffer = fs.readFileSync( 'spellbook' ) ;
	}
	catch ( error ) {
		term.red( "Cannot find the " )
			.italic.bold.brightRed( "spellbook" )
			.red( " file into the current working directory.\n" ) ;
		return ;
	}
	
	book = new spellcast.Book( buffer.toString() ) ;
	
	if ( args.makefile )
	{
		book.buildMakefile( args.makefile ) ;
		return ;
	}
	
	var toCast = args._[ 0 ] ;
	
	if ( ! toCast )
	{
		term.yellow( 'Usage is: ' ).cyan( 'spellcast <spell>\n' ) ;
		return ;
	}
	
	if ( book.spells[ toCast ] )
	{
		book.cast( toCast , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					term.red( 'The spell fizzled: ' ).italic.brightRed( '%s\n' , error.message ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'string' )
				{
					term.red( 'The spell fizzled: ' ).italic.brightRed( '%s\n' , error ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'number' )
				{
					term.red( 'The spell fizzled: ' ).italic.brightRed( '#%d\n' , error ) ;
					process.exit( error ) ;
				}
				else
				{
					term.red( 'The spell fizzled...\n' ) ;
					process.exit( 1 ) ;
				}
			}
			
			process.exit( 0 ) ;
		} ) ;
	}
	else if ( book.summons[ toCast ] )
	{
		book.summon( toCast , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					term.red( 'The summoning has failed: ' ).italic.brightRed( '%s\n' , error.message ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'string' )
				{
					term.red( 'The summoning has failed: ' ).italic.brightRed( '%s\n' , error ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'number' )
				{
					term.red( 'The summoning has failed: ' ).italic.brightRed( '#%d\n' , error ) ;
					process.exit( error ) ;
				}
				else
				{
					term.red( 'The summoning has failed...\n' ) ;
					process.exit( 1 ) ;
				}
			}
			
			process.exit( 0 ) ;
		} ) ;
	}
	else
	{
		term.red( "No such spell (" )
			.italic.bold.brightRed( toCast )
			.red( ") in this spellbook.\n" ) ;
		process.exit( 1 ) ;
	}
} ;

module.exports = cli ;

