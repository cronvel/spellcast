/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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
var async = require( 'async-kit' ) ;
//var spellcastPackage = require( '../../package.json' ) ;

//var Ngev = require( 'nextgen-events' ) ;

var log = require( 'logfella' ).global.use( 'spellcast-classic-ui' ) ;



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
			config: { value: null , writable: true , enumerable: true } ,
			commandConfig: { value: null , writable: true , enumerable: true } ,
			chatConfig: { value: null , writable: true , enumerable: true } ,
			actionConfig: { value: null , writable: true , enumerable: true } ,
			inGame: { value: false , writable: true , enumerable: true } ,
			focusOn: { value: 'nextMenu' , writable: true , enumerable: true } ,
			isBlinkingChat: { value: false , writable: true , enumerable: true } ,
			inputHistory: { value: [] , writable: true , enumerable: true } ,
			commandInput: { value: null , writable: true , enumerable: true } ,
			commandHistory: { value: [] , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			nextMenu: { value: false , writable: true , enumerable: true } ,
			clearRoleListCallback: { value: null , writable: true , enumerable: true } ,
			statusLineTimer: { value: null , writable: true , enumerable: true } ,
			statusLineIdling: { value: null , writable: true , enumerable: true } ,
			messageAreaY: { value: null , writable: true , enumerable: true } ,
		} ) ;
	}
	
	self.bus.on( 'clientConfig' , UI.clientConfig.bind( self ) ) ;
	self.bus.on( 'user' , UI.user.bind( self ) ) ;
	self.bus.on( 'userList' , UI.userList.bind( self ) ) ;
	self.bus.on( 'roleList' , UI.roleList.bind( self ) ) ;
	
	self.bus.on( 'coreMessage' , UI.coreMessage.bind( self ) ) ;
	self.bus.on( 'errorMessage' , UI.errorMessage.bind( self ) ) ;
	self.bus.on( 'extOutput' , UI.extOutput.bind( self ) ) ;
	self.bus.on( 'extErrorOutput' , UI.extErrorOutput.bind( self ) ) ;
	
	self.bus.on( 'message' , UI.message.bind( self ) , { async: true } ) ;
	self.bus.on( 'commandConfig' , UI.commandConfig.bind( self ) ) ;
	self.bus.on( 'chatConfig' , UI.chatConfig.bind( self ) ) ;
	self.bus.on( 'actionConfig' , UI.actionConfig.bind( self ) ) ;
	
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
	
	// Clean up the terminal
	self.init() ;
	
	return self ;
}

//UI.prototype = Object.create( Ngev.prototype ) ;
//UI.prototype.constructor = UI ;

module.exports = UI ;



function arrayGetById( id ) { return this.find( e => e.id === id ) ; }  // jshint ignore:line



UI.prototype.init = function init()
{
	// Ensure we have few lines after the input
	term( '\n\n\n' ).up( 3 ) ;
	
	// Clean up eventual garbage below us
	term.eraseDisplayBelow() ;
	
	// Enable input grabbing, including the mouse motion
	term.grabInput( { mouse: 'motion' } ) ;
	
	// Prepare scrolling area
	this.defineMessageArea() ;
	
	// Create the command input
	this.createCommandInput() ;
	
	term.on( 'key' , key => {
		switch ( key )
		{
			case 'CTRL_C' :
				if ( this.nextMenu ) { this.nextMenu.clear_() ; }
				term.saveCursor() ;
				term.resetScrollingRegion() ;
				term.restoreCursor() ;
				term.green( '\nCTRL-C received: quit...\n' ) ;
				term.processExit( 130 ) ;
				break ;
			case 'CTRL_S' :
				term.green( '\nSave state required...\n' ) ;
				this.bus.emit( 'saveState' ) ;
				break ;
			case 'TAB' :
				this.cycleFocus() ;
				break ;
			case 'SHIFT_TAB' :
				this.cycleFocus( -1 ) ;
				break ;
		}
	} ) ;
	
	this.bus.emit( 'ready' ) ;
} ;



