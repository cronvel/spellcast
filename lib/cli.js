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
		term.yellow( 'Usage is: ' ).cyan( 'spellcast [<book file>] <spell|summoning> [option1] [option2] [...]\n' ) ;
		return ;
	}
	else if ( args._.length <= 1 )
	{
		bookPath = 'spellbook' ;
		toCast = args._[ 0 ] ;
	}
	else if ( args._.length === 2 )
	{
		bookPath = args._[ 0 ] ;
		toCast = args._[ 1 ] ;
	}
	else
	{
		// Cast/summon multiple files (it happens when glob is used without quote in bash)
		bookPath = args._[ 0 ] ;
		toCast = args._.slice( 1 ) ;
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
	
	var castOptions = {
		undead: !! args.undead ,
		again: !! args.again
	} ;
	
	book.initBook( function() {
		
		book.prologue( function( error ) {
			if ( error ) { process.exit( 1 ) ; }
			
			cast( book , toCast , castOptions , function( errorCode ) {
				
				if ( castOptions.undead ) { return ; }
				if ( errorCode ) { process.exit( errorCode ) ; }
				
				book.epilogue( function( error ) {
					if ( error ) { process.exit( 1 ) ; }
					process.exit( 0 ) ;
				} ) ;
			} ) ;
		} ) ;
	} ) ;
}

module.exports = cli ;



function cast( book , toCast , castOptions , callback )
{	
	if ( book.spells[ toCast ] )
	{
		book.cast( toCast , castOptions , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					if ( error.type === 'upToDate' ) { callback() ; }
					else { callback( 1 ) ; }
				}
				else
				{
					callback( typeof error === 'number' ? error : 1 ) ;
				}
			}
			else
			{
				callback() ;
			}
		} ) ;
		
		return ;
	}
	
	try {
		book.summon( toCast , castOptions , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					if ( error.type === 'upToDate' ) { callback() ; }
					else if ( error.type === 'notFound' )
					{
						term.red( "No such spell or summoning (" )
							.italic.bold.brightRed( toCast )
							.red( ") in this spellbook.\n" ) ;
						callback( 1 ) ;
					}
					else { callback( 1 ) ; }
				}
				else
				{
					callback( typeof error === 'number' ? error : 1 ) ;
				}
			}
			else
			{
				callback() ;
			}
		} ) ;
	}
	catch ( error ) {
		term.red( "Error: \n%E\n" , error ) ;
		callback( 1 ) ;
	}
}

