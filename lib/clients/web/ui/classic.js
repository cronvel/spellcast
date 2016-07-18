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



var dom = require( 'dom-kit' ) ;



function UI( client , self )
{
	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			client: { value: client , enumerable: true }
		} ) ;
	}
	
	self.$text = document.querySelector( '#text' ) ;
	self.$next = document.querySelector( '#next' ) ;
	
	//self.client.on( 'coreMessage' , UI.coreMessage.bind( self ) ) ;
	//self.client.on( 'errorMessage' , UI.errorMessage.bind( self ) ) ;
	self.client.on( 'message' , { fn: UI.message.bind( self ) , async: true } ) ;
	self.client.on( 'extOutput' , UI.extOutput.bind( self ) ) ;
	self.client.on( 'extErrorOutput' , UI.extErrorOutput.bind( self ) ) ;
	
	self.client.on( 'enterScene' , UI.enterScene.bind( self ) ) ;
	self.client.on( 'next' , UI.next.bind( self ) ) ;
	
	self.client.on( 'textInput' , UI.textInput.bind( self ) ) ;
	
	self.client.on( 'exit' , UI.exit.bind( self ) ) ;
	
	return self ;
}

module.exports = UI ;



// Formated message emitted by the core engine, core execution continue
//UI.coreMessage = function coreMessage() { term.apply( term , arguments ) ; } ;
// Error formated message, mostly emitted by the core engine, but may be emitted from the script
//UI.errorMessage = function errorMessage() { term.apply( term , arguments ) ; } ;



// Script [message], execution can be suspended if the listener is async, waiting for completion.
// E.g.: possible use: wait for a user input before continuing processing.
UI.message = function message( text , options ) //, callback )
{
	var self = this , triggered = false ;
	
	if ( ! options ) { options = {} ; }
	
	this.$text.innerHTML = '' ;
	this.$next.innerHTML = '' ;
	
	var triggerCallback = function triggerCallback() {
		if ( triggered ) { return ; }
		triggered = true ;
		//if ( options.next ) { self.next( callback ) ; return ; }
		//callback() ;
	} ;
	
	/*
	if ( options.slowTyping )
	{
		term.slowTyping( text + '\n' , triggerCallback ) ;
		return ;
	}
	*/
	
	this.$text.insertAdjacentHTML( 'beforeend' ,
		'<p class="text classic-ui">' + text + '</p>'
	) ;
	
	triggerCallback() ;
} ;



// 'enterScene' event, nothing to do for instance
UI.enterScene = function enterScene() {} ;



UI.next = function next( nexts ) //, callback )
{
	//if ( nexts.length === 0 ) { this.nextEnd() ; }
	//else 
	if ( nexts.length === 1 ) { this.nextConfirm( nexts[ 0 ] ) ; }
	else { this.nextMenu( nexts ) ; }
} ;

//UI.prototype.nextEnd = function nextEnd() { term.brightBlue( 'End.\n' ) ; } ;

UI.prototype.nextConfirm = function nextConfirm( next )
{
	var self = this , $next ;
	
	this.$next.innerHTML = '' ;
	
	if ( next.label )
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<a id="next_0" class="next classic-ui">Next: ' + next.label + '</a>'
		) ;
	}
	else
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<a id="next_0" class="next classic-ui">Next.</a>'
		) ;
	}
	
	$next = document.querySelector( '#next_0' ) ;
	
	$next.onclick = function() {
		self.client.input.emit( 'next' , 0 ) ;
		$next.onclick = null ;
	} ;
} ;



UI.prototype.nextMenu = function nextMenu( nexts )
{
	var self = this , $nexts ,
		max = 0x61 + nexts.length - 1 ;
	
	this.$next.innerHTML = '' ;
	
	nexts.forEach( function( e , i ) {
		
		self.$next.insertAdjacentHTML( 'beforeend' ,
			'<a id="next_' + i + '" class="next classic-ui">' + String.fromCharCode( 0x61 + i ) + '. ' + e.label + '</a>'
		) ;
	} ) ;
	
	$nexts = document.querySelectorAll( '.next' ) ;
	$nexts = Array.prototype.slice.call( $nexts ) ;
	
	$nexts.forEach( function( e , i ) {
		e.onclick = function() {
			self.client.input.emit( 'next' , i ) ;
			$nexts.forEach( function( e , i ) { e.onclick = null ; } ) ;
		} ;
	} ) ;
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
		if ( error ) { self.client.input.emit( error ) ; }
		else { self.client.input.emit( 'textInput' , input ) ; }
	} ) ;
} ;



// Exit event
UI.exit = function exit()
{
	//term( "\n" ) ;
	term.styleReset() ;
} ;

