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



function UI( bus , self )
{
	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			bus: { value: bus , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
		} ) ;
	}
	
	self.bus.on( 'coreMessage' , UI.coreMessage.bind( self ) ) ;
	self.bus.on( 'errorMessage' , UI.errorMessage.bind( self ) ) ;
	self.bus.on( 'extOutput' , UI.extOutput.bind( self ) ) ;
	self.bus.on( 'extErrorOutput' , UI.extErrorOutput.bind( self ) ) ;
	
	self.bus.on( 'message' , UI.message.bind( self ) , { async: true } ) ;
	
	/*
	self.bus.on( 'image' , UI.image.bind( self ) ) ;
	self.bus.on( 'sound' , UI.sound.bind( self ) ) ;
	self.bus.on( 'music' , UI.music.bind( self ) ) ;
	*/
	
	self.bus.on( 'enterScene' , UI.enterScene.bind( self ) ) ;
	self.bus.on( 'leaveScene' , UI.leaveScene.bind( self ) ) ;
	self.bus.on( 'nextList' , UI.nextList.bind( self ) ) ;
	self.bus.on( 'nextTriggered' , UI.nextTriggered.bind( self ) ) ;
	
	self.bus.on( 'textInput' , UI.textInput.bind( self ) ) ;
	
	self.bus.on( 'end' , UI.end.bind( self ) ) ;
	
	self.bus.on( 'exit' , UI.exit.bind( self ) , { async: true } ) ;
	
	term.grabInput( true ) ;
	
	term.on( 'key' , function( key ) {
		if ( key === 'CTRL_C' )
		{
			term.green( 'CTRL-C detected...\n' ) ;
			process.exit( 130 ) ;
		}
	} ) ;
	
	self.bus.emit( 'ready' ) ;
	
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
		if ( options.next ) { self.messageNext( callback ) ; return ; }
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



UI.prototype.messageNext = function messageNext( callback )
{
	var self = this ;
	
	term.inverse( 'PRESS ANY KEY TO CONTINUE' ) ;
	
	var onKey = function onKey( name ) {
		
		if ( name.length === 1 || name === 'ENTER' )
		{
			term.column( 1 ).eraseLine( '\n' ) ;
			term.off( 'key' , onKey ) ;
			callback() ;
		}
	} ;
	
	term.on( 'key' , onKey ) ;
} ;



// 'enterScene' event
UI.enterScene = function enterScene()
{
	this.afterNext = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene()
{
	if ( ! this.afterNext ) { term( '\n' ) ; }
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered()
{
} ;



UI.nextList = function nextList( nexts ) //, callback )
{
	this.afterNext = true ;
	
	term( '\n' ) ;
	
	//if ( nexts.length === 0 ) { this.nextEnd() ; }
	//else 
	if ( nexts.length === 1 ) { this.nextListConfirm( nexts[ 0 ] ) ; }
	else { this.nextListMenu( nexts ) ; }
} ;

//UI.prototype.nextListEnd = function nextListEnd() { term.brightBlue( 'End.\n' ) ; } ;

UI.prototype.nextListConfirm = function nextListConfirm( next )
{
	var self = this ;
	
	if ( next.label ) { term.brightBlue( 'Next: %s\n\n' , next.label ) ; }
	else { term.brightBlue( 'Next.\n\n' ) ; }
	
	//term.bgBrightWhite.black.eraseLine( 'PRESS ANY KEY TO CONTINUE' ) ;
	term.inverse( 'PRESS ANY KEY TO CONTINUE' ) ;
	
	var onKey = function onKey( name ) {
		
		if ( name.length === 1 || name === 'ENTER' )
		{
			term.column( 1 ).eraseLine( '\n' ) ;
			term.off( 'key' , onKey ) ;
			self.bus.emit( 'selectNext' , 0 ) ;
		}
	} ;
	
	term.on( 'key' , onKey ) ;
} ;



UI.prototype.nextListMenu = function nextListMenu( nexts )
{
	var self = this , nextIndex ,
		max = 0x61 + nexts.length - 1 ;
	
	nexts.forEach( ( e , i ) => term.brightBlue( '%s. %s\n' , String.fromCharCode( 0x61 + i ) , e.label ) ) ;
	term( '\n' ) ;
	
	term.inverse( 'PRESS KEY a-' + String.fromCharCode( max ) ) ;
	
	var onKey = function onKey( name , matches , data ) {
		
		if ( data.codepoint >= 0x61 && data.codepoint <= max )
		{
			term.column( 1 ).eraseLine() ;
			nextIndex = data.codepoint - 0x61 ;
			term.bold.cyan( "> %s. %s\n\n\n" , name , nexts[ nextIndex ].label ) ;
			term.off( 'key' , onKey ) ;
			self.bus.emit( 'selectNext' , nextIndex ) ;
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
		if ( error ) { self.bus.emit( error ) ; }
		else { self.bus.emit( 'textInput' , input ) ; }
	} ) ;
} ;



// end event
UI.end = function end( result , data )
{
	term( '\n\t\t' ) ;
	
	switch ( result )
	{
		case 'end' :
			term.bgBrightYellow.black( '>>> THE END. <<<' ) ;
			break ;
		case 'win' :
			term.bgBrightCyan.black( '>>> YOU WIN! <<<' ) ;
			break ;
		case 'lost' :
			term.bgBrightRed.black( '>>> YOU LOSE... <<<' ) ;
			break ;
		case 'draw' :
			term.bgBrightGreen.black( '>>> DRAW. <<<' ) ;
			break ;
	}
	
	term( '\n\n' ) ;
} ;



// Exit event
UI.exit = function exit( code , timeout , callback )
{
	//term( "\n" ) ;
	term.styleReset() ;
	term.grabInput( false ) ;
	setTimeout( callback , 100 ) ;
} ;


