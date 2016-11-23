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

var path = require( 'path' ) ;

var dom = require( 'dom-kit' ) ;
var treeExtend = require( 'tree-kit/lib/extend.js' ) ;
var treeOps = require( 'kung-fig/lib/treeOps.js' ) ;
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
			chatConfig: { value: null , writable: true , enumerable: true } ,
			inGame: { value: false , writable: true , enumerable: true } ,
			redirectChat: { value: null , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true } ,
			afterNext: { value: false , writable: true , enumerable: true } ,
			afterLeave: { value: false , writable: true , enumerable: true } ,
			nextSoundChannel: { value: 0 , writable: true , enumerable: true } ,
			sprites: { value: {} , enumerable: true } ,
			animations: { value: {} , enumerable: true } ,
		} ) ;
	}
	
	self.$gfx = document.querySelector( '#gfx' ) ;
	self.$content = document.querySelector( '#content' ) ;
	self.$text = document.querySelector( '#text' ) ;
	self.$chat = document.querySelector( '#chat' ) ;
	self.$chatForm = document.querySelector( '#chat-form' ) ;
	self.$chatInput = document.querySelector( '#chat-input' ) ;
	self.$next = document.querySelector( '#next' ) ;
	self.$hint = document.querySelector( '#hint' ) ;
	self.$connection = document.querySelector( '#connection' ) ;
	self.$music = document.querySelector( '#music' ) ;
	self.$sound0 = document.querySelector( '#sound0' ) ;
	self.$sound1 = document.querySelector( '#sound1' ) ;
	self.$sound2 = document.querySelector( '#sound2' ) ;
	self.$sound3 = document.querySelector( '#sound3' ) ;
	
	self.initInteractions() ;
	
	self.client.once( 'connecting' , UI.clientConnecting.bind( self ) ) ;
	self.client.once( 'open' , UI.clientOpen.bind( self ) ) ;
	self.client.once( 'close' , UI.clientClose.bind( self ) ) ;
	self.client.on( 'error' , UI.clientError.bind( self ) ) ;
	
	return self ;
}

module.exports = UI ;



function arrayGetById( id ) { return this.find( function( e ) { return e.id === id ; } ) ; }	// jshint ignore:line



UI.prototype.initInteractions = function initInteractions()
{
	var self = this , fullScreenImageTimer = null ;
	
	// Chat
	this.$chatForm.onsubmit = UI.onChatSubmit.bind( this ) ;
	
	// Switch to fullscreen background image on click
	var fromFullScreenImage = function fromFullScreenImage( event ) {
		if ( fullScreenImageTimer !== null ) { clearTimeout( fullScreenImageTimer ) ; fullScreenImageTimer = null ; }
		self.$content.classList.remove( 'hidden' ) ;
	} ;
	
	var toFullScreenImage = function toFullScreenImage( event ) {
		if ( fullScreenImageTimer !== null ) { clearTimeout( fullScreenImageTimer ) ; fullScreenImageTimer = null ; }
		
		self.$content.classList.toggle( 'hidden' ) ;
		
		if ( self.$content.classList.contains( 'hidden' ) )
		{
			fullScreenImageTimer = setTimeout( fromFullScreenImage , 8000 ) ;
		}
	} ;
	
	this.$content.addEventListener( 'click' , fromFullScreenImage , false ) ;
	this.$gfx.addEventListener( 'click' , toFullScreenImage , false ) ;
} ;



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
	this.bus.on( 'chatConfig' , UI.chatConfig.bind( this ) ) ;
	
	this.bus.on( 'image' , UI.image.bind( this ) ) ;
	this.bus.on( 'sound' , UI.sound.bind( this ) ) ;
	this.bus.on( 'music' , UI.music.bind( this ) ) ;
	
	this.bus.on( 'defineAnimation' , UI.defineAnimation.bind( this ) ) ;
	
	this.bus.on( 'showSprite' , UI.showSprite.bind( this ) ) ;
	this.bus.on( 'updateSprite' , UI.prototype.updateSprite.bind( this ) ) ;
	this.bus.on( 'animateSprite' , UI.animateSprite.bind( this ) ) ;
	this.bus.on( 'clearSprite' , UI.clearSprite.bind( this ) ) ;
	
	this.bus.on( 'enterScene' , UI.enterScene.bind( this ) ) ;
	this.bus.on( 'leaveScene' , UI.leaveScene.bind( this ) , { async: true } ) ;
	this.bus.on( 'nextList' , UI.nextList.bind( this ) ) ;
	this.bus.on( 'nextTriggered' , UI.nextTriggered.bind( this ) ) ;
	
	this.bus.on( 'textInput' , UI.textInput.bind( this ) ) ;
	
	//this.bus.on( 'split' , UI.split.bind( this ) ) ;
    this.bus.on( 'rejoin' , UI.rejoin.bind( this ) ) ;
    
    this.bus.on( 'wait' , UI.wait.bind( this ) ) ;
    this.bus.on( 'end' , UI.end.bind( this ) ) ;
	
	this.bus.on( 'exit' , UI.exit.bind( this ) ) ;
	
	this.bus.emit( 'ready' ) ;
} ;



