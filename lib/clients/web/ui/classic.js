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



/* global alert */

var Dom = require( '../Dom.js' ) ;
// var treeExtend = require( 'tree-kit/lib/extend.js' ) ;
// var treeOps = require( 'kung-fig/lib/treeOps.js' ) ;
var toolkit = require( '../toolkit.js' ) ;



function UI( bus , client , self )
{
	console.log( Array.from( arguments ) ) ;

	if ( ! self )
	{
		self = Object.create( UI.prototype , {
			bus: { value: bus , enumerable: true } ,
			client: { value: client , enumerable: true } ,
			user: { value: null , writable: true , enumerable: true } ,
			users: { value: null , writable: true , enumerable: true } ,
			roles: { value: null , writable: true , enumerable: true } ,
			roleId: { value: null , writable: true , enumerable: true } ,
			config: { value: null , writable: true , enumerable: true } ,
			inGame: { value: false , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			afterNextTriggered: { value: false , writable: true , enumerable: true } ,
			afterLeave: { value: false , writable: true , enumerable: true } ,
			hasNewContent: { value: false , writable: true , enumerable: true } ,
			dom: { value: Dom.create() } ,
		} ) ;
	}

	self.client.once( 'connecting' , UI.clientConnecting.bind( self ) ) ;
	self.client.once( 'open' , UI.clientOpen.bind( self ) ) ;
	self.client.once( 'close' , UI.clientClose.bind( self ) ) ;
	self.client.on( 'error' , UI.clientError.bind( self ) ) ;
	
	
	self.dom.enableChat( function( message ) {
		console.log( 'inGame?' , self.inGame ) ;
		self.bus.emit( self.inGame ? 'command' : 'chat' , message ) ;
	} ) ;

	return self ;
}

module.exports = UI ;



function arrayGetById( id ) { return this.find( function( e ) { return e.id === id ; } ) ; }	// jshint ignore:line



// 'open' event on client
UI.prototype.initBus = function initBus()
{
	this.bus.on( 'clientConfig' , UI.clientConfig.bind( this ) ) ;
	this.bus.on( 'user' , UI.user.bind( this ) ) ;
	this.bus.on( 'userList' , UI.userList.bind( this ) ) ;
	this.bus.on( 'roleList' , UI.roleList.bind( this ) ) ;

	//this.bus.on( 'coreMessage' , UI.coreMessage.bind( this ) ) ;
	//this.bus.on( 'errorMessage' , UI.errorMessage.bind( this ) ) ;
	this.bus.on( 'extOutput' , UI.extOutput.bind( this ) ) ;
	this.bus.on( 'extErrorOutput' , UI.extErrorOutput.bind( this ) ) ;

	this.bus.on( 'message' , UI.message.bind( this ) , { async: true } ) ;
	this.bus.on( 'indicators' , UI.indicators.bind( this ) ) ;
	this.bus.on( 'status' , UI.status.bind( this ) ) ;

	this.bus.on( 'theme' , UI.theme.bind( this ) ) ;
	this.bus.on( 'image' , UI.image.bind( this ) ) ;
	this.bus.on( 'sound' , UI.sound.bind( this ) ) ;
	this.bus.on( 'music' , UI.music.bind( this ) ) ;

	this.bus.on( 'defineAnimation' , UI.defineAnimation.bind( this ) ) ;

	this.bus.on( 'showSprite' , UI.showSprite.bind( this ) ) ;
	this.bus.on( 'updateSprite' , UI.prototype.updateSprite.bind( this ) ) ;
	this.bus.on( 'animateSprite' , UI.animateSprite.bind( this ) ) ;
	this.bus.on( 'clearSprite' , UI.clearSprite.bind( this ) ) ;

	this.bus.on( 'enterScene' , UI.enterScene.bind( this ) ) ;
	this.bus.on( 'leaveScene' , UI.leaveScene.bind( this ) ) ;
	this.bus.on( 'nextList' , UI.nextList.bind( this ) ) ;
	this.bus.on( 'nextTriggered' , UI.nextTriggered.bind( this ) ) ;

	this.bus.on( 'textInput' , UI.textInput.bind( this ) ) ;

	//this.bus.on( 'split' , UI.split.bind( this ) ) ;
    this.bus.on( 'rejoin' , UI.rejoin.bind( this ) ) ;

    this.bus.on( 'wait' , UI.wait.bind( this ) ) ;
    this.bus.on( 'end' , UI.end.bind( this ) , { async: true } ) ;

	this.bus.on( 'exit' , UI.exit.bind( this ) ) ;

	this.bus.emit( 'ready' ) ;
} ;



UI.clientConnecting = function clientConnecting()
{
	console.log( 'Connecting!' ) ;
	this.dom.clientStatus( 'connecting...' , { color: 'blue' } ) ;
} ;



UI.clientOpen = function clientOpen()
{
	console.log( 'Connected!' ) ;
	this.dom.clientStatus( 'connected' , { color: 'green' } ) ;
	this.initBus() ;
	
	/*
	this.dom.setDialog( 'Yo!' , { modal: true , big: true , fun: true , slow: true } ) ;
	setTimeout( () => {
		this.dom.setDialog( 'Yo2!' , { modal: true , big: true , fun: true , slow: true } ) ;
	} , 5000 ) ;
	//*/
} ;



UI.clientClose = function clientClose()
{
	console.log( 'Closed!' ) ;
	this.dom.clientStatus( 'connection closed' , { color: 'red' , alert: true } ) ;
} ;



UI.clientError = function clientError( code )
{
	switch ( code )
	{
		case 'unreachable' :
			this.dom.clientStatus( 'server unreachable' , { color: 'red' , alert: true } ) ;
			break ;
	}
} ;



UI.clientConfig = function clientConfig( config )
{
	console.warn( 'Client config received: ' , config ) ;
	this.config = config ;

	if ( this.config.theme )
	{
		this.dom.setTheme( this.config.theme ) ;
	}
} ;



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
	var self = this , choices = [] , undecidedNames ;

	// If there are many roles, this is a multiplayer game
	if ( ! this.roles && roles.length > 1 ) { this.dom.setMultiplayer( true ) ; }
	
	// Add the get method to the array
	roles.get = arrayGetById ;

	this.roles = roles ;

	// If already in-game, nothing more to do...
	if ( this.inGame ) { return ; }

	if ( assigned && roles.length <= 1 )
	{
		// Nothing to do and nothing to display...
		this.roleId = roles[ 0 ].id ;
		return ;
	}

	roles.forEach( function( role , i ) {

		var userName = role.clientId && self.users.get( role.clientId ).name ;

		choices.push( {
			index: i ,
			label: role.label ,
			type: 'role' ,
			selectedBy: userName && [ userName ]
		} ) ;
	} ) ;

	if ( unassignedUsers.length )
	{
		undecidedNames = unassignedUsers.map( function( e ) { return self.users.get( e ).name ; } ) ;
	}

	var onSelect = function( index ) {

		if ( roles[ index ].clientId === self.user.id )
		{
			// Here we want to unassign
			self.bus.emit( 'selectRole' , null ) ;
		}
		else if ( roles[ index ].clientId !== null )
		{
			// Already holded by someone else
			return ;
		}
		else
		{
			self.bus.emit( 'selectRole' , index ) ;
		}
	} ;

	this.dom.setChoices( choices , undecidedNames , onSelect ) ;

	if ( assigned )
	{
		roles.find( function( e , i ) {
			if ( e.clientId === self.user.id ) { self.roleId = e.id ; return true ; }
			return false ;
		} ) ;

		this.afterLeave = true ;	// tmp
		return ;
	}
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

	this.hasNewContent = true ;
	
	text = toolkit.markup( text ) ;

	if ( ! options ) { options = {} ; }

	var triggerCallback = function triggerCallback() {
		if ( triggered ) { return ; }
		triggered = true ;
		if ( options.next ) { self.messageNext( callback ) ; return ; }
		callback() ;
	} ;

	this.dom.addMessage( text , options , triggerCallback ) ;
} ;



