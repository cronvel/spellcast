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

/* global window */



var domKit = require( 'dom-kit' ) ;
var treeExtend = require( 'tree-kit/lib/extend.js' ) ;

function noop() {}



function Dom() { return Dom.create() ; }
module.exports = Dom ;



Dom.create = function create()
{
	var self = Object.create( Dom.prototype ) ;

	self.$theme = document.querySelector('#theme') ;
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
	self.onChatSubmit = null ;

	self.initEvents() ;

	// temp
	window.dom = self ;
	// temp

	return self ;
} ;



Dom.prototype.setTheme = function setTheme( theme )
{
	this.$theme.setAttribute( 'href' , theme.url ) ;
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

	domKit.empty( this.$connection ) ;

	this.$connection.appendChild( textElement ) ;
	this.$connection.classList.toggle( 'alert' , options.alert ) ;
} ;



Dom.prototype.clear = function clear( callback )
{
	callback = callback || noop ;
	domKit.empty( this.$hint ) ;
	domKit.empty( this.$text ) ;
	domKit.empty( this.$next ) ;
	callback() ;
} ;


Dom.prototype.clearHints = function clearHints( callback )
{
	callback = callback || noop ;
	domKit.empty( this.$hint ) ;
	callback() ;
} ;



Dom.prototype.clearMessages = function clearMessages( callback )
{
	callback = callback || noop ;
	domKit.empty( this.$text ) ;
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


// TODO
Dom.prototype.messageNext = function messageNext( callback )
{
	callback() ;
} ;


Dom.prototype.clearChoices = function clearChoices( callback )
{
	callback = callback || noop ;
	domKit.empty( this.$next ) ;
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
			var spanElement = document.createElement( 'span' ) ;
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
Dom.prototype.setChoices = function setChoices( choices , undecidedNames , onSelect , options , callback )
{
	var self = this ;

	options = options || {} ;
	callback = callback || noop ;

	this.clearChoices( function() {
		if ( options.style === 'inline' ) { self.$next.classList.add( 'inline' ) ; }
		else { self.$next.classList.remove( 'inline' ) ; }
		
		self.addChoices( choices , onSelect , callback ) ;

		if ( undecidedNames && undecidedNames.length )
		{
			var $unassignedUsers = document.createElement( 'p' ) ;
			$unassignedUsers.classList.add( 'unassigned-users' ) ;
			$unassignedUsers.textContent = undecidedNames.join( ', ' ) ;
			self.$next.appendChild( $unassignedUsers ) ;
		}

		if ( typeof options.timeout === 'number' ) { self.choiceTimeout( options.timeout ) ; }
	} ) ;
} ;



Dom.prototype.setChoiceStyle = function setChoiceStyle( style )
{
	switch ( style )
	{
		case 'inline' :
		case 'list' :
			this.$next.setAttribute( 'data-choice-style' , style ) ;
			break ;
		case 'auto' :
		default :
			this.$next.setAttribute( 'data-choice-style' , null ) ;
	}
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



Dom.prototype.textInputDisabled = function textInputDisabled( options )
{
	var $form = document.createElement('form') ,
		$label = document.createElement('label') ,
		$input = document.createElement('input') ;

	$label.textContent = options.label ;

	$input.setAttribute('placeholder' , options.placeholder ) ;
	$input.setAttribute('disabled' , true) ;
	$input.setAttribute('type' , 'text') ;
	$input.classList.add('text-input') ;

	$form.appendChild( $label ) ;
	$form.appendChild( $input ) ;
	this.$text.appendChild( $form ) ;
} ;


Dom.prototype.textInput = function textInput( options , callback )
{
	var $form = document.createElement('form') ,
		$label = document.createElement('label') ,
		$input = document.createElement('input') ;

	// HINT: remove this class?
	$label.classList.add('text') ;
	$label.textContent = options.label ;

	$input.setAttribute('type' , 'text') ;
	$input.classList.add('text-input') ;

	$form.appendChild( $label ) ;
	$form.appendChild( $input ) ;
	this.$text.appendChild( $form ) ;

	$input.focus() ;

	var finalize = function finalize( event ) {
		event.preventDefault() ;

		$form.removeEventListener( 'submit' , finalize ) ;
		$input.setAttribute( 'disabled' , true ) ;
		callback( $input.value ) ;
	} ;

	$form.addEventListener( 'submit' , finalize ) ;
} ;



Dom.prototype.enableChat = function enableChat( callback )
{
	var self = this ;

	if ( ! this.onChatSubmit ) {
		this.onChatSubmit = function( event ) {
			event.preventDefault() ;
			callback( self.$chatInput.value ) ;
			self.$chatInput.value = '' ;
		} ;

		this.$chatForm.addEventListener( 'submit' , this.onChatSubmit ) ;

		this.$chat.classList.remove( 'hidden' ) ;
		this.$chatInput.removeAttribute( 'disabled' ) ;
	}
} ;



Dom.prototype.disableChat = function disableChat()
{
	this.$chatForm.removeEventListener( 'submit' , this.onChatSubmit ) ;
	this.onChatSubmit = null ;

	this.$chat.classList.add( 'hidden' ) ;
	this.$chatInput.setAttribute( 'disabled' , true ) ;
} ;



Dom.prototype.clearHint = function clearHint()
{
	domKit.empty( this.$hint ) ;
} ;



Dom.prototype.setBigHint = function setBigHint( text , classes )
{
	var $hint = document.createElement( 'h2' ) ;
	$hint.textContent = text ;
	if ( classes ) { domKit.class( $hint , classes ) ; }
	domKit.empty( this.$hint ) ;
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
		sprite.$img.setAttribute( 'src' , data.url ) ;
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



Dom.prototype.defineAnimation = function defineAnimation( id , data )
{
	this.animations[ id ] = data ;
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