UI.prototype.cleanUrl = function cleanUrl( url )
{
	/*
	if ( path.isAbsolute( url ) ) { return url ; }
	return this.config.assetBaseUrl + '/' + url ;
	*/
	
	return '/script/' + url ;
}



UI.clientConnecting = function clientConnecting()
{
	console.log( 'Connecting!' ) ;
	this.$connection.innerHTML = '<span class="blue bold">connecting...</span>' ;
	this.$connection.classList.remove( 'alert' ) ;
} ;



UI.clientOpen = function clientOpen()
{
	console.log( 'Connected!' ) ;
	this.$connection.innerHTML = '<span class="green bold">connected</span>' ;
	this.$connection.classList.remove( 'alert' ) ;
	this.initBus() ;
} ;



UI.clientClose = function clientClose()
{
	console.log( 'Closed!' ) ;
	this.$connection.innerHTML = '<span class="red bold">connection closed</span>' ;
	this.$connection.classList.add( 'alert' ) ;
} ;



UI.clientError = function clientError( code )
{
	switch ( code )
	{
		case 'unreachable' :
			this.$connection.innerHTML = '<span class="red bold">server unreachable</span>' ;
			this.$connection.classList.add( 'alert' ) ;
			break ;
	}
} ;



UI.clientConfig = function clientConfig( config )
{
	console.warn( 'Client config received: ' , config ) ;
	this.config = config ;
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
	var self = this , $roles , userName ,
		max = 0x61 + roles.length - 1 ;
	
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
	
	text = toolkit.markup( text ) ;
	
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



UI.chatConfig = function chatConfig( data )
{
	this.chatConfig = data ;
	console.warn( 'chatConfig:' , this.chatConfig ) ;
	
	if ( this.roleId && this.chatConfig[ this.roleId ].write )
	{
		if ( this.$chatInput.getAttribute( 'disabled' ) )
		{
			this.$chat.classList.remove( 'hidden' ) ;
			this.$chatInput.removeAttribute( 'disabled' ) ;
		}
	}
	else
	{
		if ( ! this.$chatInput.getAttribute( 'disabled' ) )
		{
			this.$chat.classList.add( 'hidden' ) ;
			this.$chatInput.setAttribute( 'disabled' , true ) ;
		}
	}
} ;



// Dom event
UI.onChatSubmit = function onChatSubmit( event )
{
	event.preventDefault() ;
	
	if ( this.$chatInput.getAttribute( 'disabled' ) ) { return ; }
	
	if ( this.redirectChat )
	{
		this.redirectChat( this.$chatInput.value ) ;
	}
	else
	{
		this.bus.emit( 'chat' , this.$chatInput.value ) ;
	}
	
	this.$chatInput.value = '' ;
} ;



// 'enterScene' event
UI.enterScene = function enterScene()
{
	this.inGame = true ;
	
	if ( this.afterLeave && ! this.afterNextTriggered )
	{
		this.$text.innerHTML = '' ;
		this.$next.innerHTML = '' ;
		this.$hint.innerHTML = '' ;
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



UI.nextList = function nextList( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	this.nexts = nexts ;
	this.afterNext = true ;
	
	// No need to update if we are alone
	if ( isUpdate && this.roles.length === 1 ) { return ; }
	
	//if ( nexts.length === 0 ) { this.nextEnd() ; }
	//else 
	if ( nexts.length === 1 ) { this.nextListConfirm( nexts[ 0 ] , grantedRoleIds , undecidedRoleIds , timeout , isUpdate ) ; }
	else { this.nextListMenu( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate ) ; }
} ;



UI.prototype.nextListConfirm = function nextListConfirm( next , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	var self = this , $next , roles ,
		startTime , timer , $timer ;
	
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
	
	if ( undecidedRoleIds.length && this.roles.length > 1 )
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<p class="waiting-roles classic-ui">Waiting: <span class="waiting-roles classic-ui">' +
			undecidedRoleIds.map( function( e ) { return self.roles.get( e ).label ; } ).join( ', ' ) +
			'</span></p>'
		) ;
	}
	
	if ( timeout !== null )
	{
		startTime = Date.now() ;
		
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<p class="timer classic-ui">Time limit: <span class="time">' + Math.round( timeout / 1000 ) + 's' + '</span></p>'
		) ;
		
		$timer = document.querySelector( '.timer .time' ) ;
		
		timer = setInterval( function() {
			// If no parentNode, the element has been removed...
			if ( ! $timer.parentNode ) { clearInterval( timer ) ; return ; }
			
			$timer.textContent = Math.round( ( timeout + startTime - Date.now() ) / 1000 ) + 's' ;
		} , 1000 ) ;
	}
	
	$next = document.querySelector( '#next_0' ) ;
	
	$next.onclick = function() {
		self.bus.emit( 'selectNext' , 0 ) ;
		$next.onclick = null ;
	} ;
} ;



