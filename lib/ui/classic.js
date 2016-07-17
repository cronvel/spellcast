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

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function UI( book , self )
{
	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			book: { value: book , enumerable: true }
		} ) ;
	}
	
	self.book.on( 'coreMessage' , UI.coreMessage.bind( self ) ) ;
	self.book.on( 'errorMessage' , UI.errorMessage.bind( self ) ) ;
	self.book.on( 'message' , { fn: UI.message.bind( self ) , async: true } ) ;
	self.book.on( 'extOutput' , UI.extOutput.bind( self ) ) ;
	self.book.on( 'extErrorOutput' , UI.extErrorOutput.bind( self ) ) ;
	
	self.book.on( 'next' , UI.next.bind( self ) ) ;
	
	self.book.on( 'textInput' , UI.textInput.bind( self ) ) ;
	
	self.book.on( 'exit' , UI.exit.bind( self ) ) ;
	
	term.grabInput( true ) ;
	
	term.on( 'key' , function( key ) {
		if ( key === 'CTRL_C' )
		{
			term.green( 'CTRL-C detected...\n' ) ;
			process.exit( 130 ) ;
		}
	} ) ;

	return self ;
}

module.exports = UI ;



// Formated message emitted by the core engine, core execution continue
UI.coreMessage = function coreMessage()
{
	term.apply( term , arguments ) ;
} ;



// Error formated message, mostly emitted by the core engine, but may be emitted from the script
UI.errorMessage = function errorMessage()
{
	term.apply( term , arguments ) ;
} ;



// Script [message], execution can be suspended if the listener is async, waiting for completion.
// E.g.: possible use: wait for a user input before continuing processing.
UI.message = function message( text , options , callback )
{
	var self = this , triggered = false ;
	
	if ( ! options ) { options = {} ; }
	
	var triggerCallback = function triggerCallback() {
		if ( triggered ) { return ; }
		triggered = true ;
		if ( options.next ) { self.next( callback ) ; return ; }
		callback() ;
	} ;
	
	if ( options.slowTyping )
	{
		term.slowTyping( text + '\n' , triggerCallback ) ;
		return ;
	}
	
	term( text + '\n' ) ;
	triggerCallback() ;
} ;



UI.next = function next( nexts ) //, callback )
{
	term( '\n' ) ;
	
	if ( nexts.length === 0 ) { this.nextEnd() ; }
	else if ( nexts.length === 1 ) { this.nextConfirm( nexts[ 0 ] ) ; }
	else { this.nextMenu( nexts ) ; }
	
	term( '\n' ) ;
} ;



UI.prototype.nextEnd = function nextEnd()
{
	term.brightBlue( 'End.\n' ) ;
} ;



UI.prototype.nextConfirm = function nextConfirm( next )
{
	var self = this ;
	
	if ( next.label ) { term.brightBlue( 'Next: %s\n' , next.label ) ; }
	else { term.brightBlue( 'Next...\n' ) ; }
	
	var onKey = function onKey( name ) {
		
		if ( name.length === 1 || name === 'ENTER' )
		{
			term.off( 'key' , onKey ) ;
			self.book.input.emit( 'next' , 0 ) ;
		}
	} ;
	
	term.on( 'key' , onKey ) ;
} ;



UI.prototype.nextMenu = function nextMenu( nexts )
{
	var self = this , nextIndex ,
		max = 0x61 + nexts.length - 1 ;
	
	nexts.forEach( ( e , i ) => term.brightBlue( '%s. %s\n' , String.fromCharCode( 0x61 + i ) , nexts[ i ].label ) ) ;
	
	var onKey = function onKey( name , matches , data ) {
		
		if ( data.codepoint >= 0x61 && data.codepoint <= max )
		{
			nextIndex = data.codepoint - 0x61 ;
			term.off( 'key' , onKey ) ;
			self.book.input.emit( 'next' , nextIndex ) ;
		}
	} ;
	
	term.on( 'key' , onKey ) ;
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



// Text input field
UI.textInput = function textInput( label )
{
	var self = this ;
	
	if ( label ) { term( label ) ; }
	
	var options = {
		//history : history ,
		//autoComplete: autoComplete ,
		//autoCompleteMenu: true ,
		//maxLength: 3
	} ;
	
	term.inputField( options , function( error , input ) {
		term( '\n' ) ;
		if ( error ) { self.book.input.emit( error ) ; }
		else { self.book.input.emit( 'textInput' , input ) ; }
	} ) ;
} ;



// Exit event
UI.exit = function exit()
{
	//term( "\n" ) ;
	term.styleReset() ;
} ;


