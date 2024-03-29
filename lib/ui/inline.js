/*
	Spellcast

	Copyright (c) 2014 - 2021 Cédric Ronvel

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



const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;

const bookSource = require( 'book-source' ) ;
const QuickMarkupRenderer = require( 'book-source-quickmarkup-renderer' ) ;
const theme = new bookSource.Theme() ;
const quickMarkupRenderer = new QuickMarkupRenderer( theme ) ;

//const spellcastPackage = require( '../../package.json' ) ;

//const Ngev = require( 'nextgen-events' ) ;

// Some functions are shared
const ClassicUI = require( './classic.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast-classic-ui' ) ;



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
			inInput: { value: false , writable: true , enumerable: true } ,
			inCommand: { value: false , writable: true , enumerable: true } ,
			isBlinkingCommand: { value: false , writable: true , enumerable: true } ,
			closeAfterBlinking: { value: false , writable: true , enumerable: true } ,
			continued: { value: false , writable: true , enumerable: true } ,
			commandInput: { value: null , writable: true , enumerable: true } ,
			inputHistory: { value: [] , writable: true , enumerable: true } ,
			commandHistory: { value: [] , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			inSelect: { value: false , writable: true , enumerable: true } ,
			rewritableLines: { value: 0 , writable: true , enumerable: true } ,
			redrawNextList: { value: null , writable: true , enumerable: true } ,
			statusLineStatus: { value: null , writable: true , enumerable: true } ,
			clearRoleListCallback: { value: null , writable: true , enumerable: true } ,
			clearNextListCallback: { value: null , writable: true , enumerable: true }
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

	//self.bus.on( 'splitRoles' , UI.splitRoles.bind( self ) ) ;
	self.bus.on( 'rejoinRoles' , UI.rejoinRoles.bind( self ) ) ;

	self.bus.on( 'wait' , UI.wait.bind( self ) ) ;
	self.bus.on( 'end' , UI.end.bind( self ) ) ;

	self.bus.on( 'exit' , UI.exit.bind( self ) , { async: true } ) ;

	term.grabInput( true ) ;

	term.on( 'key' , key => {
		switch ( key ) {
			case 'CTRL_C' :
				if ( self.inCommand ) { term.restoreCursor() ; }
				term.green( '\nCTRL-C received: quit...\n' ) ;
				term.processExit( 130 ) ;
				break ;
			case 'CTRL_S' :
				term.green( '\nSave state required...\n' ) ;
				self.bus.emit( 'saveState' ) ;
				break ;
			case 'TAB' :
				if ( self.inCommand ) { self.closeCommand() ; }
				else { self.openCommand() ; }
				break ;
		}
	} ) ;

	self.bus.emit( 'ready' ) ;

	return self ;
}

//UI.prototype = Object.create( Ngev.prototype ) ;
//UI.prototype.constructor = UI ;

module.exports = UI ;



function arrayGetById( id ) { return this.find( e => e.id === id ) ; }  // jshint ignore:line



UI.clientConfig = function( config ) {
	//term( 'Client config received: %Y' , config ) ;
	this.config = config ;
} ;



UI.user = function( user_ ) {
	//console.log( 'User received: ' , user_ ) ;
	this.user = user_ ;
} ;



UI.userList = function( users ) {
	//console.log( 'User-list received: ' , users ) ;

	// Add the get method to the array
	users.get = arrayGetById ;
	this.users = users ;
} ;



UI.roleList = function( roles , unassignedUsers , assigned ) {
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

	// If already in-game, nothing more to do...
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

	var draw = ( shouldRedrawLines_ ) => {

		if ( this.inCommand ) { this.blinkCommand() ; }

		this.uncontinue() ;

		if ( shouldRedrawLines_ ) { this.rewriteLines() ; }

		term( '\n' ) ;

		if ( assigned ) { term.brightGreen.inverse( 'ASSIGNED ROLES:' ) ; }
		else { term.inverse( 'SELECT A ROLE:' ) ; }

		term( '\n\n' ) ;

		roles.forEach( ( e , i ) => {
			charCount = 0 ;

			if ( ! assigned ) {
				term.brightBlue( '%s. ' , String.fromCharCode( 0x61 + i ) ) ;
				charCount += 3 ;
			}

			term.brightBlue( '%s' , e.name ) ;
			charCount += e.name.length ;

			if ( e.clientId !== null ) {
				userName = this.users.get( e.clientId ).name ;
				term.italic.dim( ' %s' , userName ) ;
				charCount += 1 + userName.length ;
			}

			term( '\n' ) ;

			this.rewritableLines += Math.floor( charCount / term.width ) + 1 ;
		} ) ;

		term( '\n' ) ;
		this.rewritableLines += 4 ;

		if ( assigned ) {
			term( '\n\n' ) ;
			this.rewritableLines = 0 ;
			return ;
		}

		if ( unassignedUsers.length ) {
			charCount = 8 ;
			str = unassignedUsers.map( e => this.users.get( e ).name ).join( ', ' ) ;
			charCount += str.length ;
			this.rewritableLines += Math.floor( charCount / term.width ) + 2 ;
			term( '^-Idling: ^/%s\n\n' , str ) ;
		}

		term.inverse( 'PRESS KEY a-' + String.fromCharCode( max ) + ' to select a role, or ESC/DELETE/BACKSPACE to cancel' ) ;
	} ;

	draw( shouldRedrawLines ) ;

	// Nothing more to do...
	if ( assigned ) { return ; }

	this.redrawNextList = () => {
		draw() ;
	} ;

	var clear = () => {
		term.column( 1 ).eraseLine() ;
		this.clearRoleListCallback = null ;
		term.off( 'key' , onKey ) ;
	} ;

	var onKey = ( name , matches , data ) => {

		if ( this.inCommand ) { return ; }

		if ( data.codepoint >= 0x61 && data.codepoint <= max ) {
			roleIndex = data.codepoint - 0x61 ;

			if ( roles[ roleIndex ].clientId !== null ) { return ; }

			clear() ;
			this.bus.emit( 'selectRole' , roles[ roleIndex ].id ) ;
		}
		else if ( name === 'ESC' || name === 'DELETE' || name === 'BACKSPACE' ) {
			clear() ;
			this.bus.emit( 'selectRole' , null ) ;
		}
	} ;

	this.clearRoleListCallback = clear ;
	term.on( 'key' , onKey ) ;
} ;



// Formated message emitted by the core engine, core execution continue
UI.coreMessage = function( ... args ) {
	if ( this.inCommand ) { this.blinkCommand() ; }
	this.uncontinue() ;
	term( ... args ) ;
} ;



// Error formated message, mostly emitted by the core engine, but may be emitted from the script
UI.errorMessage = function( ... args ) {
	if ( this.inCommand ) { this.blinkCommand() ; }
	this.uncontinue() ;
	term( ... args ) ;
} ;



// Script [message], execution can be suspended if the listener is async, waiting for completion.
// E.g.: possible use: wait for a user input before continuing processing.
UI.message = function( bookSourceText , options , callback ) {
	var triggered = false ,
		continuing = this.continued ,
		text = this.toQuickMarkup( bookSourceText ) ;

	if ( this.inCommand ) { this.blinkCommand() ; }

	if ( ! options ) { options = {} ; }

	this.continued = !! options.continue ;
	if ( ! options.continue ) { text += '\n' ; }

	var triggerCallback = () => {
		if ( triggered ) { return ; }
		triggered = true ;
		if ( options.next ) { this.messageNext( options.next , callback ) ; return ; }
		callback() ;
	} ;

	if ( options.slowTyping ) {
		if ( ! continuing ) { term.column( 1 ).eraseLine() ; }
		term.markupOnly.slowTyping( text , triggerCallback ) ;
		return ;
	}

	if ( this.afterNext ) {
		this.rewriteLines() ;
	}

	if ( ! continuing ) { term.column( 1 ).eraseLine() ; }
	term.wrapColumn() ;
	term.wrap.markupOnly( text ) ;

	if ( this.afterNext && this.redrawNextList ) { this.redrawNextList() ; }

	triggerCallback() ;
} ;



UI.prototype.messageNext = function( value , callback ) {
	var triggered = false ;

	var triggerCallback = () => {
		if ( triggered ) { return ; }

		triggered = true ;
		term.column( 1 ).eraseLineAfter() ;	//.eraseLine( '\n' ) ;
		term.off( 'key' , onKey ) ;
		callback() ;
	} ;

	var onKey = ( key ) => {
		if ( this.inCommand ) { return ; }

		if ( key === ' ' || key === 'ENTER' ) {
			triggerCallback() ;
		}
	} ;

	term.on( 'key' , onKey ) ;

	this.uncontinue() ;

	if ( typeof value === 'number' && isFinite( value ) && value > 0 ) {
		term.inverse( "WAIT OR PRESS SPACE / ENTER TO CONTINUE" ) ;
		setTimeout( triggerCallback , value * 1000 ) ;
	}
	else {
		term.inverse( "PRESS SPACE / ENTER TO CONTINUE" ) ;
	}
} ;



UI.indicators = function( data ) {
	if ( this.inCommand ) { this.blinkCommand() ; }

	this.uncontinue() ;
	term.column( 1 ).eraseLine() ;

	UI.displayIndicators( data ) ;

	if ( this.afterNext && this.redrawNextList ) { this.redrawNextList() ; }
} ;



UI.status = function( data ) {
	this.statusLineStatus = UI.statusString( data ) ;
} ;



UI.displayIndicators = ClassicUI.displayIndicators ;
UI.statusString = ClassicUI.statusString ;



// 'enterScene' event
UI.enterScene = function( isGosub , toAltBuffer ) {
	this.inGame = true ;
	this.afterNext = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function( isReturn , backToMainBuffer ) {
	//if ( ! this.afterNext ) { term( '\n' ) ; }
} ;



UI.nextList = function( nexts , undecidedRoleIds , options , isUpdate ) {
	var nextIndex , str , charCount ,
		max = 0x61 + nexts.length - 1 ,
		timer = null , timeStr = '' , startTime ;

	this.uncontinue() ;
	startTime = Date.now() ;

	//console.log( 'nextList received:' , nexts ) ;

	this.nexts = nexts ;
	this.afterNext = true ;
	this.lastNextListEvent = Array.from( arguments ) ;	// eslint-disable-line

	if ( this.clearNextListCallback ) { this.clearNextListCallback() ; }

	if ( isUpdate ) {
		if ( this.roles.length === 1 ) { return ; }	// No need to update if we are alone
		this.rewriteLines() ;
	}
	else {
		// Reset rewritable lines
		this.rewritableLines = 0 ;
	}

	var drawTimer = () => {
		if ( this.inCommand ) { this.blinkCommand() ; }
		if ( timeStr.length ) { term.left( timeStr.length ) ; }
		term.eraseLineAfter() ;
		timeStr = ' ' + Math.round( ( options.timeout + startTime - Date.now() ) / 1000 ) + 's' ;
		term( timeStr ) ;
	} ;

	var draw = () => {

		if ( this.inCommand ) { this.blinkCommand() ; }

		term( '\n' ) ;

		if ( nexts.length === 1 ) {
			if ( nexts[ 0 ].label ) {
				term.wrap.brightBlue( 'Next: %s\n' , nexts[ 0 ].label ) ;
				charCount += 6 + nexts[ 0 ].label.length ;
				this.rewritableLines += Math.floor( charCount / term.width ) + 1 ;
			}
			else {
				term.wrap.brightBlue( 'Next.\n' ) ;
				this.rewritableLines ++ ;
			}
		}
		else {
			nexts.forEach( ( next , i ) => {
				term.wrap.brightBlue( '%s. %s' , String.fromCharCode( 0x61 + i ) , next.label ) ;

				charCount = 3 + next.label.length ;

				if ( this.roles.length > 1 && Array.isArray( next.roleIds ) && next.roleIds.length ) {
					str = next.roleIds.map( e => this.roles.get( e ).name ).join( ', ' ) ;
					term.wrap.dim.italic( " %s" , str ) ;
					charCount += 1 + str.length ;
				}

				term( '\n' ) ;

				this.rewritableLines += Math.floor( charCount / term.width ) + 1 ;
			} ) ;
		}

		term( '\n' ) ;
		this.rewritableLines += 2 ;

		if ( this.statusLineStatus ) {
			if ( termkit.stringWidth( this.statusLineStatus ) > term.width ) {
				term( termkit.truncateString( this.statusLineStatus , term.width - 1 ) ) ;
				term.styleReset( '…' ) ;
			}
			else {
				term( this.statusLineStatus ) ;
				term.styleReset() ;
			}

			term( '\n' ) ;
			this.rewritableLines ++ ;
		}

		if ( undecidedRoleIds.length && this.roles.length > 1 ) {
			charCount = 9 ;
			str = undecidedRoleIds.map( e => this.roles.get( e ).name ).join( ', ' ) ;
			charCount += str.length ;
			this.rewritableLines += Math.floor( charCount / term.width ) + 2 ;
			term( '^-Waiting: ^/%s\n\n' , str ) ;
		}

		if ( nexts.length === 1 ) {
			term.inverse( 'PRESS SPACE OR ENTER TO CONTINUE' ) ;
		}
		else {
			term.inverse( 'PRESS KEY a-' + String.fromCharCode( max ) + ' to select a choice, or ESC/DELETE/BACKSPACE to cancel' ) ;
		}

		if ( options.timeout !== undefined ) { drawTimer() ; }
	} ;

	draw() ;

	this.redrawNextList = () => {
		draw() ;
	} ;

	if ( options.timeout !== undefined ) { timer = setInterval( drawTimer , 1000 ) ; }

	var clear = () => {
		this.clearNextListCallback = null ;
		term.column( 1 ).eraseLine() ;
		if ( this.statusLineStatus ) { term.up.eraseLine( 1 ) ; }
		if ( timer !== null ) { clearInterval( timer ) ; timer = null ; }
		term.off( 'key' , onKey ) ;
	} ;

	var onKey = ( name , matches , data ) => {

		if ( this.inCommand ) { return ; }

		if ( nexts.length === 1 && ( name === ' ' || name === 'ENTER' ) ) {
			term.column( 1 ).eraseLine() ;
			clear() ;
			this.bus.emit( 'selectNext' , nexts[ 0 ].id ) ;
		}
		else if ( nexts.length > 1 && data.codepoint >= 0x61 && data.codepoint <= max ) {
			term.column( 1 ).eraseLine() ;
			nextIndex = data.codepoint - 0x61 ;
			clear() ;
			this.bus.emit( 'selectNext' , nexts[ nextIndex ].id ) ;
		}
		else if ( name === 'ESC' || name === 'DELETE' || name === 'BACKSPACE' ) {
			term.column( 1 ).eraseLine() ;
			clear() ;
			this.bus.emit( 'selectNext' , null ) ;
		}
	} ;

	this.clearNextListCallback = clear ;
	term.on( 'key' , onKey ) ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function( nextId , roleIds , special ) {
	this.uncontinue() ;
	this.afterNext = false ;

	//console.warn( 'nextTriggered received:' , this.nexts , "\n\n\n\n\n" ) ;

	var nextIndex = this.nexts.findIndex( e => e.id === nextId ) ;

	if ( this.inCommand ) { this.blinkCommand() ; }

	if ( this.clearNextListCallback ) { this.clearNextListCallback() ; }

	if ( nextIndex !== -1 && ( this.nexts.length > 1 || this.nexts[ nextIndex ].label ) ) {
		term.wrapColumn() ;
		term.wrap.bold.cyan( "> %s. %s" , String.fromCharCode( 0x61 + nextIndex ) , this.nexts[ nextIndex ].label ) ;

		if ( this.roles.length > 1 && Array.isArray( roleIds ) && roleIds.length ) {
			term.wrap.dim.italic( " %s" , roleIds.map( e => this.roles.get( e ).name ).join( ', ' ) ) ;
		}

		switch ( special ) {
			case 'auto' :
				term.wrap.red( ' AUTO' ) ;
				break ;
		}

		term( '\n\n\n' ) ;
	}
} ;



// External raw output (e.g. shell command stdout)
UI.extOutput = function( output ) {
	if ( this.inCommand ) { this.blinkCommand() ; }
	this.uncontinue() ;
	process.stdout.write( output ) ;
} ;



// External raw error output (e.g. shell command stderr)
UI.extErrorOutput = function( output ) {
	if ( this.inCommand ) { this.blinkCommand() ; }
	this.uncontinue() ;
	process.stderr.write( output ) ;
} ;



// Text input field
UI.textInput = function( label , grantedRoleIds ) {
	if ( this.inCommand ) { this.blinkCommand( true ) ; }

	this.uncontinue() ;

	if ( label ) { term( label ) ; }

	var options = {
		//style: term.bgBrightBlack ,
		history: this.inputHistory
		//autoComplete: autoComplete ,
		//autoCompleteMenu: true ,
		//maxLength: 3
	} ;

	if ( grantedRoleIds.indexOf( this.roleId ) === -1 ) {
		// Not granted!
		term.inverse( "YOU CAN'T RESPOND - WAIT..." )( '\n' ) ;
		return ;
	}

	//term.bgGray.eraseLineAfter( '> ' ) ;
	term.bold.brightWhite( '> ' ) ;

	this.inInput = true ;

	term.inputField( options , ( error , input ) => {
		this.inInput = false ;
		if ( ! error && input ) { this.inputHistory.push( input ) ; }
		term( '\n' ) ;
		term.saveCursor() ;
		if ( error ) { this.bus.emit( error ) ; }
		else { this.bus.emit( 'textSubmit' , input ) ; }
	} ) ;
} ;



UI.prototype.openCommand = function() {
	// Already in the command prompt
	if ( this.inCommand || this.inInput ) { return ; }

	this.inCommand = true ;
	term.saveCursor() ;

	term.moveTo( 1 , 1 ).eraseLine()
		.bgBrightBlack( '> ' ) ;

	if ( this.commandInput ) {
		this.commandInput.resume() ;
		this.commandInput.show() ;
		return ;
	}

	this.commandInput = term.inputField( { style: term.bgGray , history: this.commandHistory } , ( error , input ) => {
		this.commandHistory.push( input ) ;
		term.moveTo( 1 , 1 ).eraseLine() ;
		term.restoreCursor() ;
		this.commandInput = null ;
		this.inCommand = false ;	// Set it to false, or openCommand() will not open anything

		// Only send if there was actually some input
		if ( ! error && input ) {
			this.bus.emit( this.inGame ? 'command' : 'chat' , input ) ;
		}

		this.openCommand() ;
	} ) ;
} ;



UI.prototype.closeCommand = function() {
	// Not in the command prompt
	if ( ! this.inCommand ) { return ; }

	this.commandInput.pause() ;
	this.commandInput.hide() ;
	term.moveTo( 1 , 1 ).eraseLine() ;
	term.restoreCursor() ;
	this.inCommand = false ;
} ;



// Make sure the command doesn't get in the way, when outputing something is needed...
UI.prototype.blinkCommand = function( closeAfterBlinking ) {
	if ( closeAfterBlinking ) {
		this.closeAfterBlinking = true ;
		this.inCommand = false ;
	}

	// Already in the command
	if ( ! this.inCommand || this.isBlinkingCommand ) { return ; }

	this.isBlinkingCommand = true ;

	//term.moveTo( 1 , 1 ).eraseLine() ;
	this.commandInput.pause() ;
	this.commandInput.hide() ;
	term.moveTo( 1 , 1 ).eraseLine() ;
	term.restoreCursor() ;

	process.nextTick( () => {

		term.saveCursor() ;

		if ( ! this.closeAfterBlinking && this.inCommand ) {
			term.moveTo( 1 , 1 ).eraseLine()
				.bgBrightBlack( '> ' ) ;
			this.commandInput.resume() ;
			this.commandInput.show() ;
		}

		this.closeAfterBlinking = false ;
		this.isBlinkingCommand = false ;
	} ) ;
} ;



// rejoinRoles event (probably better to listen to that event before using it in the 'wait' event)
UI.rejoinRoles = function() {} ;



UI.wait = function( what ) {
	//term( '\n' ) ;
	if ( this.inCommand ) { this.blinkCommand() ; }
	this.uncontinue() ;

	switch ( what ) {
		case 'otherBranches' :
			term.cyan.inverse( 'WAITING FOR OTHER BRANCHES TO FINISH...' ) ;
			this.bus.once( 'rejoinRoles' , () => { term.column( 1 ).eraseLine() ; } ) ;
			break ;
		default :
			term.cyan.inverse( 'WAITING FOR ' + what ) ;
	}

	//this.rewritableLines = 2 ;
} ;



// end event
UI.end = function( result , data ) {
	if ( this.inCommand ) { this.blinkCommand() ; }
	this.uncontinue() ;
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
UI.exit = function( code , timeout , callback ) {
	if ( this.inCommand ) {
		this.closeCommand() ;
		term.restoreCursor() ;
	}

	term.styleReset() ;
	term.grabInput( false ) ;
	term.column( 1 ).eraseLine() ;
	setTimeout( callback , 100 ) ;
} ;



UI.prototype.rewriteLines = function() {
	if ( this.inCommand ) { this.blinkCommand() ; }
	term.eraseLine() ;
	for ( ; this.rewritableLines ; this.rewritableLines -- ) { term.up( 1 ).eraseLine() ; }
	term.column( 1 ) ;
} ;



// Manage message with the continue flag with nothing after
UI.prototype.uncontinue = function() {
	if ( ! this.continued ) { return ; }
	this.continued = false ;
	term( "\n" ) ;
} ;



UI.prototype.toQuickMarkup = function( text ) {
	var structuredDocument = bookSource.parse( text ) ;
	var rendered = structuredDocument.render( quickMarkupRenderer ) ;
	//console.error( "bob:" , rendered ) ;
	rendered = rendered.trim() ;
	return rendered ;
} ;