UI.prototype.nextListMenu = function nextListMenu( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	var self = this , $nexts ,
		startTime , timer , $timer ,
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
	
	if ( undecidedRoleIds.length && this.roles.length )
	{
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<p class="waiting-roles classic-ui">Waiting: <span class="waiting-roles classic-ui">' +
			undecidedRoleIds.map( function( e ) { return self.roles.get( e ).label ; } ).join( ', ' ) +
			'</span></p>'
		) ;
	}
	
	if ( timeout !== null )
	{
		startTime = Date.now() ;
		
		this.$next.insertAdjacentHTML( 'beforeend' ,
			'<p class="timer classic-ui">Time limit: <span class="time">' + Math.round( timeout / 1000 ) + 's' + '</span></p>'
		) ;
		
		$timer = document.querySelector( '.timer .time' ) ;
		
		timer = setInterval( function() {
			// If no parentNode, the element has been removed...
			if ( ! $timer.parentNode ) { clearInterval( timer ) ; return ; }
			
			$timer.textContent = Math.round( ( timeout + startTime - Date.now() ) / 1000 ) + 's' ;
		} , 1000 ) ;
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
UI.textInput = function textInput( label , grantedRoleIds )
{
	var self = this , $form , $input , finalized = false ;
	
	//alert( 'textInput is not coded ATM!' ) ;
	
	if ( grantedRoleIds.indexOf( this.roleId ) === -1 )
	{
		// Not granted!
		this.$text.insertAdjacentHTML( 'beforeend' ,
			'<p class="text classic-ui">' + label +
			'<input type="text" id="textInput" class="text-input classic-ui" placeholder="YOU CAN\'T RESPOND - WAIT..." disabled /></p>'
		) ;
		return ;
	}
	
	this.$text.insertAdjacentHTML( 'beforeend' ,
		'<form class="form-text-input classic-ui"><p class="text classic-ui">' + label +
		'<input type="text" class="text-input classic-ui" /></p></form>'
	) ;
	
	$form = document.querySelector( '.form-text-input' ) ;
	$input = $form.querySelector( '.text-input' ) ;
	
	$input.value = this.$chatInput.value ;
	
	$input.focus() ;
	
	var finalize = function finalize( text ) {
		if ( finalized ) { return ; }
		finalized = true ;
		
		self.redirectChat = null ;
		$form.onsubmit = function() {} ;
		$input.oninput = null ;
		self.$chatInput.oninput = null ;
		$input.setAttribute( 'disabled' , true ) ;
		
		self.bus.emit( 'textSubmit' , text ) ; 
	} ;
	
	this.redirectChat = function redirectChat( text ) {
		finalize( text ) ;
	} ;
	
	$form.onsubmit = function onSubmit( event ) {
		event.preventDefault() ;
		finalize( $input.value ) ; 
	} ;
	
	$input.oninput = function onInput() {
		self.$chatInput.value = $input.value ;
	} ;
	
	this.$chatInput.oninput = function onChatInput() {
		$input.value = self.$chatInput.value ;
	} ;
} ;



// rejoin event
UI.rejoin = function rejoin() {} ;



UI.wait = function wait( what )
{
	var self = this ;
	
	switch ( what )
	{
		case 'otherBranches' :
			this.$hint.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="wait pulse-animation classic-ui">WAITING FOR OTHER BRANCHES TO FINISH...</h2>'
			) ;
			this.bus.once( 'rejoin' , function() { self.$hint.innerHTML = '' ; } ) ;
			break ;
		default :
			this.$hint.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="wait pulse-animation classic-ui">WAITING FOR ' + what +'</h2>'
			) ;
	}
} ;



