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
			user: { value: null , writable: true , enumerable: true } ,
			users: { value: null , writable: true , enumerable: true } ,
			roles: { value: null , writable: true , enumerable: true } ,
			roleId: { value: null , writable: true , enumerable: true } ,
			inGame: { value: false , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			rewritableLines: { value: 0 , writable: true , enumerable: true } ,
			clearRoleListCallback: { value: null , writable: true , enumerable: true } ,
			clearNextListCallback: { value: null , writable: true , enumerable: true } ,
		} ) ;
	}
	
	self.bus.on( 'user' , UI.user.bind( self ) ) ;
	self.bus.on( 'userList' , UI.userList.bind( self ) ) ;
	self.bus.on( 'roleList' , UI.roleList.bind( self ) ) ;
	
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
	
	//self.bus.on( 'split' , UI.split.bind( self ) ) ;
	self.bus.on( 'rejoin' , UI.rejoin.bind( self ) ) ;
	
	self.bus.on( 'wait' , UI.wait.bind( self ) ) ;
	
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



function arrayGetById( id ) { return this.find( e => e.id === id ) ; }  // jshint ignore:line



UI.user = function user( user_ )
{
	//console.log( 'User received: ' , user_ ) ;
	this.user = user_ ;
} ;



UI.userList = function userList( users )
{
	//console.log( 'User-list received: ' , users ) ;
	
	// Add the get method to the array
	users.get = arrayGetById ;
	this.users = users ;
} ;



