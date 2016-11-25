(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SpellcastClient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2015 - 2016 Cédric Ronvel

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

/* global window */



var domKit = require( 'dom-kit' ) ;
var treeExtend = require( 'tree-kit/lib/extend.js' ) ;

function noop() {}



var domTools = {
	empty: function( $node ) {
		while ( $node.firstChild ) {
			$node.removeChild( $node.firstChild ) ;
		}
	}
} ;



function Dom() { return Dom.create() ; }
module.exports = Dom ;



Dom.create = function create()
{
	var self = Object.create( Dom.prototype ) ;

	self.$gfx = document.querySelector( '#gfx' ) ;
	self.$sceneImage = document.querySelector( '.scene-image' ) ;
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
	
	self.nextSoundChannel = 0 ;
	
	self.sprites = {} ;
	self.animations = {} ;
	
	self.hideContentTimer = null ;
	
	self.initEvents() ;
	
	return self ;
} ;



Dom.prototype.initEvents = function initEvents()
{
	this.$gfx.addEventListener( 'click' , this.toggleContent.bind( this ) , false ) ;
} ;



Dom.prototype.toggleContent = function toggleContent()
{
	if ( this.$content.classList.contains( 'hidden' ) ) { this.showContent() ; }
	else { this.hideContent() ; }
} ;



Dom.prototype.hideContent = function hideContent()
{
	if ( this.hideContentTimer !== null ) { clearTimeout( this.hideContentTimer ) ; this.hideContentTimer = null ; }

	this.$content.classList.add( 'hidden' ) ;
	this.hideContentTimer = setTimeout( this.showContent.bind( this ) , 8000 ) ;
} ;



Dom.prototype.showContent = function showContent()
{
	if ( this.hideContentTimer !== null ) { clearTimeout( this.hideContentTimer ) ; this.hideContentTimer = null ; }
	this.$content.classList.remove( 'hidden' ) ;
} ;



Dom.prototype.clientStatus = function clientStatus( text , options )
{
	var textElement = document.createElement('span') ;
	textElement.classList.add( options.color ) ;
	textElement.textContent = text ;

	domTools.empty( this.$connection ) ;

	this.$connection.appendChild( textElement ) ;
	this.$connection.classList.toggle( 'alert' , options.alert ) ;
} ;



Dom.prototype.clear = function clear( callback )
{
	callback = callback || noop ;
	domTools.empty( this.$hint ) ;
	domTools.empty( this.$text ) ;
	domTools.empty( this.$next ) ;
	callback() ;
} ;


Dom.prototype.clearHints = function clearHints( callback )
{
	callback = callback || noop ;
	domTools.empty( this.$hint ) ;
	callback() ;
} ;



Dom.prototype.clearMessages = function clearMessages( callback )
{
	callback = callback || noop ;
	domTools.empty( this.$text ) ;
	callback() ;
} ;



Dom.prototype.addMessage = function addMessage( text , options , callback )
{
	callback = callback || noop ;

	var textElement = document.createElement( 'p' ) ;
	textElement.classList.add( 'text' ) ;
	
	//textElement.textContent = text ;
	// Because the text contains <span> tags
	textElement.innerHTML = text ;

	this.$text.appendChild( textElement ) ;

	callback() ;
} ;



Dom.prototype.clearChoices = function clearChoices( callback )
{
	callback = callback || noop ;
	domTools.empty( this.$next ) ;
	callback() ;
} ;



Dom.prototype.addChoices = function addChoices( choices , onSelect , callback )
{
	var choicesFragment = document.createDocumentFragment() ;

	callback = callback || noop ;

	choices.forEach( function( choice ) {
		console.warn( "choice.selectedBy:" , choice.selectedBy ) ;

		var buttonElement = document.createElement('button') ;
		buttonElement.classList.add( 'choice' , choice.type ) ;
		buttonElement.setAttribute( 'data-isOrdered' , choice.orderedList ) ;
		
		buttonElement.textContent = choice.label ;

		if ( choice.selectedBy && choice.selectedBy.length )
		{
			var spanElement = document.createElement('span') ;
			spanElement.classList.add( 'italic' , 'brightBlack' ) ;

			// Add an extra space to separate from the label text
			spanElement.textContent = ' ' + choice.selectedBy.join( ', ' ) ;
			buttonElement.appendChild( spanElement ) ;
		}

		buttonElement.addEventListener( 'click' , function() {
			// HINT: removeListener
			onSelect( choice.index ) ;
		} ) ;

		choicesFragment.appendChild( buttonElement ) ;
	} ) ;

	this.$next.appendChild( choicesFragment ) ;

	callback() ;
} ;



// This is used when new choices replaces the previous scene choices
Dom.prototype.setChoices = function setChoices( choices , undecidedNames , timeout , onSelect , callback )
{
	var self = this ;

	callback = callback || noop ;

	this.clearChoices( function() {
		self.addChoices( choices , onSelect , callback ) ;

		if ( undecidedNames && undecidedNames.length )
		{
			var $unassignedUsers = document.createElement( 'p' ) ;
			$unassignedUsers.classList.add( 'unassigned-users' ) ;
			$unassignedUsers.textContent = undecidedNames.join( ', ' ) ;
			self.$next.appendChild( $unassignedUsers ) ;
		}

		if ( typeof timeout === 'number' ) { self.choiceTimeout( timeout ) ; }
	} ) ;
} ;



// This is used when the scene update its choices details (selectedBy, ...)
// /!\ TEMP! This does not update but just reset, just like .setChoices()
Dom.prototype.updateChoices = function setChoices( choices , undecidedNames , timeout , onSelect , callback )
{
	var self = this ;

	callback = callback || noop ;

	// /!\ TEMP! This does not update but just reset, just like .setChoices()
	this.clearChoices( function() {
		self.addChoices( choices , onSelect , callback ) ;

		if ( undecidedNames && undecidedNames.length )
		{
			var $unassignedUsers = document.createElement( 'p' ) ;
			$unassignedUsers.classList.add( 'unassigned-users' ) ;
			$unassignedUsers.textContent = undecidedNames.join( ', ' ) ;
			self.$next.appendChild( $unassignedUsers ) ;
		}

		if ( typeof timeout === 'number' ) { self.choiceTimeout( timeout ) ; }
	} ) ;
} ;



Dom.prototype.choiceTimeout = function choiceTimeout( timeout )
{
	var startTime = Date.now() , $timer , timer ;

	$timer = document.createElement( 'p' ) ;
	$timer.classList.add( 'timer' ) ;
	$timer.textContent = Math.round( timeout / 1000 ) ;

	this.$next.appendChild( $timer ) ;

	timer = setInterval( function() {
		// If no parentNode, the element has been removed...
		if ( ! $timer.parentNode ) { clearInterval( timer ) ; return ; }

		$timer.textContent = Math.round( ( timeout + startTime - Date.now() ) / 1000 ) ;
	} , 1000 ) ;
} ;



Dom.prototype.enableChat = function enableChat()
{
	this.$chat.classList.remove( 'hidden' ) ;
	this.$chatInput.removeAttribute( 'disabled' ) ;
} ;



Dom.prototype.disableChat = function disableChat()
{
	this.$chat.classList.add( 'hidden' ) ;
	this.$chatInput.setAttribute( 'disabled' , true ) ;
} ;



Dom.prototype.clearHint = function clearHint()
{
	domTools.empty( this.$hint ) ;
} ;



Dom.prototype.setBigHint = function setBigHint( text , classes )
{
	var $hint = document.createElement( 'h2' ) ;
	$hint.textContent = text ;
	if ( classes ) { domKit.class( $hint , classes ) ; }
	domTools.empty( this.$hint ) ;
	this.$hint.appendChild( $hint ) ;
} ;



			/* GFX */



Dom.prototype.setSceneImage = function setSceneImage( data )
{
	var cleaned = false ;
	
	var $oldSceneImage = this.$sceneImage ;

	console.warn( "setSceneImage: " , data ) ;
	this.$sceneImage = document.createElement( 'div' ) ;
	this.$sceneImage.classList.add( 'scene-image' ) ;

	if ( data.url )
	{
		this.$sceneImage.style.backgroundImage = 'url("' + data.url + '")' ;
	}

	if ( data.origin && typeof data.origin === 'string' )
	{
		this.$sceneImage.style.backgroundPosition = data.origin ;
	}

	var cleanUp = function cleanUp() {
		if ( cleaned ) { return ; }
		cleaned = true ;
		$oldSceneImage.remove() ;
	} ;

	if ( $oldSceneImage )
	{
		$oldSceneImage.addEventListener( 'transitionend' , cleanUp , false ) ;
		this.$gfx.insertBefore( this.$sceneImage , $oldSceneImage ) ;
		$oldSceneImage.classList.add( 'hidden' ) ;

		// For some very obscure reason, sometime we don't get the 'transitionend' event,
		// Maybe no transition happend at all... So we need to clean up anyway after a while...
		setTimeout( cleanUp , 2000 ) ;
	}
	else
	{
		this.$gfx.insertBefore( this.$sceneImage , this.$gfx.firstChild || null ) ;
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



Dom.prototype.showSprite = function showSprite( id , data )
{
	var self = this , sprite , oldSprite ;

	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	oldSprite = this.sprites[ id ] ;

	sprite = this.sprites[ id ] = {
		actionCallback: data.actionCallback ,
		action: null ,
		style: {} ,
		animation: null
	} ;

	sprite.$img = document.createElement( 'img' ) ;
	sprite.$img.classList.add( 'sprite' ) ;
	
	if ( data.maskUrl )
	{
		console.warn( 'has mask!' ) ;
		
		domKit.svg.load( null , data.maskUrl , {
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
Dom.prototype.updateSprite = function updateSprite( id , data , internalSprite )
{
	var sprite , $element ;
	
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
		sprite.$img.setAttribute( "src" , data.url ) ;
	}

	if ( data.action !== undefined )
	{
		$element = sprite.$mask || sprite.$img ;
		
		if ( data.action && ! sprite.action )
		{
			sprite.onClick = function( event ) {
				sprite.actionCallback( sprite.action ) ;
				event.stopPropagation() ;
			} ;
			
			$element.classList.add( 'clickable' ) ;
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
	domKit.css( sprite.$img , data.style ) ;
	
	// Update the mask, if any
	if ( sprite.$mask )
	{
		console.warn( 'update mask!' ) ;
		domKit.css( sprite.$mask , data.style ) ;
	}
} ;



Dom.prototype.animateSprite = function animateSprite( spriteId , animationId )
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



Dom.prototype.clearSprite = function clearSprite( id )
{
	var sprite ;

	if ( ! this.sprites[ id ] )
	{
		console.warn( 'Unknown sprite id: ' , id ) ;
		return ;
	}

	sprite = this.sprites[ id ] ;

	sprite.$img.remove() ;
	if ( sprite.$mask ) { sprite.$mask.remove() ; }
	
	delete this.sprites[ id ] ;
} ;



			/* SFX */



Dom.prototype.sound = function sound( data )	// maybe? , callback )
{
	var element = this[ '$sound' + this.nextSoundChannel ] ;
	console.warn( '$sound' + this.nextSoundChannel , data , element ) ;
	this.nextSoundChannel = ( this.nextSoundChannel + 1 ) % 4 ;

	element.setAttribute( 'src' , data.url ) ;

	element.play() ;
} ;



Dom.prototype.music = function music( data )
{
	var self = this ,
		oldSrc = this.$music.getAttribute( 'src' ) ;

	if ( data.url )
	{
		if ( oldSrc )
		{
			if ( oldSrc !== data.url )
			{
				soundFadeOut( this.$music , function() {
					self.$music.setAttribute( 'src' , data.url ) ;
					self.$music.play() ;
					soundFadeIn( self.$music ) ;
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
			this.$music.setAttribute( 'src' , data.url ) ;
			this.$music.play() ;
			soundFadeIn( this.$music ) ;
		}
	}
	else
	{
		if ( oldSrc )
		{
			soundFadeOut( this.$music , function() {
				self.$music.removeAttribute( 'src' ) ;
			} ) ;
		}
	}
} ;



var SOUND_FADE_TIMEOUT = 10 ;
var SOUND_FADE_VALUE = 0.01 ;



function soundFadeIn( element , callback )
{
	if ( element.__fadeTimer ) { clearTimeout( element.__fadeTimer ) ; element.__fadeTimer = null ; }

	if ( element.volume >= 1 )
	{
		if ( callback ) { callback() ; }
		return ;
	}

	element.volume = Math.min( 1 , element.volume + SOUND_FADE_VALUE ) ;
	element.__fadeTimer = setTimeout( soundFadeIn.bind( undefined , element , callback ) , SOUND_FADE_TIMEOUT ) ;
}



function soundFadeOut( element , callback )
{
	if ( element.__fadeTimer ) { clearTimeout( element.__fadeTimer ) ; element.__fadeTimer = null ; }

	if ( element.volume <= 0 )
	{
		if ( callback ) { callback() ; }
		return ;
	}

	element.volume = Math.max( 0 , element.volume - SOUND_FADE_VALUE ) ;
	element.__fadeTimer = setTimeout( soundFadeOut.bind( undefined , element , callback ) , SOUND_FADE_TIMEOUT ) ;
}




},{"dom-kit":6,"tree-kit/lib/extend.js":23}],2:[function(require,module,exports){
/*
	Spellcast
	
	Copyright (c) 2015 - 2016 Cédric Ronvel
	
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

/* global window, WebSocket */



var Ngev = require( 'nextgen-events' ) ;
var dom = require( 'dom-kit' ) ;
var url = require( 'url' ) ;



function SpellcastClient( options ) { return SpellcastClient.create( options ) ; }
module.exports = SpellcastClient ;
SpellcastClient.prototype = Object.create( Ngev.prototype ) ;
SpellcastClient.prototype.constructor = SpellcastClient ;



SpellcastClient.create = function create( options )
{
	var self = Object.create( SpellcastClient.prototype , {
		token: { value: options.token || 'null' , writable: true , enumerable: true } ,
		port: { value: options.port || 80 , writable: true , enumerable: true } ,
		userName: { value: options.name || 'unknown_' + Math.floor( Math.random() * 10000 ) , writable: true , enumerable: true } ,
		ws: { value: null , writable: true , enumerable: true } ,
		proxy: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
} ;



var uiList = {
	classic: require( './ui/classic.js' ) ,
} ;



SpellcastClient.autoCreate = function autoCreate()
{
	var options = url.parse( window.location.href , true ).query ;
	
	window.spellcastClient = SpellcastClient.create( options ) ;
	//window.spellcastClient.init() ;
	
	if ( ! options.ui ) { options.ui = [ 'classic' ] ; }
	else if ( ! Array.isArray( options.ui ) ) { options.ui = [ options.ui ] ; }
	
	window.spellcastClient.ui = options.ui ;
	
	return window.spellcastClient ;
} ;



SpellcastClient.prototype.run = function run( callback )
{
	var self = this , isOpen = false ;
	
	this.proxy = new Ngev.Proxy() ;
	
	// Add the remote service we want to access
	this.proxy.addRemoteService( 'bus' ) ;
	
	this.ui.forEach( function( ui ) {
		if ( uiList[ ui ] ) { uiList[ ui ]( self.proxy.remoteServices.bus , self ) ; }
	} ) ;
	
	this.ws = new WebSocket( 'ws://127.0.0.1:' + this.port + '/' + this.token ) ;
	
	this.emit( 'connecting' ) ;
	
	this.ws.onerror = function onError() {
		
		if ( ! isOpen )
		{
			// The connection has never opened, we can't connect to the server.
			console.log( "Can't open Websocket (error)..." ) ;
			self.emit( 'error' , 'unreachable' ) ;
			return ;
		}
	} ;
	
	this.ws.onopen = function onOpen() {
		
		isOpen = true ;
		
		// Send 'ready' to server? 
		// No, let the UI send it.
		//self.proxy.remoteServices.bus.emit( 'ready' ) ;
		
		console.log( "Websocket opened!" ) ;
		self.emit( 'open' ) ;
		
		// Should be done after emitting 'open'
		self.proxy.remoteServices.bus.emit( 'authenticate' , {
			name: self.userName
		} ) ;
		
		if ( typeof callback === 'function' ) { callback() ; }
	} ;
	
	this.ws.onclose = function onClose() {
		
		if ( ! isOpen )
		{
			// The connection has never opened, we can't connect to the server.
			console.log( "Can't open Websocket (close)..." ) ;
			self.emit( 'error' , 'unreachable' ) ;
			return ;
		}
		
		isOpen = false ;
		self.proxy.destroy() ;
		console.log( "Websocket closed!" ) ;
		self.emit( 'close' ) ;
	} ;
	
	this.ws.onmessage = function onMessage( wsMessage ) {
		
		var message ;
		
		try {
			message = JSON.parse( wsMessage.data ) ;
		}
		catch ( error ) {
			return ;
		}
		
		console.log( "Message received: " , message ) ;
		
		self.proxy.receive( message ) ;
	} ;
	
	self.proxy.send = function send( message ) {
		self.ws.send( JSON.stringify( message ) ) ;
	} ;
} ;



SpellcastClient.autoCreate() ;

dom.ready( function() {
	window.spellcastClient.run() ;
} ) ;



},{"./ui/classic.js":4,"dom-kit":6,"nextgen-events":10,"url":24}],3:[function(require,module,exports){
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



var toolkit = {} ;
module.exports = toolkit ;



var markupMethod = require( 'string-kit/lib/format.js' ).markupMethod ;
var escapeHtml = require( 'string-kit/lib/escape.js' ).html ;



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



toolkit.markup = function()
{
	var args = Array.from( arguments ) ;
	args[ 0 ] = escapeHtml( args[ 0 ] ).replace( /\n/ , '<br />' ) ;
	return markupMethod.apply( markupConfig , args ) ;
} ;


},{"string-kit/lib/escape.js":20,"string-kit/lib/format.js":21}],4:[function(require,module,exports){
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

var Dom = require( '../Dom.js' ) ;
var dom = require( 'dom-kit' ) ;	// tmp...
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
			//nextSoundChannel: { value: 0 , writable: true , enumerable: true } ,
			//sprites: { value: {} , enumerable: true } ,
			//animations: { value: {} , enumerable: true } ,
			dom: { value: Dom.create() } ,
		} ) ;
	}


	// ------------ TEMP!!! ------------------------------------------------
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
	// ------------ TEMP!!! ------------------------------------------------


	self.initInteractions() ;

	self.client.once( 'connecting' , UI.clientConnecting.bind( self ) ) ;
	self.client.once( 'open' , UI.clientOpen.bind( self ) ) ;
	self.client.once( 'close' , UI.clientClose.bind( self ) ) ;
	self.client.on( 'error' , UI.clientError.bind( self ) ) ;

	return self ;
}

module.exports = UI ;



function arrayGetById( id ) { return this.find( function( e ) { return e.id === id ; } ) ; }	// jshint ignore:line



// DOM
UI.prototype.initInteractions = function initInteractions()
{
	var self = this , fullScreenImageTimer = null ;

	// Chat
	this.$chatForm.onsubmit = UI.onChatSubmit.bind( this ) ;
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
	return '/script/' + url ;
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
	var self = this , $roles , userName , choices = [] , undecidedNames ,
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
	
	this.dom.setChoices( choices , undecidedNames , null , onSelect ) ;
	
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



// DOM
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
		this.dom.enableChat() ;
	}
	else
	{
		this.dom.disableChat() ;
	}
} ;



// Dom event
// DOM
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
		this.dom.clear() ;
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
	this.dom.clearMessages() ;
	this.dom.clearChoices() ;
} ;



UI.nextList = function nextList( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate )
{
	var self = this , $nexts , choices = [] , undecidedNames ,
		startTime , timer , $timer ,
		max = 0x61 + nexts.length - 1 ;

	this.nexts = nexts ;
	this.afterNext = true ;

	// No need to update if we are alone
	if ( isUpdate && this.roles.length === 1 ) { return ; }

	nexts.forEach( function( next , i ) {

		var roles = next.roleIds.map( function( id ) { return self.roles.get( id ).label ; } ) ;

		choices.push( {
			index: i ,
			label: next.label || 'Next' ,
			orderedList: nexts.length > 1 ,
			type: 'next' ,
			selectedBy: roles
		} ) ;
	} ) ;

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
	
	this.dom.setChoices( choices , undecidedNames , timeout , onSelect ) ;
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



// DOM
// Text input field
UI.textInput = function textInput( label , grantedRoleIds )
{
	var self = this , $form , $input , finalized = false ;

	//alert( 'textInput is not coded ATM!' ) ;

	if ( grantedRoleIds.indexOf( this.roleId ) === -1 )
	{
		// Not granted!
		this.$text.insertAdjacentHTML( 'beforeend' ,
			'<p class="text">' + label +
			'<input type="text" id="textInput" class="text-input" placeholder="YOU CAN\'T RESPOND - WAIT..." disabled /></p>'
		) ;
		return ;
	}

	this.$text.insertAdjacentHTML( 'beforeend' ,
		'<form class="form-text-input"><p class="text">' + label +
		'<input type="text" class="text-input" /></p></form>'
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
			this.dom.setBigHint( "WAITING FOR OTHER BRANCHES TO FINISH..." , { wait: true , "pulse-animation": true } ) ;
			this.bus.once( 'rejoin' , function() { self.dom.clearHint() ; } ) ;
			break ;
		default :
			this.dom.setBigHint( "WAITING FOR " + what , { wait: true , "pulse-animation": true } ) ;
	}
} ;



UI.image = function image( data )
{
	if ( data.url ) { data.url = this.cleanUrl( data.url ) ; }
	this.dom.setSceneImage( data ) ;
} ;



UI.defineAnimation = function defineAnimation( id , data )
{
	this.animations[ id ] = data ;
} ;



UI.showSprite = function showSprite( id , data )
{
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }
	
	data.url = this.cleanUrl( data.url ) ;
	if ( data.maskUrl ) { data.maskUrl = this.cleanUrl( data.maskUrl ) ; }
	
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
	if ( data.url ) { data.url = this.cleanUrl( data.url ) ; }
	if ( data.maskUrl ) { data.maskUrl = this.cleanUrl( data.maskUrl ) ; }
	
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
	if ( data.url ) { data.url = this.cleanUrl( data.url ) ; }
	this.dom.sound( data ) ;
} ;



UI.music = function music( data )
{
	if ( data.url ) { data.url = this.cleanUrl( data.url ) ; }
	this.dom.music( data ) ;
} ;



// Exit event
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



// Exit event
UI.exit = function exit()
{
	//term( "\n" ) ;
	//term.styleReset() ;
} ;


},{"../Dom.js":1,"../toolkit.js":3,"dom-kit":6,"kung-fig/lib/treeOps.js":9,"path":13,"tree-kit/lib/extend.js":23}],5:[function(require,module,exports){

},{}],6:[function(require,module,exports){
/*
	The Cedric's Swiss Knife (CSK) - CSK DOM toolbox

	Copyright (c) 2015 - 2016 Cédric Ronvel 
	
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



/* global NamedNodeMap */

// Load modules
//var string = require( 'string-kit' ) ;



var dom = {} ;
module.exports = dom ;



// Load the svg submodule
dom.svg = require( './svg.js' ) ;



// Like jQuery's $(document).ready()
dom.ready = function ready( callback )
{
	document.addEventListener( 'DOMContentLoaded' , function internalCallback() {
		document.removeEventListener( 'DOMContentLoaded' , internalCallback , false ) ;
		callback() ;
	} , false ) ;
} ;



// Return a fragment from html code
dom.fromHtml = function fromHtml( html )
{
	var i , doc , fragment ;
	
	// Fragment allow us to return a collection that... well... is not a collection,
	// and that's fine because the html code may contains multiple top-level element
	fragment = document.createDocumentFragment() ;
	
	doc = document.createElement( 'div' ) ;	// whatever type...
	
	// either .innerHTML or .insertAdjacentHTML()
	//doc.innerHTML = html ;
	doc.insertAdjacentHTML( 'beforeend' , html ) ;
	
	for ( i = 0 ; i < doc.children.length ; i ++ )
	{
		fragment.appendChild( doc.children[ i ] ) ;
	}
	
	return fragment ;
} ;



// Batch processing, like array, HTMLCollection, and so on...
dom.batch = function batch( method , elements )
{
	var i , args = Array.prototype.slice.call( arguments , 1 ) ;
	
	if ( elements instanceof Element )
	{
		args[ 0 ] = elements ;
		method.apply( this , args ) ;
	}
	else if ( Array.isArray( elements ) )
	{
		for ( i = 0 ; i < elements.length ; i ++ )
		{
			args[ 0 ] = elements[ i ] ;
			method.apply( this , args ) ;
		}
	}
	else if ( elements instanceof NodeList || elements instanceof NamedNodeMap )
	{
		for ( i = 0 ; i < elements.length ; i ++ )
		{
			args[ 0 ] = elements[ i ] ;
			method.apply( this , args ) ;
		}
	}
} ;



// Set a bunch of css properties given as an object
dom.css = function css( element , object )
{
	var key ;
	
	for ( key in object )
	{
		element.style[ key ] = object[ key ] ;
	}
} ;



// Set a bunch of attributes given as an object
dom.attr = function attr( element , object )
{
	var key ;
	
	for ( key in object )
	{
		if ( object[ key ] === null ) { element.removeAttribute( key ) ; }
		else { element.setAttribute( key , object[ key ] ) ; }
	}
} ;



// Set/unset a bunch of classes given as an object
dom.class = function class_( element , object )
{
	var key ;
	
	for ( key in object )
	{
		if ( object[ key ] ) { element.classList.add( key ) ; }
		else { element.classList.remove( key ) ; }
	}
} ;



// Remove an element. A little shortcut that ease life...
dom.remove = function remove( element ) { element.parentNode.removeChild( element ) ; } ;



// Remove all children of an element
dom.empty = function empty( element )
{
	// element.innerHTML = '' ;	// According to jsPerf, it is 96% slower
	while ( element.firstChild ) { element.removeChild( element.firstChild ); }
} ;



// Clone a source DOM tree and replace children of the destination
dom.cloneInto = function cloneInto( destination , source )
{
	dom.empty( destination ) ;
	destination.appendChild( source.cloneNode( true ) ) ;
} ;



// Same than cloneInto() without cloning anything
dom.insertInto = function insertInto( destination , source )
{
	dom.empty( destination ) ;
	destination.appendChild( source ) ;
} ;



// Children of this element get all their ID namespaced, any url(#id) references are patched accordingly
dom.idNamespace = function idNamespace( element , namespace )
{
	var elements , replacement = {} ;
	
	elements = element.querySelectorAll( '*' ) ;
	
	dom.batch( dom.idNamespace.idAttributePass , elements , namespace , replacement ) ;
	dom.batch( dom.idNamespace.otherAttributesPass , elements , replacement ) ;
} ;

// Callbacks for dom.idNamespace(), cleanly hidden behind its namespace

dom.idNamespace.idAttributePass = function idAttributePass( element , namespace , replacement ) {
	replacement[ element.id ] = namespace + '.' + element.id ;
	element.id = replacement[ element.id ] ;
} ;

dom.idNamespace.otherAttributesPass = function otherAttributesPass( element , replacement ) {
	dom.batch( dom.idNamespace.oneAttributeSubPass , element.attributes , replacement ) ;
} ;

dom.idNamespace.oneAttributeSubPass = function oneAttributeSubPass( attr , replacement ) {
	
	// We have to search all url(#id) like substring in the current attribute's value
	attr.value = attr.value.replace( /url\(#([^)]+)\)/g , function( match , id ) {
		
		// No replacement? return the matched string
		if ( ! replacement[ id ] ) { return match ; }
		
		// Or return the replacement ID
		return 'url(#' + replacement[ id ] + ')' ;
	} ) ;
} ;



		/* Function useful for .batch() as callback */
		/* ... to avoid defining again and again the same callback function */

// Change id
dom.id = function id( element , id ) { element.id = id ; } ;

// Like jQuery .text().
dom.text = function text( element , text ) { element.textContent = text ; } ;

// Like jQuery .html().
dom.html = function html( element , html ) { element.innerHTML = html ; } ;





},{"./svg.js":7}],7:[function(require,module,exports){
(function (process){
/*
	The Cedric's Swiss Knife (CSK) - CSK DOM toolbox

	Copyright (c) 2015 - 2016 Cédric Ronvel 
	
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



// Load modules
var fs = require( 'fs' ) ;
//var string = require( 'string-kit' ) ;
var dom = require( './dom.js' ) ;



var domSvg = {} ;
module.exports = domSvg ;



/*
	load( container , url , [options] , callback )
	
	* container: null or the DOM element where the <svg> tag will be put
	* url: the URL of the .svg file
	* options: an optional object with optional options
		* id: the id attribute of the <svg> tag (recommanded)
		* class: a class object to add/remove on the <svg> tag
		* hidden: inject the svg but make it hidden (useful to apply modification before the show)
		* noWidthHeightAttr: remove the width and height attribute of the <svg> tag
		* css: a css object to apply on the <svg> tag
	* callback: completion callback
*/
domSvg.load = function load( container , url , options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( url.substring( 0 , 7 ) === 'file://' && ! process.browser )
	{
		// Use Node.js 'fs' module
		
		fs.readFile( url.slice( 7 ) , function( error , content ) {
			
			if ( error ) { callback( error ) ; return ; }
			
			var parser = new DOMParser() ;
			var svg = parser.parseFromString( content.toString() , 'application/xml' ).documentElement ;
			
			try {
				domSvg.attachXmlTo( container , svg , options ) ;
			}
			catch ( error ) {
				callback( error ) ;
				return ;
			}
			
			callback( undefined , svg ) ;
		} ) ;
	}
	else
	{
		// Use an AJAX HTTP Request
		
		domSvg.ajax( url , function( error , xmlDoc ) {
			
			if ( error ) { callback( error ) ; return ; }
			
			var svg = xmlDoc.documentElement ;
			
			try {
				domSvg.attachXmlTo( container , svg , options ) ;
			}
			catch ( error ) {
				callback( error ) ;
				return ;
			}
			
			callback( undefined , svg ) ;
		} ) ;
	}
} ;



// Dummy ATM...
domSvg.attachXmlTo = function attachXmlTo( container , svg , options )
{
	var viewBox , width , height ;
	
	domSvg.lightCleanup( svg ) ;
	
	// Fix id, if necessary
	if ( options.id !== undefined )
	{
		if ( typeof options.id === 'string' ) { svg.setAttribute( 'id' , options.id ) ; }
		else if ( ! options.id ) { svg.removeAttribute( 'id' ) ; }
	}
	
	if ( options.class && typeof options.class === 'object' ) { dom.class( svg , options.class ) ; }
	
	if ( options.idNamespace ) { dom.idNamespace( svg , options.idNamespace ) ; }
	
	if ( options.hidden ) { svg.style.visibility = 'hidden' ; }
	
	if ( options.noWidthHeightAttr )
	{
		// Save and remove the width and height attribute
		width = svg.getAttribute( 'width' ) ;
		height = svg.getAttribute( 'height' ) ;
		
		svg.removeAttribute( 'height' ) ;
		svg.removeAttribute( 'width' ) ;
		
		// if the svg don't have a viewBox attribute, set it now from the width and height (it works most of time)
		if ( ! svg.getAttribute( 'viewBox' ) && width && height )
		{
			viewBox = '0 0 ' + width + ' ' + height ;
			//console.log( "viewBox:" , viewBox ) ;
			svg.setAttribute( 'viewBox' , viewBox ) ;
		}
	}
	
	if ( options.css ) { dom.css( svg , options.css ) ; }
	
	// If a container was specified, attach to it
	if ( container ) { container.appendChild( svg ) ; }
} ;



domSvg.lightCleanup = function lightCleanup( svgElement )
{
	removeAllTag( svgElement , 'metadata' ) ;
	removeAllTag( svgElement , 'script' ) ;
} ;



// Should remove all tags and attributes that have non-registered namespace,
// e.g.: sodipodi, inkscape, etc...
//domSvg.heavyCleanup = function heavyCleanup( svgElement ) {} ;



function removeAllTag( container , tag )
{
	var i , elements , element ;
	
	elements = container.getElementsByTagName( tag ) ;
	
	for ( i = 0 ; i < elements.length ; i ++ )
	{
		element = elements.item( i ) ;
		element.parentNode.removeChild( element ) ;
	}
}






domSvg.ajax = function ajax( url , callback )
{
	var xhr = new XMLHttpRequest() ;
	
	//console.warn( "ajax url:" , url ) ;
	
	xhr.responseType = 'document' ;
	xhr.onreadystatechange = domSvg.ajax.ajaxStatus.bind( xhr , callback ) ;
	xhr.open( 'GET', url ) ;
	xhr.send() ;
} ;



domSvg.ajax.ajaxStatus = function ajaxStatus( callback )
{
	// From MDN: In the event of a communication error (such as the webserver going down),
	// an exception will be thrown in the when attempting to access the 'status' property. 
	
	try {
		if ( this.readyState === 4 )
		{
			if ( this.status === 200 )
			{
				callback( undefined , this.responseXML ) ;
			}
			else if ( this.status === 0 && this.responseXML )	// Yay, loading with file:// does not provide any status...
			{
				callback( undefined , this.responseXML ) ;
			}
			else
			{
				if ( this.status ) { callback( this.status ) ; }
				else { callback( new Error( "[dom-kit.svg] ajaxStatus(): Error with falsy status" ) ) ; }
			}
		}
	}
	catch ( error ) {
		callback( error ) ;
	}
} ;



}).call(this,require('_process'))
},{"./dom.js":6,"_process":14,"fs":5}],8:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],9:[function(require,module,exports){
/*
	Kung Fig
	
	Copyright (c) 2015 - 2016 Cédric Ronvel
	
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



// Load modules
//var tree = require( 'tree-kit' ) ;



// Create and export the module
var treeOps = {} ;
module.exports = treeOps ;



// Reduce then transform to object
treeOps.reduceToObject = function reduceToObject( object )
{
	return treeOps.toObject( treeOps.reduce.apply( this , arguments ) ) ;
} ;



// Remove all treeOps mark and operators, transform to a regular object with values
treeOps.toObject = function toObject( object )
{
	if ( ! isPlainObject( object ) ) { return object ; }
	
	var i , iMax , parts , value ,
		output = {} ,
		keys = Object.keys( object ) ;
	
	for ( i = 0 , iMax = keys.length ; i < iMax ; i ++ )
	{
		parts = this.splitOpKey( keys[ i ] ) ;
		
		// Skip operators
		if ( parts.operator ) { continue ; }
		
		value = object[ keys[ i ] ] ;
		
		if ( isPlainObject( value ) ) { value = treeOps.toObject( value ) ; }
		
		output[ parts.baseKey ] = value ;
	}
	
	return output ;
} ;



// Stack multiple object structure into one new object, do not apply operators
treeOps.stack = function stack()
{
	var i , iMax = arguments.length ,  stacked = {} ;
	
	for ( i = 0 ; i < iMax ; i ++ )
	{
		//if ( ! arguments[ i ] || typeof arguments[ i ] !== 'object' || Array.isArray( arguments[ i ] ) ) { continue ; }
		if ( ! isPlainObject( arguments[ i ] ) ) { continue ; }
		this.stackInto( arguments[ i ] , stacked ) ;
	}
	
	return stacked ;
} ;



// Stack multiple object structure into the first object, do not apply operators
treeOps.autoStack = function autoStack( stacked )
{
	//if ( ! stacked || typeof stacked !== 'object' || Array.isArray( stacked ) ) { return stacked ; }
	if ( ! isPlainObject( stacked ) ) { return stacked ; }
	
	var i , iMax = arguments.length ;
	
	for ( i = 1 ; i < iMax ; i ++ )
	{
		//if ( ! arguments[ i ] || typeof arguments[ i ] !== 'object' || Array.isArray( arguments[ i ] ) ) { continue ; }
		if ( ! isPlainObject( arguments[ i ] ) ) { continue ; }
		this.stackInto( arguments[ i ] , stacked ) ;
	}
	
	return stacked ;
} ;



// Stack the source into the target, do not apply operators
treeOps.stackInto = function stackInto( source , target )
{
	var i , iMax , parts , foreachKey , nonForeachKey , key , keys = Object.keys( source ) ;
	
	iMax = keys.length ;
	
	for ( i = 0 ; i < iMax ; i ++ )
	{
		key = keys[ i ] ;
		
		// Skip empty keys, avoid infinite recursions, also the empty operator is not allowed on the root object
		if ( ! key ) { continue ; }
		
		parts = this.splitOpKey( key ) ;
		
		if ( parts.foreach )
		{
			if ( Array.isArray( source[ key ] ) )
			{
				nonForeachKey = key[ 0 ] === '(' ?
					'(' + key.slice( 2 ) :
					key.slice( 1 ) ;
				
				//console.log( "source is array, operator:" , parts.operator , nonForeachKey , target[ nonForeachKey ] ) ;
				if ( target[ nonForeachKey ] !== undefined )
				{
					//console.log( "target non-foreach operator exist" ) ;
					if ( Array.isArray( target[ key ] ) ) { target[ key ].push( target[ nonForeachKey ] ) ; }
					else { target[ key ] = [ target[ nonForeachKey ] ] ; }
					delete target[ nonForeachKey ] ;
				}
				
				if ( Array.isArray( target[ key ] ) ) { target[ key ] = target[ key ].concat( source[ key ] ) ; }
				else { target[ key ] = source[ key ] ; }
			}
			
			continue ;
		}
		
		foreachKey = key[ 0 ] === '(' ?
			'(#' + key.slice( 1 ) :
			'#' + key ;
		
		if ( Array.isArray( target[ foreachKey ] ) )
		{
			if ( target[ key ] === undefined )
			{
				target[ foreachKey ].push( source[ key ] ) ;
			}
			else
			{
				target[ foreachKey ] = target[ foreachKey ].concat( [ target[ key ] , source[ key ] ] ) ;
			}
			
			delete target[ key ] ;
		}
		else if ( target[ key ] === undefined )
		{
			target[ key ] = source[ key ] ;
		}
		else
		{
			target[ foreachKey ] = [ target[ key ] , source[ key ] ] ;
			delete target[ key ] ;
		}
	}
} ;



// Reduce a previously stacked (or not) object by applying operators.
// Do not modify the original object, create a brand new one.
// In case of multiple arguments, they are first “stacked” into a recipient object.
// Applied operators are removed.
treeOps.reduce = function reduce( object )
{
	//if ( ! object || typeof object !== 'object' || Array.isArray( object ) ) { return object ; }
	if ( ! isPlainObject( object ) ) { return object ; }
	
	object = this.stack.apply( this , arguments ) ;
	
	//console.log( "reduce after autoStack():" , require('string-kit').inspect( {style:'color',depth:10},object ) ) ;
	return this.reduceObject( object , [ object ] ) ;
} ;



// Reduce a previously stacked (or not) object by applying operators.
// In case of multiple arguments, they are first “autoStacked” into the first one before the first one is reduced.
// Applied operators are removed.
treeOps.autoReduce = function autoReduce( object )
{
	//if ( ! object || typeof object !== 'object' || Array.isArray( object ) ) { return object ; }
	if ( ! isPlainObject( object ) ) { return object ; }
	
	if ( arguments.length > 1 ) { this.autoStack.apply( this , arguments ) ; }
	
	//console.log( "autoReduce after autoStack():" , require('string-kit').inspect( {style:'color',depth:10},object ) ) ;
	return this.reduceObject( object , [ object ] ) ;
} ;



// Reduce one object
treeOps.reduceObject = function reduceObject( object , antiCircularObjectList )
{
	var i , iMax , parts , ops = [] , operands , baseKey , key , keys = Object.keys( object ) ;
	
	iMax = keys.length ;
	
	// First, list all operations
	for ( i = 0 ; i < iMax ; i ++ )
	{
		// Skip empty keys, avoid infinite recursions, also the empty operator is not allowed on the root object.
		// Also skip property with undefined value, undefined is the same as no property in the treeOps world.
		if ( ! keys[ i ] || object[ keys[ i ] ] === undefined ) { delete object[ keys[ i ] ] ; continue ; }
		
		parts = this.splitOpKey( keys[ i ] ) ;
		//console.log( "'" + parts.operator + "'" ) ;
		parts.rank = this.operators[ parts.operator ].rank ;
		ops.push( parts ) ;
	}
	
	// Sort all operations, so they will be applied in the correct order
	ops.sort( sortOperations ) ;
	
	// Apply anything
	for ( i = 0 , iMax = ops.length ; i < iMax ; i ++ )
	{
		baseKey = ops[ i ].baseKey ;
		key = ops[ i ].key ;
		
		if ( ! baseKey )
		{
			// We want to combine with the root object, create a temporary clone
			
			//console.log( ">>> no basekey!" ) ;
			object[''] = {} ;
			this.assignObject( object[''] , object ) ;
			
			// Delete the operator about to be applied to from the clone, delete self-reference
			delete object[''][ key ] ;
			delete object[''][''] ;
		}
		
		if ( ops[ i ].foreach )
		{
			if ( ! Array.isArray( object[ key ] ) )
			{
				// This is a bad foreach key, due to a userland bad entry: remove that key and move forward.
				delete object[ key ] ;
				continue ;
			}
			
			object[ baseKey ] = this.operators[ ops[ i ].operator ].reduce.call(
				this ,
				object[ baseKey ] ,
				object[ key ]
			) ;
			
			if ( object[ baseKey ] === undefined ) { delete object[ baseKey ] ; }
			
			if ( object[ key ].length === 0 ) { delete object[ key ] ; }
			else if ( object[ key ].length === 1 ) { object[ key.slice( 1 ) ] = object[ key ][ 0 ] ; delete object[ key ] ; }
		}
		else if ( ops[ i ].operator )
		{
			operands = [ object[ key ] ] ;
			
			//console.log( ">>> before" ) ;
			//console.log( ">>> " , ops[ i ].operator ) ;
			object[ baseKey ] = this.operators[ ops[ i ].operator ].reduce.call(
				this ,
				object[ baseKey ] ,
				operands
			) ;
			//console.log( ">>> after" ) ;

			if ( object[ baseKey ] === undefined ) { delete object[ baseKey ] ; }
			
			if ( operands.length === 0 ) { delete object[ key ] ; }
		}
		
		if (
			//object[ baseKey ] && typeof object[ baseKey ] === 'object' && ! Array.isArray( object[ baseKey ] ) &&
			isPlainObject( object[ baseKey ] ) &&
			antiCircularObjectList.indexOf( object[ baseKey ] ) === -1
		)
		{
			antiCircularObjectList.push( object[ baseKey ] ) ;
			this.reduceObject( object[ baseKey ] , antiCircularObjectList ) ;
		}
		
		if ( ! baseKey )
		{
			// We have combined with the root object, assign the clone to the root
			
			//if ( object[''] && typeof object[''] === 'object' && ! Array.isArray( object[''] ) )
			if ( isPlainObject( object[''] ) )
			{
				// The object ref has changed, but we cannot blindly assign object=object['']
				// because the parent object will still refer to the old one
				this.assignObject( object , object[''] ) ;
			}
			
			delete object[''] ;
			
			// Operations on the root object are typically unsafe: some remaining operations may had gone
			// and some new one should be created.
			// We have to run again reduceObject() for the whole newly assigned object.
			
			return this.reduceObject( object , antiCircularObjectList ) ;
		}
	}
	
	return object ;
} ;



function sortOperations( a , b )
{
	// First, the operator rank is checked,
	// then root object operations come last,
	// and finally 'foreach' operations come first
	return ( a.rank - b.rank ) ||
		( ( a.baseKey ? 0 : 1 ) - ( b.baseKey ? 0 : 1 ) ) ||
		( ( a.foreach ? 0 : 1 ) - ( b.foreach ? 0 : 1 ) ) ;
}



function isPlainObject( value )
{
	var proto ;
	
	return value &&
		typeof value === 'object' &&
		( ( proto = Object.getPrototypeOf( value ) ) === Object.prototype || proto === null ) ;
}



// Those operators do not need to be inside ()
treeOps.reservedOperators = {
//	'@': true ,	// needed?
	'+': true ,
	'-': true ,
	'*': true ,
	'/': true ,
	'*>': true ,
	'<*': true ,
	'*>>': true ,
	'<<*': true ,
	'+>': true ,
	'<+': true
} ;

// Expand them all with the 'foreach' prefix (#)
Object.keys( treeOps.reservedOperators ).forEach( function( k ) {
	treeOps.reservedOperators[ '#' + k ] = true ;
} ) ;



treeOps.reservedKeyStart = {
//	'@': true ,	// needed?
	'#': true ,
	'(': true ,
	'+': true ,
	'-': true ,
	'*': true ,
	'/': true ,
	'<' : true ,
	'?': true ,
	'!': true ,
	'^': true ,
} ;



// NOTE: it MUST be efficient, hence the strange switch-case hell

treeOps.splitOpKey = function splitOpKey( key )
{
	var i , iMax , opkey = key , splitted , foreach = false ;
	
	if ( opkey[ 0 ] === '(' )
	{
		opkey = key.slice( 1 ) ;
		
		if ( opkey[ 0 ] === '#' )
		{
			foreach = true ;
			opkey = opkey.slice( 1 ) ;
		}
		
		for ( i = 0 , iMax = opkey.length ; i < iMax && opkey[ i ] !== ')' ; i ++ ) {} // jshint ignore:line
		
		splitted = { operator: opkey.slice( 0 , i ) , baseKey: opkey.slice( i + 1 ) , key: key } ;
	}
	else
	{
		if ( opkey[ 0 ] === '#' )
		{
			foreach = true ;
			opkey = opkey.slice( 1 ) ;
		}
		
		switch ( opkey[ 0 ] )
		{
			/*
			case '$' :
				splitted = { operator: '$' , baseKey: opkey.slice( 1 ) , key: key } ;
				break ;
			*/
			case '+' :
				switch ( opkey[ 1 ] )
				{
					case '>' :
						splitted = { operator: '+>' , baseKey: opkey.slice( 2 ) , key: key } ;
						break ;
					default :
						splitted = { operator: '+' , baseKey: opkey.slice( 1 ) , key: key } ;
				}
				break ;
			case '-' :
				splitted = { operator: '-' , baseKey: opkey.slice( 1 ) , key: key } ;
				break ;
			case '*' :
				switch ( opkey[ 1 ] )
				{
					case '>' :
						switch ( opkey[ 2 ] )
						{
							case '>' :
								splitted = { operator: '*>>' , baseKey: opkey.slice( 3 ) , key: key } ;
								break ;
							default :
								splitted = { operator: '*>' , baseKey: opkey.slice( 2 ) , key: key } ;
						}
						break ;
					default :
						splitted = { operator: '*' , baseKey: opkey.slice( 1 ) , key: key } ;
				}
				break ;
			case '/' :
				splitted = { operator: '/' , baseKey: opkey.slice( 1 ) , key: key } ;
				break ;
			case '<' :
				switch ( opkey[ 1 ] )
				{
					case '<' :
						switch ( opkey[ 2 ] )
						{
							case '*' :
								splitted = { operator: '<<*' , baseKey: opkey.slice( 3 ) , key: key } ;
								break ;
							default :
								splitted = { operator: '' , baseKey: opkey , key: key } ;
						}
						break ;
					case '*' :
						splitted = { operator: '<*' , baseKey: opkey.slice( 2 ) , key: key } ;
						break ;
					case '+' :
						splitted = { operator: '<+' , baseKey: opkey.slice( 2 ) , key: key } ;
						break ;
					case '^' :
						splitted = { operator: '<^' , baseKey: opkey.slice( 2 ) , key: key } ;
						break ;
					default :
						splitted = { operator: '' , baseKey: opkey , key: key } ;
				}
				break ;
			case '^' :
				splitted = { operator: '^' , baseKey: opkey.slice( 1 ) , key: key } ;
				break ;
			//case '@' :
			//	/!\ Typically, this should never been encountered here, but solved at file loading
			//	splitted = { operator: '@' , baseKey: opkey.slice( 1 ) , key: key } ;
			default:
				splitted = { operator: '' , baseKey: opkey , key: key } ;
		}
	}
	
	splitted.foreach = foreach ;
	splitted.fullOperator = foreach ? '#' + splitted.operator : splitted.operator ;
	
	return splitted ;
} ;



treeOps.assignObject = function assignObject( target , source )
{
	var k ;
	
	for ( k in target ) { delete target[ k ] ; }
	for ( k in source ) { target[ k ] = source[ k ] ; }
} ;



/*
ASCII: &~#{}()[]-|`\_^°+=$%><*?,;.:/!
ASCII 8bits: §«»

# foreach prefix: the operand is an array, the operator should be applied to each element

+ add
- substract
* multiply
/ divide
+> append (string, array)
<+ prepend (string, array)
*> merge after (object), i.e. overwrite
<* merge before (object), i.e. do not overwrite
*>> merge after, lesser priority
<<* merge before, lesser priority

Not implemented yet / not specified:
*+> merge after (object), i.e. overwrite, use concat after when possible
<+* merge before (object), i.e. do not overwrite, use concat before when possible
$ global reference/link
?: set if it does not exist (define)?
!: set if it exists (rewrite)?
! delete?
_ gettext?
^ pow
<^ exp (the arg is the base, the existing key is the exponent)
*/

treeOps.operators = {} ;

var rank = 0 ;

// The order matter: it is sorted from the highest to the lowest priority

// key: the full key, prepended by the operator
// baseKey: the key without the operator

// Assign operator (aka empty operator)
treeOps.operators[''] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		var i , iMax = operands.length ;
		
		for ( i = 0 ; i < iMax ; i ++ )
		{
			if (
				//existing && typeof existing === 'object' && ! Array.isArray( existing ) &&
				//operands[ i ] && typeof operands[ i ] === 'object' && ! Array.isArray( operands[ i ] )
				isPlainObject( existing ) && isPlainObject( operands[ i ] )
			)
			{
				// Both are object: autoReduce
				this.autoReduce( existing , operands[ i ] ) ;
			}
			else
			{
				// One of them is not an object: assign
				existing = operands[ i ] ;
			}
		}
		
		operands.length = 0 ;
		return existing ;
	}
} ;

// Combine (subtree) before
treeOps.operators['<*'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		//if ( ! existing || typeof existing !== 'object' || Array.isArray( existing ) )
		if ( ! isPlainObject( existing ) )
		{
			// Do nothing...
			return existing ;
		}
		
		// We have to reverse things before calling autoReduce()
		var rcpt = {} ;
		var args = [ existing ].concat( operands ).concat( rcpt ).reverse() ;
		
		this.autoReduce.apply( this , args ) ;
		operands.length = 0 ;
		
		return rcpt ;
		
		// Or:
		// this.assignObject( existing , rcpt ) ;
		// return existing ;
	}
} ;