UI.image = function image( data )
{
	var self = this , cleaned = false ;
	
	var div = document.createElement( 'div' ) ;
	div.classList.add( 'scene-image' ) ;
	
	if ( data.url )
	{
		div.style.backgroundImage = 'url("' + this.cleanUrl( data.url ) + '")' ;
	}
	
	if ( data.origin && typeof data.origin === 'string' )
	{
		div.style.backgroundPosition = data.origin ;
	}
	
	var oldImage = this.$gfx.firstElementChild || null ;
	
	var cleanUp = function cleanUp() {
		if ( cleaned ) { return ; }
		cleaned = true ;
		oldImage.remove() ;
	} ;
	
	if ( oldImage )
	{
		oldImage.addEventListener( 'transitionend' , cleanUp , false ) ;
		this.$gfx.insertBefore( div , oldImage ) ;
		oldImage.classList.add( 'hidden' ) ;
		
		// For some very obscure reason, sometime we don't get the 'transitionend' event,
		// Maybe no transition happend at all... So we need to clean up anyway after a while...
		setTimeout( cleanUp , 2000 ) ;
	}
	else
	{
		this.$gfx.append( div ) ;
	}
	
	switch ( data.position )
	{
		case 'left' :
			this.$content.setAttribute( 'data-position' , 'right' ) ;
			break ;
		case 'right' :	// jshint ignore:line
		default :
			this.$content.setAttribute( 'data-position' , 'left' ) ;
			break ;
	}
} ;



UI.defineAnimation = function defineAnimation( id , data )
{
	this.animations[ id ] = data ;
} ;



// Using an <img> tag
UI.showSprite = function showSprite( id , data )
{
	var self = this , sprite , oldSprite ;
	
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }
	
	oldSprite = this.sprites[ id ] ;
	
	sprite = this.sprites[ id ] = {
		animation: null ,
		action: null ,
		style: {}
	} ;
	
	sprite.$img = document.createElement( 'img' ) ;
	sprite.$img.classList.add( 'sprite' ) ;
	
	if ( data.maskUrl )
	{
		console.warn( 'has mask!' ) ;
		
		dom.svg.load( null , this.cleanUrl( data.maskUrl ) , {
				class: { spriteMask: true , clickable: true } ,
				css: data.style ,
				noWidthHeightAttr: true
			} ,
			function( error , svg ) {
				if ( error ) { console.warn( error ) ; return ; }
				sprite.$mask = svg ;
				
				// /!\ Duplicated code:
				
				self.updateSprite( null , data , sprite ) ;
				
				if ( oldSprite ) { oldSprite.$img.remove() ; }
				
				self.$gfx.append( sprite.$img ) ;
				self.$gfx.append( sprite.$mask ) ;
			}
		) ;
		
		return ;
	}
		
	this.updateSprite( null , data , sprite ) ;
	
	if ( oldSprite ) { oldSprite.$img.remove() ; }
	
	this.$gfx.append( sprite.$img ) ;
} ;



// internalSprite is used for internal update call
UI.prototype.updateSprite = function updateSprite( id , data , internalSprite )
{
	var self = this , sprite , $element ;
	
	if ( ! data.style || typeof data.style !== 'object' ) { data.style = {} ; }
	
	if ( internalSprite )
	{
		sprite = internalSprite ;
	}
	else
	{
		if ( ! this.sprites[ id ] )
		{
			console.warn( 'Unknown sprite id: ' , id ) ;
			return ;
		}
		
		sprite = this.sprites[ id ] ;
	}
	
	delete data.style.position ;
	
	if ( data.url )
	{
		sprite.$img.setAttribute( "src" , this.cleanUrl( data.url ) ) ;
	}
	
	if ( data.action !== undefined )
	{
		$element = sprite.$mask || sprite.$img ;
		
		if ( data.action && ! sprite.action )
		{
			$element.classList.add( 'clickable' ) ;
			
			sprite.onClick = function( event ) {
				console.warn( "action triggered: " , sprite.action ) ;
				self.bus.emit( 'action' , sprite.action ) ;
				event.stopPropagation() ;
			} ;
			
			$element.addEventListener( 'click' , sprite.onClick ) ;
		}
		else if ( ! data.action && sprite.action )
		{
			$element.classList.remove( 'clickable' ) ;
			$element.removeEventListener( 'click' , sprite.onClick ) ;
		}
		
		sprite.action = data.action || null ;
	}
	
	//treeExtend( { deep: true } , sprite , data ) ;
	treeExtend( null , sprite.style , data.style ) ;
	
	// Use data.style, NOT sprite.style: we have to set only new/updated styles
	dom.css( sprite.$img , data.style ) ;
	
	// Update the mask, if any
	if ( sprite.$mask )
	{
		console.warn( 'update mask!' ) ;
		dom.css( sprite.$mask , data.style ) ;
	}
} ;



