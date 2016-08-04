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



/* global alert */

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



function UI( bus , self )
{
	console.log( Array.from( arguments ) ) ;
	
	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			bus: { value: bus , enumerable: true } ,
			user: { value: null , writable: true , enumerable: true } ,
			users: { value: null , writable: true , enumerable: true } ,
			roles: { value: null , writable: true , enumerable: true } ,
			roleId: { value: null , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			afterLeave: { value: false , writable: true , enumerable: true } ,
		} ) ;
	}
	
	self.$text = document.querySelector( '#text' ) ;
	self.$next = document.querySelector( '#next' ) ;
	
	self.bus.on( 'user' , UI.user.bind( self ) ) ;
	self.bus.on( 'userList' , UI.userList.bind( self ) ) ;
	self.bus.on( 'roleList' , UI.roleList.bind( self ) ) ;
	
	//self.bus.on( 'coreMessage' , UI.coreMessage.bind( self ) ) ;
	//self.bus.on( 'errorMessage' , UI.errorMessage.bind( self ) ) ;
	self.bus.on( 'extOutput' , UI.extOutput.bind( self ) ) ;
	self.bus.on( 'extErrorOutput' , UI.extErrorOutput.bind( self ) ) ;
	
	self.bus.on( 'message' , UI.message.bind( self ) , { async: true } ) ;
	self.bus.on( 'image' , UI.image.bind( self ) ) ;
	self.bus.on( 'sound' , UI.sound.bind( self ) ) ;
	self.bus.on( 'music' , UI.music.bind( self ) ) ;
	
	self.bus.on( 'enterScene' , UI.enterScene.bind( self ) ) ;
	self.bus.on( 'leaveScene' , UI.leaveScene.bind( self ) , { async: true } ) ;
	self.bus.on( 'nextList' , UI.nextList.bind( self ) ) ;
	self.bus.on( 'nextTriggered' , UI.nextTriggered.bind( self ) ) ;
	
	self.bus.on( 'textInput' , UI.textInput.bind( self ) ) ;
	
	self.bus.on( 'end' , UI.end.bind( self ) ) ;
	
	self.bus.on( 'exit' , UI.exit.bind( self ) ) ;
	
	self.bus.emit( 'ready' ) ;
	
	return self ;
}

module.exports = UI ;



function arrayGetById( id ) { return this.find( function( e ) { return e.id === id ; } ) ; }



UI.user = function user( user_ )
{
	console.log( 'User received: ' , user_ ) ;
	this.user = user_ ;
} ;



UI.userList = function userList( users )
{
	console.log( 'User-list received: ' , users ) ;
	
	// Add the get method to the array
	users.get = arrayGetById ;
	this.users = users ;
} ;



UI.roleList = function roleList( roles , unassignedUsers , assigned )
{
	var self = this , $roles , userName ,
		max = 0x61 + roles.length - 1 ;
	
	// Add the get method to the array
	roles.get = arrayGetById ;

	this.roles = roles ;
	
	if ( assigned && roles.length <= 1 )
	{
		// Nothing to do and nothing to display...
		this.roleId = this.role[ 0 ].id ;
		console.log( "this.roleIndex: " , this.roleId ) ;
		return ;
	}
	
	this.$next.innerHTML = '' ;
	
	roles.forEach( function( role , i ) {
		
		userName = role.clientId && self.users.get( role.clientId ).name ;
		
		self.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_' + i + '" class="role classic-ui">' + String.fromCharCode( 0x61 + i ) + '. ' + role.label +
			( userName ? ' <span class="italic brightBlack">' + userName + '</span>' : '' ) +
			'</button>'
		) ;
	} ) ;
	
	if ( assigned )
	{
		roles.find( function( e , i ) {
			if ( e.clientId === self.user.id ) { self.roleId = e.id ; return true ; }
			return false ;
		} ) ;
		
		this.afterLeave = true ;	// tmp
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<h2 class="end classic-ui">Start!</h2>'
		) ;
		return ;
	}
	
	if ( unassignedUsers.length )
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<p class="unassigned-users classic-ui">Idling: <span class="unassigned-users classic-ui">' +
			unassignedUsers.map( function( e ) { return self.users.get( e ).name ; } ).join( ', ' ) +
			'</span></p>'
		) ;
	}

	$roles = document.querySelectorAll( '.role' ) ;
	$roles = Array.prototype.slice.call( $roles ) ;
	
	$roles.forEach( function( e , i ) {
		e.onclick = function() {
			if ( roles[ i ].clientId === self.user.id )
			{
				// Here we want to unassign
				self.bus.emit( 'selectRole' , null ) ;
			}
			else if ( roles[ i ].clientId !== null )
			{
				// Already holded by someone else
				return ;
			}
			else
			{
				self.bus.emit( 'selectRole' , i ) ;
			}
			
			$roles.forEach( function( e , i ) { e.onclick = null ; } ) ;
		} ;
	} ) ;
} ;



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
	setTimeout( callback , 500 ) ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered()
{
	this.afterNextTriggered = true ;
	this.$text.innerHTML = '' ;
	this.$next.innerHTML = '' ;
} ;