// Combine (subtree) after
treeOps.operators['*>'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		//if ( ! existing || typeof existing !== 'object' || Array.isArray( existing ) )
		if ( ! isPlainObject( existing ) )
		{
			// Do nothing...
			return existing ;
		}
		
		//console.log( "calling autoReduce with:" , require('string-kit').inspect( {style:'color',depth:10},[ existing ].concat( operands ) ) ) ;
		this.autoReduce.apply( this , [ existing ].concat( operands ) ) ;
		operands.length = 0 ;
		return existing ;
	}
} ;

// Combine (subtree) before, lower priority
treeOps.operators['<<*'] = {
	rank: rank ++ ,
	reduce: treeOps.operators['<*'].reduce
} ;

// Combine (subtree) after, lower priority
treeOps.operators['*>>'] = {
	rank: rank ++ ,
	reduce: treeOps.operators['*>'].reduce
} ;

// Concat before / prepend
treeOps.operators['<+'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		var i , iMax = operands.length , operand = [] ;
		
		for ( i = 0 ; i < iMax ; i ++ )
		{
			if ( Array.isArray( operands[ i ] ) )
			{
				operand = operands[ i ].concat( operand ) ;
			}
		}
		
		if ( Array.isArray( existing ) )
		{
			existing = operand.concat( existing ) ;
			operands.length = 0 ;
			return existing ;
		}
		else
		{
			operands[ 0 ] = operand ;
			operands.length = 1 ;
			return existing ;
		}
	}
} ;