UI.roleList = function roleList( roles , unassignedUsers , assigned )
{
	var self = this , roleIndex , userName , str , charCount ,
		max = 0x61 + roles.length - 1 ;
	
	if ( self.clearRoleListCallback ) { self.clearRoleListCallback() ; }
	
	// Add the get method to the array
	roles.get = arrayGetById ;
	
	// If already in-game, nothing more to do...
	if ( this.inGame )
	{
		this.roles = roles ;
		return ;
	}
	
	if ( assigned && roles.length <= 1 )
	{
		// Nothing to do and nothing to display...
		this.roles = roles ;
		this.roleId = roles[ 0 ].id ;
		return ;
	}
	
	// If we have already received one 'roleList' event, rewrite lines to replace the last block
	if ( this.roles ) { this.rewriteLines() ; }
	
	this.roles = roles ;
	
	term( '\n' ) ;
	
	if ( assigned ) { term.brightGreen.inverse( 'ASSIGNED ROLES:' ) ; }
	else { term.inverse( 'SELECT A ROLE:' ) ; }
	
	term( '\n\n' ) ;
	
	roles.forEach( ( e , i ) => {
		charCount = 0 ;
		
		if ( ! assigned )
		{
			term.brightBlue( '%s. ' , String.fromCharCode( 0x61 + i ) ) ;
			charCount += 3 ;
		}
		
		term.brightBlue( '%s' , e.label ) ;
		charCount += e.label.length ;
		
		if ( e.clientId !== null )
		{
			userName = self.users.get( e.clientId ).name ;
			term.italic.dim( ' %s' , userName ) ;
			charCount += 1 + userName.length ;
		}
		
		term( '\n' ) ;
		
		this.rewritableLines += Math.floor( charCount / term.width ) + 1 ;
	} ) ;
	
	term( '\n' ) ;
	this.rewritableLines += 4 ;
	
	if ( assigned )
	{
		roles.find( ( e , i ) => {
			if ( e.clientId === this.user.id ) { this.roleId = e.id ; return true ; }
			return false ;
		} ) ;
		
		term( '\n\n' ) ;
		this.rewritableLines = 0 ;
		return ;
	}
	
	if ( unassignedUsers.length )
	{
		charCount = 8 ;
		str = unassignedUsers.map( e => this.users.get( e ).name ).join( ', ' ) ;
		charCount += str.length ;
		this.rewritableLines += Math.floor( charCount / term.width ) + 2 ;
		term( '^-Idling: ^/%s\n\n' , str ) ;
	}
	
	term.inverse( 'PRESS KEY a-' + String.fromCharCode( max ) + ' to select a role, or ESC/DELETE/BACKSPACE to cancel' ) ;
	
	var clear = function clear() {
		term.column( 1 ).eraseLine() ;
		self.clearRoleListCallback = null ;
		term.off( 'key' , onKey ) ;
	} ;
	
	var onKey = function onKey( name , matches , data ) {
		
		if ( data.codepoint >= 0x61 && data.codepoint <= max )
		{
			roleIndex = data.codepoint - 0x61 ;
			
			if ( roles[ roleIndex ].clientId !== null ) { return ; }
			
			clear() ;
			self.bus.emit( 'selectRole' , roleIndex ) ;
		}
		else if ( name === 'ESC' || name === 'DELETE' || name === 'BACKSPACE' )
		{
			clear() ;
			self.bus.emit( 'selectRole' , null ) ;
		}
	} ;
	
	self.clearRoleListCallback = clear ;
	term.on( 'key' , onKey ) ;
} ;



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
	this.inGame = true ;
	this.afterNext = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene()
{
	if ( ! this.afterNext ) { term( '\n' ) ; }
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered( nextIndex , roleIds , special )
{
	if ( this.clearNextListCallback ) { this.clearNextListCallback() ; }
	
	if ( this.nexts.length > 1 || this.nexts[ nextIndex ].label )
	{
		term.bold.cyan( "> %s. %s" , String.fromCharCode( 0x61 + nextIndex ) , this.nexts[ nextIndex ].label ) ;
		
		if ( this.roles.length > 1 && Array.isArray( roleIds ) && roleIds.length )
		{
			term.dim.italic( " %s" , roleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ) ;
		}
		
		switch ( special )
		{
			case 'auto' :
				term.red( ' AUTO' ) ;
				break ;
		}
		
		term( '\n\n\n' ) ;
	}
} ;



UI.nextList = function nextList( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	//console.log( 'nextList received:' , nexts ) ;
	this.nexts = nexts ;
	this.afterNext = true ;
	
	if ( this.clearNextListCallback ) { this.clearNextListCallback() ; }
	
	if ( isUpdate )
	{
		if ( this.roles.length === 1 ) { return ; }	// No need to update if we are alone
		this.rewriteLines() ;
	}
	else
	{
		// Reset rewritable lines
		this.rewritableLines = 0 ;
	}
	
	//if ( nexts.length === 0 ) { this.nextEnd() ; }
	//else 
	if ( nexts.length === 1 ) { this.nextListConfirm( nexts[ 0 ] , grantedRoleIds , undecidedRoleIds , timeout , isUpdate ) ; }
	else { this.nextListMenu( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate ) ; }
} ;



UI.prototype.nextListConfirm = function nextListConfirm( next , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	var self = this , str , charCount = 0 ,
		timer = null , timeStr , startTime ;
	
	term( '\n' ) ;
	
	if ( next.label ) { term.brightBlue( 'Next: %s' , next.label ) ; charCount += 6 + next.label.length ; }
	else { term.brightBlue( 'Next.' ) ; }
	
	if ( this.roles.length > 1 && Array.isArray( next.roleIds ) && next.roleIds.length )
	{
		str = next.roleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ;
		term.dim.italic( " %s" , str ) ;
		charCount += 1 + str.length ;
	}
	
	term( '\n\n' ) ;
	
	this.rewritableLines += Math.floor( charCount / term.width ) + 3 ;
	
	if ( undecidedRoleIds.length && this.roles.length > 1 )
	{
		charCount = 9 ;
		str = undecidedRoleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ;
		charCount += str.length ;
		this.rewritableLines += Math.floor( charCount / term.width ) + 2 ;
		term( '^-Waiting: ^/%s\n\n' , str ) ;
	}
	
	//term.bgBrightWhite.black.eraseLine( 'PRESS ANY KEY TO CONTINUE' ) ;
	term.inverse( 'PRESS ANY KEY TO CONTINUE' ) ;
	
	if ( timeout !== null )
	{
		startTime = Date.now() ;
		timeStr = ' ' + Math.round( timeout / 1000 ) + 's' ;
		term( timeStr ) ;
		
		timer = setInterval( function() {
			term.left.eraseLineAfter( timeStr.length ) ;
			timeStr = ' ' + Math.round( ( timeout + startTime - Date.now() ) / 1000 ) + 's' ;
			term( timeStr ) ;
		} , 1000 ) ;
	}
	
	var clear = function clear() {
		term.column( 1 ).eraseLine() ;
		self.clearNextListCallback = null ;
		if ( timer !== null ) { clearInterval( timer ) ; timer = null ; }
		term.off( 'key' , onKey ) ;
	} ;
	
	var onKey = function onKey( name ) {
		
		if ( name.length === 1 || name === 'ENTER' )
		{
			clear() ;
			self.bus.emit( 'selectNext' , 0 ) ;
		}
	} ;
	
	self.clearNextListCallback = clear ;
	term.on( 'key' , onKey ) ;
} ;



UI.prototype.nextListMenu = function nextListMenu( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	var self = this , nextIndex , str , charCount ,
		max = 0x61 + nexts.length - 1 ,
		timer = null , timeStr , startTime ;
	
	term( '\n' ) ;
	
	nexts.forEach( ( next , i ) => {
		term.brightBlue( '%s. %s' , String.fromCharCode( 0x61 + i ) , next.label ) ;
		
		charCount = 3 + next.label.length ;
		
		if ( this.roles.length > 1 && Array.isArray( next.roleIds ) && next.roleIds.length )
		{
			str = next.roleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ;
			term.dim.italic( " %s" , str ) ;
			charCount += 1 + str.length ;
		}
		
		term( '\n' ) ;
		
		this.rewritableLines += Math.floor( charCount / term.width ) + 1 ;
	} ) ;
	
	term( '\n' ) ;
	this.rewritableLines += 2 ;
	
	if ( undecidedRoleIds.length && this.roles.length > 1 )
	{
		charCount = 9 ;
		str = undecidedRoleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ;
		charCount += str.length ;
		this.rewritableLines += Math.floor( charCount / term.width ) + 2 ;
		term( '^-Waiting: ^/%s\n\n' , str ) ;
	}
	
	term.inverse( 'PRESS KEY a-' + String.fromCharCode( max ) + ' to select a choice, or ESC/DELETE/BACKSPACE to cancel' ) ;
	
	if ( timeout !== null )
	{
		startTime = Date.now() ;
		timeStr = ' ' + Math.round( timeout / 1000 ) + 's' ;
		term( timeStr ) ;
		
		timer = setInterval( function() {
			term.left.eraseLineAfter( timeStr.length ) ;
			timeStr = ' ' + Math.round( ( timeout + startTime - Date.now() ) / 1000 ) + 's' ;
			term( timeStr ) ;
		} , 1000 ) ;
	}
	
	var clear = function clear() {
		term.column( 1 ).eraseLine() ;
		self.clearNextListCallback = null ;
		if ( timer !== null ) { clearInterval( timer ) ; timer = null ; }
		term.off( 'key' , onKey ) ;
	} ;
	
	var onKey = function onKey( name , matches , data ) {
		
		if ( data.codepoint >= 0x61 && data.codepoint <= max )
		{
			term.column( 1 ).eraseLine() ;
			nextIndex = data.codepoint - 0x61 ;
			clear() ;
			self.bus.emit( 'selectNext' , nextIndex ) ;
		}
		else if ( name === 'ESC' || name === 'DELETE' || name === 'BACKSPACE' )
		{
			clear() ;
			self.bus.emit( 'selectNext' , null ) ;
		}
	} ;
	
	self.clearNextListCallback = clear ;
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
UI.textInput = function textInput( label , grantedRoleIds )
{
	var self = this ;
	
	if ( label ) { term( label ) ; }
	
	var options = {
		//history : history ,
		//autoComplete: autoComplete ,
		//autoCompleteMenu: true ,
		//maxLength: 3
	} ;
	
	if ( grantedRoleIds.indexOf( this.roleId ) === -1 )
	{
		// Not granted!
		term.inverse( "YOU CAN'T RESPOND - WAIT..." )( '\n' ) ;
		return ;
	}
	
	term.inputField( options , function( error , input ) {
		term( '\n' ) ;
		if ( error ) { self.bus.emit( error ) ; }
		else { self.bus.emit( 'textSubmit' , input ) ; }
	} ) ;
} ;



// rejoin event
UI.rejoin = function rejoin() {} ;



UI.wait = function wait( what )
{
	//term( '\n' ) ;
	
	switch ( what )
	{
		case 'otherBranches' :
			term.cyan.inverse( 'WAITING FOR OTHER BRANCHES TO FINISH...' ) ;
			this.bus.once( 'rejoin' , function() { term.column( 1 ).eraseLine() ; } ) ;
			break ;
		default :
			term.cyan.inverse( 'WAITING FOR ' + what ) ;
	}
	
	//this.rewritableLines = 2 ;
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



UI.prototype.rewriteLines = function rewriteLines()
{
	term.eraseLine() ;
	for ( ; this.rewritableLines ; this.rewritableLines -- ) { term.up( 1 ).eraseLine() ; }
	term.column( 1 ) ;
} ;

