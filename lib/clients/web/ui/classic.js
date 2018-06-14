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

/* global alert */



var Ngev = require( 'nextgen-events/lib/browser.js' ) ;
var Dom = require( '../Dom.js' ) ;
// var treeExtend = require( 'tree-kit/lib/extend.js' ) ;
// var treeOps = require( 'kung-fig/lib/treeOps.js' ) ;
var toolkit = require( '../toolkit.js' ) ;



function UI( bus , client ) {
	console.log( Array.from( arguments ) ) ;	// eslint-disable-line

	this.bus = bus ;
	this.client = client ;
	this.user = null ;
	this.users = null ;
	this.roles = null ;
	this.roleId = null ;
	this.config = null ;
	this.inGame = false ;
	this.nexts = null ;
	this.afterNext = false ;
	this.afterNextTriggered = false ;
	this.afterLeave = false ;
	this.hasNewContent = false ;
	this.dom = new Dom() ;
	this.ended = false ;

	this.client.once( 'connecting' , UI.clientConnecting.bind( this ) ) ;
	this.client.once( 'open' , UI.clientOpen.bind( this ) ) ;
	this.client.once( 'close' , UI.clientClose.bind( this ) ) ;
	this.client.on( 'error' , UI.clientError.bind( this ) ) ;

	this.dom.enableChat( ( message ) => {
		console.log( 'inGame?' , this.inGame ) ;
		this.bus.emit( this.inGame ? 'command' : 'chat' , message ) ;
	} ) ;

	this.dom.preload() ;
}

module.exports = UI ;

UI.prototype = Object.create( Ngev.prototype ) ;
UI.prototype.constructor = UI ;



function arrayGetById( id ) { return this.find( ( e ) => { return e.id === id ; } ) ; }	// jshint ignore:line



// 'open' event on client
UI.prototype.initBus = function initBus() {
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
	this.bus.on( 'panel' , UI.panel.bind( this ) ) ;

	this.bus.on( 'theme' , UI.theme.bind( this ) ) ;
	this.bus.on( 'image' , UI.image.bind( this ) ) ;
	this.bus.on( 'sound' , UI.sound.bind( this ) ) ;
	this.bus.on( 'music' , UI.music.bind( this ) ) ;

	this.bus.on( 'defineAnimation' , UI.defineAnimation.bind( this ) ) ;

	this.bus.on( 'showSprite' , UI.showSprite.bind( this ) ) ;
	this.bus.on( 'updateSprite' , UI.updateSprite.bind( this ) ) ;
	this.bus.on( 'animateSprite' , UI.animateSprite.bind( this ) ) ;
	this.bus.on( 'clearSprite' , UI.clearSprite.bind( this ) ) ;

	this.bus.on( 'showUi' , UI.showUi.bind( this ) ) ;
	this.bus.on( 'updateUi' , UI.updateUi.bind( this ) ) ;
	this.bus.on( 'animateUi' , UI.animateUi.bind( this ) ) ;
	this.bus.on( 'clearUi' , UI.clearUi.bind( this ) ) ;

	this.bus.on( 'showMarker' , UI.showMarker.bind( this ) ) ;
	this.bus.on( 'updateMarker' , UI.updateMarker.bind( this ) ) ;
	this.bus.on( 'animateMarker' , UI.animateMarker.bind( this ) ) ;
	this.bus.on( 'clearMarker' , UI.clearMarker.bind( this ) ) ;

	this.bus.on( 'showCard' , UI.showCard.bind( this ) ) ;
	this.bus.on( 'updateCard' , UI.updateCard.bind( this ) ) ;
	this.bus.on( 'animateCard' , UI.animateCard.bind( this ) ) ;
	this.bus.on( 'clearCard' , UI.clearCard.bind( this ) ) ;

	this.bus.on( 'enterScene' , UI.enterScene.bind( this ) ) ;
	this.bus.on( 'leaveScene' , UI.leaveScene.bind( this ) ) ;
	this.bus.on( 'nextList' , UI.nextList.bind( this ) ) ;
	this.bus.on( 'nextTriggered' , UI.nextTriggered.bind( this ) ) ;

	this.bus.on( 'textInput' , UI.textInput.bind( this ) ) ;

	//this.bus.on( 'split' , UI.split.bind( this ) ) ;
	this.bus.on( 'rejoin' , UI.rejoin.bind( this ) ) ;

	this.bus.on( 'pause' , UI.pause.bind( this ) ) ;
	this.bus.on( 'unpause' , UI.unpause.bind( this ) ) ;

	this.bus.on( 'wait' , UI.wait.bind( this ) ) ;
	this.bus.on( 'end' , UI.end.bind( this ) , { async: true } ) ;

	this.bus.on( 'custom' , UI.custom.bind( this ) ) ;

	this.bus.on( 'exit' , UI.exit.bind( this ) , { async: true } ) ;

	this.bus.emit( 'ready' ) ;

	this.defineStates( 'end' ) ;
} ;