// Concat after / append
treeOps.operators['+>'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		var i , iMax = operands.length , operand = [] ;
		
		for ( i = 0 ; i < iMax ; i ++ )
		{
			if ( Array.isArray( operands[ i ] ) )
			{
				operand = operand.concat( operands[ i ] ) ;
			}
		}
		
		if ( Array.isArray( existing ) )
		{
			existing = existing.concat( operand ) ;
			operands.length = 0 ;
			return existing ;
		}
		else
		{
			operands[ 0 ] = operand ;
			operands.length = 1 ;
			return existing ;
		}
	}
} ;

treeOps.operators['/'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		var i , iMax = operands.length , operand = 1 ;
		
		for ( i = 0 ; i < iMax ; i ++ )
		{
			if ( ! isNaN( operands[ i ] ) )
			{
				operand *= + operands[ i ] ;
			}
		}
		
		if ( ! isNaN( existing ) )
		{
			existing = + existing / operand ;
			operands.length = 0 ;
			return existing ;
		}
		else
		{
			operands[ 0 ] = operand ;
			operands.length = 1 ;
			return existing ;
		}
	}
} ;

treeOps.operators['*'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		var i , iMax = operands.length , operand = 1 ;
		
		for ( i = 0 ; i < iMax ; i ++ )
		{
			if ( ! isNaN( operands[ i ] ) )
			{
				operand *= + operands[ i ] ;
			}
		}
		
		if ( ! isNaN( existing ) )
		{
			existing = + existing * operand ;
			operands.length = 0 ;
			return existing ;
		}
		else
		{
			operands[ 0 ] = operand ;
			operands.length = 1 ;
			return existing ;
		}
	}
} ;

treeOps.operators['-'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		var i , iMax = operands.length , operand = 0 ;
		
		for ( i = 0 ; i < iMax ; i ++ )
		{
			if ( ! isNaN( operands[ i ] ) )
			{
				operand += + operands[ i ] ;
			}
		}
		
		if ( ! isNaN( existing ) )
		{
			existing = + existing - operand ;
			operands.length = 0 ;
			return existing ;
		}
		else
		{
			operands[ 0 ] = operand ;
			operands.length = 1 ;
			return existing ;
		}
	}
} ;

treeOps.operators['+'] = {
	rank: rank ++ ,
	reduce: function( existing , operands ) {
		var i , iMax = operands.length , operand = 0 ;
		
		for ( i = 0 ; i < iMax ; i ++ )
		{
			if ( ! isNaN( operands[ i ] ) )
			{
				operand += + operands[ i ] ;
			}
		}
		
		if ( ! isNaN( existing ) )
		{
			existing = + existing + operand ;
			operands.length = 0 ;
			return existing ;
		}
		else
		{
			operands[ 0 ] = operand ;
			operands.length = 1 ;
			return existing ;
		}
	}
} ;



/*
The link mechanism is more complicated: it needs multipass at whole-tree level

treeOps.operators['$'] = {
	rank: rank ++ ,
	multipass: true ,
	reduce: function( target , key , baseKey , root ) {
		
		var parts , source = root ;
		
		if ( target[ key ] ) { source = tree.path.get( root , target[ key ] ) ; }
		
		target[ baseKey ] = source ;
		delete target[ key ] ;
		
		// Multipass
		parts = this.splitOpKey( baseKey ) ;
		parts.rank = this.operators[ parts.operator ].rank ;
		
		return parts ;
	}
} ;
*/

},{}],10:[function(require,module,exports){
(function (global){
/*
	Next Gen Events
	
	Copyright (c) 2015 - 2016 Cédric Ronvel
	
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



function NextGenEvents() { return Object.create( NextGenEvents.prototype ) ; }
module.exports = NextGenEvents ;
NextGenEvents.prototype.__prototypeUID__ = 'nextgen-events/NextGenEvents' ;
NextGenEvents.prototype.__prototypeVersion__ = require( '../package.json' ).version ;

			/* Basic features, more or less compatible with Node.js */



NextGenEvents.SYNC = -Infinity ;

// Not part of the prototype, because it should not pollute userland's prototype.
// It has an eventEmitter as 'this' anyway (always called using call()).
NextGenEvents.init = function init()
{
	Object.defineProperty( this , '__ngev' , {
		configurable: true ,
		value: {
			nice: NextGenEvents.SYNC ,
			interruptible: false ,
			recursion: 0 ,
			contexts: {} ,
			
			// States by events
			states: {} ,
			
			// State groups by events
			stateGroups: {} ,
			
			// Listeners by events
			listeners: {
				// Special events
				error: [] ,
				interrupt: [] ,
				newListener: [] ,
				removeListener: []
			}
		}
	} ) ;
} ;



// Use it with .bind()
NextGenEvents.filterOutCallback = function( what , currentElement ) { return what !== currentElement ; } ;



// .addListener( eventName , [fn] , [options] )
NextGenEvents.prototype.addListener = function addListener( eventName , fn , options )
{
	var listener = {} , newListenerListeners ;
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }
	
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".addListener(): argument #0 should be a non-empty string" ) ; }
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	listener.fn = fn || options.fn ;
	listener.id = options.id !== undefined ? options.id : listener.fn ;
	listener.once = !! options.once ;
	listener.async = !! options.async ;
	listener.eventObject = !! options.eventObject ;
	listener.nice = options.nice !== undefined ? Math.floor( options.nice ) : NextGenEvents.SYNC ;
	listener.context = typeof options.context === 'string' ? options.context : null ;
	
	if ( typeof listener.fn !== 'function' )
	{
		throw new TypeError( ".addListener(): a function or an object with a 'fn' property which value is a function should be provided" ) ;
	}
	
	// Implicit context creation
	if ( listener.context && typeof listener.context === 'string' && ! this.__ngev.contexts[ listener.context ] )
	{
		this.addListenerContext( listener.context ) ;
	}
	
	// Note: 'newListener' and 'removeListener' event return an array of listener, but not the event name.
	// So the event's name can be retrieved in the listener itself.
	listener.event = eventName ;
	
	if ( this.__ngev.listeners.newListener.length )
	{
		// Extra care should be taken with the 'newListener' event, we should avoid recursion
		// in the case that eventName === 'newListener', but inside a 'newListener' listener,
		// .listenerCount() should report correctly
		newListenerListeners = this.__ngev.listeners.newListener.slice() ;
		
		this.__ngev.listeners[ eventName ].push( listener ) ;
		
		// Return an array, because one day, .addListener() may support multiple event addition at once,
		// e.g.: .addListener( { request: onRequest, close: onClose, error: onError } ) ;
		NextGenEvents.emitEvent( {
			emitter: this ,
			name: 'newListener' ,
			args: [ [ listener ] ] ,
			listeners: newListenerListeners
		} ) ;
		
		if ( this.__ngev.states[ eventName ] ) { NextGenEvents.emitToOneListener( this.__ngev.states[ eventName ] , listener ) ; }
		
		return this ;
	}
	
	this.__ngev.listeners[ eventName ].push( listener ) ;
	
	if ( this.__ngev.states[ eventName ] ) { NextGenEvents.emitToOneListener( this.__ngev.states[ eventName ] , listener ) ; }
	
	return this ;
} ;

NextGenEvents.prototype.on = NextGenEvents.prototype.addListener ;



// Shortcut
// .once( eventName , [fn] , [options] )
NextGenEvents.prototype.once = function once( eventName , fn , options )
{
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }
	
	return this.addListener( eventName , fn , options ) ;
} ;



NextGenEvents.prototype.removeListener = function removeListener( eventName , id )
{
	var i , length , newListeners = [] , removedListeners = [] ;
	
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeListener(): argument #0 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }
	
	length = this.__ngev.listeners[ eventName ].length ;
	
	// It's probably faster to create a new array of listeners
	for ( i = 0 ; i < length ; i ++ )
	{
		if ( this.__ngev.listeners[ eventName ][ i ].id === id )
		{
			removedListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
		}
		else
		{
			newListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
		}
	}
	
	this.__ngev.listeners[ eventName ] = newListeners ;
	
	if ( removedListeners.length && this.__ngev.listeners.removeListener.length )
	{
		this.emit( 'removeListener' , removedListeners ) ;
	}
	
	return this ;
} ;

NextGenEvents.prototype.off = NextGenEvents.prototype.removeListener ;



NextGenEvents.prototype.removeAllListeners = function removeAllListeners( eventName )
{
	var removedListeners ;
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	if ( eventName )
	{
		// Remove all listeners for a particular event
		
		if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeAllListeners(): argument #0 should be undefined or a non-empty string" ) ; }
		
		if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }
		
		removedListeners = this.__ngev.listeners[ eventName ] ;
		this.__ngev.listeners[ eventName ] = [] ;
		
		if ( removedListeners.length && this.__ngev.listeners.removeListener.length )
		{
			this.emit( 'removeListener' , removedListeners ) ;
		}
	}
	else
	{
		// Remove all listeners for any events
		// 'removeListener' listeners cannot be triggered: they are already deleted
		this.__ngev.listeners = {} ;
	}
	
	return this ;
} ;



NextGenEvents.listenerWrapper = function listenerWrapper( listener , event , context )
{
	var returnValue , serial , listenerCallback ;
	
	if ( event.interrupt ) { return ; }
	
	if ( listener.async )
	{
		//serial = context && context.serial ;
		if ( context )
		{
			serial = context.serial ;
			context.ready = ! serial ;
		}
		
		listenerCallback = function( arg ) {
			
			event.listenersDone ++ ;
			
			// Async interrupt
			if ( arg && event.emitter.__ngev.interruptible && ! event.interrupt && event.name !== 'interrupt' )
			{
				event.interrupt = arg ;
				
				if ( event.callback )
				{
					event.callback( event.interrupt , event ) ;
					delete event.callback ;
				}
				
				event.emitter.emit( 'interrupt' , event.interrupt ) ;
			}
			else if ( event.listenersDone >= event.listeners.length && event.callback )
			{
				event.callback( undefined , event ) ;
				delete event.callback ;
			}
			
			// Process the queue if serialized
			if ( serial ) { NextGenEvents.processQueue.call( event.emitter , listener.context , true ) ; }
			
		} ;
		
		if ( listener.eventObject ) { listener.fn( event , listenerCallback ) ; }
		else { returnValue = listener.fn.apply( undefined , event.args.concat( listenerCallback ) ) ; }
	}
	else
	{
		if ( listener.eventObject ) { listener.fn( event ) ; }
		else { returnValue = listener.fn.apply( undefined , event.args ) ; }
		
		event.listenersDone ++ ;
	}
	
	// Interrupt if non-falsy return value, if the emitter is interruptible, not already interrupted (emit once),
	// and not within an 'interrupt' event.
	if ( returnValue && event.emitter.__ngev.interruptible && ! event.interrupt && event.name !== 'interrupt' )
	{
		event.interrupt = returnValue ;
		
		if ( event.callback )
		{
			event.callback( event.interrupt , event ) ;
			delete event.callback ;
		}
		
		event.emitter.emit( 'interrupt' , event.interrupt ) ;
	}
	else if ( event.listenersDone >= event.listeners.length && event.callback )
	{
		event.callback( undefined , event ) ;
		delete event.callback ;
	}
} ;



// A unique event ID
var nextEventId = 0 ;