UI.clientConfig = function clientConfig( config )
{
	//term( 'Client config received: %Y' , config ) ;
	this.config = config ;
} ;



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
	var roleIndex , userName , str , charCount ,
		shouldRedrawLines = false ,
		max = 0x61 + roles.length - 1 ;
	
	// If we have already received one 'roleList' event, rewrite lines to replace the last block
	if ( this.roles ) { shouldRedrawLines = true ; }
	
	this.roles = roles ;
	this.afterNext = true ;
	
	if ( this.clearRoleListCallback ) { this.clearRoleListCallback() ; }
	
	// Add the get method to the array
	roles.get = arrayGetById ;
	
	// If already in-game, no more thing to do...
	if ( this.inGame )
	{
		this.roles = roles ;
		return ;
	}
	
	if ( assigned )
	{
		if ( roles.length <= 1 )
		{
			// Nothing to do and nothing to display...
			this.roles = roles ;
			this.roleId = roles[ 0 ].id ;
			return ;
		}
		else
		{
			// Find our own role ID
			roles.find( ( e , i ) => {
				if ( e.clientId === this.user.id ) { this.roleId = e.id ; return true ; }
				return false ;
			} ) ;
		}
	}
	
	var draw = ( shouldRedrawLines ) => {
		
		//if ( this.focusOn ) { this.blinkChat() ; }
		
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
				userName = this.users.get( e.clientId ).name ;
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
		
		// /!\ ULTRA TMP /!\
		this.nextMenu = {
			redraw_: redraw ,
			clear_: clear
		} ;
	} ;
	
	var redraw = () => {
		draw() ;
	} ;
	
	var clear = () => {
		term.column( 1 ).eraseLine() ;
		this.clearRoleListCallback = null ;
		term.off( 'key' , onKey ) ;
		
		// /!\ ULTRA TMP /!\
		this.nextMenu = null ;
	} ;
	
	var onKey = ( name , matches , data ) => {
		
		//if ( this.focusOn ) { return ; }
		
		if ( data.codepoint >= 0x61 && data.codepoint <= max )
		{
			roleIndex = data.codepoint - 0x61 ;
			
			if ( roles[ roleIndex ].clientId !== null ) { return ; }
			
			clear() ;
			this.bus.emit( 'selectRole' , roleIndex ) ;
		}
		else if ( name === 'ESC' || name === 'DELETE' || name === 'BACKSPACE' )
		{
			clear() ;
			this.bus.emit( 'selectRole' , null ) ;
		}
	} ;
	
	draw( shouldRedrawLines ) ;
	
	// Nothing more to do...
	if ( assigned ) { return ; }
	
	this.clearRoleListCallback = clear ;
	term.on( 'key' , onKey ) ;
} ;



// Formated message emitted by the core engine, core execution continue
UI.coreMessage = function coreMessage()
{
	//if ( this.focusOn ) { this.blinkChat() ; }
	term.apply( term , arguments ) ;
} ;



// Error formated message, mostly emitted by the core engine, but may be emitted from the script
UI.errorMessage = function errorMessage()
{
	//if ( this.focusOn ) { this.blinkChat() ; }
	term.apply( term , arguments ) ;
} ;



// External raw output (e.g. shell command stdout)
UI.extOutput = function extOutput( output )
{
	//if ( this.focusOn ) { this.blinkChat() ; }
	process.stdout.write( output ) ;
} ;



// External raw error output (e.g. shell command stderr)
UI.extErrorOutput = function extErrorOutput( output )
{
	//if ( this.focusOn ) { this.blinkChat() ; }
	process.stderr.write( output ) ;
} ;