UI.clientConnecting = function clientConnecting() {
	console.log( 'Connecting!' ) ;
	this.dom.clientStatus( 'connecting' ) ;
} ;



UI.clientOpen = function clientOpen() {
	console.log( 'Connected!' ) ;
	this.dom.clientStatus( 'connected' ) ;
	this.initBus() ;

	/*
	this.dom.setDialog( 'Yo!' , { modal: true , big: true , fun: true , slow: true } ) ;
	setTimeout( () => {
		this.dom.setDialog( 'Yo2!' , { modal: true , big: true , fun: true , slow: true } ) ;
	} , 5000 ) ;
	//*/
} ;



UI.clientClose = function clientClose() {
	console.log( 'Closed!' ) ;
	this.dom.clientStatus( 'closed' ) ;
} ;



UI.clientError = function clientError( code ) {
	switch ( code ) {
		case 'unreachable' :
			this.dom.clientStatus( 'unreachable' ) ;
			break ;
	}
} ;



UI.clientConfig = function clientConfig( config ) {
	console.warn( 'Client config received: ' , config ) ;
	this.config = config ;

	if ( this.config.theme ) {
		this.dom.setTheme( this.config.theme ) ;
	}
} ;



UI.user = function user( user_ ) {
	console.log( 'User received: ' , user_ ) ;
	this.user = user_ ;
} ;



UI.userList = function userList( users ) {
	console.log( 'User-list received: ' , users ) ;

	// Add the get method to the array
	users.get = arrayGetById ;
	this.users = users ;
} ;



