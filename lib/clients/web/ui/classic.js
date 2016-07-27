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

var markupMethod = require( 'string-kit/lib/format.js' ).markupMethod ;

var markupConfig = {
	endingMarkupReset: true ,
	markupReset: function( markupStack ) {
		var str = '</span>'.repeat( markupStack.length ) ;
		markupStack.length = 0 ;
		return str ;
	} ,
	markup: {
		":": function( markupStack ) {
			var str = '</span>'.repeat( markupStack.length ) ;
			markupStack.length = 0 ;
			return str ;
		} ,
		" ": function( markupStack ) {
			var str = '</span>'.repeat( markupStack.length ) ;
			markupStack.length = 0 ;
			return str + ' ' ;
		} ,
		
		"-": '<span class="dim">' ,
		"+": '<span class="bold">' ,
		"_": '<span class="underline">' ,
		"/": '<span class="italic">' ,
		"!": '<span class="inverse">' ,
		
		"b": '<span class="blue">' ,
		"B": '<span class="brightBlue">' ,
		"c": '<span class="cyan">' ,
		"C": '<span class="brightCyan">' ,
		"g": '<span class="green">' ,
		"G": '<span class="brightGreen">' ,
		"k": '<span class="black">' ,
		"K": '<span class="brightBlack">' ,
		"m": '<span class="magenta">' ,
		"M": '<span class="brightMagenta">' ,
		"r": '<span class="red">' ,
		"R": '<span class="brightRed">' ,
		"w": '<span class="white">' ,
		"W": '<span class="brightWhite">' ,
		"y": '<span class="yellow">' ,
		"Y": '<span class="brightYellow">'
	}
} ;

var markup = markupMethod.bind( markupConfig ) ;



function UI( client , self )
{
	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			client: { value: client , enumerable: true } ,
			remote: { value: client.proxy.remoteServices , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			afterLeave: { value: false , writable: true , enumerable: true } ,
		} ) ;
	}
	
	self.$text = document.querySelector( '#text' ) ;
	self.$next = document.querySelector( '#next' ) ;
	
	//self.remote.book.on( 'coreMessage' , UI.coreMessage.bind( self ) ) ;
	//self.remote.book.on( 'errorMessage' , UI.errorMessage.bind( self ) ) ;
	self.remote.book.on( 'extOutput' , UI.extOutput.bind( self ) ) ;
	self.remote.book.on( 'extErrorOutput' , UI.extErrorOutput.bind( self ) ) ;
	
	self.remote.book.on( 'message' , UI.message.bind( self ) , { async: true } ) ;
	self.remote.book.on( 'image' , UI.image.bind( self ) ) ;
	self.remote.book.on( 'sound' , UI.sound.bind( self ) ) ;
	self.remote.book.on( 'music' , UI.music.bind( self ) ) ;
	
	self.remote.book.on( 'enterScene' , UI.enterScene.bind( self ) ) ;
	self.remote.book.on( 'leaveScene' , UI.leaveScene.bind( self ) , { async: true } ) ;
	self.remote.book.on( 'nextList' , UI.nextList.bind( self ) ) ;
	self.remote.book.on( 'nextTriggered' , UI.nextTriggered.bind( self ) ) ;
	
	self.remote.book.on( 'textInput' , UI.textInput.bind( self ) ) ;
	
	self.remote.book.on( 'end' , UI.end.bind( self ) ) ;
	
	self.remote.book.on( 'exit' , UI.exit.bind( self ) ) ;
	
	return self ;
}

module.exports = UI ;



// Formated message emitted by the core engine, core execution continue
//UI.coreMessage = function coreMessage() { term.apply( term , arguments ) ; } ;
// Error formated message, mostly emitted by the core engine, but may be emitted from the script
//UI.errorMessage = function errorMessage() { term.apply( term , arguments ) ; } ;