// Script [message], execution can be suspended if the listener is async, waiting for completion.
// E.g.: possible use: wait for a user input before continuing processing.
UI.message = function message( text , options , callback )
{
	var triggered = false , needFocus ;
	
	options = options || {} ;
	
	var triggerCallback = () => {
		if ( triggered ) { return ; }
		triggered = true ;
		
		if ( needFocus ) { this.setFocus( needFocus ) ; }
		if ( options.next ) { this.messageNext( callback ) ; return ; }
		
		callback() ;
	} ;
	
	if ( this.messageAreaY )
	{
		term.moveTo( 1 , this.messageAreaY ) ;
	}
	else if ( this.focusOn === 'commandInput' )
	{
		needFocus = this.focusOn ;
		this.setFocus( 'frozen' ) ;
		term.restoreCursor() ;
		term.saveCursor() ;
		term.scrollingRegion( 1 , term.height - 2 ) ;
		term.restoreCursor() ;
		term.column( 1 ).eraseLine() ;
	}
	else
	{
		term.saveCursor() ;
		term.scrollingRegion( 1 , term.height - 2 ) ;
		term.restoreCursor() ;
		term.column( 1 ).eraseLine() ;
	}
	
	if ( options.slowTyping )
	{
		term.markupOnly.slowTyping( text + '\n' , triggerCallback ) ;
		return ;
	}
	
	term.markupOnly( text + '\n' ) ;
	
	triggerCallback() ;
} ;



UI.prototype.messageNext = function messageNext( callback )
{
	term.inverse( 'PRESS SPACE OR ENTER TO CONTINUE' ) ;
	
	var onKey = ( key ) => {
		
		//if ( this.focusOn ) { return ; }
		
		if ( key === ' ' || key === 'ENTER' )
		{
			term.column( 1 ).eraseLine( '\n' ) ;
			term.off( 'key' , onKey ) ;
			callback() ;
		}
	} ;
	
	term.on( 'key' , onKey ) ;
} ;



UI.commandConfig = function commandConfig( data ) { this.commandConfig = data ; } ;
UI.chatConfig = function chatConfig( data ) { this.chatConfig = data ; } ;
UI.actionConfig = function actionConfig( data ) { this.actionConfig = data ; } ;



