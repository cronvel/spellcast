/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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
var string = require( 'string-kit' ) ;
var async = require( 'async-kit' ) ;
//var spellcastPackage = require( '../../package.json' ) ;

//var Ngev = require( 'nextgen-events' ) ;

function noop() {}

var log = require( 'logfella' ).global.use( 'spellcast-classic-ui' ) ;



function UI( bus , self ) {
	if ( ! self ) {
		self = Object.create( UI.prototype , {
			bus: { value: bus , enumerable: true } ,
			user: { value: null , writable: true , enumerable: true } ,
			users: { value: null , writable: true , enumerable: true } ,
			roles: { value: null , writable: true , enumerable: true } ,
			roleId: { value: null , writable: true , enumerable: true } ,
			config: { value: null , writable: true , enumerable: true } ,
			inGame: { value: false , writable: true , enumerable: true } ,
			focusOn: { value: 'nextMenu' , writable: true , enumerable: true } ,
			isBlinkingChat: { value: false , writable: true , enumerable: true } ,
			inputHistory: { value: [] , writable: true , enumerable: true } ,
			continued: { value: false , writable: true , enumerable: true } ,
			commandInput: { value: null , writable: true , enumerable: true } ,
			commandHistory: { value: [] , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			nextMenu: { value: false , writable: true , enumerable: true } ,
			clearRoleListCallback: { value: null , writable: true , enumerable: true } ,
			statusLineTimer: { value: null , writable: true , enumerable: true } ,
			statusLineIdling: { value: null , writable: true , enumerable: true } ,
			statusLineWaitingFor: { value: null , writable: true , enumerable: true } ,
			statusLineTmp: { value: null , writable: true , enumerable: true } ,
			statusLineStatus: { value: null , writable: true , enumerable: true } ,
			messageAreaY: { value: null , writable: true , enumerable: true }
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

	self.bus.on( 'message' , UI.prototype.message.bind( self ) , { async: true } ) ;
	self.bus.on( 'indicators' , UI.indicators.bind( self ) ) ;
	self.bus.on( 'status' , UI.status.bind( self ) ) ;

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



UI.prototype.init = function init() {
	// Clear and move 2 lines before the bottom of the screen
	term.clear() ;
	term.moveTo( 1 , term.height - 2 ) ;

	// Prepare scrolling area
	this.defineMessageArea() ;

	// Enable input grabbing, including the mouse motion
	term.grabInput( { mouse: 'motion' } ) ;

	// Create the command input
	this.createCommandInput() ;

	term.on( 'key' , key => {
		switch ( key ) {
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



UI.clientConfig = function clientConfig( config ) {
	//term( 'Client config received: %Y' , config ) ;
	this.config = config ;
} ;



UI.user = function user( user_ ) {
	//console.log( 'User received: ' , user_ ) ;
	this.user = user_ ;
} ;



UI.userList = function userList( users ) {
	//console.log( 'User-list received: ' , users ) ;

	// Add the get method to the array
	users.get = arrayGetById ;
	this.users = users ;
} ;



UI.roleList = function roleList( roles , unassignedUsers , assigned ) {
	var isUpdate = !! this.roles ,
		unsubmittableIndexes = [] ,
		timeout = null ;

	this.roles = roles ;

	// Add the get method to the array
	roles.get = arrayGetById ;

	// If already in-game, no more thing to do...
	if ( this.inGame ) {
		this.roles = roles ;
		return ;
	}

	if ( assigned ) {
		if ( roles.length <= 1 ) {
			// Nothing to do and nothing to display...
			this.roles = roles ;
			this.roleId = roles[ 0 ].id ;
			return ;
		}

		// Find our own role ID
		roles.find( ( e , i ) => {
			if ( e.clientId === this.user.id ) { this.roleId = e.id ; return true ; }
			return false ;
		} ) ;

	}

	this.statusLineTmp = assigned ? '-ASSIGNED ROLES-' : '-SELECT A ROLE-' ;

	if ( unassignedUsers.length ) {
		this.statusLineIdling = 'Idling: ^/' + unassignedUsers.map( e => this.users.get( e ).name ).join( ', ' ) ;
	}

	var menuItems = roles.map( ( role , index ) => {

		var userName , item = role.label ;

		if ( role.clientId !== null ) {
			userName = this.users.get( role.clientId ).name ;
			item += term.str.italic.dim( ' ' + userName ) ;
			unsubmittableIndexes[ index ] = true ;
		}

		return item ;
	} ) ;

	this.createNextMenu( menuItems , 'selectRole' , timeout , unsubmittableIndexes , isUpdate ) ;

	if ( assigned ) {
		// Clean-up, for instance, it's a copy-paste of .nextTriggered()
		this.statusLineTimer = null ;
		this.afterNext = false ;

		if ( this.nextMenu ) { this.nextMenu.clear_() ; }

		term( '\n\n' ) ;
	}
} ;



// Formated message emitted by the core engine, core execution continue
UI.coreMessage = function coreMessage( ... args ) {
	this.uncontinue() ;
	term( ... args ) ;
} ;



// Error formated message, mostly emitted by the core engine, but may be emitted from the script
UI.errorMessage = function errorMessage( ... args ) {
	this.uncontinue() ;
	term( ... args ) ;
} ;



// External raw output (e.g. shell command stdout)
UI.extOutput = function extOutput( output ) {
	this.uncontinue() ;
	process.stdout.write( output ) ;
} ;



// External raw error output (e.g. shell command stderr)
UI.extErrorOutput = function extErrorOutput( output ) {
	process.stderr.write( output ) ;
} ;



// Script [message], execution can be suspended if the listener is async, waiting for completion.
// E.g.: possible use: wait for a user input before continuing processing.
UI.prototype.message = function message( text , options , callback ) {
	var triggered = false , focusBkup ,
		continuing = this.continued ;

	options = options || {} ;

	this.continued = !! options.continue ;
	if ( ! options.continue ) { text += '\n' ; }

	var triggerCallback = () => {
		if ( triggered ) { return ; }
		triggered = true ;

		if ( focusBkup ) { this.setFocus( focusBkup ) ; }
		this.restoreCursor() ;

		if ( options.next ) { this.messageNext( options.next , callback ) ; return ; }

		callback() ;
	} ;

	focusBkup = this.focusOn ;

	if ( options.slowTyping ) {
		this.setFocus( 'frozen' ) ;
		if ( ! continuing ) { term.moveTo( 1 , this.messageAreaY ) ; }
		term.markupOnly.slowTyping( text , triggerCallback ) ;
		return ;
	}

	if ( ! continuing ) { term.moveTo( 1 , this.messageAreaY ) ; }
	term.markupOnly( text ) ;

	triggerCallback() ;
} ;



UI.prototype.messageNext = function messageNext( value , callback ) {

	var triggerCallback = () => {
		//term.column( 1 ).eraseLine( '\n' ) ;
		term.off( 'key' , onKey ) ;
		callback() ;
	} ;

	var onKey = ( key ) => {
		//if ( this.focusOn ) { return ; }
		if ( key === ' ' || key === 'ENTER' ) {
			triggerCallback() ;
		}
	} ;

	term.on( 'key' , onKey ) ;

	if ( typeof value === 'number' && isFinite( value ) && value > 0 ) {
		this.statusLineTmp = "WAIT OR PRESS SPACE / ENTER TO CONTINUE" ;
		setTimeout( triggerCallback , value * 1000 ) ;
	}
	else {
		this.statusLineTmp = "PRESS SPACE / ENTER TO CONTINUE" ;
	}

	this.redrawStatusLine() ;
} ;



UI.indicators = function indicators( data ) {
	var focusBkup = this.focusOn ;

	this.uncontinue() ;
	term.moveTo( 1 , this.messageAreaY ) ;

	UI.displayIndicators( data ) ;

	if ( focusBkup ) { this.setFocus( focusBkup ) ; }
	this.restoreCursor() ;
} ;



UI.status = function status( data ) {
	this.statusLineStatus = UI.statusString( data ) ;
} ;



// Shared with the inline UI
UI.displayIndicators = function displayIndicator( data ) {
	var maxWidth = 0 , focusBkup = this.focusOn , barStyle , barInnerSize = 10 ;

	// First, compute the width
	data.forEach( indicator => {
		indicator.width = string.unicode.width( indicator.label || '' ) ;
		if ( indicator.width > maxWidth ) { maxWidth = indicator.width ; }
	} ) ;

	data.forEach( indicator => {
		var step ;
		term.markupOnly( indicator.label + ' '.repeat( maxWidth - indicator.width ) ) ;

		switch ( indicator.type ) {
			case 'text' :
				term( indicator.value ) ;
				break ;

			case 'vbar' :
				barInnerSize = 2 ;	// jshint ignore:line
			case 'hbar' :

				if ( typeof indicator.color === 'string' ) {
					if ( indicator.color[ 0 ] === '#' ) {
						if ( term.support.trueColor ) {
							barStyle = term.colorRgbHex.bindArgs( indicator.color ) ;
						}
						else {
							barStyle = term[ term.colorNameForHex( indicator.color ) ] ;
						}
					}
				}

				term.bar( indicator.value / 100 , {
					innerSize: barInnerSize ,
					barStyle: barStyle
				} ) ;

				break ;
		}

		term( '\n' ) ;
	} ) ;
} ;



// Shared with the inline UI
UI.statusString = function statusString( data ) {
	var str = '' , focusBkup = this.focusOn , barStyle , barInnerSize = 3 ;

	data.forEach( indicator => {
		var step ;
		str += term.markupOnly.str( indicator.label ) ;

		switch ( indicator.type ) {
			case 'text' :
				str += term.str( ' ' + indicator.value ) ;
				break ;

			case 'vbar' :
				barInnerSize = 2 ;	// jshint ignore:line
			case 'hbar' :

				if ( typeof indicator.color === 'string' ) {
					if ( indicator.color[ 0 ] === '#' ) {
						if ( term.support.trueColor ) {
							barStyle = term.colorRgbHex.bindArgs( indicator.color ) ;
						}
						else {
							barStyle = term[ term.colorNameForHex( indicator.color ) ] ;
						}
					}
				}

				str += term.bar( indicator.value / 100 , {
					innerSize: barInnerSize ,
					barStyle: barStyle ,
					str: true
				} ) ;

				break ;
		}
	} ) ;

	return str ;
} ;



// 'enterScene' event
UI.enterScene = function enterScene( isGosub , toAltBuffer ) {
	this.inGame = true ;
	this.afterNext = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene( isReturn , backToMainBuffer ) {
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
		UP: 'cyclePrevious' ,
		DOWN: 'cycleNext' ,
		HOME: 'first' ,
		END: 'last' ,
		ESCAPE: 'cancel' ,
		BACKSPACE: 'cancel' ,
		DELETE: 'cancel'
	}
} ;



UI.nextList = function nextList( nexts , grantedRoleIds , undecidedRoleIds , options , isUpdate ) {
	// Really useful?
	this.nexts = nexts ;

	var menuItems = nexts.map( next => {
		var item = next.label || 'Next.' ;

		if ( this.roles.length > 1 && Array.isArray( next.roleIds ) && next.roleIds.length ) {
			item += ' ' + term.str.dim.italic( next.roleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ) ;
		}

		return item ;
	} ) ;

	if ( undecidedRoleIds.length && this.roles.length > 1 ) {
		this.statusLineIdling = 'Waiting: ^/' + undecidedRoleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ;
	}

	this.createNextMenu( menuItems , 'selectNext' , options.timeout , null , isUpdate ) ;
} ;



UI.prototype.createNextMenu = function createNextMenu( menuItems , submitEvent , timeout , unsubmittableIndexes , isUpdate ) {
	var nextIndex , str , charCount , state , maxChars , startTime ,
		menuY , selectedIndex = 0 , submitted = false ;

	this.uncontinue() ;

	startTime = Date.now() ;

	this.afterNext = true ;

	if ( isUpdate ) {
		if ( this.roles.length === 1 ) { return ; }	// No need to update if we are alone?

		// Should always be true?
		if ( this.nextMenu ) {
			state = this.nextMenu.getState() ;
			selectedIndex = state.selectedIndex ;
			submitted = state.submitted ;
			menuY = state.start.y ;
		}

		if ( this.nextMenu ) { this.nextMenu.clear_( undefined , true ) ; }

		term.up( 1 ) ;
	}
	else if ( this.nextMenu ) { this.nextMenu.clear_() ; }

	var onSubmit = ( data ) => {
		this.bus.emit( submitEvent , data.selectedIndex ) ;
	} ;

	var onCancel = () => {
		this.bus.emit( submitEvent , null ) ;
	} ;

	var updateTimer = () => {
		this.statusLineTimer = 'Time limit: ' + Math.round( ( timeout + this.nextMenu.timeoutStartAt_ - Date.now() ) / 1000 ) + 's' ;
		this.redrawStatusLine() ;
	} ;

	var draw = () => {

		this.defineMessageArea() ;

		if ( isUpdate ) { term.moveTo( 1 , menuY ) ; }
		else { term.moveTo( 1 , this.messageAreaY ) ; }

		this.nextMenu = term.singleColumnMenu(
			menuItems ,
			Object.assign( {
				y: menuY ,
				selectedIndex: selectedIndex ,
				submitted: submitted ,
				paused: this.focusOn !== 'nextMenu' ,
				unsubmittableIndexes: unsubmittableIndexes ,
				scrollRegionBottom: this.messageAreaY
			} ,
			nextMenuOptions
			)
		) ;

		// Parisite the menu with our own method and data
		this.nextMenu.clear_ = clear ;
		this.nextMenu.timeoutStartAt_ = startTime ;
		this.nextMenu.timeoutTimer_ = null ;

		this.nextMenu.on( 'submit' , onSubmit ) ;
		this.nextMenu.on( 'cancel' , onCancel ) ;

		this.nextMenu.once( 'ready' , () => {

			this.defineMessageArea( this.nextMenu.getState().start.y - 1 ) ;

			if ( timeout !== null && timeout !== undefined ) {
				updateTimer() ;
				if ( this.nextMenu.timeoutTimer_ !== null ) { clearInterval( this.nextMenu.timeoutTimer_ ) ; }
				this.nextMenu.timeoutTimer_ = setInterval( updateTimer , 1000 ) ;
			}
			else {
				// updateTimer() redraws status line, so do it only in the 'else' statement
				this.redrawStatusLine() ;
			}

			this.restoreCursor() ;
		} ) ;
	} ;

	var clear = ( index , eraseMenu ) => {

		this.nextMenu.off( 'submit' , onSubmit ) ;
		this.nextMenu.off( 'cancel' , onCancel ) ;

		if ( this.nextMenu.timeoutTimer_ !== null ) {
			clearInterval( this.nextMenu.timeoutTimer_ ) ;
			this.nextMenu.timeoutTimer_ = null ;
		}

		if ( index !== undefined ) {
			this.nextMenu.select( index ) ;
			this.nextMenu.submit() ;
		}

		this.nextMenu.stop( eraseMenu ) ;
		this.nextMenu = null ;
		this.defineMessageArea() ;

		// Reset status line
		this.statusLineTimer = null ;
		this.statusLineIdling = null ;
		this.redrawStatusLine() ;
	} ;

	draw() ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered( nextIndex , roleIds , special ) {
	this.uncontinue() ;
	this.statusLineTimer = null ;
	this.afterNext = false ;

	//console.warn( 'nextTriggered received:' , this.nexts , "\n\n\n\n\n" ) ;

	if ( this.nextMenu ) { this.nextMenu.clear_( nextIndex ) ; }

	if ( this.nexts.length > 1 || this.nexts[ nextIndex ].label ) {
		term.bold.cyan( "\n> %s" , this.nexts[ nextIndex ].label ) ;

		if ( this.roles.length > 1 && Array.isArray( roleIds ) && roleIds.length ) {
			term.dim.italic( " %s" , roleIds.map( e => this.roles.get( e ).label ).join( ', ' ) ) ;
		}

		switch ( special ) {
			case 'auto' :
				term.red( ' AUTO' ) ;
				break ;
		}

		term( '\n' ) ;
	}

	term( '\n\n' ) ;
} ;



// Text input field
UI.textInput = function textInput( label , grantedRoleIds ) {
	label = label || '' ;

	if ( label ) {
		// Write the message in the text flow
		this.message( label , null , noop ) ;
	}

	if ( grantedRoleIds.indexOf( this.roleId ) === -1 ) {
		// Not granted!
		this.statusLineTmp = "-WAITING FOR OTHER TO RESPOND-" ;
		this.redrawStatusLine() ;
		return ;
	}

	this.createCommandInput( label ) ;
} ;



UI.prototype.createCommandInput = function createCommandInput( isAsked , placeHolder , inputBkup ) {
	var prompt , history ;

	this.uncontinue() ;

	if ( isAsked === true ) { isAsked = '' ; }
	var isTextInput = isAsked || isAsked === '' ;

	if ( isTextInput ) {
		prompt = isAsked + '> ' ;
		history = null ;
	}
	else {
		prompt = '> ' ;
		history = this.commandHistory ;
	}

	var options = {
		x: 1 + prompt.length ,
		y: term.height - 1 ,
		//style: term.bgBrightBlack ,
		default: placeHolder ,
		history: history ,
		//autoComplete: autoComplete ,
		//autoCompleteMenu: true ,
		//maxLength: 3 ,
		minLength: 1
	} ;

	if ( this.focusOn !== 'commandInput' ) {
		if ( isAsked ) {
			this.setFocus( 'commandInput' ) ;
		}
		else {
			term.saveCursor() ;
		}
	}

	if ( this.commandInput ) {
		// There is already one active commandInput, save its input, and abort it
		inputBkup = this.commandInput.getInput() ;
		this.commandInput.abort() ;
		this.commandInput = null ;
	}

	term.moveTo.eraseLineAfter.bold( 1 , term.height - 1 , prompt ) ;

	this.commandInput = term.inputField( options , ( error , input ) => {

		var submitEvent ;

		if ( error ) {
			this.bus.emit( error ) ;
			// Retry...
			this.commandInput = null ;
			this.createCommandInput( isAsked , placeHolder , inputBkup ) ;
		}
		else if ( input ) {
			if ( history ) { history.push( input ) ; }
			this.commandInput = null ;
			this.createCommandInput( null , inputBkup ) ;

			// Important: emit after! Or strange race condition may happen!
			if ( isTextInput ) { submitEvent = 'textSubmit' ; }
			else { submitEvent = this.inGame ? 'command' : 'chat' ; }

			this.bus.emit( submitEvent , input ) ;
		}
		else {
			// Retry...
			this.commandInput = null ;
			this.createCommandInput( isAsked , placeHolder , inputBkup ) ;
		}
	} ) ;

	if ( this.focusOn !== 'commandInput' ) {
		this.commandInput.pause() ;
		term.restoreCursor() ;
	}

	//this.commandInput.once( 'ready' , () => {} ) ;
} ;



UI.prototype.setFocus = function setFocus( widget ) {
	if ( this.focusOn === widget ) { return ; }

	// First, turn off the current widget
	this.blur() ;

	// Then, turn on the new widget
	switch ( widget ) {
		case 'nextMenu' :
			if ( this.nextMenu ) { this.nextMenu.resume() ; }
			break ;
		case 'commandInput' :
			if ( this.commandInput ) { this.commandInput.resume() ; }
			break ;
		case 'frozen' :
			break ;
	}

	this.focusOn = widget ;
} ;



// Move the cursor back to the focused widget
UI.prototype.restoreCursor = function restoreCursor() {
	switch ( this.focusOn ) {
		case 'nextMenu' :
			if ( this.nextMenu ) { this.nextMenu.redrawCursor() ; }
			break ;
		case 'commandInput' :
			if ( this.commandInput ) { this.commandInput.redrawCursor() ; }
			break ;
		case 'frozen' :
			break ;
	}
} ;



UI.prototype.blur = function blur() {
	switch ( this.focusOn ) {
		case 'nextMenu' :
			if ( this.nextMenu ) { this.nextMenu.pause() ; }
			break ;
		case 'commandInput' :
			if ( this.commandInput ) { this.commandInput.pause() ; }
			break ;
	}

	this.focusOn = null ;
} ;



const focusCycle = [ 'nextMenu' , 'commandInput' ] ;



UI.prototype.cycleFocus = function cycleFocus( increment = 1 ) {
	if ( this.focusOn === 'frozen' ) { return ; }

	var index = focusCycle.indexOf( this.focusOn ) + increment ;

	if ( index >= focusCycle.length ) { index = 0 ; }
	else if ( index < 0 ) { index = focusCycle.length - 1 ; }

	this.setFocus( focusCycle[ index ] ) ;
} ;



UI.prototype.defineMessageArea = function defineMessageArea( y ) {
	this.messageAreaY = y || term.height - 2 ;

	term.saveCursor() ;
	term.scrollingRegion( 1 , this.messageAreaY ) ;
	term.restoreCursor() ;
} ;



UI.prototype.redrawStatusLine = function redrawStatusLine() {
	var str = [] , stripped ;

	if ( this.statusLineTimer ) { str.push( this.statusLineTimer ) ; }
	if ( this.statusLineTmp ) { str.push( this.statusLineTmp ) ; this.statusLineTmp = null ; }
	if ( this.statusLineWaitingFor ) { str.push( this.statusLineWaitingFor ) ; }
	if ( this.statusLineIdling ) { str.push( this.statusLineIdling ) ; }
	if ( this.statusLineStatus ) { str.push( term.str.styleReset( this.statusLineStatus ) ) ; }

	str = str.join( '   ' ) ;

	if ( termkit.stringWidth( str ) > term.width ) {
		str = termkit.truncateString( str , term.width - 1 ) + term.str.styleReset( '…' ) ;
	}

	term.saveCursor() ;
	term.moveTo.styleReset.inverse.eraseLineAfter( 1 , term.height ) ;
	term( str ) ;
	term.styleReset() ;
	term.restoreCursor() ;
} ;



// Manage message with the continue flag with nothing after
UI.prototype.uncontinue = function uncontinue() {
	if ( ! this.continued ) { return ; }
	this.continued = false ;
	term( "\n" ) ;
} ;



// rejoin event
UI.rejoin = function rejoin() {} ;



UI.wait = function wait( what ) {
	switch ( what ) {
		case 'otherBranches' :
			this.statusLineWaitingFor = '-WAITING FOR OTHER BRANCHES TO FINISH-' ;
			this.redrawStatusLine() ;
			this.bus.once( 'rejoin' , () => {
				this.statusLineWaitingFor = null ;
				this.redrawStatusLine() ;
			} ) ;
			break ;
		default :
			this.statusLineTmp = '-WAITING FOR ' + what + '-' ;
			this.redrawStatusLine() ;
	}
} ;



// end event
UI.end = function end( result , data ) {
	term( '\n\t\t' ) ;

	switch ( result ) {
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
UI.exit = function exit( code , timeout , callback ) {
	term( '\n' ).eraseDisplayBelow() ;
	term.saveCursor() ;
	term.resetScrollingRegion() ;
	term.restoreCursor() ;
} ;