// Script [message], execution can be suspended if the listener is async, waiting for completion.
// E.g.: possible use: wait for a user input before continuing processing.
UI.message = function message( text , options , callback )
{
	var self = this , triggered = false ;
	
	text = markup( text ) ;
	
	if ( ! options ) { options = {} ; }
	
	var triggerCallback = function triggerCallback() {
		if ( triggered ) { return ; }
		triggered = true ;
		if ( options.next ) { self.messageNext( callback ) ; return ; }
		callback() ;
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



UI.prototype.messageNext = function messageNext( callback )
{
	callback() ;
} ;



UI.image = function image( image , options , callback )
{
	console.warn( '[image] tag not supported ATM' , image , options ) ;
} ;
UI.sound = function sound( sound , options , callback )
{
	console.warn( '[sound] tag not supported ATM' , sound , options ) ;
} ;
UI.music = function music( music , options , callback )
{
	console.warn( '[music] tag not supported ATM' , music , options ) ;
} ;



// 'enterScene' event
UI.enterScene = function enterScene()
{
	if ( this.afterLeave && ! this.afterNextTriggered )
	{
		this.$text.innerHTML = '' ;
		this.$next.innerHTML = '' ;
	}
	
	this.afterNext = this.afterLeave = this.afterNextTriggered = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene( callback )
{
	this.afterLeave = true ;
	
	if ( this.afterNext ) { callback() ; return ; }
	setTimeout( callback , 1000 ) ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered()
{
	this.afterNextTriggered = true ;
	this.$text.innerHTML = '' ;
	this.$next.innerHTML = '' ;
} ;



UI.nextList = function nextList( nexts ) //, callback )
{
	this.afterNext = true ;
	//if ( nexts.length === 0 ) { this.nextEnd() ; }
	//else 
	if ( nexts.length === 1 ) { this.nextListConfirm( nexts[ 0 ] ) ; }
	else { this.nextListMenu( nexts ) ; }
} ;



//UI.prototype.nextListEnd = function nextListEnd() { term.brightBlue( 'End.\n' ) ; } ;

UI.prototype.nextListConfirm = function nextListConfirm( next )
{
	var self = this , $next ;
	
	//this.$next.innerHTML = '' ;
	
	if ( next.label )
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_0" class="next classic-ui">Next: ' + next.label + '</a>'
		) ;
	}
	else
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_0" class="next classic-ui">Next.</a>'
		) ;
	}
	
	$next = document.querySelector( '#next_0' ) ;
	
	$next.onclick = function() {
		self.remote.bookInput.emit( 'selectNext' , 0 ) ;
		$next.onclick = null ;
	} ;
} ;



UI.prototype.nextListMenu = function nextListMenu( nexts )
{
	var self = this , $nexts ,
		max = 0x61 + nexts.length - 1 ;
	
	this.$next.innerHTML = '' ;
	
	nexts.forEach( function( e , i ) {
		
		self.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_' + i + '" class="next classic-ui">' + String.fromCharCode( 0x61 + i ) + '. ' + e.label + '</a>'
		) ;
	} ) ;
	
	$nexts = document.querySelectorAll( '.next' ) ;
	$nexts = Array.prototype.slice.call( $nexts ) ;
	
	$nexts.forEach( function( e , i ) {
		e.onclick = function() {
			self.remote.bookInput.emit( 'selectNext' , i ) ;
			$nexts.forEach( function( e , i ) { e.onclick = null ; } ) ;
		} ;
	} ) ;
} ;



// External raw output (e.g. shell command stdout)
UI.extOutput = function extOutput( output )
{
	alert( 'not coded ATM!' ) ;
	//process.stdout.write( output ) ;
} ;



// External raw error output (e.g. shell command stderr)
UI.extErrorOutput = function extErrorOutput( output )
{
	alert( 'not coded ATM!' ) ;
	//process.stderr.write( output ) ;
} ;



// Text input field
UI.textInput = function textInput( label )
{
	alert( 'textInput is not coded ATM!' ) ;
	/*
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
		if ( error ) { self.remote.bookInput.emit( error ) ; }
		else { self.remote.bookInput.emit( 'textInput' , input ) ; }
	} ) ;
	*/
} ;



// Exit event
UI.end = function end()
{
	this.$text.insertAdjacentHTML( 'beforeend' ,
		'<h2 class="header classic-ui">The End.</h2>'
	) ;
} ;



// Exit event
UI.exit = function exit()
{
	//term( "\n" ) ;
	//term.styleReset() ;
} ;