// 'enterScene' event
UI.enterScene = function enterScene()
{
	this.inGame = true ;
	this.afterNext = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene()
{
	//if ( ! this.afterNext ) { term( '\n' ) ; }
} ;



const nextMenuOptions = {
	leftPadding: '  ' ,
	selectedLeftPadding: '  ' ,
	submittedLeftPadding: '  ' ,
	extraLines: 1 ,
	style: term.brightBlue ,
	selectedStyle: term.bgBlue.white ,
	submittedStyle: term.bgGray.bold.brightWhite ,
	disabledStyle: term.gray ,
	disabledSelectedStyle: term.bgGray.dim ,
	disabledSubmittedStyle: term.bgGray ,
	continueOnSubmit: true ,
	keyBindings: {
		ENTER: 'submit' ,
		KP_ENTER: 'submit' ,
		UP: 'previous' ,
		DOWN: 'next' ,
		//TAB: 'cycleNext' ,
		//SHIFT_TAB: 'cyclePrevious' ,
		HOME: 'first' ,
		END: 'last' ,
		ESCAPE: 'cancel' ,
		BACKSPACE: 'cancel' ,
		DELETE: 'cancel'
    }
} ;



UI.nextList = function nextList( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	var nextIndex , str , charCount , state , selectedIndex = 0 , menuY , maxChars , startTime ;
	
	startTime = Date.now() ;
	
	this.nexts = nexts ;
	this.afterNext = true ;
	this.lastNextListEvent = Array.from( arguments ) ;
	
	if ( isUpdate )
	{
		if ( this.roles.length === 1 ) { return ; }	// No need to update if we are alone?
		
		// Should always be true?
		if ( this.nextMenu )
		{
			state = this.nextMenu.getState() ;
			selectedIndex = state.selectedIndex ;
			menuY = state.start.y ;
		}
		
		if ( this.nextMenu ) { this.nextMenu.clear_( undefined , true ) ; }
		
		term.up( 1 ) ;
	}
	else
	{
		if ( this.nextMenu ) { this.nextMenu.clear_() ; }
	}
	
	var onSubmit = ( data ) => {
		this.bus.emit( 'selectNext' , data.selectedIndex ) ;
	} ;
	
	var onCancel = () => {
		this.bus.emit( 'selectNext' , null ) ;
	} ;
	
	var updateTimer = () => {
		this.statusLineTimer = 'Time limit: ' + Math.round( ( timeout + this.nextMenu.timeoutStartAt_ - Date.now() ) / 1000 ) + 's' ;
		this.redrawStatusLine() ;
	} ;
	
	var draw = () => {
		
		//if ( this.focusOn ) { this.blinkChat() ; }
		
		var menuItems = nexts.map( next => {
			var item = next.label || 'Next.' ;
			
			if ( this.roles.length > 1 && Array.isArray( next.roleIds ) && next.roleIds.length )
			{
				item += ' ' + term.str.dim.italic( next.roleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ) ;
			}
			
			return item ;
		} ) ;
		
		term.saveCursor() ;
		term.scrollingRegion( 1 , term.height - 2 ) ;
		term.restoreCursor() ;
		
		this.nextMenu = term.singleColumnMenu(
			menuItems ,
			Object.assign( {
					y: menuY ,
					selectedIndex: selectedIndex ,
					paused: this.focusOn !== 'nextMenu' ,
					scrollRegionBottom: term.height - 2
				} ,
				nextMenuOptions
			)
		) ;
		
		// Parisite the menu with our own method and data
		this.nextMenu.clear_ = clear ;
		this.nextMenu.redraw_ = redraw ;
		this.nextMenu.timeoutStartAt_ = startTime ;
		this.nextMenu.timeoutTimer_ = null ;
		
		this.nextMenu.on( 'submit' , onSubmit ) ;
		this.nextMenu.on( 'cancel' , onCancel ) ;
		
		this.nextMenu.once( 'ready' , () => {
			
			this.defineMessageArea( this.nextMenu.getState().start.y - 1 ) ;
			
			if ( undecidedRoleIds.length && this.roles.length > 1 )
			{
				this.statusLineIdling = 'Waiting: ^/' + undecidedRoleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ;
			}
			
			if ( timeout !== null )
			{
				updateTimer() ;
				if ( this.nextMenu.timeoutTimer_ !== null ) { clearInterval( this.nextMenu.timeoutTimer_ ) ; }
				this.nextMenu.timeoutTimer_ = setInterval( updateTimer , 1000 ) ;
			}
			else
			{
				// updateTimer() redraws status line, so do it only in the 'else' statement
				this.redrawStatusLine() ;
			}
		} ) ;
	} ;
	
	var redraw = () => {
		console.error( '\nTODO: redraw NextList\n' ) ;
		//draw() ;
	} ;
	
	var clear = ( index , eraseMenu ) => {
		
		this.nextMenu.off( 'submit' , onSubmit ) ;
		this.nextMenu.off( 'cancel' , onCancel ) ;
		
		if ( this.nextMenu.timeoutTimer_ !== null )
		{
			clearInterval( this.nextMenu.timeoutTimer_ ) ;
			this.nextMenu.timeoutTimer_ = null ;
		}
		
		if ( index !== undefined )
		{
			this.nextMenu.select( index ) ;
			this.nextMenu.submit() ;
		}
		
		// Erase the last line
		term.moveTo( 1 , term.height ).eraseLine() ;
		this.nextMenu.stop( eraseMenu ) ;
		this.defineMessageArea( null ) ;
		this.nextMenu = null ;
	} ;
	
	draw() ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered( nextIndex , roleIds , special )
{
	this.statusLineTimer = null ;
	this.afterNext = false ;
	
	//console.warn( 'nextTriggered received:' , this.nexts , "\n\n\n\n\n" ) ;
	
	//if ( this.focusOn ) { this.blinkChat() ; }
	
	if ( this.nextMenu ) { this.nextMenu.clear_( nextIndex ) ; }
	
	if ( this.nexts.length > 1 || this.nexts[ nextIndex ].label )
	{
		term.bold.cyan( "\n> %s" , this.nexts[ nextIndex ].label ) ;
		
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
		
		term( '\n' ) ;
	}
	
	term( '\n\n' ) ;
} ;



// Text input field
UI.textInput = function textInput( label , grantedRoleIds )
{
	//if ( this.focusOn ) { this.closeChat() ; }
	if ( label ) { term( label ) ; }
	
	var options = {
		//style: term.bgBrightBlack ,
		//history : this.inputHistory ,
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
	
	//term.bgGray.eraseLineAfter( '> ' ) ;
	term.bold.brightWhite( '> ' ) ;
	
	term.inputField( options , ( error , input ) => {
		this.inputHistory.push( input ) ;
		term( '\n' ) ;
		if ( error ) { this.bus.emit( error ) ; }
		else { this.bus.emit( 'textSubmit' , input ) ; }
	} ) ;
} ;



UI.prototype.createCommandInput = function createCommandInput()
{
	var options = {
		//style: term.bgBrightBlack ,
		history : this.commandHistory ,
		//autoComplete: autoComplete ,
		//autoCompleteMenu: true ,
		//maxLength: 3
	} ;
	
	if ( this.focusOn !== 'commandInput' ) { term.saveCursor() ; }
	
	term.moveTo.eraseLineAfter.bold( 1 , term.height - 1 , '> ' ) ;
	
	this.commandInput = term.inputField( options , ( error , input ) => {
		
		// Only send if there was actually some input
		if ( ! error && input )
		{
			this.commandHistory.push( input ) ;
			// If it starts with a '/', this is an action
			//if ( input[ 0 ] === '/' ) { this.bus.emit( 'action' , input ) ; }
			//else { this.bus.emit( 'chat' , input ) ; }
			
			// Should the event be changed to 'command'?
			this.bus.emit( 'chat' , input ) ;
			//this.bus.emit( 'command' , input ) ;
		}
		
		this.commandInput = null ;
		this.createCommandInput() ;
	} ) ;
	
	if ( this.focusOn !== 'commandInput' )
	{
		this.commandInput.pause() ;
		term.restoreCursor() ;
	}
	
	//this.commandInput.once( 'ready' , () => {} ) ;	
} ;



UI.prototype.setFocus = function setFocus( widget )
{
	if ( this.focusOn === widget ) { return ; }
	
	// First, turn off the current widget
	this.blur() ;
	
	// Then, turn on the new widget
	switch ( widget )
	{
		case 'nextMenu' :
			if ( this.nextMenu ) { this.nextMenu.resume() ; }
			break ;
		case 'commandInput' :
			if ( this.commandInput )
			{
				this.commandInput.resume() ;
				term.saveCursor() ;
			}
			break ;
		case 'frozen' :
			break ;
	}
	
	this.focusOn = widget ;
} ;



UI.prototype.blur = function blur()
{
	switch ( this.focusOn )
	{
		case 'nextMenu' :
			if ( this.nextMenu ) { this.nextMenu.pause() ; }
			break ;
		case 'commandInput' :
			if ( this.commandInput )
			{
				this.commandInput.pause() ;
				term.restoreCursor() ;
			}
			break ;
	}
	
	this.focusOn = null ;
} ;



const focusCycle = [ 'nextMenu' , 'commandInput' ] ;



UI.prototype.cycleFocus = function cycleFocus( increment = 1 )
{
	if ( this.focusOn === 'frozen' ) { return ; }
	
	var index = focusCycle.indexOf( this.focusOn ) + increment ;
	
	if ( index >= focusCycle.length ) { index = 0 ; }
	else if ( index < 0 ) { index = focusCycle.length - 1 ; }
	
	this.setFocus( focusCycle[ index ] ) ;
} ;



UI.prototype.defineMessageArea = function defineMessageArea( y )
{
	this.messageAreaY = y ;
	
	if ( ! this.messageAreaY )
	{
		term.saveCursor() ;
		//term.resetScrollingRegion() ;
		term.scrollingRegion( 1 , term.height - 2 ) ;
		term.restoreCursor() ;
	}
	else
	{
		term.saveCursor() ;
		term.scrollingRegion( 1 , this.messageAreaY ) ;
		term.restoreCursor() ;
	}
} ;



UI.prototype.redrawStatusLine = function redrawStatusLine()
{
	var str = [] ;
	
	if ( this.statusLineTimer ) { str.push( this.statusLineTimer ) ; }
	if ( this.statusLineIdling ) { str.push( this.statusLineIdling ) ; }
	
	str = str.join( '   ' ) ;
	if ( str.length > term.width ) { str = str.slice( 0 , term.width - 1 ) + '…' ; }
	
	term.saveCursor() ;
	term.moveTo.styleReset.inverse.eraseLineAfter( 1 , term.height ) ;
	term( str ) ;
	term.restoreCursor() ;
} ;



// rejoin event
UI.rejoin = function rejoin() {} ;



UI.wait = function wait( what )
{
	//term( '\n' ) ;
	//if ( this.focusOn ) { this.blinkChat() ; }
	
	switch ( what )
	{
		case 'otherBranches' :
			term.cyan.inverse( 'WAITING FOR OTHER BRANCHES TO FINISH...' ) ;
			this.bus.once( 'rejoin' , () => { term.column( 1 ).eraseLine() ; } ) ;
			break ;
		default :
			term.cyan.inverse( 'WAITING FOR ' + what ) ;
	}
	
	//this.rewritableLines = 2 ;
} ;



// end event
UI.end = function end( result , data )
{
	//if ( this.focusOn ) { this.blinkChat() ; }
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
	term( '\n' ).eraseDisplayBelow() ;
	term.saveCursor() ;
	term.resetScrollingRegion() ;
	term.restoreCursor() ;
} ;







// Deprecated?



UI.prototype.openChat = function openChat()
{
	// Already in the chat
	//if ( this.focusOn ) { return ; }
	
	this.focusOn = 'input' ;
	//term.saveCursor() ;
	
	var canChat = ! this.chatConfig || ( this.roleId && this.chatConfig && this.chatConfig[ this.roleId ].write ) ;
	var canAct = this.roleId && this.actionConfig && ! this.actionConfig.disabled ;
	
	if ( ! canChat && ! canAct )
	{
		term.moveTo( 1 , 1 ).eraseLine().red.inverse( "CAN'T CHAT OR ACT NOW!" ) ;
		
		setTimeout( () => {
			// The chat may have been closed, before the timeout...
			//if ( ! this.focusOn ) { return ; }
			
			term.moveTo( 1 , 1 ).eraseLine() ;
			term.restoreCursor() ;
			//this.focusOn = false ;
		} , 1000 ) ;
		
		return ;
	}
	
	term.moveTo( 1 , 1 ).eraseLine().bgBrightBlack( '> ' ) ;
	
	if ( this.chatInput )
	{
		this.chatInput.resume() ;
		this.chatInput.show() ;
		return ;
	}
	
	this.chatInput = term.inputField( { style: term.bgGray , history: this.chatHistory } , ( error , input ) => {
		this.chatHistory.push( input ) ;
		term.moveTo( 1 , 1 ).eraseLine() ;
		term.restoreCursor() ;
		this.chatInput = null ;
		//this.focusOn = false ;	// Set it to false, or openChat() will not open anything
		
		// Only send if there was actually some input
		if ( ! error && input )
		{
			// If it starts with a '/', this is an action
			if ( input[ 0 ] === '/' ) { this.bus.emit( 'action' , input ) ; }
			else { this.bus.emit( 'chat' , input ) ; }
		}
		
		this.openChat() ;
	} ) ;
} ;



UI.prototype.closeChat = function closeChat()
{
	// Already in the chat
	//if ( ! this.focusOn ) { return ; }
	
	//term.moveTo( 1 , 1 ).eraseLine() ;
	
	// .chatInput can be null, when the chat display the "can't open chat" message...
	if ( this.chatInput )
	{
		this.chatInput.pause() ;
		this.chatInput.hide() ;
	}
	
	term.moveTo( 1 , 1 ).eraseLine() ;
	term.restoreCursor() ;
	//this.focusOn = false ;
} ;



// Make sure the chat doesn't get in the way, when outputing something is needed...
UI.prototype.blinkChat = function blinkChat()
{
	// Already in the chat
	//if ( ! this.focusOn || this.isBlinkingChat ) { return ; }
	
	this.isBlinkingChat = true ;
	
	//term.moveTo( 1 , 1 ).eraseLine() ;
	this.chatInput.pause() ;
	this.chatInput.hide() ;
	//term.moveTo( 1 , 1 ).eraseLine() ;
	term.restoreCursor() ;
	
	process.nextTick( () => {
		term.saveCursor() ;
		term.moveTo( 1 , 1 ).eraseLine().bgBrightBlack( '> ' ) ;
		this.chatInput.resume() ;
		this.chatInput.show() ;
		this.isBlinkingChat = false ;
	} ) ;
} ;