UI.roleList = function roleList( roles , unassignedUsers , assigned ) {
	var choices = [] , undecidedNames ;

	// If there are many roles, this is a multiplayer game
	if ( ! this.roles && roles.length > 1 ) { this.dom.setMultiplayer( true ) ; }

	// Add the get method to the array
	roles.get = arrayGetById ;

	this.roles = roles ;

	// If already in-game, nothing more to do...
	if ( this.inGame ) { return ; }

	if ( assigned && roles.length <= 1 ) {
		// Nothing to do and nothing to display...
		this.roleId = roles[ 0 ].id ;
		return ;
	}

	roles.forEach( ( role , i ) => {

		var userName = role.clientId && this.users.get( role.clientId ).name ;

		choices.push( {
			index: i ,
			label: role.name ,
			type: 'role' ,
			selectedBy: userName && [ userName ]
		} ) ;
	} ) ;

	if ( unassignedUsers.length ) {
		undecidedNames = unassignedUsers.map( ( e ) => { return this.users.get( e ).name ; } ) ;
	}

	var onSelect = ( index ) => {

		if ( roles[ index ].clientId === this.user.id ) {
			// Here we want to unassign
			this.bus.emit( 'selectRole' , null ) ;
		}
		else if ( roles[ index ].clientId !== null ) {
			// Already holded by someone else
			return ;
		}
		else {
			this.bus.emit( 'selectRole' , index ) ;
		}
	} ;

	this.dom.setChoices( choices , undecidedNames , onSelect ) ;

	if ( assigned ) {
		roles.find( ( e , i ) => {
			if ( e.clientId === this.user.id ) { this.roleId = e.id ; return true ; }
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
UI.message = function message( text , options , callback ) {
	var triggered = false ;

	this.hasNewContent = true ;

	text = toolkit.markup( text ) ;

	if ( ! options ) { options = {} ; }

	this.dom.addMessage( text , options , callback ) ;
} ;



UI.indicators = function indicators( data ) {
	this.dom.addIndicators( data ) ;
} ;



UI.status = function status( data ) {
	this.dom.addIndicators( data , true ) ;
} ;



UI.panel = function panel( data , reset ) {
	this.dom.addPanel( data , reset ) ;
} ;



// 'enterScene' event
UI.enterScene = function enterScene( isGosub , toAltBuffer ) {
	var switchedToAltBuffer ;

	this.inGame = true ;

	if ( toAltBuffer ) {
		switchedToAltBuffer = this.dom.toAltBuffer() ;
	}

	if ( ! isGosub && ! switchedToAltBuffer ) {
		this.dom.newSegmentOnContent() ;
	}

	this.afterNext = this.afterLeave = this.afterNextTriggered = false ;
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene( isReturn , backToMainBuffer ) {
	if ( backToMainBuffer ) { this.dom.toMainBuffer() ; }
	//else { this.dom.newSegmentOnContent() ; }

	// if ( isReturn ) {}

	this.afterNext = this.afterNextTriggered = false ;
	this.afterLeave = true ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function nextTriggered( nextIndex ) {
	var selected = this.nexts[ nextIndex ] ;

	this.dom.newSegmentOnContent( 'inter-segment' ) ;

	if ( selected.label && ! selected.button ) {
		this.dom.addSelectedChoice( selected.label ) ;
	}

	this.dom.clearChoices() ;
	this.afterNextTriggered = true ;
	this.hasNewContent = false ;
} ;



UI.nextList = function nextList( nexts , grantedRoleIds , undecidedRoleIds , options , isUpdate ) {
	var choices = [] , undecidedNames , charCount = 0 ;

	this.nexts = nexts ;
	this.afterNext = true ;

	// No need to update if we are alone
	if ( isUpdate && this.roles.length === 1 ) { return ; }

	nexts.forEach( ( next , i ) => {

		var roles = next.roleIds.map( id => { return this.roles.get( id ).name ; } ) ;

		if ( next.label ) { charCount += next.label.length ; }

		choices.push( {
			index: i ,
			label: next.label || 'Next' ,
			style: next.style ,
			class: next.class ,
			image: next.image ,
			button: next.button ,
			groupBreak: !! next.groupBreak ,
			//orderedList: nexts.length > 1 ,
			type: 'next' ,
			selectedBy: roles
		} ) ;
	} ) ;

	if ( ! options.nextStyle || options.nextStyle === 'auto' ) {
		if ( this.roles.length <= 1 && choices.length <= 3 && charCount < 20 ) {
			options.nextStyle = 'inline' ;
		}
		else if ( choices.length > 8 ) {
			options.nextStyle = 'smallList' ;
		}
		else {
			options.nextStyle = 'list' ;
		}
	}

	if ( undecidedRoleIds.length && this.roles.length ) {
		undecidedNames = undecidedRoleIds.map( ( e ) => { return this.roles.get( e ).name ; } ) ;
	}

	var onSelect = index => {
		if ( nexts[ index ].roleIds.indexOf( this.roleId ) !== -1 ) {
			this.bus.emit( 'selectNext' , null ) ;
		}
		else {
			this.bus.emit( 'selectNext' , index ) ;
		}
	} ;

	this.dom.setChoices( choices , undecidedNames , onSelect , { timeout: options.timeout , nextStyle: options.nextStyle } ) ;
} ;



// External raw output (e.g. shell command stdout)
UI.extOutput = function extOutput( output ) {
	alert( 'not coded ATM!' ) ;
	//process.stdout.write( output ) ;
} ;



// External raw error output (e.g. shell command stderr)
UI.extErrorOutput = function extErrorOutput( output ) {
	alert( 'not coded ATM!' ) ;
	//process.stderr.write( output ) ;
} ;



// Text input field
UI.textInput = function textInput( label , grantedRoleIds ) {
	var options = {
		label: label
	} ;

	if ( grantedRoleIds.indexOf( this.roleId ) === -1 ) {
		options.placeholder = 'YOU CAN\'T RESPOND - WAIT...' ;
		this.dom.textInputDisabled( options ) ;
	}
	else {
		this.dom.textInput( options , ( text ) => {
			this.bus.emit( 'textSubmit' , text ) ;
		} ) ;
	}
} ;



UI.pause = function pause( duration ) {
	console.log( "Received a pause event for" , duration , "seconds" ) ;
} ;



UI.unpause = function unpause() {
	console.log( "Received an unpause event" ) ;
} ;



// rejoin event
UI.rejoin = function rejoin() {} ;



UI.wait = function wait( what ) {
	switch ( what ) {
		case 'otherBranches' :
			this.dom.setBigHint( "WAITING FOR OTHER BRANCHES TO FINISH..." , { wait: true , "pulse-animation": true } ) ;
			this.bus.once( 'rejoin' , () => this.dom.clearHint() ) ;
			break ;
		default :
			this.dom.setBigHint( "WAITING FOR " + what , { wait: true , "pulse-animation": true } ) ;
	}
} ;



UI.theme = function theme( data ) {
	if ( ! data.url ) {
		if ( this.config.theme ) { this.dom.setTheme( this.config.theme ) ; }
		return ;
	}

	this.dom.setTheme( data ) ;
} ;



UI.image = function image( data ) {
	this.dom.setSceneImage( data ) ;
} ;



UI.defineAnimation = function defineAnimation( id , data ) {
	this.dom.defineAnimation( id , data ) ;
} ;



UI.showSprite = function showSprite( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	data.actionCallback = UI.spriteActionCallback.bind( this ) ;

	this.dom.showSprite( id , data ) ;
} ;



UI.spriteActionCallback = function spriteActionCallback( action ) {
	console.warn( "Sprite action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateSprite = function updateSprite( id , data ) {
	this.dom.updateSprite( id , data ) ;
} ;



UI.animateSprite = function animateSprite( spriteId , animationId ) {
	this.dom.animateSprite( spriteId , animationId ) ;
} ;



UI.clearSprite = function clearSprite( id ) {
	this.dom.clearSprite( id ) ;
} ;



UI.showUi = function showUi( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	data.actionCallback = UI.uiActionCallback.bind( this ) ;

	this.dom.showUi( id , data ) ;
} ;



UI.uiActionCallback = function uiActionCallback( action ) {
	console.warn( "UI action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateUi = function updateUi( id , data ) {
	this.dom.updateUi( id , data ) ;
} ;



UI.animateUi = function animateUi( uiId , animationId ) {
	this.dom.animateUi( uiId , animationId ) ;
} ;



UI.clearUi = function clearUi( id ) {
	this.dom.clearUi( id ) ;
} ;



UI.showMarker = function showMarker( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	data.actionCallback = UI.markerActionCallback.bind( this ) ;

	this.dom.showMarker( id , data ) ;
} ;



UI.markerActionCallback = function markerActionCallback( action ) {
	console.warn( "Marker action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateMarker = function updateMarker( id , data ) {
	this.dom.updateMarker( id , data ) ;
} ;



UI.animateMarker = function animateMarker( markerId , animationId ) {
	this.dom.animateMarker( markerId , animationId ) ;
} ;



UI.clearMarker = function clearMarker( id ) {
	this.dom.clearMarker( id ) ;
} ;



UI.showCard = function showCard( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	data.actionCallback = UI.cardActionCallback.bind( this ) ;

	this.dom.showCard( id , data ) ;
} ;



UI.cardActionCallback = function cardActionCallback( action ) {
	console.warn( "Card action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateCard = function updateCard( id , data ) {
	this.dom.updateCard( id , data ) ;
} ;



UI.animateCard = function animateCard( cardId , animationId ) {
	this.dom.animateCard( cardId , animationId ) ;
} ;



UI.clearCard = function clearCard( id ) {
	this.dom.clearCard( id ) ;
} ;



// add a callback here?
UI.sound = function sound( data ) {
	this.dom.sound( data ) ;
} ;



UI.music = function music( data ) {
	this.dom.music( data ) ;
} ;



// End event
UI.end = function end( result , data , callback ) {
	// /!\ this.afterNext is not the good way to detect extra content...
	var options = {
		modal: true , big: true , fun: true , contentDelay: this.hasNewContent , slow: true
	} ;

	var finished = () => {
		if ( this.ended ) { return ; }
		this.ended = true ;
		console.log( 'finished!' ) ;
		this.emit( 'end' ) ;
		callback() ;
	} ;

	switch ( result ) {
		case 'end' :
			this.dom.setDialog( 'The End.' , options , finished ) ;
			break ;
		case 'win' :
			this.dom.setDialog( 'You Win!' , options , finished ) ;
			break ;
		case 'lost' :
			this.dom.setDialog( 'You Lose...' , options , finished ) ;
			break ;
		case 'draw' :
			this.dom.setDialog( 'Draw.' , options , finished ) ;
			break ;
	}
} ;



// Custom event, not used in vanilla client
UI.custom = function custom( event , data ) {
	console.log( "Received a custom event" , event , data ) ;
} ;



// Exit event
UI.exit = function exit( error , timeout , callback ) {
	console.log( 'exit cb' , callback ) ;
	this.once( 'end' , () => {
		// Add at least few ms, because DOM may be OK, but parallel image download are still in progress.
		// E.g.: after .setDialog()'s callback, boxes/geometric-gold.svg is not loaded.
		// Keep in mind that once the exit callback is sent, the remote server will disconnect us as soon as possible.
		setTimeout( 200 , callback ) ;
	} ) ;
} ;