UI.nextList = function nextList( nexts , undecidedRoles , isUpdate )
{
	this.nexts = nexts ;
	this.afterNext = true ;
	
	// No need to update if we are alone
	if ( isUpdate && this.roles.length === 1 ) { return ; }
	
	//if ( nexts.length === 0 ) { this.nextEnd() ; }
	//else 
	if ( nexts.length === 1 ) { this.nextListConfirm( nexts[ 0 ] , undecidedRoles , isUpdate ) ; }
	else { this.nextListMenu( nexts , undecidedRoles , isUpdate ) ; }
} ;



UI.prototype.nextListConfirm = function nextListConfirm( next , undecidedRoles , isUpdate )
{
	var self = this , $next , roles ;
	
	this.$next.innerHTML = '' ;
	
	if ( next.label )
	{
		roles = next.roleIds.map( function( id ) { return self.roles.get( id ).label ; } ).join( ', ' ) ;
		
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_0" class="next classic-ui">Next: ' + next.label +
			( roles ? ' <span class="italic brightBlack">' + roles + '</span>' : '' ) +
			'</button>'
		) ;
	}
	else
	{
		roles = next.roleIds.map( function( id ) { return self.roles.get( id ).label ; } ).join( ', ' ) ;
		
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_0" class="next classic-ui">Next.' +
			( roles ? ' <span class="italic brightBlack">' + roles + '</span>' : '' ) +
			'</button>'
		) ;
	}
	
	if ( undecidedRoles.length )
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<p class="waiting-roles classic-ui">Waiting: <span class="waiting-roles classic-ui">' +
			undecidedRoles.map( function( e ) { return self.roles.get( e ).label ; } ).join( ', ' ) +
			'</span></p>'
		) ;
	}
	
	$next = document.querySelector( '#next_0' ) ;
	
	$next.onclick = function() {
		self.bus.emit( 'selectNext' , 0 ) ;
		$next.onclick = null ;
	} ;
} ;



UI.prototype.nextListMenu = function nextListMenu( nexts , undecidedRoles , isUpdate )
{
	var self = this , $nexts ,
		max = 0x61 + nexts.length - 1 ;
	
	this.$next.innerHTML = '' ;
	
	nexts.forEach( function( next , i ) {
		
		var roles = next.roleIds.map( function( id ) { return self.roles.get( id ).label ; } ).join( ', ' ) ;
		
		self.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_' + i + '" class="next classic-ui">' + String.fromCharCode( 0x61 + i ) + '. ' + next.label +
			( roles ? ' <span class="italic brightBlack">' + roles + '</span>' : '' ) +
			'</button>'
		) ;
	} ) ;
	
	if ( undecidedRoles.length )
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<p class="waiting-roles classic-ui">Waiting: <span class="waiting-roles classic-ui">' +
			undecidedRoles.map( function( e ) { return self.roles.get( e ).label ; } ).join( ', ' ) +
			'</span></p>'
		) ;
	}
	
	$nexts = document.querySelectorAll( '.next' ) ;
	$nexts = Array.prototype.slice.call( $nexts ) ;
	
	$nexts.forEach( function( e , i ) {
		e.onclick = function() {
			if ( nexts[ i ].roleIds.indexOf( self.roleId ) !== -1 )
			{
				self.bus.emit( 'selectNext' , null ) ;
			}
			else
			{
				self.bus.emit( 'selectNext' , i ) ;
			}
			
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
		if ( error ) { self.output.emit( error ) ; }
		else { self.output.emit( 'textSubmit' , input ) ; }
	} ) ;
	*/
} ;



// Exit event
UI.end = function end( result , data )
{
	switch ( result )
	{
		case 'end' :
			this.$text.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="end classic-ui">The End.</h2>'
			) ;
			break ;
		case 'win' :
			this.$text.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="end win classic-ui">You win!</h2>'
			) ;
			break ;
		case 'lost' :
			this.$text.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="end lost classic-ui">You lose...</h2>'
			) ;
			break ;
		case 'draw' :
			this.$text.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="end draw classic-ui">Draw.</h2>'
			) ;
			break ;
	}
	
} ;



// Exit event
UI.exit = function exit()
{
	//term( "\n" ) ;
	//term.styleReset() ;
} ;