/*
	emit( [nice] , eventName , [arg1] , [arg2] , [...] , [emitCallback] )
*/
NextGenEvents.prototype.emit = function emit()
{
	var event ;
	
	event = { emitter: this } ;
	
	// Arguments handling
	if ( typeof arguments[ 0 ] === 'number' )
	{
		event.nice = Math.floor( arguments[ 0 ] ) ;
		event.name = arguments[ 1 ] ;
		if ( ! event.name || typeof event.name !== 'string' ) { throw new TypeError( ".emit(): when argument #0 is a number, argument #1 should be a non-empty string" ) ; }
		
		if ( typeof arguments[ arguments.length - 1 ] === 'function' )
		{
			event.callback = arguments[ arguments.length - 1 ] ;
			event.args = Array.prototype.slice.call( arguments , 2 , -1 ) ;
		}
		else
		{
			event.args = Array.prototype.slice.call( arguments , 2 ) ;
		}
	}
	else
	{
		//event.nice = this.__ngev.nice ;
		event.name = arguments[ 0 ] ;
		if ( ! event.name || typeof event.name !== 'string' ) { throw new TypeError( ".emit(): argument #0 should be an number or a non-empty string" ) ; }
		event.args = Array.prototype.slice.call( arguments , 1 ) ;
		
		if ( typeof arguments[ arguments.length - 1 ] === 'function' )
		{
			event.callback = arguments[ arguments.length - 1 ] ;
			event.args = Array.prototype.slice.call( arguments , 1 , -1 ) ;
		}
		else
		{
			event.args = Array.prototype.slice.call( arguments , 1 ) ;
		}
	}
	
	return NextGenEvents.emitEvent( event ) ;
} ;



/*
	At this stage, 'event' should be an object having those properties:
		* emitter: the event emitter
		* name: the event name
		* args: array, the arguments of the event
		* nice: (optional) nice value
		* callback: (optional) a callback for emit
		* listeners: (optional) override the listeners array stored in __ngev
*/
NextGenEvents.emitEvent = function emitEvent( event )
{
	var self = event.emitter ,
		i , iMax , count = 0 , state , removedListeners ;
	
	if ( ! self.__ngev ) { NextGenEvents.init.call( self ) ; }
	
	state = self.__ngev.states[ event.name ] ;
	
	// This is a state event, register it now!
	if ( state !== undefined )
	{
		
		if ( state && event.args.length === state.args.length &&
			event.args.every( function( arg , index ) { return arg === state.args[ index ] ; } ) )
		{
			// The emitter is already in this exact state, skip it now!
			return ;
		}
		
		// Unset all states of that group
		self.__ngev.stateGroups[ event.name ].forEach( function( eventName ) {
			self.__ngev.states[ eventName ] = null ;
		} ) ;
		
		self.__ngev.states[ event.name ] = event ;
	}
	
	if ( ! self.__ngev.listeners[ event.name ] ) { self.__ngev.listeners[ event.name ] = [] ; }
	
	event.id = nextEventId ++ ;
	event.listenersDone = 0 ;
	event.once = !! event.once ;
	
	if ( event.nice === undefined || event.nice === null ) { event.nice = self.__ngev.nice ; }
	
	// Trouble arise when a listener is removed from another listener, while we are still in the loop.
	// So we have to COPY the listener array right now!
	if ( ! event.listeners ) { event.listeners = self.__ngev.listeners[ event.name ].slice() ; }
	
	// Increment self.__ngev.recursion
	self.__ngev.recursion ++ ;
	removedListeners = [] ;
	
	// Emit the event to all listeners!
	for ( i = 0 , iMax = event.listeners.length ; i < iMax ; i ++ )
	{
		count ++ ;
		NextGenEvents.emitToOneListener( event , event.listeners[ i ] , removedListeners ) ;
	}
	
	// Decrement recursion
	self.__ngev.recursion -- ;
	
	// Emit 'removeListener' after calling listeners
	if ( removedListeners.length && self.__ngev.listeners.removeListener.length )
	{
		self.emit( 'removeListener' , removedListeners ) ;
	}
	
	
	// 'error' event is a special case: it should be listened for, or it will throw an error
	if ( ! count )
	{
		if ( event.name === 'error' )
		{
			if ( event.args[ 0 ] ) { throw event.args[ 0 ] ; }
			else { throw Error( "Uncaught, unspecified 'error' event." ) ; }
		}
		
		if ( event.callback )
		{
			event.callback( undefined , event ) ;
			delete event.callback ;
		}
	}
	
	return event ;
} ;



// If removedListeners is not given, then one-time listener emit the 'removeListener' event,
// if given: that's the caller business to do it
NextGenEvents.emitToOneListener = function emitToOneListener( event , listener , removedListeners )
{	
	var self = event.emitter ,
		context , currentNice , emitRemoveListener = false ;
	
	context = listener.context && self.__ngev.contexts[ listener.context ] ;
	
	// If the listener context is disabled...
	if ( context && context.status === NextGenEvents.CONTEXT_DISABLED ) { return ; }
	
	// The nice value for this listener...
	if ( context ) { currentNice = Math.max( event.nice , listener.nice , context.nice ) ; }
	else { currentNice = Math.max( event.nice , listener.nice ) ; }
	
	
	if ( listener.once )
	{
		// We should remove the current listener RIGHT NOW because of recursive .emit() issues:
		// one listener may eventually fire this very same event synchronously during the current loop.
		self.__ngev.listeners[ event.name ] = self.__ngev.listeners[ event.name ].filter(
			NextGenEvents.filterOutCallback.bind( undefined , listener )
		) ;
		
		if ( removedListeners ) { removedListeners.push( listener ) ; }
		else { emitRemoveListener = true ; }
	}
	
	if ( context && ( context.status === NextGenEvents.CONTEXT_QUEUED || ! context.ready ) )
	{
		// Almost all works should be done by .emit(), and little few should be done by .processQueue()
		context.queue.push( { event: event , listener: listener , nice: currentNice } ) ;
	}
	else
	{
		try {
			if ( currentNice < 0 )
			{
				if ( self.__ngev.recursion >= - currentNice )
				{
					setImmediate( NextGenEvents.listenerWrapper.bind( self , listener , event , context ) ) ;
				}
				else
				{
					NextGenEvents.listenerWrapper.call( self , listener , event , context ) ;
				}
			}
			else
			{
				setTimeout( NextGenEvents.listenerWrapper.bind( self , listener , event , context ) , currentNice ) ;
			}
		}
		catch ( error ) {
			// Catch error, just to decrement self.__ngev.recursion, re-throw after that...
			self.__ngev.recursion -- ;
			throw error ;
		}
	}
	
	// Emit 'removeListener' after calling the listener
	if ( emitRemoveListener && self.__ngev.listeners.removeListener.length )
	{
		self.emit( 'removeListener' , [ listener ] ) ;
	}
} ;



NextGenEvents.prototype.listeners = function listeners( eventName )
{
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listeners(): argument #0 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }
	
	// Do not return the array, shallow copy it
	return this.__ngev.listeners[ eventName ].slice() ;
} ;



NextGenEvents.listenerCount = function( emitter , eventName )
{
	if ( ! emitter || ! ( emitter instanceof NextGenEvents ) ) { throw new TypeError( ".listenerCount(): argument #0 should be an instance of NextGenEvents" ) ; }
	return emitter.listenerCount( eventName ) ;
} ;



NextGenEvents.prototype.listenerCount = function( eventName )
{
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listenerCount(): argument #1 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }
	
	return this.__ngev.listeners[ eventName ].length ;
} ;



NextGenEvents.prototype.setNice = function setNice( nice )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	//if ( typeof nice !== 'number' ) { throw new TypeError( ".setNice(): argument #0 should be a number" ) ; }
	
	this.__ngev.nice = Math.floor( +nice || 0 ) ;
} ;



NextGenEvents.prototype.setInterruptible = function setInterruptible( value )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	//if ( typeof nice !== 'number' ) { throw new TypeError( ".setNice(): argument #0 should be a number" ) ; }
	
	this.__ngev.interruptible = !! value ;
} ;



// Make two objects sharing the same event bus
NextGenEvents.share = function( source , target )
{
	if ( ! ( source instanceof NextGenEvents ) || ! ( target instanceof NextGenEvents ) )
	{
		throw new TypeError( 'NextGenEvents.share() arguments should be instances of NextGenEvents' ) ;
	}
	
	if ( ! source.__ngev ) { NextGenEvents.init.call( source ) ; }
	
	Object.defineProperty( target , '__ngev' , {
		configurable: true ,
		value: source.__ngev
	} ) ;
} ;



NextGenEvents.reset = function reset( emitter )
{
	Object.defineProperty( emitter , '__ngev' , {
        configurable: true ,
        value: null
	} ) ;
} ;



// There is no such thing in NextGenEvents, however, we need to be compatible with node.js events at best
NextGenEvents.prototype.setMaxListeners = function() {} ;

// Sometime useful as a no-op callback...
NextGenEvents.noop = function() {} ;





			/* Next Gen feature: states! */



// .defineStates( exclusiveState1 , [exclusiveState2] , [exclusiveState3] , ... )
NextGenEvents.prototype.defineStates = function defineStates()
{
	var self = this ,
		states = Array.prototype.slice.call( arguments ) ;
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	states.forEach( function( state ) {
		self.__ngev.states[ state ] = null ;
		self.__ngev.stateGroups[ state ] = states ;
	} ) ;
} ;



NextGenEvents.prototype.hasState = function hasState( state )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return !! this.__ngev.states[ state ] ;
} ;



NextGenEvents.prototype.getAllStates = function getAllStates()
{
	var self = this ;
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return Object.keys( this.__ngev.states ).filter( function( e ) { return self.__ngev.states[ e ] ; } ) ;
} ;





			/* Next Gen feature: groups! */



NextGenEvents.groupAddListener = function groupAddListener( emitters , eventName , fn , options )
{
	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	fn = fn || options.fn ;
	delete options.fn ;
	
	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;
	
	emitters.forEach( function( emitter ) {
		emitter.addListener( eventName , fn.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;

NextGenEvents.groupOn = NextGenEvents.groupAddListener ;



// Once per emitter
NextGenEvents.groupOnce = function groupOnce( emitters , eventName , fn , options )
{
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }
	
	return this.groupAddListener( emitters , eventName , fn , options ) ;
} ;



// Globally once, only one event could be emitted, by the first emitter to emit
NextGenEvents.groupGlobalOnce = function groupGlobalOnce( emitters , eventName , fn , options )
{
	var fnWrapper , triggered = false ;
	
	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	fn = fn || options.fn ;
	delete options.fn ;
	
	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;
	
	fnWrapper = function() {
		if ( triggered ) { return ; }
		triggered = true ;
		NextGenEvents.groupRemoveListener( emitters , eventName , options.id ) ;
		fn.apply( undefined , arguments ) ;
	} ;
	
	emitters.forEach( function( emitter ) {
		emitter.once( eventName , fnWrapper.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;



// Globally once, only one event could be emitted, by the last emitter to emit
NextGenEvents.groupGlobalOnceAll = function groupGlobalOnceAll( emitters , eventName , fn , options )
{
	var fnWrapper , triggered = false , count = emitters.length ;
	
	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	fn = fn || options.fn ;
	delete options.fn ;
	
	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;
	
	fnWrapper = function() {
		if ( triggered ) { return ; }
		if ( -- count ) { return ; }
		
		// So this is the last emitter...
		
		triggered = true ;
		// No need to remove listeners: there are already removed anyway
		//NextGenEvents.groupRemoveListener( emitters , eventName , options.id ) ;
		fn.apply( undefined , arguments ) ;
	} ;
	
	emitters.forEach( function( emitter ) {
		emitter.once( eventName , fnWrapper.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;



NextGenEvents.groupRemoveListener = function groupRemoveListener( emitters , eventName , id )
{
	emitters.forEach( function( emitter ) {
		emitter.removeListener( eventName , id ) ;
	} ) ;
} ;

NextGenEvents.groupOff = NextGenEvents.groupRemoveListener ;



NextGenEvents.groupRemoveAllListeners = function groupRemoveAllListeners( emitters , eventName )
{
	emitters.forEach( function( emitter ) {
		emitter.removeAllListeners( eventName ) ;
	} ) ;
} ;



NextGenEvents.groupEmit = function groupEmit( emitters )
{
	var eventName , nice , argStart = 2 , argEnd , args , count = emitters.length ,
		callback , callbackWrapper , callbackTriggered = false ;
	
	if ( typeof arguments[ arguments.length - 1 ] === 'function' )
	{
		argEnd = -1 ;
		callback = arguments[ arguments.length - 1 ] ;
		
		callbackWrapper = function( interruption ) {
			if ( callbackTriggered ) { return ; }
			
			if ( interruption )
			{
				callbackTriggered = true ;
				callback( interruption ) ;
			}
			else if ( ! -- count )
			{
				callbackTriggered = true ;
				callback() ;
			}
		} ;
	}
	
	if ( typeof arguments[ 1 ] === 'number' )
	{
		argStart = 3 ;
		nice = typeof arguments[ 1 ] ;
	}
	
	eventName = arguments[ argStart - 1 ] ;
	args = Array.prototype.slice.call( arguments , argStart , argEnd ) ;
	
	emitters.forEach( function( emitter ) {
		NextGenEvents.emitEvent( {
			emitter: emitter ,
			name: eventName ,
			args: args ,
			nice: nice ,
			callback: callbackWrapper
		} ) ;
	} ) ;
} ;



NextGenEvents.groupDefineStates = function groupDefineStates( emitters )
{
	var args = Array.prototype.slice.call( arguments , 1 ) ;
	
	emitters.forEach( function( emitter ) {
		emitter.defineStates.apply( emitter , args ) ;
	} ) ;
} ;





			/* Next Gen feature: contexts! */



NextGenEvents.CONTEXT_ENABLED = 0 ;
NextGenEvents.CONTEXT_DISABLED = 1 ;
NextGenEvents.CONTEXT_QUEUED = 2 ;



NextGenEvents.prototype.addListenerContext = function addListenerContext( contextName , options )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".addListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! this.__ngev.contexts[ contextName ] )
	{
		// A context IS an event emitter too!
		this.__ngev.contexts[ contextName ] = Object.create( NextGenEvents.prototype ) ;
		this.__ngev.contexts[ contextName ].nice = NextGenEvents.SYNC ;
		this.__ngev.contexts[ contextName ].ready = true ;
		this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_ENABLED ;
		this.__ngev.contexts[ contextName ].serial = false ;
		this.__ngev.contexts[ contextName ].queue = [] ;
	}
	
	if ( options.nice !== undefined ) { this.__ngev.contexts[ contextName ].nice = Math.floor( options.nice ) ; }
	if ( options.status !== undefined ) { this.__ngev.contexts[ contextName ].status = options.status ; }
	if ( options.serial !== undefined ) { this.__ngev.contexts[ contextName ].serial = !! options.serial ; }
	
	return this ;
} ;



NextGenEvents.prototype.disableListenerContext = function disableListenerContext( contextName )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_DISABLED ;
	
	return this ;
} ;



NextGenEvents.prototype.enableListenerContext = function enableListenerContext( contextName )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".enableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_ENABLED ;
	
	if ( this.__ngev.contexts[ contextName ].queue.length > 0 ) { NextGenEvents.processQueue.call( this , contextName ) ; }
	
	return this ;
} ;



NextGenEvents.prototype.queueListenerContext = function queueListenerContext( contextName )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".queueListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_QUEUED ;
	
	return this ;
} ;



NextGenEvents.prototype.serializeListenerContext = function serializeListenerContext( contextName , value )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".serializeListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].serial = value === undefined ? true : !! value ;
	
	return this ;
} ;



NextGenEvents.prototype.setListenerContextNice = function setListenerContextNice( contextName , nice )
{
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".setListenerContextNice(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }
	
	this.__ngev.contexts[ contextName ].nice = Math.floor( nice ) ;
	
	return this ;
} ;



NextGenEvents.prototype.destroyListenerContext = function destroyListenerContext( contextName )
{
	var i , length , eventName , newListeners , removedListeners = [] ;
	
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }
	
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	
	// We don't care if a context actually exists, all listeners tied to that contextName will be removed
	
	for ( eventName in this.__ngev.listeners )
	{
		newListeners = null ;
		length = this.__ngev.listeners[ eventName ].length ;
		
		for ( i = 0 ; i < length ; i ++ )
		{
			if ( this.__ngev.listeners[ eventName ][ i ].context === contextName )
			{
				newListeners = [] ;
				removedListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
			else if ( newListeners )
			{
				newListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
		}
		
		if ( newListeners ) { this.__ngev.listeners[ eventName ] = newListeners ; }
	}
	
	if ( this.__ngev.contexts[ contextName ] ) { delete this.__ngev.contexts[ contextName ] ; }
	
	if ( removedListeners.length && this.__ngev.listeners.removeListener.length )
	{
		this.emit( 'removeListener' , removedListeners ) ;
	}
	
	return this ;
} ;



// To be used with .call(), it should not pollute the prototype
NextGenEvents.processQueue = function processQueue( contextName , isCompletionCallback )
{
	var context , job ;
	
	// The context doesn't exist anymore, so just abort now
	if ( ! this.__ngev.contexts[ contextName ] ) { return ; }
	
	context = this.__ngev.contexts[ contextName ] ;
	
	if ( isCompletionCallback ) { context.ready = true ; }
	
	// Should work on serialization here
	
	//console.log( ">>> " , context ) ;
	
	// Increment recursion
	this.__ngev.recursion ++ ;
	
	while ( context.ready && context.queue.length )
	{
		job = context.queue.shift() ;
		
		// This event has been interrupted, drop it now!
		if ( job.event.interrupt ) { continue ; }
		
		try {
			if ( job.nice < 0 )
			{
				if ( this.__ngev.recursion >= - job.nice )
				{
					setImmediate( NextGenEvents.listenerWrapper.bind( this , job.listener , job.event , context ) ) ;
				}
				else
				{
					NextGenEvents.listenerWrapper.call( this , job.listener , job.event , context ) ;
				}
			}
			else
			{
				setTimeout( NextGenEvents.listenerWrapper.bind( this , job.listener , job.event , context ) , job.nice ) ;
			}
		}
		catch ( error ) {
			// Catch error, just to decrement this.__ngev.recursion, re-throw after that...
			this.__ngev.recursion -- ;
			throw error ;
		}
	}
	
	// Decrement recursion
	this.__ngev.recursion -- ;
} ;



// Backup for the AsyncTryCatch
NextGenEvents.on = NextGenEvents.prototype.on ;
NextGenEvents.once = NextGenEvents.prototype.once ;
NextGenEvents.off = NextGenEvents.prototype.off ;



if ( global.AsyncTryCatch )
{
	NextGenEvents.prototype.asyncTryCatchId = global.AsyncTryCatch.NextGenEvents.length ;
	global.AsyncTryCatch.NextGenEvents.push( NextGenEvents ) ;
	
	if ( global.AsyncTryCatch.substituted )
	{
		//console.log( 'live subsitute' ) ;
		global.AsyncTryCatch.substitute() ;
	}
}



// Load Proxy AT THE END (circular require)
NextGenEvents.Proxy = require( './Proxy.js' ) ;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":12,"./Proxy.js":11}],11:[function(require,module,exports){
/*
	Next Gen Events
	
	Copyright (c) 2015 - 2016 Cédric Ronvel
	
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



// Create the object && export it
function Proxy() { return Proxy.create() ; }
module.exports = Proxy ;

var NextGenEvents = require( './NextGenEvents.js' ) ;
var MESSAGE_TYPE = 'NextGenEvents/message' ;

function noop() {}



Proxy.create = function create()
{
	var self = Object.create( Proxy.prototype , {
		localServices: { value: {} , enumerable: true } ,
		remoteServices: { value: {} , enumerable: true } ,
		nextAckId: { value: 1 , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
} ;



// Add a local service accessible remotely
Proxy.prototype.addLocalService = function addLocalService( id , emitter , options )
{
	this.localServices[ id ] = LocalService.create( this , id , emitter , options ) ;
	return this.localServices[ id ] ;
} ;



// Add a remote service accessible locally
Proxy.prototype.addRemoteService = function addRemoteService( id )
{
	this.remoteServices[ id ] = RemoteService.create( this , id ) ;
	return this.remoteServices[ id ] ;
} ;



// Destroy the proxy
Proxy.prototype.destroy = function destroy()
{
	var self = this ;
	
	Object.keys( this.localServices ).forEach( function( id ) {
		self.localServices[ id ].destroy() ;
		delete self.localServices[ id ] ;
	} ) ;
	
	Object.keys( this.remoteServices ).forEach( function( id ) {
		self.remoteServices[ id ].destroy() ;
		delete self.remoteServices[ id ] ;
	} ) ;
	
	this.receive = this.send = noop ;
} ;



// Push an event message.
Proxy.prototype.push = function push( message )
{
	if (
		message.__type !== MESSAGE_TYPE ||
		! message.service || typeof message.service !== 'string' ||
		! message.event || typeof message.event !== 'string' ||
		! message.method
	)
	{
		return ;
	}
	
	switch ( message.method )
	{
		// Those methods target a remote service
		case 'event' :
			return this.remoteServices[ message.service ] && this.remoteServices[ message.service ].receiveEvent( message ) ;
		case 'ackEmit' :
			return this.remoteServices[ message.service ] && this.remoteServices[ message.service ].receiveAckEmit( message ) ;
			
		// Those methods target a local service
		case 'emit' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveEmit( message ) ;
		case 'listen' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveListen( message ) ;
		case 'ignore' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveIgnore( message ) ;
		case 'ackEvent' :
			return this.localServices[ message.service ] && this.localServices[ message.service ].receiveAckEvent( message ) ;
			
		default:
		 	return ;
	}
} ;



// This is the method to receive and decode data from the other side of the communication channel, most of time another proxy.
// In most case, this should be overwritten.
Proxy.prototype.receive = function receive( raw )
{
	this.push( raw ) ;
} ;



// This is the method used to send data to the other side of the communication channel, most of time another proxy.
// This MUST be overwritten in any case.
Proxy.prototype.send = function send()
{
	throw new Error( 'The send() method of the Proxy MUST be extended/overwritten' ) ;
} ;



			/* Local Service */



function LocalService( proxy , id , emitter , options ) { return LocalService.create( proxy , id , emitter , options ) ; }
Proxy.LocalService = LocalService ;



LocalService.create = function create( proxy , id , emitter , options )
{
	var self = Object.create( LocalService.prototype , {
		proxy: { value: proxy , enumerable: true } ,
		id: { value: id , enumerable: true } ,
		emitter: { value: emitter , writable: true , enumerable: true } ,
		internalEvents: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		events: { value: {} , enumerable: true } ,
		canListen: { value: !! options.listen , writable: true , enumerable: true } ,
		canEmit: { value: !! options.emit , writable: true , enumerable: true } ,
		canAck: { value: !! options.ack , writable: true , enumerable: true } ,
		canRpc: { value: !! options.rpc , writable: true , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
} ;



// Destroy a service
LocalService.prototype.destroy = function destroy()
{
	var self = this ;
	
	Object.keys( this.events ).forEach( function( eventName ) {
		self.emitter.off( eventName , self.events[ eventName ] ) ;
		delete self.events[ eventName ] ;
	} ) ;
	
	this.emitter = null ;
	this.destroyed = true ;
} ;



// Remote want to emit on the local service
LocalService.prototype.receiveEmit = function receiveEmit( message )
{
	if ( this.destroyed || ! this.canEmit || ( message.ack && ! this.canAck ) ) { return ; }
	
	var self = this ;
	
	var event = {
		emitter: this.emitter ,
		name: message.event ,
		args: message.args || [] 
	} ;
	
	if ( message.ack )
	{
		event.callback = function ack( interruption ) {
			
			self.proxy.send( {
				__type: MESSAGE_TYPE ,
				service: self.id ,
				method: 'ackEmit' ,
				ack: message.ack ,
				event: message.event ,
				interruption: interruption
			} ) ;
		} ;
	}
	
	NextGenEvents.emitEvent( event ) ;
} ;



// Remote want to listen to an event of the local service
LocalService.prototype.receiveListen = function receiveListen( message )
{
	if ( this.destroyed || ! this.canListen || ( message.ack && ! this.canAck ) ) { return ; }
	
	if ( message.ack )
	{
		if ( this.events[ message.event ] )
		{
			if ( this.events[ message.event ].ack ) { return ; }
			
			// There is already an event, but not featuring ack, remove that listener now
			this.emitter.off( message.event , this.events[ message.event ] ) ;
		}
		
		this.events[ message.event ] = LocalService.forwardWithAck.bind( this ) ;
		this.events[ message.event ].ack = true ;
		this.emitter.on( message.event , this.events[ message.event ] , { eventObject: true , async: true } ) ;
	}
	else
	{
		if ( this.events[ message.event ] )
		{
			if ( ! this.events[ message.event ].ack ) { return ; }
			
			// Remote want to downgrade:
			// there is already an event, but featuring ack so we remove that listener now
			this.emitter.off( message.event , this.events[ message.event ] ) ;
		}
		
		this.events[ message.event ] = LocalService.forward.bind( this ) ;
		this.events[ message.event ].ack = false ;
		this.emitter.on( message.event , this.events[ message.event ] , { eventObject: true } ) ;
	}
} ;



// Remote do not want to listen to that event of the local service anymore
LocalService.prototype.receiveIgnore = function receiveIgnore( message )
{
	if ( this.destroyed || ! this.canListen ) { return ; }
	
	if ( ! this.events[ message.event ] ) { return ; }
	
	this.emitter.off( message.event , this.events[ message.event ] ) ;
	this.events[ message.event ] = null ;
} ;



// 
LocalService.prototype.receiveAckEvent = function receiveAckEvent( message )
{
	if (
		this.destroyed || ! this.canListen || ! this.canAck || ! message.ack ||
		! this.events[ message.event ] || ! this.events[ message.event ].ack
	)
	{
		return ;
	}
	
	this.internalEvents.emit( 'ack' , message ) ;
} ;



// Send an event from the local service to remote
LocalService.forward = function forward( event )
{
	if ( this.destroyed ) { return ; }
	
	this.proxy.send( {
		__type: MESSAGE_TYPE ,
		service: this.id ,
		method: 'event' ,
		event: event.name ,
		args: event.args
	} ) ;
} ;

LocalService.forward.ack = false ;



// Send an event from the local service to remote, with ACK
LocalService.forwardWithAck = function forwardWithAck( event , callback )
{
	if ( this.destroyed ) { return ; }
	
	var self = this ;
	
	if ( ! event.callback )
	{
		// There is no emit callback, no need to ack this one
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'event' ,
			event: event.name ,
			args: event.args
		} ) ;
		
		callback() ;
		return ;
	}
	
	var triggered = false ;
	var ackId = this.proxy.nextAckId ++ ;
	
	var onAck = function onAck( message ) {
		if ( triggered || message.ack !== ackId ) { return ; }	// Not our ack...
		//if ( message.event !== event ) { return ; }	// Do we care?
		triggered = true ;
		self.internalEvents.off( 'ack' , onAck ) ;
		callback() ;
	} ;
	
	this.internalEvents.on( 'ack' , onAck ) ;
	
	this.proxy.send( {
		__type: MESSAGE_TYPE ,
		service: this.id ,
		method: 'event' ,
		event: event.name ,
		ack: ackId ,
		args: event.args
	} ) ;
} ;

LocalService.forwardWithAck.ack = true ;



			/* Remote Service */



function RemoteService( proxy , id ) { return RemoteService.create( proxy , id ) ; }
//RemoteService.prototype = Object.create( NextGenEvents.prototype ) ;
//RemoteService.prototype.constructor = RemoteService ;
Proxy.RemoteService = RemoteService ;



var EVENT_NO_ACK = 1 ;
var EVENT_ACK = 2 ;



RemoteService.create = function create( proxy , id )
{
	var self = Object.create( RemoteService.prototype , {
		proxy: { value: proxy , enumerable: true } ,
		id: { value: id , enumerable: true } ,
		// This is the emitter where everything is routed to
		emitter: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		internalEvents: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		events: { value: {} , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true } ,
		
		/*	Useless for instance, unless some kind of service capabilities discovery mechanism exists
		canListen: { value: !! options.listen , writable: true , enumerable: true } ,
		canEmit: { value: !! options.emit , writable: true , enumerable: true } ,
		canAck: { value: !! options.ack , writable: true , enumerable: true } ,
		canRpc: { value: !! options.rpc , writable: true , enumerable: true } ,
		*/
	} ) ;
	
	return self ;
} ;



// Destroy a service
RemoteService.prototype.destroy = function destroy()
{
	var self = this ;
	this.emitter.removeAllListeners() ;
	this.emitter = null ;
	Object.keys( this.events ).forEach( function( eventName ) { delete self.events[ eventName ] ; } ) ;
	this.destroyed = true ;
} ;



// Local code want to emit to remote service
RemoteService.prototype.emit = function emit( eventName )
{
	if ( this.destroyed ) { return ; }
	
	var self = this , args , callback , ackId , triggered ;
	
	if ( typeof eventName === 'number' ) { throw new TypeError( 'Cannot emit with a nice value on a remote service' ) ; }
	
	if ( typeof arguments[ arguments.length - 1 ] !== 'function' )
	{
		args = Array.prototype.slice.call( arguments , 1 ) ;
		
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'emit' ,
			event: eventName ,
			args: args
		} ) ;
		
		return ;
	}
	
	args = Array.prototype.slice.call( arguments , 1 , -1 ) ;
	callback = arguments[ arguments.length - 1 ] ;
	ackId = this.proxy.nextAckId ++ ;
	triggered = false ;
	
	var onAck = function onAck( message ) {
		if ( triggered || message.ack !== ackId ) { return ; }	// Not our ack...
		//if ( message.event !== event ) { return ; }	// Do we care?
		triggered = true ;
		self.internalEvents.off( 'ack' , onAck ) ;
		callback( message.interruption ) ;
	} ;
	
	this.internalEvents.on( 'ack' , onAck ) ;
	
	this.proxy.send( {
		__type: MESSAGE_TYPE ,
		service: this.id ,
		method: 'emit' ,
		ack: ackId ,
		event: eventName ,
		args: args
	} ) ;
} ;



// Local code want to listen to an event of remote service
RemoteService.prototype.addListener = function addListener( eventName , fn , options )
{
	if ( this.destroyed ) { return ; }
	
	// Manage arguments the same way NextGenEvents#addListener() does
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	options.fn = fn || options.fn ;
	
	this.emitter.addListener( eventName , options ) ;
	
	// No event was added...
	if ( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) { return ; }
	
	// If the event is successfully listened to and was not remotely listened...
	if ( options.async && this.events[ eventName ] !== EVENT_ACK )
	{
		// We need to listen to or upgrade this event
		this.events[ eventName ] = EVENT_ACK ;
		
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'listen' ,
			ack: true ,
			event: eventName
		} ) ;
	}
	else if ( ! options.async && ! this.events[ eventName ] )
	{
		// We need to listen to this event
		this.events[ eventName ] = EVENT_NO_ACK ;
		
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'listen' ,
			event: eventName
		} ) ;
	}
} ;

RemoteService.prototype.on = RemoteService.prototype.addListener ;

// This is a shortcut to this.addListener()
RemoteService.prototype.once = NextGenEvents.prototype.once ;



// Local code want to ignore an event of remote service
RemoteService.prototype.removeListener = function removeListener( eventName , id )
{
	if ( this.destroyed ) { return ; }
	
	this.emitter.removeListener( eventName , id ) ;
	
	// If no more listener are locally tied to with event and the event was remotely listened...
	if (
		( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) &&
		this.events[ eventName ]
	)
	{
		this.events[ eventName ] = 0 ;
		
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'ignore' ,
			event: eventName
		} ) ;
	}
} ;