UI.animateSprite = function animateSprite( spriteId , animationId )
{
	var self = this , sprite , animation , frame , frameIndex = 0 ;
	
	if ( ! this.sprites[ spriteId ] )
	{
		console.warn( 'Unknown sprite id: ' , spriteId ) ;
		return ;
	}
	
	if ( ! this.animations[ animationId ] )
	{
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return ;
	}
	
	sprite = this.sprites[ spriteId ] ;
	animation = this.animations[ animationId ] ;
	sprite.animation = animationId ;
	
	// What should be done if an animation is already running???
	
	//console.warn( "Animation: " , animation ) ;
	
	// If there is no frames, quit now
	if ( ! Array.isArray( animation.frames ) || ! animation.frames.length ) { return ; }
	
	var nextFrame = function() {
		frame = animation.frames[ frameIndex ] ;
		
		// Update the sprite
		self.updateSprite( null , frame , sprite ) ;
		
		if ( ++ frameIndex < animation.frames.length )
		{
			setTimeout( nextFrame , frame.duration * 1000 ) ;
		}
		else
		{
			// This is the end of the animation...
			// Restore something here?
			sprite.animation = null ;
		}
	} ;
	
	nextFrame() ;
} ;



UI.clearSprite = function clearSprite( id , data )
{
	var sprite ;
	
	if ( ! this.sprites[ id ] )
	{
		console.warn( 'Unknown sprite id: ' , id ) ;
		return ;
	}
	
	sprite = this.sprites[ id ] ;
	
	sprite.$img.remove() ;
	
	delete this.sprites[ id ] ;
} ;



UI.sound = function sound( data )	// maybe? , callback )
{
	var element = this[ '$sound' + this.nextSoundChannel ] ;
	console.warn( '$sound' + this.nextSoundChannel , data , element ) ;
	this.nextSoundChannel = ( this.nextSoundChannel + 1 ) % 4 ;
	
	element.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;
	element.play() ;
} ;



UI.music = function music( data )
{
	var self = this ,
		oldSrc = this.$music.getAttribute( 'src' ) ;
	
	if ( data.url )
	{
		if ( oldSrc )
		{
			if ( oldSrc !== data.url )
			{
				fadeOut( this.$music , function() {
					self.$music.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;
					self.$music.play() ;
					fadeIn( self.$music ) ;
				} ) ;
			}
			else if ( this.$music.ended )
			{
				// We are receiving a music event for the same last music url,
				// but last playback ended, so play it again.
				this.$music.play() ;
			}
		}
		else
		{
			this.$music.volume = 0 ;
			this.$music.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;
			this.$music.play() ;
			fadeIn( this.$music ) ;
		}
	}
	else
	{
		if ( oldSrc )
		{
			fadeOut( this.$music , function() {
				self.$music.removeAttribute( 'src' ) ;
			} ) ;
		}
	}
} ;



var FADE_TIMEOUT = 10 ;
var FADE_VALUE = 0.01 ;



function fadeIn( element , callback )
{
	if ( element.__fadeTimer ) { clearTimeout( element.__fadeTimer ) ; element.__fadeTimer = null ; }
	
	if ( element.volume >= 1 )
	{
		if ( callback ) { callback() ; }
		return ;
	}
	
	element.volume = Math.min( 1 , element.volume + FADE_VALUE ) ;
	element.__fadeTimer = setTimeout( fadeIn.bind( undefined , element , callback ) , FADE_TIMEOUT ) ;
}



function fadeOut( element , callback )
{
	if ( element.__fadeTimer ) { clearTimeout( element.__fadeTimer ) ; element.__fadeTimer = null ; }
	
	if ( element.volume <= 0 )
	{
		if ( callback ) { callback() ; }
		return ;
	}
	
	element.volume = Math.max( 0 , element.volume - FADE_VALUE ) ;
	element.__fadeTimer = setTimeout( fadeOut.bind( undefined , element , callback ) , FADE_TIMEOUT ) ;
}



// Exit event
UI.end = function end( result , data )
{
	switch ( result )
	{
		case 'end' :
			this.$hint.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="end classic-ui">The End.</h2>'
			) ;
			break ;
		case 'win' :
			this.$hint.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="end win classic-ui">You win!</h2>'
			) ;
			break ;
		case 'lost' :
			this.$hint.insertAdjacentHTML( 'beforeend' ,
				'<h2 class="end lost classic-ui">You lose...</h2>'
			) ;
			break ;
		case 'draw' :
			this.$hint.insertAdjacentHTML( 'beforeend' ,
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


