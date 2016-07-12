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



var termkit = require( 'terminal-kit' ) ;
var term = termkit.terminal ;
//var spellcastPackage = require( '../../package.json' ) ;



function UI( book , self )
{
	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			book: { value: book , enumerable: true }
		} ) ;
	}
	
	self.book.on( 'message' , UI.message.bind( self ) ) ;
	self.book.on( 'errorMessage' , UI.errorMessage.bind( self ) ) ;
	self.book.on( 'extOutput' , UI.extOutput.bind( self ) ) ;
	self.book.on( 'extErrorOutput' , UI.extErrorOutput.bind( self ) ) ;
	
	self.book.on( 'exit' , UI.exit.bind( self ) ) ;
	
	return self ;
}

module.exports = UI ;



// Normal formated message
UI.message = function message()
{
	term.apply( term , arguments ) ;
} ;



// Error formated message
UI.errorMessage = function errorMessage()
{
	term.apply( term , arguments ) ;
} ;



// External raw output (e.g. shell command stdout)
UI.extOutput = function extOutput( output )
{
	process.stdout.write( output ) ;
} ;



// External raw error output (e.g. shell command stderr)
UI.extErrorOutput = function extErrorOutput( output )
{
	process.stderr.write( output ) ;
} ;



// Exit event
UI.exit = function exit()
{
	//term( "\n" ) ;
	term.styleReset() ;
} ;