UI.prototype.messageNext = function messageNext( callback )
{
	this.dom.messageNext( callback ) ;
} ;



UI.indicators = function indicators( data )
{
	this.dom.addIndicators( data ) ;
} ;



UI.status = function status( data )
{
} ;



// 'enterScene' event
UI.enterScene = function enterScene( isGosub , toAltBuffer )
{
	this.inGame = true ;
	
	if ( toAltBuffer ) { this.dom.toAltBuffer() ; }
	else if ( ! isGosub ) { this.dom.newSegmentOnContent() ; }
	
	this.afterNext = this.afterLeave = this.afterNextTriggered = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene( isReturn , backToMainBuffer )
{
	if ( backToMainBuffer ) { this.dom.toMainBuffer() ; }
	//else { this.dom.newSegmentOnContent() ; }
	
	// if ( isReturn ) {}
	
	this.afterNext = this.afterNextTriggered = false ;
	this.afterLeave = true ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered()
{
	this.afterNextTriggered = true ;
	this.hasNewContent = false ;
	//this.dom.clearMessages() ;
	this.dom.clearChoices() ;
} ;



UI.nextList = function nextList( nexts , grantedRoleIds , undecidedRoleIds , options , isUpdate )
{
	var self = this , choices = [] , undecidedNames , charCount = 0 ;

	this.nexts = nexts ;
	this.afterNext = true ;

	// No need to update if we are alone
	if ( isUpdate && this.roles.length === 1 ) { return ; }

	nexts.forEach( function( next , i ) {

		var roles = next.roleIds.map( function( id ) { return self.roles.get( id ).label ; } ) ;
		
		if ( next.label ) { charCount += next.label.length ; }

		choices.push( {
			index: i ,
			label: next.label || 'Next' ,
			image: next.image ,
			groupBreak: !! next.groupBreak ,
			//orderedList: nexts.length > 1 ,
			type: 'next' ,
			selectedBy: roles
		} ) ;
	} ) ;
	
	if ( ! options.style || options.style === 'auto' )
	{
		if ( this.roles.length <= 1 && choices.length <= 3 && charCount < 20 )
		{
			options.style = 'inline' ;
		}
		else if ( choices.length > 8 )
		{
			options.style = 'smallList' ;
		}
		else
		{
			options.style = 'list' ;
		}
	}
	
	if ( undecidedRoleIds.length && this.roles.length )
	{
		undecidedNames = undecidedRoleIds.map( function( e ) { return self.roles.get( e ).label ; } ) ;
	}

	var onSelect = function( index ) {
		if ( nexts[ index ].roleIds.indexOf( self.roleId ) !== -1 )
		{
			self.bus.emit( 'selectNext' , null ) ;
		}
		else
		{
			self.bus.emit( 'selectNext' , index ) ;
		}
	} ;
	
	this.dom.setChoices( choices , undecidedNames , onSelect , { timeout: options.timeout , style: options.style } ) ;
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
UI.textInput = function textInput( label , grantedRoleIds )
{
	var self = this ,
		options = {
			label: label
		} ;

	if ( grantedRoleIds.indexOf( this.roleId ) === -1 )
	{
		options.placeholder = 'YOU CAN\'T RESPOND - WAIT...' ;
		this.dom.textInputDisabled( options ) ;
	}
	else
	{
		this.dom.textInput( options , function( text ) {
			self.bus.emit( 'textSubmit' , text ) ;
		} ) ;
	}
} ;



// rejoin event
UI.rejoin = function rejoin() {} ;



UI.wait = function wait( what )
{
	var self = this ;

	switch ( what )
	{
		case 'otherBranches' :
			this.dom.setBigHint( "WAITING FOR OTHER BRANCHES TO FINISH..." , { wait: true , "pulse-animation": true } ) ;
			this.bus.once( 'rejoin' , function() { self.dom.clearHint() ; } ) ;
			break ;
		default :
			this.dom.setBigHint( "WAITING FOR " + what , { wait: true , "pulse-animation": true } ) ;
	}
} ;



UI.theme = function theme( data )
{
	if ( ! data.url )
	{
		if ( this.config.theme ) { this.dom.setTheme( this.config.theme ) ; }
		return ;
	}
	
	this.dom.setTheme( data ) ;
} ;



UI.image = function image( data )
{
	this.dom.setSceneImage( data ) ;
} ;



UI.defineAnimation = function defineAnimation( id , data )
{
	this.dom.defineAnimation( id , data ) ;
} ;



UI.showSprite = function showSprite( id , data )
{
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	data.actionCallback = UI.spriteActionCallback.bind( this ) ;

	this.dom.showSprite( id , data ) ;
} ;



UI.spriteActionCallback = function spriteActionCallback( action )
{
	console.warn( "action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.prototype.updateSprite = function updateSprite( id , data )
{
	this.dom.updateSprite( id , data ) ;
} ;



UI.animateSprite = function animateSprite( spriteId , animationId )
{
	this.dom.animateSprite( spriteId , animationId ) ;
} ;



UI.clearSprite = function clearSprite( id )
{
	this.dom.clearSprite( id ) ;
} ;



UI.sound = function sound( data )	// maybe? , callback )
{
	this.dom.sound( data ) ;
} ;



UI.music = function music( data )
{
	this.dom.music( data ) ;
} ;



// Exit event
/*
UI.end = function end( result , data )
{
	switch ( result )
	{
		case 'end' :
			this.dom.setBigHint( 'The End.' , { end: true } ) ;
			break ;
		case 'win' :
			this.dom.setBigHint( 'You Win!' , { end: true , win: true } ) ;
			break ;
		case 'lost' :
			this.dom.setBigHint( 'You Lose...' , { end: true , lost: true } ) ;
			break ;
		case 'draw' :
			this.dom.setBigHint( 'Draw.' , { end: true , draw: true } ) ;
			break ;
	}
	
} ;
*/

UI.end = function end( result , data , callback )
{
	// /!\ this.afterNext is not the good way to detect extra content...
	var options = { modal: true , big: true , fun: true , contentDelay: this.hasNewContent , slow: true } ;
	
	switch ( result )
	{
		case 'end' :
			this.dom.setDialog( 'The End.' , options , callback ) ;
			break ;
		case 'win' :
			this.dom.setDialog( 'You Win!' , options , callback ) ;
			break ;
		case 'lost' :
			this.dom.setDialog( 'You Lose...' , options , callback ) ;
			break ;
		case 'draw' :
			this.dom.setDialog( 'Draw.' , options , callback ) ;
			break ;
	}
} ;



// Exit event
UI.exit = function exit()
{
	//term( "\n" ) ;
	//term.styleReset() ;
} ;