RemoteService.prototype.off = RemoteService.prototype.removeListener ;



// A remote service sent an event we are listening to, emit on the service representing the remote
RemoteService.prototype.receiveEvent = function receiveEvent( message )
{
	var self = this ;
	
	if ( this.destroyed || ! this.events[ message.event ] ) { return ; }
	
	var event = {
		emitter: this.emitter ,
		name: message.event ,
		args: message.args || [] 
	} ;
	
	if ( message.ack )
	{
		event.callback = function ack() {
			
			self.proxy.send( {
				__type: MESSAGE_TYPE ,
				service: self.id ,
				method: 'ackEvent' ,
				ack: message.ack ,
				event: message.event
			} ) ;
		} ;
	}
	
	NextGenEvents.emitEvent( event ) ;
	
	var eventName = event.name ;
	
	// Here we should catch if the event is still listened to ('once' type listeners)
	//if ( this.events[ eventName ]	) // not needed, already checked at the begining of the function
	if ( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length )
	{
		this.events[ eventName ] = 0 ;
		
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'ignore' ,
			event: eventName
		} ) ;
	}
} ;



// 
RemoteService.prototype.receiveAckEmit = function receiveAckEmit( message )
{
	if ( this.destroyed || ! message.ack || this.events[ message.event ] !== EVENT_ACK )
	{
		return ;
	}
	
	this.internalEvents.emit( 'ack' , message ) ;
} ;



},{"./NextGenEvents.js":10}],12:[function(require,module,exports){
module.exports={
  "name": "nextgen-events",
  "version": "0.9.8",
  "description": "The next generation of events handling for javascript! New: abstract away the network!",
  "main": "lib/NextGenEvents.js",
  "directories": {
    "test": "test"
  },
  "dependencies": {},
  "devDependencies": {
    "browserify": "^13.0.1",
    "expect.js": "^0.3.1",
    "jshint": "^2.9.2",
    "mocha": "^2.5.3",
    "uglify-js": "^2.6.2",
    "ws": "^1.1.1"
  },
  "scripts": {
    "test": "mocha -R dot"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/cronvel/nextgen-events.git"
  },
  "keywords": [
    "events",
    "async",
    "emit",
    "listener",
    "context",
    "series",
    "serialize",
    "namespace",
    "proxy",
    "network"
  ],
  "author": {
    "name": "Cédric Ronvel"
  },
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/cronvel/nextgen-events/issues"
  },
  "copyright": {
    "title": "Next-Gen Events",
    "years": [
      2015,
      2016
    ],
    "owner": "Cédric Ronvel"
  },
  "readme": "\n\n# NextGen Events\n\nNext generation of events handling for node.js\n\n* License: MIT\n* Current status: close to release\n* Platform: Node.js and browsers\n\n*NextGen Events* solves common trouble that one may encounter when dealing with events and listeners.\n\n## Feature highlights:\n\n* Standard event-handling almost compatible with Node.js built-in events\n* .emit() support a completion callback\n* Support for asynchronous event-handling\n* Multiple listeners can be tied to a single context\n* A context can be temporarly *disabled*\n* A context can be in *queue* mode: events for its listeners are stored, they will be *resumed* when the context is enabled again\n* Context serialization: async listeners can be run one after the other is fully completed\n* **NEW: proxy services!** Abstract away your network: emit and listen to emitter on the other side of the plug!\n\nEmitting events asynchronously or registering a listener that will be triggered asynchronously because it performs\nnon-critical tasks has some virtues: it gives some breath to the event-loop, so important I/O can be processed as soon as possible.\n\nContexts are really useful, it handles a collection of listeners.\nAt first glance, it looks like a sort of namespace for listeners.\nBut it can do more than that: you can turn a context off, so every listener tied to this context will not be triggered anymore,\nthen turn it on and they will be available again. \n\nYou can even switch a context into queue mode: the listeners tied to it will not be triggered, but events for those\nlisteners will be stored in the context. When the context is resumed, all retained events will trigger their listeners.\nThis allow one to postpone some operations, while performing some other high priority tasks, but be careful:\ndepending on your application nature, the queue may grow fast and consumes a lot of memory very quickly.\n\nOne of the top feature of this lib is the context serialization: it greatly eases the flow of the code!\nWhen differents events can fire at the same time, there are use cases when one does not want that async listener run concurrently.\nThe context serialization feature will ensure you that no concurrency will happen for listeners tied to it.\nYou do not have to code fancy or complicated tests to cover all cases anymore: just let *NextGen Events* do it for you!\n\n**Proxy services are awesome.** They abstract away the network so we can emit and listen to emitter on the other side of the plug!\nBoth side of the channel create a Proxy, and add to it local and remote *services*, i.e. event emitters, and that's all.\nA remote service looks like a normal (i.e. local) emitter, and share the same API (with few limitations).\nIt's totally protocol agnostic, you just define two methods for your proxy: one to read from the network and one to send to it\n(e.g. for Web Socket, this is a one-liner).\n\n\n\n# Install\n\nUse npm:\n\n```\nnpm install nextgen-events\n```\n\n\n# Getting started\n\nBy the way you can create an event emitter simply by creating a new object, this way:\n\n```js\nvar NGEmitter = require( 'nextgen-events' ) ;\nvar emitter = new NGEmitter() ;\n```\n\nYou can use `var emitter = Object.create( NGEmitter.prototype )` as well, the object does not need the constructor.\n\nBut in real life, you would make your own objects inherit it:\n\n```js\nvar NGEmitter = require( 'nextgen-events' ) ;\n\nfunction myClass()\n{\n\t// myClass constructor code here\n}\n\nmyClass.prototype = Object.create( NGEmitter.prototype ) ;\nmyClass.prototype.constructor = myClass ;\t// restore the constructor\n\n// define other methods for myClass...\n```\n\nThe basis of the event emitter works like Node.js built-in events:\n\n```js\nvar NGEmitter = require( 'nextgen-events' ) ;\nvar emitter = new NGEmitter() ;\n\n// Normal listener\nemitter.on( 'message' , function( message ) {\n\tconsole.log( 'Message received: ' , message ) ;\n} ) ;\n\n// One time listener:\nemitter.once( 'close' , function() {\n\tconsole.log( 'Connection closed!' ) ;\n} ) ;\n\n// The error listener: if it is not defined, the error event will throw an exception\nemitter.on( 'error' , function( error ) {\n\tconsole.log( 'Shit happens: ' , error ) ;\n} ) ;\n\nemitter.emit( 'message' , 'Hello world!' ) ;\n// ...\n```\n\n\n\n# References\n\nNode.js documentation:\n\n> When an EventEmitter instance experiences an error, the typical action is to emit an 'error' event.\n> Error events are treated as a special case in node. If there is no listener for it,\n> then the default action is to print a stack trace and exit the program.\n\n> All EventEmitters emit the event 'newListener' when new listeners are added and 'removeListener' when a listener is removed. \n\nFor the 'newListener' and 'removeListener' events, see the section about [incompatibilities](#incompatibilities), since there\nare few differences with the built-in Node.js EventEmitter.\n\n\n\n## Table of Content\n\n* [Events](#ref.events)\n\t* [.addListener() / .on()](#ref.events.addListener)\n\t* [.once()](#ref.events.once)\n\t* [.removeListener() / .off()](#ref.events.removeListener)\n\t* [.removeAllListeners()](#ref.events.removeAllListeners)\n\t* [.setMaxListeners()](#ref.events.setMaxListeners)\n\t* [.listeners()](#ref.events.listeners)\n\t* [.listenerCount()](#ref.events.listenerCount)\n\t* [.setNice()](#ref.events.setNice)\n\t* [.emit()](#ref.events.emit)\n\t* [.addListenerContext()](#ref.events.addListenerContext)\n\t* [.disableListenerContext()](#ref.events.disableListenerContext)\n\t* [.queueListenerContext()](#ref.events.queueListenerContext)\n\t* [.enableListenerContext()](#ref.events.enableListenerContext)\n\t* [.setListenerContextNice()](#ref.events.setListenerContextNice)\n\t* [.serializeListenerContext()](#ref.events.serializeListenerContext)\n\t* [.destroyListenerContext()](#ref.events.destroyListenerContext)\n\t* [the *nice feature*](#ref.note.nice)\n\t* [incompatibilities](#incompatibilities)\n* [Proxy Services](#ref.proxy)\n\n\n\n<a name=\"ref.events\"></a>\n## Events\n\n<a name=\"ref.events.addListener\"></a>\n### .addListener( eventName , [fn] , [options] )   *or*   .on( eventName , [fn] , [options] )\n\n* eventName `string` the name of the event to bind to\n* fn `Function` the callback function for this event, this argument is optional: it can be passed to the `fn` property of `options`\n* options `Object` where:\n\t* fn `Function` (mandatory if no `fn` argument provided) the listener function\n\t* id `any type` (default to the provided *fn* function) the identifier of the listener, useful if we have to remove it later\n\t* once `boolean` (default: false) *true* if this is a one-time-listener\n\t* context `string` (default: undefined - no context) a non-empty string identifying a context, if defined the listener\n\t  will be tied to this context, if this context is unexistant, it will be implicitly defined with default behaviour\n\t* nice `integer` (default: -Infinity) see [the nice feature](#ref.note.nice) for details\n\t* async `boolean` (default: false) set it to *true* if the listener is async by nature and a context serialization is wanted,\n\t  when *async* is set for a listener, it **MUST** accept a completion callback as its last argument.\n\t* eventObject `boolean` (default: false) if set, the listener will be passed an unique argument: the very same event object\n\t  that is returned by `.emit()`, if the listener is async, a second argument is passed as the callback\n\nNode.js documentation:\n\n> Adds a listener to the end of the listeners array for the specified event.\n> No checks are made to see if the listener has already been added.\n> Multiple calls passing the same combination of event and listener will result in the listener being added multiple times.\n\n```js\nserver.on( 'connection' , function( stream ) {\n\tconsole.log( 'someone connected!' ) ;\n} ) ;\n```\n\n> Returns emitter, so calls can be chained.\n\nExample, creating implicitly a context the listeners will be tied to:\n\n```js\nserver.on( 'connection' , {\n\tcontext: 'ctx' ,\n\tfn: function( stream ) {\n\t\tconsole.log( 'someone connected!' ) ;\n\t}\n} ) ;\n\nserver.on( 'close' , {\n\tcontext: 'ctx' ,\n\tfn: function() {\n\t\tconsole.log( 'connection closed!' ) ;\n\t\t\n\t\t// Destroy the context and all listeners tied to it:\n\t\tserver.destroyListenerContext( 'ctx' ) ;\n\t}\n} ) ;\n\nserver.on( 'error' , {\n\tcontext: 'ctx' ,\n\tfn: function() {\n\t\t// some error handling code\n\t\t\n\t\t// Destroy the context and all listeners tied to it:\n\t\tserver.destroyListenerContext( 'ctx' ) ;\n\t}\n} ) ;\n```\n\nWhen an async listener is defined, the completion callback is automatically added at the end of the arguments \nsupplied to [.emit()](#ref.events.emit) for any listeners with *async = true*.\n\n\n\n<a name=\"ref.events.once\"></a>\n### .once( eventName , listener )\n\n* eventName `string` the name of the event to bind to\n* listener `Function` or `Object` the listener that will listen to this event, it can be a function or an object where:\n\t* fn `Function` (mandatory) the listener function\n\t* id `any type` (default to the provided *fn* function) the identifier of the listener, useful if we have to remove it later\n\t* context `string` (default: undefined - no context) a non-empty string identifying a context, if defined the listener\n\t  will be tied to this context, if this context is unexistant, it will be implicitly defined with default behaviour\n\t* nice `integer` (default: -Infinity) see [the nice feature](#ref.note.nice) for details\n\t* async `boolean` (default: false) set it to *true* if the listener is async by nature and a context serialization is wanted\n\nNode.js documentation:\n\n> Adds a **one time** listener for the event.\n> This listener is invoked only the next time the event is fired, after which it is removed. \n\n```js\nserver.once( 'connection' , function( stream ) {\n\tconsole.log( 'Ah, we have our first user!' ) ;\n} ) ;\n```\n\n> Returns emitter, so calls can be chained.\n\nNote that using `.once()` in *NextGen Events* lib is just a syntactic sugar (and it's also there for compatibility),\nthe previous example can be rewritten using `.on()`:\n\n```js\nserver.on( 'connection' , {\n\tfn: function( stream ) {\n\t\tconsole.log( 'Ah, we have our first user!' ) ;\n\t} ,\n\tonce: true\n} ) ;\n```\n\n\n\n<a name=\"ref.events.removeListener\"></a>\n### .removeListener( eventName , listenerID )   *or*   .off( eventName , listenerID )\n\n* eventName `string` the name of the event the listener to remove is binded to\n* listenerID `any type` the identifier of the listener to remove\n\nNode.js documentation:\n\n> Remove a listener from the listener array for the specified event.\n> **Caution**: changes array indices in the listener array behind the listener. \n\n```js\nvar callback = function( stream ) {\n\tconsole.log( 'someone connected!' ) ;\n} ;\n\nserver.on( 'connection' , callback ) ;\n// ...\nserver.removeListener( 'connection' , callback ) ;\n```\n\n**CAUTION: Unlike the built-in Node.js emitter**, `.removeListener()` will remove **ALL** listeners whose ID is matching\nthe given *listenerID*.\nIf any single listener has been added multiple times to the listener array for the specified event, then only one\ncall to `.removeListener()` will remove them all.\n\n> Returns emitter, so calls can be chained.\n\nExample using user-defined ID:\n\n```js\nvar callback = function( stream ) {\n\tconsole.log( 'someone connected!' ) ;\n} ;\n\nserver.on( 'connection' , { id: 'foo' , fn: callback } ) ;\nserver.on( 'connection' , { id: 'bar' , fn: callback } ) ;\n\n// ...\n\n// Does nothing! we have used custom IDs!\nserver.removeListener( 'connection' , callback ) ;\n\n// Remove the first listener only, despite the fact they are sharing the same function\nserver.removeListener( 'connection' , 'foo' ) ;\n```\n\nDon't forget that by default, the ID is the callback function itself.\n\n\n\n<a name=\"ref.events.removeAllListeners\"></a>\n### .removeAllListeners( [eventName] )\n\n* eventName `string` (optional) the name of the event the listeners to remove are binded to\n\nNode.js documentation:\n\n> Removes all listeners, or those of the specified event.\n> It's not a good idea to remove listeners that were added elsewhere in the code, especially when it's on an emitter\n> that you didn't create (e.g. sockets or file streams).\n\n> Returns emitter, so calls can be chained.\n\n\n\n<a name=\"ref.events.setMaxListeners\"></a>\n### .setMaxListeners()\n\nOnly available for compatibility with the built-in Node.js emitter, so it does not break the code for people that want\nto make the switch.\n\nBut please note that **there is no such concept of max listener in NextGen Events**, this method does nothing\n(it's an empty function).\n\n\n\n<a name=\"ref.events.listeners\"></a>\n### .listeners( eventName )\n\n* eventName `string` (optional) the name of the event the listeners to list are binded to\n\nNode.js documentation:\n\n> Returns an array of listeners for the specified event.\n\n```js\nserver.on( 'connection' , function( stream ) {\n\tconsole.log( 'someone connected!' ) ;\n} ) ;\n\nconsole.log( util.inspect( server.listeners( 'connection' ) ) ) ;\n// output:\n// [ { id: [Function], fn: [Function], nice: -Infinity, event: 'connection' } ]\n```\n\n\n\n<a name=\"ref.events.listenerCount\"></a>\n### .listenerCount( eventName )\n\n* eventName `string` the name of the event\n\nNode.js documentation:\n\n> Returns the number of listeners listening to the type of event.\n\n\n\n<a name=\"ref.events.setNice\"></a>\n### .setNice( nice )\n\n* nice `integer` (default: -Infinity) see [the nice feature](#ref.note.nice) for details\n\nSet the default *nice value* of the current emitter.\n\n\n\n<a name=\"ref.events.emit\"></a>\n### .emit( [nice] , eventName , [arg1] , [arg2] , [...] , [callback] )\n\n* nice `integer` (default: -Infinity) see [the nice feature](#ref.note.nice) for details\n* eventName `string` (optional) the name of the event to emit\n* arg1 `any type` (optional) first argument to transmit\n* arg2 `any type` (optional) second argument to transmit\n* ...\n* callback `function` (optional) a completion callback triggered when all listener have done, accepting arguments:\n\t* interruption `any type` if truthy, then emit was interrupted with this interrupt value (provided by userland)\n\t* event `Object` representing the current event\n\nIt returns an object representing the current event.\n\nNode.js documentation:\n\n> Execute each of the listeners in order with the supplied arguments.\n\n**It does not returns the emitter!**\n\n\n\n\n<a name=\"ref.note.nice\"></a>\n### A note about the *nice feature*\n\nThe *nice value* represent the *niceness* of the event-emitting processing.\nThis concept is inspired by the UNIX *nice* concept for processus (see the man page for the *nice* and *renice* command).\n\nIn this lib, this represents the asyncness of the event-emitting processing.\n\nThe constant `require( 'nextgen-events' ).SYNC` can be used to have synchronous event emitting, its value is `-Infinity`\nand it's the default value.\n\n* any nice value *N* greater than or equals to 0 will be emitted asynchronously using setTimeout() with a *N* ms timeout\n  to call the listeners\n* any nice value *N* lesser than 0 will emit event synchronously until *-N* recursion is reached, after that, setImmediate()\n  will be used to call the listeners, the first event count as 1 recursion, so if nice=-1, all events will be asynchronously emitted,\n  if nice=-2 the initial event will call the listener synchronously, but if the listener emits events on the same emitter object,\n  the sub-listener will be called through setImmediate(), breaking the recursion... and so on...\n\nThey are many elements that can define their own *nice value*.\n\nHere is how this is resolved:\n\n* First the *emit nice value* will be the one passed to the `.emit()` method if given, or the default *emitter nice value*\n  defined with [.setNice()](#ref.events.setNice).\n* For each listener to be called, the real *nice value* for the current listener will be the **HIGHEST** *nice value* of\n  the *emit nice value* (see above), the listener *nice value* (defined with [.addListener()](#ref.events.addListener)), and\n  if the listener is tied to a context, the context *nice value* (defined with [.addListenerContext()](#ref.events.addListenerContext)\n  or [.setListenerContextNice](#ref.events.setListenerContextNice))\n\n\n\n<a name=\"ref.events.addListenerContext\"></a>\n### .addListenerContext( contextName , options )\n\n* contextName `string` a non-empty string identifying the context to be created\n* options `Object` an object of options, where:\n\t* nice `integer` (default: -Infinity) see [the nice feature](#ref.note.nice) for details\n\t* serial `boolean` (default: false) if true, the async listeners tied to this context will run sequentially,\n\t  one after the other is fully completed\n\nCreate a context using the given *contextName*.\n\nListeners can be tied to a context, enabling some grouping features like turning them on or off just by enabling/disabling\nthe context, queuing them, resuming them, or forcing serialization of all async listeners.\n\n\n\n<a name=\"ref.events.disableListenerContext\"></a>\n### .disableListenerContext( contextName )\n\n* contextName `string` a non-empty string identifying the context to be created\n\nIt disables a context: any listeners tied to it will not be triggered anymore.\n\nThe context is not destroyed, the listeners are not removed, they are just inactive.\nThey can be enabled again using [.enableListenerContext()](#ref.events.enableListenerContext).\n\n\n\n<a name=\"ref.events.queueListenerContext\"></a>\n### .queueListenerContext( contextName )\n\n* contextName `string` a non-empty string identifying the context to be created\n\nIt switchs a context into *queue mode*: any listeners tied to it will not be triggered anymore, but every listener's call\nwill be queued.\n\nWhen the context will be enabled again using [.enableListenerContext()](#ref.events.enableListenerContext), any queued listener's call\nwill be processed.\n\n\n\n<a name=\"ref.events.enableListenerContext\"></a>\n### .enableListenerContext( contextName )\n\n* contextName `string` a non-empty string identifying the context to be created\n\nThis enables a context previously disabled using [.disableListenerContext()](#ref.events.disableListenerContext) or queued\nusing [.disableListenerContext()](#ref.events.disableListenerContext).\n\nIf the context was queued, any queued listener's call will be processed right now for synchronous emitter, or a bit later\ndepending on the *nice value*. E.g. if a listener would have been called with a timeout of 50 ms (nice value = 5),\nand the call has been queued, the timeout will apply at resume time.\n\n\n\n<a name=\"ref.events.setListenerContextNice\"></a>\n### .setListenerContextNice( contextName , nice )\n\n* contextName `string` a non-empty string identifying the context to be created\n* nice `integer` (default: -Infinity) see [the nice feature](#ref.note.nice) for details\n\nSet the *nice* value for the current context.\n\n\n\n<a name=\"ref.events.serializeListenerContext\"></a>\n### .serializeListenerContext( contextName , [value] )\n\n* contextName `string` a non-empty string identifying the context to be created\n* value `boolean` (optional, default is true) if *true* the context will enable serialization for async listeners.\n\nThis is one of the top feature of this lib.\n\nIf set to *true* it enables the context serialization.\n\nIt has no effect on listeners defined without the *async* option (see [.addListener()](#ref.events.addListener)).\nListeners defined with the async option will postpone any other listener's calls part of the same context.\nThose calls will be queued until the completion callback of the listener is triggered.\n\nExample:\n\n```js\napp.on( 'maintenance' , {\n\tcontext: 'maintenanceHandlers' ,\n\tasync: true ,\n\tfn: function( type , done ) {\n\t\tperformSomeCriticalAsyncStuff( function() {\n\t\t\tconsole.log( 'Critical maintenance stuff finished' ) ;\n\t\t\tdone() ;\n\t\t} ) ;\n\t}\n} ) ;\n\napp.serializeListenerContext( maintenanceHandlers ) ;\n\n// ...\n\napp.emit( 'maintenance' , 'doBackup' ) ;\n\n// Despite the fact we emit synchronously, the listener will not be called now,\n// it will be queued and called later when the previous call will be finished\napp.emit( 'maintenance' , 'doUpgrade' ) ;\n```\n\nBy the way, there is only one listener here that will queue itself, and only one event type is fired.\nBut this would work the same with multiple listener and event type, if they share the same context.\n\nSame code with two listeners and two event type:\n\n```js\napp.on( 'doBackup' , {\n\tcontext: 'maintenanceHandlers' ,\n\tasync: true ,\n\tfn: function( done ) {\n\t\tperformBackup( function() {\n\t\t\tconsole.log( 'Backup finished' ) ;\n\t\t\tdone() ;\n\t\t} ) ;\n\t}\n} ) ;\n\napp.on( 'doUpgrade' , {\n\tcontext: 'maintenanceHandlers' ,\n\tasync: true ,\n\tfn: function( done ) {\n\t\tperformUpgrade( function() {\n\t\t\tconsole.log( 'Upgrade finished' ) ;\n\t\t\tdone() ;\n\t\t} ) ;\n\t}\n} ) ;\n\napp.on( 'whatever' , function() {\n\t// Some actions...\n} ) ;\n\napp.serializeListenerContext( maintenanceHandlers ) ;\n\n// ...\n\napp.emit( 'doBackup' ) ;\n\n// Despite the fact we emit synchronously, the second listener will not be called now,\n// it will be queued and called later when the first listener will have finished its job\napp.emit( 'doUpgrade' ) ;\n\n// The third listener is not part of the 'maintenanceHandlers' context, so it will be called\n// right now, before the first listener finished, and before the second listener ever start\napp.emit( 'whatever' ) ;\n```\n\n\n\n<a name=\"ref.events.destroyListenerContext\"></a>\n### .destroyListenerContext( contextName )\n\n* contextName `string` a non-empty string identifying the context to be created\n\nThis destroy a context and remove all listeners tied to it.\n\nAny queued listener's calls will be lost.\n\n\n\n<a name=\"incompatibilities\"></a>\n## Incompatibilities with the built-in Node.js EventEmitter\n\nNextGen Events is almost compatible with Node.js' EventEmitter, except for few things:\n\n* .emit() does not return the emitter, but an object representing the current event.\n\n* If the last argument passed to .emit() is a function, it is not passed to listeners, instead it is a completion callback\n  triggered when all listeners have done their job. If one want to pass function to listeners as the final argument, it is easy\n  to add an extra `null` or `undefined` argument to .emit().\n\n* There is more reserved event name: 'interrupt', 'emitted'.\n\n* There is no such concept of *max listener* in NextGen Events, .setMaxListeners() function exists only to not break compatibility\n  for people that want to make the switch, but it does nothing (it's an empty function).\n\n* .removeListener() will remove all matching listener, not only the first listener found.\n\n* 'newListener'/'removeListener' event listener will receive an array of new/removed *listener object*, instead of only one\n  *listener function*.\n  E.g: it will be fired only once by when .removeListener() or .removeAllListener() is invoked and multiple listeners are deleted.\n  A *listener object* contains a property called 'fn' that hold the actual *listener function*.\n\n* `.removeAllListeners()` without any argument does not trigger 'removeListener' listener, because there are actually removed too.\n  The same apply to `.removeAllListeners( 'removeListener' )`.\n\n* .listeners() same here: rather than providing an array of *listener function* an array of *listener object* is provided.\n\n\n\n<a name=\"ref.proxy\"></a>\n## Proxy Services\n\n**This part of the doc is still a work in progress!**\n\n**Proxy services are awesome.** They abstract away the network so we can emit and listen to emitter on the other side of the plug!\nBoth side of the channel create a Proxy, and add to it local and remote *services*, i.e. event emitters, and that's all.\nA remote service looks like a normal (i.e. local) emitter, and share the same API (with few limitations).\n\nIt's totally protocol agnostic, you just define two methods for your proxy: one to read from the network and one to send to it\n(e.g. for Web Socket, this is a one-liner).\n\n\n\n#### Example, using the Web Socket *ws* node module\n\nThe code below set up a server and a client written in Node.js.\nThe server expose the *heartBeatService* which simply emit an *heartBeat* event once in a while with the beat count as data.\nMost of this code is websocket boiler-plate, the actual proxy code involves only few lines.\nThe client code could be easily rewritten for the browser.\n\n**Server:**\n\n```js\nvar NGEvents = require( 'nextgen-events' ) ;\n\n// Create our service/emitter\nvar heartBeatEmitter = new NGEvents() ;\nvar nextBeat = 1 ;\n\n// Emit one 'heartBeat' event every few seconds\nsetInterval( function() {\n  var beat = nextBeat ++ ;\n  heartBeatEmitter.emit( 'heartBeat' , beat ) ;\n} , 2000 ) ;\n\n// Create our server\nvar WebSocket = require( 'ws' ) ;\nvar server = new WebSocket.Server( { port: 12345 } ) ;\n\n// On new connection... \nserver.on( 'connection' , function connection( ws ) {\n  \n  // Create a proxy for this client\n  var proxy = new NGEvents.Proxy() ;\n  \n  // Add the local service exposed to this client and grant it all right\n  proxy.addLocalService( 'heartBeatService' , heartBeatEmitter ,\n    { listen: true , emit: true , ack: true } ) ;\n  \n  // message received: just hook to proxy.receive()\n  ws.on( 'message' , function incoming( message ) {\n    proxy.receive( message ) ;\n  } ) ;\n  \n  // Define the receive method: should call proxy.push()\n  // after decoding the raw message\n  proxy.receive = function receive( raw ) {\n    try { proxy.push( JSON.parse( raw ) ) ; } catch ( error ) {}\n  } ;\n  \n  // Define the send method\n  proxy.send = function send( message ) {\n    ws.send( JSON.stringify( message ) ) ;\n  } ;\n  \n  // Clean up after everything is done\n  ws.on( 'close' , function close() {\n    proxy.destroy() ;\n  } ) ;\n} ) ;\n```\n\n**Client:**\n\n```js\nvar NGEvents = require( 'nextgen-events' ) ;\nvar WebSocket = require( 'ws' ) ;\nvar ws = new WebSocket( 'ws://127.0.0.1:12345' ) ;\n\n// Create a proxy\nvar proxy = new NGEvents.Proxy() ;\n\n// Once the connection is established...\nws.on( 'open' , function open() {\n  \n  // Add the remote service we want to access\n  proxy.addRemoteService( 'heartBeatService' ) ;\n  \n  // Listen to the event 'heartBeat' on this service\n  proxy.remoteServices.heartBeatService.on( 'heartBeat' , function( beat ) {\n    console.log( '>>> Heart Beat (%d) received!' , beat ) ;\n  } ) ;\n} ) ;\n\n// message received: just hook to proxy.receive()\nws.on( 'message' , function( message ) {\n  proxy.receive( message ) ;\n} ) ;\n\n// Define the receive method: should call proxy.push()\n// after decoding the raw message\nproxy.receive = function receive( raw ) {\n  try { proxy.push( JSON.parse( raw ) ) ; } catch ( error ) {}\n} ;\n\n// Define the send method\nproxy.send = function send( message ) {\n  ws.send( JSON.stringify( message ) ) ;\n} ;\n\n// Clean up after everything is done\nws.on( 'close' , function close() {\n  proxy.destroy() ;\n} ) ;\n```\n\n\n\nOptions passed to `.addLocalService()`:\n\n* listen `boolean` if set, the remote client can listen (addListener()/on()) to the local emitter\n* emit `boolean` if set, the remote client can emit on the local emitter\n* ack `boolean` if set, the remote client can acknowledge or ask for acknowledgement, enabling **async listeners**\n  and .emit()'s **completion callback**\n\n\n\nNextGen Events features available in proxy services:\n\n* All the basic API is supported (the node-compatible API)\n* Emit completion callback supported\n* Async listeners supported\n\n\n\nFeatures that could be supported in the future:\n\n* Emit interruption and retrieving the interruption value\n\n\n\nFeatures that are unlikely to be supported:\n\n* Remote emit with a nice value (does not make sense at all through a network)\n* Contexts cannot be shared across different proxies/client, think of it as if they were namespaced behind their proxy\n\n\n",
  "readmeFilename": "README.md",
  "gitHead": "e91559128a1653ed3b58dcadefcac62aa7056207",
  "homepage": "https://github.com/cronvel/nextgen-events#readme",
  "_id": "nextgen-events@0.9.8",
  "_shasum": "ed1712c2b37dad55407b3e941672d1568c3a4630",
  "_from": "nextgen-events@>=0.9.8 <0.10.0"
}

},{}],13:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":14}],14:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],15:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],18:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":16,"./encode":17}],19:[function(require,module,exports){
/*
	String Kit
	
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



// To solve dependency hell, we do not rely on terminal-kit anymore.
module.exports = {
	reset: '\x1b[0m' ,
	bold: '\x1b[1m' ,
	dim: '\x1b[2m' ,
	italic: '\x1b[3m' ,
	underline: '\x1b[4m' ,
	inverse: '\x1b[7m' ,
	defaultColor: '\x1b[39m' ,
	black: '\x1b[30m' ,
	red: '\x1b[31m' ,
	green: '\x1b[32m' ,
	yellow: '\x1b[33m' ,
	blue: '\x1b[34m' ,
	magenta: '\x1b[35m' ,
	cyan: '\x1b[36m' ,
	white: '\x1b[37m' ,
	brightBlack: '\x1b[90m' ,
	brightRed: '\x1b[91m' ,
	brightGreen: '\x1b[92m' ,
	brightYellow: '\x1b[93m' ,
	brightBlue: '\x1b[94m' ,
	brightMagenta: '\x1b[95m' ,
	brightCyan: '\x1b[96m' ,
	brightWhite: '\x1b[97m' ,
} ;



},{}],20:[function(require,module,exports){
/*
	String Kit
	
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

/*
	Escape collection.
*/



"use strict" ;



// Load modules
//var tree = require( 'tree-kit' ) ;



// From Mozilla Developper Network
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
exports.regExp = exports.regExpPattern = function escapeRegExpPattern( str ) {
	return str.replace( /([.*+?^${}()|\[\]\/\\])/g , '\\$1' ) ;
} ;

exports.regExpReplacement = function escapeRegExpReplacement( str ) {
	return str.replace( /\$/g , '$$$$' ) ;	// This replace any single $ by a double $$
} ;



exports.format = function escapeFormat( str ) {
	return str.replace( /%/g , '%%' ) ;	// This replace any single % by a double %%
} ;



exports.shellArg = function escapeShellArg( str ) {
	return '\'' + str.replace( /\'/g , "'\\''" ) + '\'' ;
} ;



var escapeControlMap = { '\r': '\\r', '\n': '\\n', '\t': '\\t', '\x7f': '\\x7f' } ;

// Escape \r \n \t so they become readable again, escape all ASCII control character as well, using \x syntaxe
exports.control = function escapeControl( str ) {
	return str.replace( /[\x00-\x1f\x7f]/g , function( match ) {
		if ( escapeControlMap[ match ] !== undefined ) { return escapeControlMap[ match ] ; }
		var hex = match.charCodeAt( 0 ).toString( 16 ) ;
		if ( hex.length % 2 ) { hex = '0' + hex ; }
		return '\\x' + hex ;
	} ) ;
} ;



var escapeHtmlMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' } ;

// Only escape & < > so this is suited for content outside tags
exports.html = function escapeHtml( str ) {
	return str.replace( /[&<>]/g , function( match ) { return escapeHtmlMap[ match ] ; } ) ;
} ;

// Escape & < > " so this is suited for content inside a double-quoted attribute
exports.htmlAttr = function escapeHtmlAttr( str ) {
	return str.replace( /[&<>"]/g , function( match ) { return escapeHtmlMap[ match ] ; } ) ;
} ;

// Escape all html special characters & < > " '
exports.htmlSpecialChars = function escapeHtmlSpecialChars( str ) {
	return str.replace( /[&<>"']/g , function( match ) { return escapeHtmlMap[ match ] ; } ) ;
} ;



},{}],21:[function(require,module,exports){
/*
	String Kit
	
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

/*
	String formater, inspired by C's sprintf().
*/



"use strict" ;



// Load modules
//var tree = require( 'tree-kit' ) ;
var inspect = require( './inspect.js' ).inspect ;
var inspectError = require( './inspect.js' ).inspectError ;
var ansi = require( './ansi.js' ) ;



/*
	%%		a single %
	%s		string
	%f		float
	%d	%i	integer
	%u		unsigned integer
	%U		unsigned positive integer (>0)
	%h		hexadecimal
	%x		hexadecimal, force pair of symbols (e.g. 'f' -> '0f')
	%o		octal
	%b		binary
	%I		call string-kit's inspect()
	%Y		call string-kit's inspect(), but do not inspect non-enumerable
	%E		call string-kit's inspectError()
	%J		JSON.stringify()
	%D		drop
	%F		filter function existing in the 'this' context, e.g. %[filter:%a%a]F
	%a		argument for a function
	
	Candidate format:
	%A		for automatic type?
	%c		for char? (can receive a string or an integer translated into an UTF8 chars)
	%C		for currency formating?
	%B		for Buffer objects?
	%e		for scientific notation?
*/

exports.formatMethod = function format( str )
{
	if ( typeof str !== 'string' )
	{
		if ( str === null || str === undefined ) { return '' ; }
		else if ( /*str && typeof str === 'object' && */ typeof str.toString === 'function' ) { str = str.toString() ; }
		else { return '' ; }
	}
	
	var self = this , arg , value ,
		autoIndex = 1 , args = arguments , length = arguments.length ,
		hasMarkup = false , markupStack = [] ;
	
	//console.log( 'format args:' , arguments ) ;
	
	// /!\ each changes here should be reported on string.format.count() and string.format.hasFormatting() too /!\
	//str = str.replace( /\^(.?)|%(?:([+-]?)([0-9]*)(?:\/([^\/]*)\/)?([a-zA-Z%])|\[([a-zA-Z0-9_]+)(?::([^\]]*))?\])/g ,
	str = str.replace( /\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/g ,
		function( match , markup , doublePercent , relative , index , modeArg , mode ) {		// jshint ignore:line
			
			var replacement , i , n , tmp , fn , fnArgString , argMatches , argList = [] ;
			
			//console.log( 'replaceArgs:' , arguments ) ;
			if ( doublePercent ) { return '%'; }
			
			if ( markup )
			{
				if ( markup === '^' ) { return '^' ; }
				if ( ! self.markup || ! self.markup[ markup ] ) { return '' ; }
				hasMarkup = true ;
				
				if ( typeof self.markup[ markup ] === 'function' )
				{
					replacement = self.markup[ markup ]( markupStack ) ;
					// method should manage markup stack themselves
				}
				else
				{
					replacement = self.markup[ markup ] ;
					markupStack.push( replacement ) ;
				}
				
				return replacement ;
			}
			
			
			if ( index )
			{
				index = parseInt( index ) ;
				
				if ( relative )
				{
					if ( relative === '+' ) { index = autoIndex + index ; }
					else if ( relative === '-' ) { index = autoIndex - index ; }
				}
			}
			else
			{
				index = autoIndex ;
			}
			
			autoIndex ++ ;
			
			if ( index >= length || index < 1 ) { arg = undefined ; }
			else { arg = args[ index ] ; }
			
			switch ( mode )
			{
				case 's' :	// string
					if ( arg === null || arg === undefined ) { return '' ; }
					if ( typeof arg === 'string' ) { return arg ; }
					if ( typeof arg === 'number' ) { return '' + arg ; }
					if ( typeof arg.toString === 'function' ) { return arg.toString() ; }
					return '' ;
				case 'f' :	// float
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg !== 'number' ) { return '0' ; }
					if ( modeArg !== undefined )
					{
						// Use jQuery number format?
						switch ( modeArg[ 0 ] )
						{
							case 'p' :
								n = parseInt( modeArg.slice( 1 ) , 10 ) ;
								if ( n >= 1 ) { arg = arg.toPrecision( n ) ; }
								break ;
							case 'f' :
								n = parseInt( modeArg.slice( 1 ) , 10 ) ;
								arg = arg.toFixed( n ) ;
								break ;
						}
					}
					return '' + arg ;
				case 'd' :
				case 'i' :	// integer decimal
					if ( typeof arg === 'string' ) { arg = parseInt( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.floor( arg ) ; }
					return '0' ;
				case 'u' :	// unsigned decimal
					if ( typeof arg === 'string' ) { arg = parseInt( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ) ; }
					return '0' ;
				case 'U' :	// unsigned positive decimal
					if ( typeof arg === 'string' ) { arg = parseInt( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 1 ) ; }
					return '1' ;
				case 'x' :	// unsigned hexadecimal, force pair of symbole
					if ( typeof arg === 'string' ) { arg = parseInt( arg ) ; }
					if ( typeof arg !== 'number' ) { return '0' ; }
					value = '' + Math.max( Math.floor( arg ) , 0 ).toString( 16 ) ;
					if ( value.length % 2 ) { value = '0' + value ; }
					return value ;
				case 'h' :	// unsigned hexadecimal
					if ( typeof arg === 'string' ) { arg = parseInt( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 16 ) ; }
					return '0' ;
				case 'o' :	// unsigned octal
					if ( typeof arg === 'string' ) { arg = parseInt( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 8 ) ; }
					return '0' ;
				case 'b' :	// unsigned binary
					if ( typeof arg === 'string' ) { arg = parseInt( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 2 ) ; }
					return '0' ;
				case 'I' :
					return inspect( { style: ( self && self.color ? 'color' : 'none' ) } , arg ) ;
				case 'Y' :
					return inspect( {
							style: ( self && self.color ? 'color' : 'none' ) ,
							noFunc: true ,
							enumOnly: true ,
							noDescriptor: true
						} ,
						arg ) ;
				case 'E' :
					return inspectError( { style: ( self && self.color ? 'color' : 'none' ) } , arg ) ;
				case 'J' :
					return JSON.stringify( arg ) ;
				case 'D' :
					return '' ;
				case 'F' :	// Function
					
					autoIndex -- ;	// %F does not eat any arg
					
					if ( modeArg === undefined ) { return '' ; }
					tmp = modeArg.split( ':' ) ;
					fn = tmp[ 0 ] ;
					fnArgString = tmp[ 1 ] ;
					if ( ! fn ) { return '' ; }
					
					if ( fnArgString && ( argMatches = fnArgString.match( /%([+-]?)([0-9]*)[a-zA-Z]/g ) ) )
					{
						//console.log( argMatches ) ;
						//console.log( fnArgString ) ;
						for ( i = 0 ; i < argMatches.length ; i ++ )
						{
							relative = argMatches[ i ][ 1 ] ;
							index = argMatches[ i ][ 2 ] ;
							
							if ( index )
							{
								index = parseInt( index , 10 ) ;
								
								if ( relative )
								{
									if ( relative === '+' ) { index = autoIndex + index ; }		// jshint ignore:line
									else if ( relative === '-' ) { index = autoIndex - index ; }	// jshint ignore:line
								}
							}
							else
							{
								index = autoIndex ;
							}
							
							autoIndex ++ ;
							
							if ( index >= length || index < 1 ) { argList[ i ] = undefined ; }
							else { argList[ i ] = args[ index ] ; }
						}
					}
					
					if ( ! self || ! self.fn || typeof self.fn[ fn ] !== 'function' ) { return '' ; }
					return self.fn[ fn ].apply( self , argList ) ;
				
				default :
					return '' ;
			}
	} ) ;
	
	if ( hasMarkup && this.markupReset && this.endingMarkupReset )
	{
		str += typeof this.markupReset === 'function' ? this.markupReset( markupStack ) : this.markupReset ;
	}
	
	if ( this.extraArguments )
	{
		for ( ; autoIndex < length ; autoIndex ++ )
		{
			arg = args[ autoIndex ] ;
			if ( arg === null || arg === undefined ) { continue ; }
			else if ( typeof arg === 'string' ) { str += arg ; }
			else if ( typeof arg === 'number' ) { str += arg ; }
			else if ( typeof arg.toString === 'function' ) { str += arg.toString() ; }
		}
	}
	
	return str ;
} ;



var defaultFormatter = {
	extraArguments: true ,
	endingMarkupReset: true ,
	markupReset: ansi.reset ,
	markup: {
		":": ansi.reset ,
		" ": ansi.reset + " " ,
		
		"-": ansi.dim ,
		"+": ansi.bold ,
		"_": ansi.underline ,
		"/": ansi.italic ,
		"!": ansi.inverse ,
		
		"b": ansi.blue ,
		"B": ansi.brightBlue ,
		"c": ansi.cyan ,
		"C": ansi.brightCyan ,
		"g": ansi.green ,
		"G": ansi.brightGreen ,
		"k": ansi.black ,
		"K": ansi.brightBlack ,
		"m": ansi.magenta ,
		"M": ansi.brightMagenta ,
		"r": ansi.red ,
		"R": ansi.brightRed ,
		"w": ansi.white ,
		"W": ansi.brightWhite ,
		"y": ansi.yellow ,
		"Y": ansi.brightYellow
	}
} ;

exports.format = exports.formatMethod.bind( defaultFormatter ) ;
exports.format.default = defaultFormatter ;



exports.markupMethod = function markup( str )
{
	if ( typeof str !== 'string' )
	{
		if ( str === null || str === undefined ) { return '' ; }
		else if ( /*str && typeof str === 'object' && */ typeof str.toString === 'function' ) { str = str.toString() ; }
		else { return '' ; }
	}
	
	var self = this , hasMarkup = false , markupStack = [] ;
	
	//console.log( 'format args:' , arguments ) ;
	
	str = str.replace( /\^(.?)/g , function( match , markup ) {
		var replacement ;
		
		if ( markup === '^' ) { return '^' ; }
		if ( ! self.markup || ! self.markup[ markup ] ) { return '' ; }
		hasMarkup = true ;
		
		if ( typeof self.markup[ markup ] === 'function' )
		{
			replacement = self.markup[ markup ]( markupStack ) ;
			// method should manage markup stack themselves
		}
		else
		{
			replacement = self.markup[ markup ] ;
			markupStack.push( replacement ) ;
		}
		
		return replacement ;
	} ) ;
	
	if ( hasMarkup && this.markupReset && this.endingMarkupReset )
	{
		str += typeof this.markupReset === 'function' ? this.markupReset( markupStack ) : this.markupReset ;
	}
	
	return str ;
} ;

exports.markup = exports.markupMethod.bind( defaultFormatter ) ;



// Count the number of parameters needed for this string
exports.format.count = function formatCount( str )
{
	var match , index , relative , autoIndex = 1 , maxIndex = 0 ;
	
	if ( typeof str !== 'string' ) { return 0 ; }
	
	// This regex differs slightly from the main regex: we do not count '%%' and %F is excluded
	var regexp = /%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-EG-Z])/g ;
	
	
	while ( ( match = regexp.exec( str ) ) !== null )
	{
		//console.log( match ) ;
		relative = match[ 1 ] ;
		index = match[ 2 ] ;
		
		if ( index )
		{
			index = parseInt( index , 10 ) ;
			
			if ( relative )
			{
				if ( relative === '+' ) { index = autoIndex + index ; }
				else if ( relative === '-' ) { index = autoIndex - index ; }
			}
		}
		else
		{
			index = autoIndex ;
		}
		
		autoIndex ++ ;
		
		if ( maxIndex < index ) { maxIndex = index ; }
	}
	
	return maxIndex ;
} ;



// Tell if this string contains formatter chars
exports.format.hasFormatting = function hasFormatting( str )
{
	if ( str.search( /\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/ ) !== -1 ) { return true ; }
	else { return false ; }
} ;



},{"./ansi.js":19,"./inspect.js":22}],22:[function(require,module,exports){
(function (Buffer,process){
/*
	String Kit
	
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

/* global Map, Set */

/*
	Variable inspector.
*/



"use strict" ;



// Load modules
var treeExtend = require( 'tree-kit/lib/extend.js' ) ;
var escape = require( './escape.js' ) ;
var ansi = require( './ansi.js' ) ;



/*
	Inspect a variable, return a string ready to be displayed with console.log(), or even as an HTML output.
	
	Options:
		* style:
			* 'none': (default) normal output suitable for console.log() or writing in a file
			* 'color': colorful output suitable for terminal
			* 'html': html output
		* depth: depth limit, default: 3
		* noFunc: do not display functions
		* noDescriptor: do not display descriptor information
		* noType: do not display type and constructor
		* enumOnly: only display enumerable properties
		* funcDetails: display function's details
		* proto: display object's prototype
		* sort: sort the keys
		* minimal: imply noFunc: true, noDescriptor: true, noType: true, enumOnly: true, proto: false and funcDetails: false.
		  Display a minimal JSON-like output
		* useInspect? use .inspect() method when available on an object
*/

function inspect( options , variable )
{
	if ( arguments.length < 2 ) { variable = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	var runtime = { depth: 0 , ancestors: [] } ;
	
	if ( ! options.style ) { options.style = inspectStyle.none ; }
	else if ( typeof options.style === 'string' ) { options.style = inspectStyle[ options.style ] ; }
	
	if ( options.depth === undefined ) { options.depth = 3 ; }
	
	// /!\ nofunc is deprecated
	if ( options.nofunc ) { options.noFunc = true ; }
	
	if ( options.minimal )
	{
		options.noFunc = true ;
		options.noDescriptor = true ;
		options.noType = true ;
		options.enumOnly = true ;
		options.funcDetails = false ;
		options.proto = false ;
	}
	
	return inspect_( runtime , options , variable ) ;
}



function inspect_( runtime , options , variable )
{
	var i , funcName , length , propertyList , constructor , keyIsProperty ,
		type , pre , indent , isArray , isFunc , specialObject ,
		str = '' , key = '' , descriptorStr = '' , descriptor , nextAncestors ;
	
	
	// Prepare things (indentation, key, descriptor, ... )
	
	type = typeof variable ;
	indent = options.style.tab.repeat( runtime.depth ) ;
	
	if ( type === 'function' && options.noFunc ) { return '' ; }
	
	if ( runtime.key !== undefined )
	{
		if ( runtime.descriptor )
		{
			descriptorStr = [] ;
			
			if ( ! runtime.descriptor.configurable ) { descriptorStr.push( '-conf' ) ; }
			if ( ! runtime.descriptor.enumerable ) { descriptorStr.push( '-enum' ) ; }
			
			// Already displayed by runtime.forceType
			//if ( runtime.descriptor.get || runtime.descriptor.set ) { descriptorStr.push( 'getter/setter' ) ; } else
			if ( ! runtime.descriptor.writable ) { descriptorStr.push( '-w' ) ; }
			
			//if ( descriptorStr.length ) { descriptorStr = '(' + descriptorStr.join( ' ' ) + ')' ; }
			if ( descriptorStr.length ) { descriptorStr = descriptorStr.join( ' ' ) ; }
			else { descriptorStr = '' ; }
		}
		
		if ( runtime.keyIsProperty )
		{
			if ( keyNeedingQuotes( runtime.key ) )
			{
				key = '"' + options.style.key( runtime.key ) + '": ' ;
			}
			else
			{
				key = options.style.key( runtime.key ) + ': ' ;
			}
		}
		else
		{
			key = '[' + options.style.index( runtime.key ) + '] ' ;
		}
		
		if ( descriptorStr ) { descriptorStr = ' ' + options.style.type( descriptorStr ) ; }
	}
	
	pre = runtime.noPre ? '' : indent + key ;
	
	
	// Describe the current variable
	
	if ( variable === undefined )
	{
		str += pre + options.style.constant( 'undefined' ) + descriptorStr + options.style.nl ;
	}
	else if ( variable === null )
	{
		str += pre + options.style.constant( 'null' ) + descriptorStr + options.style.nl ;
	}
	else if ( variable === false )
	{
		str += pre + options.style.constant( 'false' ) + descriptorStr + options.style.nl ;
	}
	else if ( variable === true )
	{
		str += pre + options.style.constant( 'true' ) + descriptorStr + options.style.nl ;
	}
	else if ( type === 'number' )
	{
		str += pre + options.style.number( variable.toString() ) +
			( options.noType ? '' : ' ' + options.style.type( 'number' ) ) +
			descriptorStr + options.style.nl ;
	}
	else if ( type === 'string' )
	{
		str += pre + '"' + options.style.string( escape.control( variable ) ) + '" ' +
			( options.noType ? '' : options.style.type( 'string' ) + options.style.length( '(' + variable.length + ')' ) ) +
			descriptorStr + options.style.nl ;
	}
	else if ( Buffer.isBuffer( variable ) )
	{
		str += pre + options.style.inspect( variable.inspect() ) + ' ' +
			( options.noType ? '' : options.style.type( 'Buffer' ) + options.style.length( '(' + variable.length + ')' ) ) +
			descriptorStr + options.style.nl ;
	}
	else if ( type === 'object' || type === 'function' )
	{
		funcName = length = '' ;
		isFunc = false ;
		if ( type === 'function' )
		{
			isFunc = true ;
			funcName = ' ' + options.style.funcName( ( variable.name ? variable.name : '(anonymous)' ) ) ;
			length = options.style.length( '(' + variable.length + ')' ) ;
		}
		
		isArray = false ;
		if ( Array.isArray( variable ) )
		{
			isArray = true ;
			length = options.style.length( '(' + variable.length + ')' ) ;
		}
		
		if ( ! variable.constructor ) { constructor = '(no constructor)' ; }
		else if ( ! variable.constructor.name ) { constructor = '(anonymous)' ; }
		else { constructor = variable.constructor.name ; }
		
		constructor = options.style.constructorName( constructor ) ;
		
		str += pre ;
		
		if ( ! options.noType )
		{
			if ( runtime.forceType ) { str += options.style.type( runtime.forceType ) ; }
			else { str += constructor + funcName + length + ' ' + options.style.type( type ) + descriptorStr ; }
			
			if ( ! isFunc || options.funcDetails ) { str += ' ' ; }	// if no funcDetails imply no space here
		}
		
		propertyList = Object.getOwnPropertyNames( variable ) ;
		
		if ( options.sort ) { propertyList.sort() ; }
		
		// Special Objects
		specialObject = specialObjectSubstitution( variable ) ;
		
		if ( specialObject !== undefined )
		{
			str += '=> ' + inspect_( {
					depth: runtime.depth ,
					ancestors: runtime.ancestors ,
					noPre: true
				} ,
				options ,
				specialObject
			) ;
		}
		else if ( isFunc && ! options.funcDetails )
		{
			str += options.style.nl ;
		}
		else if ( ! propertyList.length && ! options.proto )
		{
			str += '{}' + options.style.nl ;
		}
		else if ( runtime.depth >= options.depth )
		{
			str += options.style.limit( '[depth limit]' ) + options.style.nl ;
		}
		else if ( runtime.ancestors.indexOf( variable ) !== -1 )
		{
			str += options.style.limit( '[circular]' ) + options.style.nl ;
		}
		else
		{
			str += ( isArray && options.noType ? '[' : '{' ) + options.style.nl ;
			
			// Do not use .concat() here, it doesn't works as expected with arrays...
			nextAncestors = runtime.ancestors.slice() ;
			nextAncestors.push( variable ) ;
			
			for ( i = 0 ; i < propertyList.length ; i ++ )
			{
				try {
					descriptor = Object.getOwnPropertyDescriptor( variable , propertyList[ i ] ) ;
					
					if ( ! descriptor.enumerable && options.enumOnly ) { continue ; }
					
					keyIsProperty = ! isArray || ! descriptor.enumerable || isNaN( propertyList[ i ] ) ;
					
					if ( ! options.noDescriptor && ( descriptor.get || descriptor.set ) )
					{
						str += inspect_( {
								depth: runtime.depth + 1 ,
								ancestors: nextAncestors ,
								key: propertyList[ i ] ,
								keyIsProperty: keyIsProperty ,
								descriptor: descriptor ,
								forceType: 'getter/setter'
							} ,
							options ,
							{ get: descriptor.get , set: descriptor.set }
						) ;
					}
					else
					{
						str += inspect_( {
								depth: runtime.depth + 1 ,
								ancestors: nextAncestors ,
								key: propertyList[ i ] ,
								keyIsProperty: keyIsProperty ,
								descriptor: options.noDescriptor ? undefined : descriptor
							} ,
							options ,
							variable[ propertyList[ i ] ]
						) ;
					}
				}
				catch ( error ) {
					str += inspect_( {
							depth: runtime.depth + 1 ,
							ancestors: nextAncestors ,
							key: propertyList[ i ] ,
							keyIsProperty: keyIsProperty ,
							descriptor: options.noDescriptor ? undefined : descriptor
						} ,
						options ,
						error
					) ;
				}
			}
			
			if ( options.proto )
			{
				str += inspect_( {
						depth: runtime.depth + 1 ,
						ancestors: nextAncestors ,
						key: '__proto__' ,
						keyIsProperty: true
					} ,
					options ,
					variable.__proto__	// jshint ignore:line
				) ;
			}
			
			str += indent + ( isArray && options.noType ? ']' : '}' ) + options.style.nl ;
		}
	}
	
	
	// Finalizing
	
	if ( runtime.depth === 0 )
	{
		if ( options.style === 'html' ) { str = escape.html( str ) ; }
	}
	
	return str ;
}

exports.inspect = inspect ;



function keyNeedingQuotes( key )
{
	if ( ! key.length ) { return true ; }
	return false ;
}



// Some special object are better written down when substituted by something else
function specialObjectSubstitution( variable )
{
	switch ( variable.constructor.name )
	{
		case 'Date' :
			if ( variable instanceof Date )
			{
				return variable.toString() + ' [' + variable.getTime() + ']' ;
			}
			break ;
		case 'Set' :
			if ( typeof Set === 'function' && variable instanceof Set )
			{
				// This is an ES6 'Set' Object
				return Array.from( variable ) ;
			}
			break ;
		case 'Map' :
			if ( typeof Map === 'function' && variable instanceof Map )
			{
				// This is an ES6 'Map' Object
				return Array.from( variable ) ;
			}
			break ;
		case 'ObjectID' :
			if ( variable._bsontype )
			{
				// This is a MongoDB ObjectID, rather boring to display in its original form
				// due to esoteric characters that confuse both the user and the terminal displaying it.
				// Substitute it to its string representation
				return variable.toString() ;
			}
			break ;
	}
	
	return ;
}



function inspectError( options , error )
{
	var str = '' , stack , type , code ;
	
	if ( arguments.length < 2 ) { error = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( error instanceof Error ) ) { return  ; }
	
	if ( ! options.style ) { options.style = inspectStyle.none ; }
	else if ( typeof options.style === 'string' ) { options.style = inspectStyle[ options.style ] ; }
	
	if ( error.stack ) { stack = inspectStack( options , error.stack ) ; }
	
	type = error.type || error.constructor.name ;
	code = error.code || error.name || error.errno || error.number ;
	
	str += options.style.errorType( type ) +
		( code ? ' [' + options.style.errorType( code ) + ']' : '' ) + ': ' ;
	str += options.style.errorMessage( error.message ) + '\n' ;
	
	if ( stack ) { str += options.style.errorStack( stack ) + '\n' ; }
	
	return str ;
}

exports.inspectError = inspectError ;



function inspectStack( options , stack )
{
	if ( arguments.length < 2 ) { stack = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! options.style ) { options.style = inspectStyle.none ; }
	else if ( typeof options.style === 'string' ) { options.style = inspectStyle[ options.style ] ; }
	
	if ( ! stack ) { return ; }
	
	if ( ( options.browser || process.browser ) && stack.indexOf( '@' ) !== -1 )
	{
		// Assume a Firefox-compatible stack-trace here...
		stack = stack
			.replace( /[<\/]*(?=@)/g , '' )	// Firefox output some WTF </</</</< stuff in its stack trace -- removing that
			.replace(
				/^\s*([^@]*)\s*@\s*([^\n]*)(?::([0-9]+):([0-9]+))?$/mg ,
				function( matches , method , file , line , column ) {	// jshint ignore:line
					return options.style.errorStack( '    at ' ) +
						( method ? options.style.errorStackMethod( method ) + ' ' : '' ) +
						options.style.errorStack( '(' ) +
						( file ? options.style.errorStackFile( file ) : options.style.errorStack( 'unknown' ) ) +
						( line ? options.style.errorStack( ':' ) + options.style.errorStackLine( line ) : '' ) +
						( column ? options.style.errorStack( ':' ) + options.style.errorStackColumn( column ) : '' ) +
						options.style.errorStack( ')' ) ;
				}
			) ;
	}
	else
	{
		stack = stack.replace( /^[^\n]*\n/ , '' ) ;
		stack = stack.replace(
			/^\s*(at)\s+(?:([^\s:\(\)\[\]\n]+(?:\([^\)]+\))?)\s)?(?:\[as ([^\s:\(\)\[\]\n]+)\]\s)?(?:\(?([^:\(\)\[\]\n]+):([0-9]+):([0-9]+)\)?)?$/mg ,
			function( matches , at , method , as , file , line , column ) {	// jshint ignore:line
				return options.style.errorStack( '    at ' ) +
					( method ? options.style.errorStackMethod( method ) + ' ' : '' ) +
					( as ? options.style.errorStack( '[as ' ) + options.style.errorStackMethodAs( as ) + options.style.errorStack( '] ' ) : '' ) +
					options.style.errorStack( '(' ) +
					( file ? options.style.errorStackFile( file ) : options.style.errorStack( 'unknown' ) ) +
					( line ? options.style.errorStack( ':' ) + options.style.errorStackLine( line ) : '' ) +
					( column ? options.style.errorStack( ':' ) + options.style.errorStackColumn( column ) : '' ) +
					options.style.errorStack( ')' ) ;
			}
		) ;
	}
	
	return stack ;
}

exports.inspectStack = inspectStack ;



// Inspect's styles

var inspectStyle = {} ;

var inspectStyleNoop = function( str ) { return str ; } ;



inspectStyle.none = {
	tab: '    ' ,
	nl: '\n' ,
	limit: inspectStyleNoop ,
	type: function( str ) { return '<' + str + '>' ; } ,
	constant: inspectStyleNoop ,
	funcName: inspectStyleNoop ,
	constructorName: function( str ) { return '<' + str + '>' ; } ,
	length: inspectStyleNoop ,
	key: inspectStyleNoop ,
	index: inspectStyleNoop ,
	number: inspectStyleNoop ,
	inspect: inspectStyleNoop ,
	string: inspectStyleNoop ,
	errorType: inspectStyleNoop ,
	errorMessage: inspectStyleNoop ,
	errorStack: inspectStyleNoop ,
	errorStackMethod: inspectStyleNoop ,
	errorStackMethodAs: inspectStyleNoop ,
	errorStackFile: inspectStyleNoop ,
	errorStackLine: inspectStyleNoop ,
	errorStackColumn: inspectStyleNoop
} ;



inspectStyle.color = treeExtend( null , {} , inspectStyle.none , {
	limit: function( str ) { return ansi.bold + ansi.brightRed + str + ansi.reset ; } ,
	type: function( str ) { return ansi.italic + ansi.brightBlack + str + ansi.reset ; } ,
	constant: function( str ) { return ansi.cyan + str + ansi.reset ; } ,
	funcName: function( str ) { return ansi.italic + ansi.magenta + str + ansi.reset ; } ,
	constructorName: function( str ) { return ansi.magenta + str + ansi.reset ; } ,
	length: function( str ) { return ansi.italic + ansi.brightBlack + str + ansi.reset ; } ,
	key: function( str ) { return ansi.green + str + ansi.reset ; } ,
	index: function( str ) { return ansi.blue + str + ansi.reset ; } ,
	number: function( str ) { return ansi.cyan + str + ansi.reset ; } ,
	inspect: function( str ) { return ansi.cyan + str + ansi.reset ; } ,
	string: function( str ) { return ansi.blue + str + ansi.reset ; } ,
	errorType: function( str ) { return ansi.red + ansi.bold + str + ansi.reset ; } ,
	errorMessage: function( str ) { return ansi.red + ansi.italic + str + ansi.reset ; } ,
	errorStack: function( str ) { return ansi.brightBlack + str + ansi.reset ; } ,
	errorStackMethod: function( str ) { return ansi.brightYellow + str + ansi.reset ; } ,
	errorStackMethodAs: function( str ) { return ansi.yellow + str + ansi.reset ; } ,
	errorStackFile: function( str ) { return ansi.brightCyan + str + ansi.reset ; } ,
	errorStackLine: function( str ) { return ansi.blue + str + ansi.reset ; } ,
	errorStackColumn: function( str ) { return ansi.magenta + str + ansi.reset ; }
} ) ;



inspectStyle.html = treeExtend( null , {} , inspectStyle.none , {
	tab: '&nbsp;&nbsp;&nbsp;&nbsp;' ,
	nl: '<br />' ,
	limit: function( str ) { return '<span style="color:red">' + str + '</span>' ; } ,
	type: function( str ) { return '<i style="color:gray">' + str + '</i>' ; } ,
	constant: function( str ) { return '<span style="color:cyan">' + str + '</span>' ; } ,
	funcName: function( str ) { return '<i style="color:magenta">' + str + '</i>' ; } ,
	constructorName: function( str ) { return '<span style="color:magenta">' + str + '</span>' ; } ,
	length: function( str ) { return '<i style="color:gray">' + str + '</i>' ; } ,
	key: function( str ) { return '<span style="color:green">' + str + '</span>' ; } ,
	index: function( str ) { return '<span style="color:blue">' + str + '</span>' ; } ,
	number: function( str ) { return '<span style="color:cyan">' + str + '</span>' ; } ,
	inspect: function( str ) { return '<span style="color:cyan">' + str + '</span>' ; } ,
	string: function( str ) { return '<span style="color:blue">' + str + '</span>' ; } ,
	errorType: function( str ) { return '<span style="color:red">' + str + '</span>' ; } ,
	errorMessage: function( str ) { return '<span style="color:red">' + str + '</span>' ; } ,
	errorStack: function( str ) { return '<span style="color:gray">' + str + '</span>' ; } ,
	errorStackMethod: function( str ) { return '<span style="color:yellow">' + str + '</span>' ; } ,
	errorStackMethodAs: function( str ) { return '<span style="color:yellow">' + str + '</span>' ; } ,
	errorStackFile: function( str ) { return '<span style="color:cyan">' + str + '</span>' ; } ,
	errorStackLine: function( str ) { return '<span style="color:blue">' + str + '</span>' ; } ,
	errorStackColumn: function( str ) { return '<span style="color:gray">' + str + '</span>' ; }
} ) ;



}).call(this,{"isBuffer":require("../../is-buffer/index.js")},require('_process'))
},{"../../is-buffer/index.js":8,"./ansi.js":19,"./escape.js":20,"_process":14,"tree-kit/lib/extend.js":23}],23:[function(require,module,exports){
/*
	Tree Kit
	
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



/*
	== Extend function ==
*/

/*
	options:
		* own: only copy own properties that are enumerable
		* nonEnum: copy non-enumerable properties as well, works only with own:true
		* descriptor: preserve property's descriptor
		* deep: perform a deep (recursive) extend
		* maxDepth: used in conjunction with deep, when max depth is reached an exception is raised, default to 100 when
			the 'circular' option is off, or default to null if 'circular' is on
		* circular: circular references reconnection
		* move: move properties to target (delete properties from the sources)
		* preserve: existing properties in the target object are not overwritten
		* nofunc: skip functions
		* deepFunc: in conjunction with 'deep', this will process sources functions like objects rather than
			copying/referencing them directly into the source, thus, the result will not be a function, it forces 'deep'
		* proto: try to clone objects with the right prototype, using Object.create() or mutating it with Object.setPrototypeOf(),
			it forces option 'own'.
		* inherit: rather than mutating target prototype for source prototype like the 'proto' option does, here it is
			the source itself that IS the prototype for the target. Force option 'own' and disable 'proto'.
		* skipRoot: the prototype of the target root object is NOT mutated only if this option is set.
		* flat: extend into the target top-level only, compose name with the path of the source, force 'deep',
			disable 'unflat', 'proto', 'inherit'
		* unflat: assume sources are in the 'flat' format, expand all properties deeply into the target, disable 'flat'
		* deepFilter
			* blacklist: list of black-listed prototype: the recursiveness of the 'deep' option will be disabled
				for object whose prototype is listed
			* whitelist: the opposite of blacklist
*/
function extend( options , target )
{
	//console.log( "\nextend():\n" , arguments ) ;
	var i , source , newTarget = false , length = arguments.length ;
	
	if ( length < 3 ) { return target ; }
	
	var sources = Array.prototype.slice.call( arguments , 2 ) ;
	length = sources.length ;
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	var runtime = { depth: 0 , prefix: '' } ;
	
	if ( ! options.maxDepth && options.deep && ! options.circular ) { options.maxDepth = 100 ; }
	
	if ( options.deepFunc ) { options.deep = true ; }
	
	if ( options.deepFilter && typeof options.deepFilter === 'object' )
	{
		if ( options.deepFilter.whitelist && ( ! Array.isArray( options.deepFilter.whitelist ) || ! options.deepFilter.whitelist.length ) ) { delete options.deepFilter.whitelist ; }
		if ( options.deepFilter.blacklist && ( ! Array.isArray( options.deepFilter.blacklist ) || ! options.deepFilter.blacklist.length ) ) { delete options.deepFilter.blacklist ; }
		if ( ! options.deepFilter.whitelist && ! options.deepFilter.blacklist ) { delete options.deepFilter ; }
	}
	
	// 'flat' option force 'deep'
	if ( options.flat )
	{
		options.deep = true ;
		options.proto = false ;
		options.inherit = false ;
		options.unflat = false ;
		if ( typeof options.flat !== 'string' ) { options.flat = '.' ; }
	}
	
	if ( options.unflat )
	{
		options.deep = false ;
		options.proto = false ;
		options.inherit = false ;
		options.flat = false ;
		if ( typeof options.unflat !== 'string' ) { options.unflat = '.' ; }
	}
	
	// If the prototype is applied, only owned properties should be copied
	if ( options.inherit ) { options.own = true ; options.proto = false ; }
	else if ( options.proto ) { options.own = true ; }
	
	if ( ! target || ( typeof target !== 'object' && typeof target !== 'function' ) )
	{
		newTarget = true ;
	}
	
	if ( ! options.skipRoot && ( options.inherit || options.proto ) )
	{
		for ( i = length - 1 ; i >= 0 ; i -- )
		{
			source = sources[ i ] ;
			if ( source && ( typeof source === 'object' || typeof source === 'function' ) )
			{
				if ( options.inherit )
				{
					if ( newTarget ) { target = Object.create( source ) ; }
					else { Object.setPrototypeOf( target , source ) ; }
				}
				else if ( options.proto )
				{
					if ( newTarget ) { target = Object.create( Object.getPrototypeOf( source ) ) ; }
					else { Object.setPrototypeOf( target , Object.getPrototypeOf( source ) ) ; }
				}
				
				break ;
			}
		}
	}
	else if ( newTarget )
	{
		target = {} ;
	}
	
	runtime.references = { sources: [] , targets: [] } ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		source = sources[ i ] ;
		if ( ! source || ( typeof source !== 'object' && typeof source !== 'function' ) ) { continue ; }
		extendOne( runtime , options , target , source ) ;
	}
	
	return target ;
}

module.exports = extend ;



function extendOne( runtime , options , target , source )
{
	//console.log( "\nextendOne():\n" , arguments ) ;
	//process.exit() ;
	
	var j , jmax , sourceKeys , sourceKey , sourceValue , sourceValueProto ,
		value , sourceDescriptor , targetKey , targetPointer , path ,
		indexOfSource = -1 ;
	
	// Max depth check
	if ( options.maxDepth && runtime.depth > options.maxDepth )
	{
		throw new Error( '[tree] extend(): max depth reached(' + options.maxDepth + ')' ) ;
	}
	
		
	if ( options.circular )
	{
		runtime.references.sources.push( source ) ;
		runtime.references.targets.push( target ) ;
	}
	
	if ( options.own )
	{
		if ( options.nonEnum ) { sourceKeys = Object.getOwnPropertyNames( source ) ; }
		else { sourceKeys = Object.keys( source ) ; }
	}
	else { sourceKeys = source ; }
	
	for ( sourceKey in sourceKeys )
	{
		if ( options.own ) { sourceKey = sourceKeys[ sourceKey ] ; }
		
		// If descriptor is on, get it now
		if ( options.descriptor )
		{
			sourceDescriptor = Object.getOwnPropertyDescriptor( source , sourceKey ) ;
			sourceValue = sourceDescriptor.value ;
		}
		else
		{
			// We have to trigger an eventual getter only once
			sourceValue = source[ sourceKey ] ;
		}
		
		targetPointer = target ;
		targetKey = runtime.prefix + sourceKey ;
		
		// Do not copy if property is a function and we don't want them
		if ( options.nofunc && typeof sourceValue === 'function' ) { continue; }
		
		// 'unflat' mode computing
		if ( options.unflat && runtime.depth === 0 )
		{
			path = sourceKey.split( options.unflat ) ;
			jmax = path.length - 1 ;
			
			if ( jmax )
			{
				for ( j = 0 ; j < jmax ; j ++ )
				{
					if ( ! targetPointer[ path[ j ] ] ||
						( typeof targetPointer[ path[ j ] ] !== 'object' &&
							typeof targetPointer[ path[ j ] ] !== 'function' ) )
					{
						targetPointer[ path[ j ] ] = {} ;
					}
					
					targetPointer = targetPointer[ path[ j ] ] ;
				}
				
				targetKey = runtime.prefix + path[ jmax ] ;
			}
		}
		
		
		if ( options.deep &&
			sourceValue &&
			( typeof sourceValue === 'object' || ( options.deepFunc && typeof sourceValue === 'function' ) ) &&
			( ! options.descriptor || ! sourceDescriptor.get ) &&
			// not a condition we just cache sourceValueProto now
			( ( sourceValueProto = Object.getPrototypeOf( sourceValue ) ) || true ) &&
			( ! options.deepFilter ||
				( ( ! options.deepFilter.whitelist || options.deepFilter.whitelist.indexOf( sourceValueProto ) !== -1 ) &&
					( ! options.deepFilter.blacklist || options.deepFilter.blacklist.indexOf( sourceValueProto ) === -1 ) ) ) )
		{
			if ( options.circular )
			{
				indexOfSource = runtime.references.sources.indexOf( sourceValue ) ;
			}
			
			if ( options.flat )
			{
				// No circular references reconnection when in 'flat' mode
				if ( indexOfSource >= 0 ) { continue ; }
				
				extendOne(
					{ depth: runtime.depth + 1 , prefix: runtime.prefix + sourceKey + options.flat , references: runtime.references } ,
					options , targetPointer , sourceValue
				) ;
			}
			else
			{
				if ( indexOfSource >= 0 )
				{
					// Circular references reconnection...
					if ( options.descriptor )
					{
						Object.defineProperty( targetPointer , targetKey , {
							value: runtime.references.targets[ indexOfSource ] ,
							enumerable: sourceDescriptor.enumerable ,
							writable: sourceDescriptor.writable ,
							configurable: sourceDescriptor.configurable
						} ) ;
					}
					else
					{
						targetPointer[ targetKey ] = runtime.references.targets[ indexOfSource ] ;
					}
					
					continue ;
				}
				
				if ( ! targetPointer[ targetKey ] || ! targetPointer.hasOwnProperty( targetKey ) || ( typeof targetPointer[ targetKey ] !== 'object' && typeof targetPointer[ targetKey ] !== 'function' ) )
				{
					if ( Array.isArray( sourceValue ) ) { value = [] ; }
					else if ( options.proto ) { value = Object.create( sourceValueProto ) ; }	// jshint ignore:line
					else if ( options.inherit ) { value = Object.create( sourceValue ) ; }
					else { value = {} ; }
					
					if ( options.descriptor )
					{
						Object.defineProperty( targetPointer , targetKey , {
							value: value ,
							enumerable: sourceDescriptor.enumerable ,
							writable: sourceDescriptor.writable ,
							configurable: sourceDescriptor.configurable
						} ) ;
					}
					else
					{
						targetPointer[ targetKey ] = value ;
					}
				}
				else if ( options.proto && Object.getPrototypeOf( targetPointer[ targetKey ] ) !== sourceValueProto )
				{
					Object.setPrototypeOf( targetPointer[ targetKey ] , sourceValueProto ) ;
				}
				else if ( options.inherit && Object.getPrototypeOf( targetPointer[ targetKey ] ) !== sourceValue )
				{
					Object.setPrototypeOf( targetPointer[ targetKey ] , sourceValue ) ;
				}
				
				if ( options.circular )
				{
					runtime.references.sources.push( sourceValue ) ;
					runtime.references.targets.push( targetPointer[ targetKey ] ) ;
				}
				
				// Recursively extends sub-object
				extendOne(
					{ depth: runtime.depth + 1 , prefix: '' , references: runtime.references } ,
					options , targetPointer[ targetKey ] , sourceValue
				) ;
			}
		}
		else if ( options.preserve && targetPointer[ targetKey ] !== undefined )
		{
			// Do not overwrite, and so do not delete source's properties that were not moved
			continue ;
		}
		else if ( ! options.inherit )
		{
			if ( options.descriptor ) { Object.defineProperty( targetPointer , targetKey , sourceDescriptor ) ; }
			else { targetPointer[ targetKey ] = sourceValue ; }
		}
		
		// Delete owned property of the source object
		if ( options.move ) { delete source[ sourceKey ] ; }
	}
}


},{}],24:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":25,"punycode":15,"querystring":18}],25:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}]},{},[2])(2)
});