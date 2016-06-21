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



var Book = require( './Book.js' ) ;
//var fs = require( 'fs' ) ;
var term = require( 'terminal-kit' ).terminal ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'spellcast' ) ;



function cli()
{
	var book , bookPath , toCast ;
	
	var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;
	
	/*
	if ( args.length < 3 )
	{
		term.yellow( 'Usage is: ' ).cyan( 'spellcast <spell>\n' ) ;
		return ;
	}
	*/
	
	var logLevel = 'info' ;
	
	if ( args.debug ) { logLevel = 'debug' ; }
	else if ( args.verbose ) { logLevel = 'verbose' ; }
	
	Logfella.global.setGlobalConfig( {
		minLevel: logLevel ,
		overrideConsole: true ,
		transports: [
			{ "type": "console" , "timeFormatter": "time" , "color": true } ,
        ]
    } ) ;
    
    if ( args._.length === 0 )
	{
		term.yellow( 'Usage is: ' ).cyan( 'spellcast [<book file>] <spell> [option1] [option2] [...]\n' ) ;
		return ;
	}
	else if ( args._.length <= 1 )
	{
		bookPath = 'spellbook' ;
		toCast = args._[ 0 ] ;
	}
	else
	{
		bookPath = args._[ 0 ] ;
		toCast = args._[ 1 ] ;
	}
	
	delete args._ ;
	
	
	try {
		book = Book.load( bookPath ) ;
	}
	catch ( error ) {
		//throw error ;
		term.red( "Cannot read the spellbook '" )
			.italic.bold.brightRed( bookPath )
			.red( "'. %s\n" , error ) ;
		return ;
	}
	
	/*
	if ( args.makefile )
	{
		book.buildMakefile( args.makefile ) ;
		return ;
	}
	*/
	
	book.initBook( function() {
		cast( book , toCast ) ;
	} ) ;
}

module.exports = cli ;



function cast( book , toCast )
{	
	if ( book.spells[ toCast ] )
	{
		book.cast( toCast , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					if ( error.type === 'upToDate' )
					{
						term.blue( 'The spell is not ready yet.\n' ) ;
						process.exit( 0 ) ;
					}
					else
					{
						term.red( 'The spell fizzled: ' ).italic.brightRed( '%s\n' , error.message ) ;
						process.exit( 1 ) ;
					}
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
		
		return ;
	}
	
	try {
		book.summon( toCast , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					if ( error.type === 'upToDate' )
					{
						term.blue( 'The summoning is not ready yet.\n' ) ;
						process.exit( 0 ) ;
					}
					else
					{
						term.red( 'The summoning has failed: ' ).italic.brightRed( '%s\n' , error.message ) ;
						process.exit( 1 ) ;
					}
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
	catch ( error ) {
		if ( error.type === 'notFound' )
		{
			term.red( "No such spell or summoning (" )
				.italic.bold.brightRed( toCast )
				.red( ") in this spellbook.\n" ) ;
		}
		else
		{
			term.red( "Error: \n%E\n" , error ) ;
		}
		
		process.exit( 1 ) ;
	}
}

