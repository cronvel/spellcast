(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SpellcastClient = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Promise = require( 'seventh' ) ;
const domKit = require( 'dom-kit' ) ;
const svgKit = require( 'svg-kit' ) ;
const commonUtils = require( '../../commonUtils.js' ) ;



function noop() {}



function Dom() {
	this.$body = document.querySelector( 'body' ) ;
	this.$spellcast = document.querySelector( 'spellcast' ) ;
	this.$theme = document.querySelector( '#theme' ) ;
	this.$gfx = document.querySelector( '#gfx' ) ;
	this.$sceneImage = document.querySelector( '.scene-image' ) ;
	this.$main = document.querySelector( 'main' ) ;
	this.$mainBuffer = document.querySelector( '#main-buffer' ) ;
	this.$altBuffer = document.querySelector( '#alt-buffer' ) ;
	this.$closeAltButton = document.querySelector( '#button-close-alt' ) ;
	this.$dialogWrapper = document.querySelector( '#dialog-wrapper' ) ;
	this.$hint = document.querySelector( '#hint' ) ;
	this.$lobby = document.querySelector( '#lobby' ) ;
	this.$clientStatus = this.$lobby.querySelector( '.client-status' ) ;
	this.$status = document.querySelector( '#status' ) ;
	this.$panel = document.querySelector( '#panel' ) ;
	this.$music = document.querySelector( '#music' ) ;
	this.$sound0 = document.querySelector( '#sound0' ) ;
	this.$sound1 = document.querySelector( '#sound1' ) ;
	this.$sound2 = document.querySelector( '#sound2' ) ;
	this.$sound3 = document.querySelector( '#sound3' ) ;

	this.choices = [] ;

	this.newSegmentNeeded = null ;
	this.onSelect = null ;
	this.onLeave = null ;
	this.onEnter = null ;
	this.toMainBuffer() ;

	this.nextSoundChannel = 0 ;

	this.sprites = {} ;
	this.vgs = {} ;
	this.markers = {} ;
	this.cards = {} ;
	this.gItemLocations = {} ;
	this.animations = {} ;

	this.hintTimer = null ;
	this.sceneImageOnTimer = null ;
	this.onCommandSubmit = null ;

	// The number of UI loading in progress
	this.uiLoadingCount = 0 ;

	this.initEvents() ;
}

module.exports = Dom ;

Dom.prototype = Object.create( Ngev.prototype ) ;
Dom.prototype.constructor = Dom ;



Dom.prototype.cleanUrl = function( url ) {
	if ( url[ 0 ] === '/' ) { return window.location.pathname + url.slice( 1 ) ; }
	return window.location.pathname + 'script/' + url ;
} ;



Dom.prototype.setTheme = function( theme ) {
	this.$theme.setAttribute( 'href' , this.cleanUrl( theme.url ) ) ;
} ;



Dom.prototype.preload = function() {
	domKit.preload( [
		'icons/plugged.svg' ,
		'icons/plugging.svg' ,
		'icons/unplugged.svg' ,
		'icons/unreachable-plug.svg'
	] ) ;
} ;



Dom.prototype.initEvents = function() {
	this.$main.addEventListener( 'click' , () => this.emit( 'continue' ) , false ) ;

	this.$gfx.addEventListener( 'click' , event => {
		//console.warn( 'event' , event ) ;
		if ( event.target.classList.contains( 'scene-image' ) ) {
			this.toggleSceneImage() ;
		}
	} , false ) ;

	this.$dialogWrapper.addEventListener( 'click' , () => this.clearDialog() , false ) ;

	// Things that can get the .toggled class when clicked
	this.$lobby.addEventListener( 'click' , () => { this.$lobby.classList.toggle( 'toggled' ) ; } ) ;
	this.$status.addEventListener( 'click' , () => { this.$status.classList.toggle( 'toggled' ) ; } ) ;
	this.$panel.addEventListener( 'click' , () => { this.$panel.classList.toggle( 'toggled' ) ; } ) ;
} ;



Dom.prototype.toggleSceneImage = function() {
	if ( this.$gfx.classList.contains( 'toggled' ) ) { this.sceneImageOff() ; }
	else { this.sceneImageOn() ; }
} ;



Dom.prototype.sceneImageOn = function() {
	if ( this.sceneImageOnTimer !== null ) { clearTimeout( this.sceneImageOnTimer ) ; this.sceneImageOnTimer = null ; }

	this.$gfx.classList.add( 'toggled' ) ;
	this.$spellcast.classList.add( 'gfx-toggled' ) ;
	this.sceneImageOnTimer = setTimeout( this.sceneImageOff.bind( this ) , 8000 ) ;
} ;



Dom.prototype.sceneImageOff = function() {
	if ( this.sceneImageOnTimer !== null ) { clearTimeout( this.sceneImageOnTimer ) ; this.sceneImageOnTimer = null ; }

	this.$gfx.classList.remove( 'toggled' ) ;
	this.$spellcast.classList.remove( 'gfx-toggled' ) ;
} ;



// return true if switched
Dom.prototype.toMainBuffer = function() {
	if ( this.$activeBuffer === this.$mainBuffer ) { return ; }

	if ( this.$activeBuffer ) {
		// This is not defined at startup
		this.clearChoices() ;
		this.clearMessages() ;
		this.clearHint() ;
		this.clearHistory() ;
	}

	this.$activeBuffer = this.$mainBuffer ;
	this.$importantMessages = null ;
	this.$mainBuffer.classList.remove( 'inactive' ) ;
	this.$altBuffer.classList.add( 'inactive' ) ;
	this.$closeAltButton.classList.add( 'inactive' ) ;

	this.getSwitchedElements() ;

	return true ;
} ;



// return true if switched
Dom.prototype.toAltBuffer = function() {
	if ( this.$activeBuffer === this.$altBuffer ) { return ; }

	this.$activeBuffer = this.$altBuffer ;
	this.$importantMessages = this.$activeSegment ;
	this.$mainBuffer.classList.add( 'inactive' ) ;
	this.$altBuffer.classList.remove( 'inactive' ) ;
	this.$closeAltButton.classList.remove( 'inactive' ) ;

	this.getSwitchedElements() ;

	return true ;
} ;



// Get elements after a buffer switch
Dom.prototype.getSwitchedElements = function() {
	this.$history = this.$activeBuffer.querySelector( '.messages.history' ) ;
	this.$activeMessages = this.$activeBuffer.querySelector( '.messages.active' ) ;
	this.$choices = this.$activeBuffer.querySelector( '.choices' ) ;
	this.$chat = this.$activeBuffer.querySelector( '.chat' ) ;
	this.$chatForm = this.$chat.querySelector( '.chat-form' ) ;
	this.$chatInput = this.$chatForm.querySelector( '.chat-input' ) ;

	this.$activeSegment = this.$activeMessages.querySelector( 'segment:last-child' ) ;

	if ( ! this.$activeSegment ) { this.newSegment() ; }
	else { this.newSegmentOnContent() ; }
} ;



Dom.prototype.clientStatus = function( status ) {
	this.$clientStatus.setAttribute( 'data-status' , status ) ;
	//this.$clientStatus.setAttribute( 'alt' , status ) ;
	this.$clientStatus.setAttribute( 'title' , status ) ;
} ;



Dom.prototype.setMultiplayer = function( value , callback ) {
	callback = callback || noop ;

	if ( value || value === undefined ) {
		this.$spellcast.classList.add( 'multiplayer' ) ;
	}
	else {
		this.$spellcast.classList.remove( 'multiplayer' ) ;
	}

	callback() ;
} ;



Dom.prototype.clear = function( callback ) {
	callback = callback || noop ;
	domKit.empty( this.$hint ) ;
	domKit.empty( this.$dialogWrapper ) ;
	domKit.empty( this.$activeMessages ) ;
	domKit.empty( this.$choices ) ;
	callback() ;
} ;



Dom.prototype.clearMessages = function( callback ) {
	callback = callback || noop ;
	domKit.empty( this.$activeMessages ) ;
	callback() ;
} ;



Dom.prototype.clearHistory = function( callback ) {
	callback = callback || noop ;
	domKit.empty( this.$history ) ;
	callback() ;
} ;



Dom.prototype.newSegment = function( type ) {
	var $segment ,
		isInterSegment = type === 'inter-segment' ;

	this.newSegmentNeeded = null ;

	//var $lastSegment = this.$activeSegment ;

	if ( isInterSegment ) {
		if ( this.$activeSegment && this.$activeSegment.tagName.toLowerCase() === 'inter-segment' ) {
			return ;
		}

		$segment = document.createElement( 'inter-segment' ) ;
	}
	else {
		$segment = document.createElement( 'segment' ) ;
	}

	if ( this.$activeSegment && ! this.$activeSegment.children.length ) {
		this.$activeSegment.remove() ;
	}

	this.$activeSegment = $segment ;
	this.$activeMessages.appendChild( $segment ) ;

	if ( ! isInterSegment ) { this.moveToHistory() ; }
} ;



Dom.prototype.moveToHistory = function() {
	var i , iMax , children , $replayButton ;

	children = Array.from( this.$activeMessages.children ) ;
	iMax = children.length - 2 ;

	while ( iMax >= 0 && children[ iMax ].tagName.toLowerCase() === 'inter-segment' ) {
		iMax -- ;
	}

	if ( iMax < 0 ) { return ; }

	for ( i = 0 ; i <= iMax ; i ++ ) {
		// Remove replay button
		$replayButton = children[ i ].querySelector( '.replay-button' ) ;
		if ( $replayButton ) { domKit.remove( $replayButton ) ; }

		this.$history.appendChild( children[ i ] ) ;
	}

	children[ iMax ].scrollIntoView( false ) ;
} ;




// Postpone new segment creation until new content
Dom.prototype.newSegmentOnContent = function( type ) {
	type = type || 'segment' ;
	this.newSegmentNeeded = type ;
} ;



Dom.prototype.addSelectedChoice = function( text ) {
	var $text = document.createElement( 'p' ) ;
	$text.classList.add( 'chosen' ) ;
	$text.textContent = text ;

	if ( this.newSegmentNeeded ) { this.newSegment( this.newSegmentNeeded ) ; }

	this.$activeSegment.appendChild( $text ) ;
} ;



Dom.prototype.addMessage = function( text , options , callback ) {
	var triggered = false ;

	callback = callback || noop ;

	var triggerCallback = () => {
		if ( triggered ) { return ; }
		triggered = true ;

		if ( options.next ) {
			$text.scrollIntoView( false ) ;
			this.messageNext( options.next , callback ) ;
			return ;
		}

		callback() ;
	} ;


	var $text = document.createElement( 'p' ) ;
	$text.classList.add( 'text' ) ;

	if ( options.next ) { $text.classList.add( 'continue' ) ; }

	if ( options.class ) {
		domKit.class( $text , commonUtils.toClassObject( options.class ) , 's-' ) ;
	}

	if ( options.style ) {
		domKit.css( $text , options.style ) ;
	}

	// Because the text contains <span> tags
	//$text.textContent = text ;
	$text.innerHTML = text ;

	if ( this.newSegmentNeeded ) { this.newSegment( this.newSegmentNeeded ) ; }

	this.$activeSegment.appendChild( $text ) ;

	if ( options.important && this.$importantMessages ) {
		// The message should be added to the main buffer too
		this.$importantMessages.appendChild( $text.cloneNode( true ) ) ;
	}

	// Slow-typing is not supported ATM
	//if ( options.slowTyping ) { return ; }

	triggerCallback() ;
} ;



Dom.prototype.messageNext = function( value , callback ) {
	var triggered = false ;

	var triggerCallback = () => {
		if ( triggered ) { return ; }
		triggered = true ;

		this.$spellcast.classList.remove( 'continue' ) ;
		callback() ;
	} ;

	this.$spellcast.classList.add( 'continue' ) ;
	this.once( 'continue' , triggerCallback ) ;

	if ( typeof value === 'number' && isFinite( value ) && value > 0 ) {
		setTimeout( triggerCallback , value * 1000 ) ;
	}
} ;



Dom.prototype.addSpeech = function( text , options , callback ) {
	var $button ;

	if ( options.speechReplay ) {
		if ( options.speechOnly && this.newSegmentNeeded ) {
			// Since there is no attached text, we need to handle the segment thing...
			this.newSegment( this.newSegmentNeeded ) ;
		}

		$button = document.createElement( 'button' ) ;
		$button.classList.add( 'replay-button' ) ;
		$button.setAttribute( 'disabled' , true ) ;
		$button.textContent = '▶' ;

		this.$activeSegment.appendChild( $button ) ;
	}

	this.speech( text , options , () => {
		if ( options.speechReplay ) {
			$button.removeAttribute( 'disabled' ) ;

			$button.addEventListener( 'click' , () => {
				this.speech( text , options ) ;
			} ) ;
		}
		callback() ;
	} ) ;
} ;



Dom.prototype.speech = function( text , options , callback ) {
	if ( options.useService ) {
		this.restServiceSpeech( text , options , callback ) ;
	}
	else {
		this.nativeBrowserSpeech( text , options , callback ) ;
	}
} ;



Dom.prototype.restServiceSpeech = function( text , options , callback ) {
	var url = /speech/ ;

	url += "?text=" + encodeURIComponent( text ) ;
	url += "&lang=" + encodeURIComponent( options.speechLang || 'en' ) ;
	url += "&volume=" + encodeURIComponent( options.speechVolume !== undefined ? options.speechVolume : 1 ) ;
	url += "&rate=" + encodeURIComponent( options.speechRate !== undefined ? options.speechRate : 1 ) ;
	url += "&pitch=" + encodeURIComponent( options.speechPitch !== undefined ? options.speechPitch : 1 ) ;
	//url += "&gender=" + encodeURIComponent( options.speechGender || 'female' ) ;

	//console.log( "Speech REST service URL:" , url ) ;
	this.sound( { url } , callback ) ;
} ;



Dom.prototype.nativeBrowserSpeech = function( text , options , callback ) {
	var speechSynthesis = window.speechSynthesis ,
		message , voices ;

	if ( ! speechSynthesis ) {
		// Not supported by this browser
		callback() ;
		return ;
	}

	message = new SpeechSynthesisUtterance( text ) ;
	//voices = window.speechSynthesis.getVoices() ;
	//message.voice = voices[10]; // Note: some voices don't support altering params
	//message.text = text ;
	message.lang = options.speechLang || 'en-US' ;
	message.volume = options.speechVolume !== undefined ? options.speechVolume : 1 ;	// 0 to 1
	message.rate = options.speechRate !== undefined ? options.speechRate : 1 ;	// 0.1 to 10
	message.pitch = options.speechPitch !== undefined ? options.speechPitch : 1 ;	//0 to 2
	if ( options.speechVoice ) { message.voiceURI = options.speechVoice ; }

	message.onend = event => {
		console.log( 'Speech: finished in ' + event.elapsedTime + ' seconds.' ) ;
		callback() ;
	} ;

	speechSynthesis.speak( message ) ;
} ;



Dom.prototype.addIndicators = function( indicators , isStatus , callback ) {
	callback = callback || noop ;

	if ( isStatus ) {
		domKit.empty( this.$status ) ;

		if ( indicators.length ) {
			this.$status.classList.remove( 'empty' ) ;
		}
		else {
			this.$status.classList.add( 'empty' ) ;
			callback() ;
			return ;
		}
	}

	var $indicatorList = document.createElement( 'indicator-list' ) ;

	indicators.forEach( ( data ) => {

		var $indicator , $label , $image , $widget , $innerBar , $outerBar ;
		$indicator = document.createElement( 'indicator' ) ;
		//$indicator.classList.add( data.type ) ;

		$label = document.createElement( 'label' ) ;
		$label.classList.add( 'label' ) ;

		if ( data.image ) {
			$indicator.classList.add( 'has-image' ) ;
			$image = document.createElement( 'img' ) ;
			$image.classList.add( 'image' ) ;
			$image.setAttribute( 'src' , this.cleanUrl( data.image ) ) ;

			if ( data.label ) {
				$image.setAttribute( 'alt' , data.label ) ;
				$image.setAttribute( 'title' , data.label ) ;
			}

			$label.appendChild( $image ) ;
		}
		else {
			$label.textContent = data.label ;
		}

		$indicator.appendChild( $label ) ;

		$widget = document.createElement( 'widget' ) ;
		$widget.classList.add( 'widget' ) ;
		$widget.classList.add( data.type ) ;
		$widget.setAttribute( 'data-value' , data.value ) ;

		switch ( data.type ) {
			case 'hbar' :
				$outerBar = document.createElement( 'outer-bar' ) ;
				$widget.appendChild( $outerBar ) ;

				$innerBar = document.createElement( 'inner-bar' ) ;

				if ( isNaN( data.value ) ) { data.value = 0 ; }
				else if ( data.value > 100 ) { data.value = 100 ; }
				else if ( data.value < 0 ) { data.value = 0 ; }

				if ( typeof data.color === 'string' ) { $innerBar.style.backgroundColor = data.color ; }

				$innerBar.style.width = '' + data.value + '%' ;

				$outerBar.appendChild( $innerBar ) ;
				break ;

			case 'vbar' :
				$outerBar = document.createElement( 'outer-bar' ) ;
				$widget.appendChild( $outerBar ) ;

				$innerBar = document.createElement( 'inner-bar' ) ;

				if ( isNaN( data.value ) ) { data.value = 0 ; }
				else if ( data.value > 100 ) { data.value = 100 ; }
				else if ( data.value < 0 ) { data.value = 0 ; }

				if ( typeof data.color === 'string' ) { $innerBar.style.backgroundColor = data.color ; }

				$innerBar.style.height = '' + data.value + '%' ;

				$outerBar.appendChild( $innerBar ) ;
				break ;

			case 'text' :	// jshint ignore:line
			default :
				$widget.textContent = data.value ;
		}

		$indicator.appendChild( $widget ) ;
		$indicatorList.appendChild( $indicator ) ;
	} ) ;

	if ( isStatus ) {
		this.$status.appendChild( $indicatorList ) ;
	}
	else {
		if ( this.newSegmentNeeded ) { this.newSegment( this.newSegmentNeeded ) ; }
		this.$activeSegment.appendChild( $indicatorList ) ;
	}

	callback() ;
} ;



Dom.prototype.createChoiceEventHandlers = function( onSelect ) {
	this.onSelect = ( event ) => {
		var $element = event.currentTarget ;
		var index = $element.getAttribute( 'data-select-index' ) ;
		if ( ! index ) { return ; }
		index = parseInt( index , 10 ) ;
		onSelect( index ) ;
	} ;

	this.onLeave = ( event ) => {
		this.clearHint() ;
		//event.stopPropagation() ; // useless for mouseleave events
	} ;

	this.onEnter = ( event ) => {
		var $element = event.currentTarget ;
		var hint = $element.getAttribute( 'data-button-hint' ) ;
		if ( ! hint ) { return ; }
		this.setHint( hint , { active: true } ) ;
		//event.stopPropagation() ;	// useless for mouseenter events
	} ;
} ;



Dom.prototype.addPanel = function( panel , clear , callback ) {
	callback = callback || noop ;


	// Clear part
	if ( clear ) {
		domKit.empty( this.$panel ) ;

		if ( panel.length ) {
			this.$panel.classList.remove( 'empty' ) ;
		}
		else {
			this.$panel.classList.add( 'empty' ) ;
			callback() ;
			return ;
		}
	}
	else if ( panel.length ) {
		this.$panel.classList.remove( 'empty' ) ;
	}


	panel.forEach( ( data ) => {

		var $button , $image , buttonId = 'button-' + data.id ;

		// Do not create it if there is already a button with this ID
		if ( document.getElementById( buttonId ) ) { return ; }

		$button = document.createElement( 'item' ) ;
		$button.classList.add( 'button' ) ;
		$button.classList.add( 'disabled' ) ;	// Disabled by default
		$button.setAttribute( 'id' , buttonId ) ;

		if ( data.image ) {
			$button.classList.add( 'has-image' ) ;

			if ( data.image.endsWith( '.svg' ) ) {
				// Pre-create the <svg> tag
				//$image = document.createElement( 'svg' ) ;	// <-- it doesn't work, it should be created with a NS
				$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'svg' ) ;
				//$image.setAttribute( 'xmlns' , 'http://www.w3.org/2000/svg' ) ;
				$image.classList.add( 'svg' ) ;

				svgKit.load( this.cleanUrl( data.image ) , {
					removeSvgStyle: true ,
					removeSize: true ,
					removeIds: true ,
					removeComments: true ,
					removeExoticNamespaces: true ,
					//removeDefaultStyles: true ,
					colorClass: true ,
					as: $image
				} ) ;
			}
			else {
				$image = document.createElement( 'img' ) ;
				$image.setAttribute( 'src' , this.cleanUrl( data.image ) ) ;
			}

			$image.classList.add( 'icon' ) ;
			$image.classList.add( 'image' ) ;

			if ( data.label ) {
				$image.setAttribute( 'alt' , data.label ) ;
				$image.setAttribute( 'title' , data.label ) ;
			}

			$button.appendChild( $image ) ;
		}
		else {
			$button.textContent = data.label ;
		}

		this.$panel.appendChild( $button ) ;
	} ) ;

	callback() ;
} ;



Dom.prototype.clearChoices = function( callback ) {
	var $uiButton ;

	callback = callback || noop ;

	// First, unassign all UI buttons
	this.choices.forEach( ( choice ) => {
		if ( ! choice.button ) { return ; }

		var buttonId = 'button-' + choice.button ;

		$uiButton = document.getElementById( buttonId ) ;

		if ( $uiButton ) {
			//console.warn( 'remove' , 'button-' + choice.button ) ;
			$uiButton.removeAttribute( 'data-select-index' ) ;
			$uiButton.classList.add( 'disabled' ) ;
			$uiButton.removeEventListener( 'click' , this.onSelect ) ;
			$uiButton.removeEventListener( 'mouseleave' , this.onLeave ) ;
			$uiButton.removeEventListener( 'mouseenter' , this.onEnter ) ;
		}
	} ) ;

	domKit.empty( this.$choices ) ;

	// Reset
	this.choices.length = 0 ;
	this.onSelect = null ;
	this.onLeave = null ;
	this.onEnter = null ;

	callback() ;
} ;



Dom.prototype.addChoices = function( choices , onSelect , callback ) {
	if ( this.uiLoadingCount ) {
		this.once( 'uiLoaded' , this.addChoices.bind( this , choices , onSelect , callback ) ) ;
		return ;
	}

	var groupBreak = false ;
	var choicesFragment = document.createDocumentFragment() ;
	var $group = document.createElement( 'group' ) ;

	callback = callback || noop ;

	this.createChoiceEventHandlers( onSelect ) ;

	choices.forEach( ( choice ) => {

		var $uiButton ;

		// Add the choice to the list
		this.choices.push( choice ) ;

		if (
			choice.button &&
			( $uiButton = document.getElementById( 'button-' + choice.button ) ) &&
			! $uiButton.getAttribute( 'data-select-index' ) &&
			! $uiButton.classList.contains( 'inactive' )
		) {
			// groupBreak remainder
			if ( choice.groupBreak ) { groupBreak = true ; }

			// Assign to it the select index
			$uiButton.setAttribute( 'data-select-index' , choice.index ) ;
			$uiButton.classList.remove( 'disabled' ) ;

			// Add the click event to the next-item
			$uiButton.addEventListener( 'click' , this.onSelect ) ;

			if ( choice.label ) {
				$uiButton.setAttribute( 'data-button-hint' , choice.label ) ;
				$uiButton.addEventListener( 'mouseleave' , this.onLeave ) ;
				$uiButton.addEventListener( 'mouseenter' , this.onEnter ) ;
			}

			return ;
		}

		var $button = document.createElement( 'choice' ) ;
		$button.classList.add( 'choice' , choice.type ) ;
		$button.setAttribute( 'data-select-index' , choice.index ) ;
		$button.classList.remove( 'disabled' ) ;
		//$button.setAttribute( 'data-is-ordered' , !! choice.orderedList ) ;

		if ( choice.class ) {
			domKit.class( $button , commonUtils.toClassObject( choice.class ) , 's-' ) ;
		}

		if ( choice.style ) {
			domKit.css( $button , choice.style ) ;
		}

		if ( choice.image ) {
			$button.classList.add( 'has-image' ) ;
			var $image = document.createElement( 'img' ) ;
			$image.classList.add( 'image' ) ;
			$image.setAttribute( 'src' , this.cleanUrl( choice.image ) ) ;
			$button.appendChild( $image ) ;
		}

		var $label = document.createElement( 'span' ) ;
		$label.classList.add( 'label' ) ;
		$label.textContent = choice.label ;
		$button.appendChild( $label ) ;
		//$button.textContent = choice.label ;

		if ( choice.selectedBy && choice.selectedBy.length ) {
			var $selectedBy = document.createElement( 'span' ) ;
			$selectedBy.classList.add( 'italic' , 'brightBlack' ) ;

			// Add an extra space to separate from the label text
			$selectedBy.textContent = ' ' + choice.selectedBy.join( ', ' ) ;
			$button.appendChild( $selectedBy ) ;
		}

		// Add the click event to the next-item
		$button.addEventListener( 'click' , this.onSelect ) ;

		if ( choice.groupBreak || groupBreak ) {
			// Add current group to the fragment, and create a new group
			groupBreak = false ;
			choicesFragment.appendChild( $group ) ;
			$group = document.createElement( 'group' ) ;
		}

		$group.appendChild( $button ) ;
	} ) ;

	// Add the pending group to the fragment
	choicesFragment.appendChild( $group ) ;

	this.$choices.appendChild( choicesFragment ) ;

	callback() ;
} ;



Dom.prototype.getChoiceColumnsCount = function( choices ) {
	var count = 0 , maxCount = 0 ;

	choices.forEach( ( choice ) => {
		if ( choice.groupBreak ) {
			if ( count > maxCount ) { maxCount = count ; }
			count = 0 ;
		}

		count ++ ;
	} ) ;

	if ( count > maxCount ) { maxCount = count ; }
	return maxCount ;
} ;



// This is used when new choices replaces the previous scene choices
Dom.prototype.setChoices = function( choices , undecidedNames , onSelect , options , callback ) {
	options = options || {} ;
	callback = callback || noop ;

	this.clearChoices( () => {

		switch ( options.nextStyle ) {
			case 'inline' :
			case 'smallInline' :
			case 'list' :
			case 'smallList' :
				this.$choices.setAttribute( 'data-choice-style' , options.nextStyle ) ;
				break ;
			case 'table' :
				this.$choices.setAttribute( 'data-choice-style' , options.nextStyle ) ;
				this.$choices.classList.add( 'columns-' + this.getChoiceColumnsCount( choices ) ) ;
				break ;
			default :
				// Default to list
				this.$choices.setAttribute( 'data-choice-style' , 'list' ) ;
		}

		this.addChoices( choices , onSelect , callback ) ;

		if ( undecidedNames && undecidedNames.length ) {
			var $unassignedUsers = document.createElement( 'p' ) ;
			$unassignedUsers.classList.add( 'unassigned-users' ) ;
			$unassignedUsers.textContent = undecidedNames.join( ', ' ) ;
			this.$choices.appendChild( $unassignedUsers ) ;
		}

		if ( typeof options.timeout === 'number' ) { this.choiceTimeout( options.timeout ) ; }
	} ) ;
} ;



// This is used when the scene update its choices details (selectedBy, ...)
// /!\ For instance, it is the same than .setChoices
Dom.prototype.updateChoices = Dom.prototype.setChoices ;



Dom.prototype.choiceTimeout = function( timeout ) {
	var startTime = Date.now() , $timer , timer ;

	$timer = document.createElement( 'p' ) ;
	$timer.classList.add( 'timer' ) ;
	$timer.textContent = Math.round( timeout / 1000 ) ;

	this.$choices.appendChild( $timer ) ;

	timer = setInterval( () => {
		// If no parentNode, the element has been removed...
		if ( ! $timer.parentNode ) { clearInterval( timer ) ; return ; }

		$timer.textContent = Math.round( ( timeout + startTime - Date.now() ) / 1000 ) ;
	} , 1000 ) ;
} ;



Dom.prototype.textInputDisabled = function( options ) {
	var $form = document.createElement( 'form' ) ,
		$label = document.createElement( 'label' ) ,
		$input = document.createElement( 'input' ) ;

	$label.textContent = options.label ;

	$input.setAttribute( 'placeholder' , options.placeholder ) ;
	$input.setAttribute( 'disabled' , true ) ;
	$input.setAttribute( 'type' , 'text' ) ;
	$input.classList.add( 'text-input' ) ;

	$form.appendChild( $label ) ;
	$form.appendChild( $input ) ;

	if ( this.newSegmentNeeded ) { this.newSegment( this.newSegmentNeeded ) ; }
	this.$activeSegment.appendChild( $form ) ;
} ;



Dom.prototype.textInput = function( options , callback ) {
	var $form = document.createElement( 'form' ) ,
		$label = document.createElement( 'label' ) ,
		$input = document.createElement( 'input' ) ;

	// HINT: remove this class?
	$label.classList.add( 'text' ) ;
	$label.textContent = options.label ;

	$input.setAttribute( 'type' , 'text' ) ;
	$input.classList.add( 'text-input' ) ;

	$form.appendChild( $label ) ;
	$form.appendChild( $input ) ;

	if ( this.newSegmentNeeded ) { this.newSegment( this.newSegmentNeeded ) ; }
	this.$activeSegment.appendChild( $form ) ;

	$input.focus() ;

	var finalize = function( event ) {
		event.preventDefault() ;

		$form.removeEventListener( 'submit' , finalize ) ;
		$input.setAttribute( 'disabled' , true ) ;
		callback( $input.value ) ;
	} ;

	$form.addEventListener( 'submit' , finalize ) ;
} ;



Dom.prototype.enableCommand = function( callback ) {
	if ( ! this.onCommandSubmit ) {
		this.onCommandSubmit = ( event ) => {
			event.preventDefault() ;
			callback( this.$chatInput.value ) ;
			this.$chatInput.value = '' ;
		} ;

		this.$chatForm.addEventListener( 'submit' , this.onCommandSubmit ) ;

		this.$mainBuffer.classList.remove( 'chat-hidden' ) ;
		this.$chat.classList.remove( 'hidden' ) ;
		this.$chatInput.removeAttribute( 'disabled' ) ;
	}
} ;



Dom.prototype.disableCommand = function() {
	this.$chatForm.removeEventListener( 'submit' , this.onCommandSubmit ) ;
	this.onCommandSubmit = null ;

	this.$mainBuffer.classList.add( 'chat-hidden' ) ;
	this.$chat.classList.add( 'hidden' ) ;
	this.$chatInput.setAttribute( 'disabled' , true ) ;
} ;



Dom.prototype.clearHint = function() {
	if ( this.hintTimer !== null ) { clearTimeout( this.hintTimer ) ; this.hintTimer = null ; }

	//domKit.empty( this.$hint ) ;
	this.$hint.classList.add( 'empty' ) ;

	this.hintTimer = setTimeout( () => {
		domKit.empty( this.$hint ) ;
	} , 3000 ) ;
} ;



Dom.prototype.setHint = function( text , classes ) {
	if ( this.hintTimer !== null ) { clearTimeout( this.hintTimer ) ; this.hintTimer = null ; }

	//this.clearHint() ;
	//domKit.empty( this.$hint ) ;

	if ( this.$hint.textContent ) {
		this.$hint.classList.add( 'empty' ) ;
		this.hintTimer = setTimeout( () => {
			domKit.empty( this.$hint ) ;
			this.setHint( text , classes ) ;
		} , 300 ) ;
		return ;
	}

	this.$hint.textContent = text ;
	this.$hint.classList.remove( 'empty' ) ;

	domKit.class( this.$hint , {
		passive: !! classes.passive ,
		active: !! classes.active
	} ) ;

	this.hintTimer = setTimeout( this.clearHint.bind( this ) , 3000 ) ;
} ;



// /!\ DEPRECATED??? /!\
Dom.prototype.setBigHint = function( text , classes ) {
	var $hint = document.createElement( 'h2' ) ;
	$hint.textContent = text ;
	if ( classes ) { domKit.class( $hint , classes ) ; }
	domKit.empty( this.$hint ) ;
	this.$hint.appendChild( $hint ) ;
} ;



Dom.prototype.clearDialog = function() {
	this.$dialogWrapper.classList.add( 'empty' ) ;
	this.$dialogWrapper.classList.remove( 'modal' ) ;

	/*
		Try to remove children of this.$dialogWrapper after an eventual transition.
		Start a race with a transition start and setTimeout, the first to win inhibit the other.
	*/
	var raceWon = false ;

	var onStart = () => {
		this.$dialogWrapper.removeEventListener( 'transitionstart' , onStart ) ;
		if ( raceWon ) { return ; }
		raceWon = true ;
		this.$dialogWrapper.addEventListener( 'transitionend' , onEnd ) ;
	} ;

	var onEnd = () => {
		this.$dialogWrapper.removeEventListener( 'transitionend' , onEnd ) ;
		domKit.empty( this.$dialogWrapper ) ;
	} ;

	this.$dialogWrapper.addEventListener( 'transitionstart' , onStart ) ;

	setTimeout( () => {
		if ( raceWon ) { return ; }
		raceWon = true ;
		domKit.empty( this.$dialogWrapper ) ;
	} , 10 ) ;
} ;



/*
	Common options:
	* modal: create a modal dialog
	* title: specify a dialog title
	* big: dialog for small text written in BIG font
	* fun: use a fun font
	* alert: dialog for alerts, critical stuffs...
*/
Dom.prototype.setDialog = function( text , options , callback ) {
	options = options || {} ;
	callback = callback || noop ;

	if ( options.contentDelay && ! this.newSegmentNeeded ) {
		// The contentDelay options wait depending on the content size before actually trigger the dialog box.
		// It is used to let the user read the content before being interupted by the dialog box.
		delete options.contentDelay ;
		var contentLength = this.$activeSegment.innerHTML.replace( /<[^>]+>|&[a-z]+;/g , '' ).length ;
		var delay = Math.min( contentLength * 10 , 5000 ) ;
		console.warn( 'contentLength/delay' , contentLength , delay ) ;
		setTimeout( this.setDialog.bind( this , text , options , callback ) , delay ) ;
		return ;
	}

	var $dialog = document.createElement( 'div' ) ;
	$dialog.classList.add( 'dialog' ) ;

	if ( options.title ) {
		var $title = document.createElement( 'h2' ) ;
		$title.classList.add( 'title' ) ;
		$title.textContent = options.title ;
		$dialog.appendChild( $title ) ;
	}

	var $message = document.createElement( 'div' ) ;
	$message.classList.add( 'message' ) ;
	$message.textContent = text ;
	$dialog.appendChild( $message ) ;

	if ( options.slow ) { this.$dialogWrapper.classList.add( 'slow' ) ; }
	else { this.$dialogWrapper.classList.remove( 'slow' ) ; }

	if ( options.big ) { $dialog.classList.add( 'big' ) ; }
	if ( options.fun ) { $dialog.classList.add( 'fun' ) ; }
	if ( options.alert ) { $dialog.classList.add( 'alert' ) ; }

	if ( options.modal ) {
		$dialog.classList.add( 'modal' ) ;
		this.$dialogWrapper.classList.add( 'modal' ) ;
	}
	else {
		this.$dialogWrapper.classList.remove( 'modal' ) ;
	}

	domKit.empty( this.$dialogWrapper ) ;
	this.$dialogWrapper.appendChild( $dialog ) ;
	this.$dialogWrapper.classList.remove( 'empty' ) ;

	callback() ;
} ;



/* GFX */



Dom.prototype.setSceneImage = function( data ) {
	var cleaned = false ;

	var $oldSceneImage = this.$sceneImage ;

	this.$sceneImage = document.createElement( 'div' ) ;
	this.$sceneImage.classList.add( 'scene-image' ) ;

	if ( data.url ) {
		this.$sceneImage.style.backgroundImage = 'url("' + this.cleanUrl( data.url ) + '")' ;
	}

	if ( data.origin && typeof data.origin === 'string' ) {
		this.$sceneImage.style.backgroundPosition = data.origin ;
	}

	var cleanUp = () => {
		if ( cleaned ) { return ; }
		cleaned = true ;
		$oldSceneImage.remove() ;
	} ;

	if ( $oldSceneImage ) {
		$oldSceneImage.addEventListener( 'transitionend' , cleanUp , false ) ;
		this.$gfx.insertBefore( this.$sceneImage , $oldSceneImage ) ;
		$oldSceneImage.classList.add( 'hidden' ) ;

		// For some very obscure reason, sometime we don't get the 'transitionend' event,
		// Maybe no transition happend at all... So we need to clean up anyway after a while...
		setTimeout( cleanUp , 2000 ) ;
	}
	else {
		this.$gfx.insertBefore( this.$sceneImage , this.$gfx.firstChild || null ) ;
	}

	switch ( data.position ) {
		case 'left' :
			this.$spellcast.setAttribute( 'data-image-position' , 'left' ) ;
			break ;
		case 'right' :	// jshint ignore:line
		default :
			this.$spellcast.setAttribute( 'data-image-position' , 'right' ) ;
			break ;
	}
} ;



Dom.prototype.clearSprite = function( id ) {
	if ( ! this.sprites[ id ] ) {
		console.warn( 'Unknown sprite id: ' , id ) ;
		return ;
	}

	this.clearGItem( this.sprites[ id ] ) ;

	delete this.sprites[ id ] ;
} ;



Dom.prototype.clearVg = function( id ) {
	if ( ! this.vgs[ id ] ) {
		console.warn( 'Unknown VG id: ' , id ) ;
		return ;
	}

	this.clearGItem( this.vgs[ id ] ) ;

	delete this.vgs[ id ] ;
} ;



Dom.prototype.clearMarker = function( id ) {
	if ( ! this.markers[ id ] ) {
		console.warn( 'Unknown Marker id: ' , id ) ;
		return ;
	}

	this.clearGItem( this.markers[ id ] ) ;

	delete this.markers[ id ] ;
} ;



Dom.prototype.clearCard = function( id ) {
	if ( ! this.cards[ id ] ) {
		console.warn( 'Unknown Card id: ' , id ) ;
		return ;
	}

	this.clearGItem( this.cards[ id ] ) ;

	delete this.cards[ id ] ;
} ;



Dom.prototype.showSprite = function( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return Promise.resolved ; }

	if ( this.sprites[ id ] ) { this.clearGItem( this.sprites[ id ] ) ; }

	var sprite = this.sprites[ id ] = this.createGItem( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'sprite' ,
		location: null ,
		class: data.class ,
		style: {} ,
		animation: null
	} ) ;

	return this.updateGItem( sprite , data , true ) ;
} ;



Dom.prototype.showVg = function( id , data ) {
	if ( ( ! data.url || typeof data.url !== 'string' ) && ( ! data.vgObject || typeof data.vgObject !== 'object' ) ) { return Promise.resolved ; }

	if ( this.vgs[ id ] ) { this.clearGItem( this.vgs[ id ] ) ; }

	var vg = this.vgs[ id ] = this.createGItem( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'vg' ,
		vgObject: null ,
		class: data.class ,
		style: {} ,
		area: {} ,
		animation: null
	} ) ;

	return this.updateGItem( vg , data , true ) ;
} ;



Dom.prototype.showMarker = function( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return Promise.resolved ; }

	if ( this.markers[ id ] ) { this.clearGItem( this.markers[ id ] ) ; }

	var marker = this.markers[ id ] = this.createGItem( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'marker' ,
		vg: null ,
		location: null ,
		class: data.class ,
		style: {} ,
		animation: null
	} ) ;

	return this.updateGItem( marker , data , true ) ;
} ;



var cardAutoIncrement = 0 ;

Dom.prototype.showCard = function( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return Promise.resolved ; }

	if ( this.cards[ id ] ) { this.clearGItem( this.cards[ id ] ) ; }

	var card = this.cards[ id ] = this.createGItem( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'card' ,
		location: 'showing' ,
		$locationSlot: null ,
		pose: null ,
		order: cardAutoIncrement ++ ,	// used as flex's order
		class: data.class ,
		style: {} ,
		imageStyle: {} ,
		animation: null ,
		contents: {}
	} ) ;

	this.createCardMarkup( card ) ;

	return this.updateGItem( card , data , true ) ;
} ;



Dom.prototype.updateSprite = function( id , data ) {
	if ( ! this.sprites[ id ] ) {
		console.warn( 'Unknown sprite id: ' , id ) ;
		return Promise.resolved ;
	}

	return this.updateGItem( this.sprites[ id ] , data ) ;
} ;



Dom.prototype.updateVg = function( id , data ) {
	if ( ! this.vgs[ id ] ) {
		console.warn( 'Unknown VG id: ' , id ) ;
		return Promise.resolved ;
	}

	return this.updateGItem( this.vgs[ id ] , data ) ;
} ;



Dom.prototype.updateMarker = function( id , data ) {
	if ( ! this.markers[ id ] ) {
		console.warn( 'Unknown marker id: ' , id ) ;
		return Promise.resolved ;
	}

	return this.updateGItem( this.markers[ id ] , data ) ;
} ;



Dom.prototype.updateCard = function( id , data ) {
	if ( ! this.cards[ id ] ) {
		console.warn( 'Unknown card id: ' , id ) ;
		return Promise.resolved ;
	}

	return this.updateGItem( this.cards[ id ] , data ) ;
} ;



Dom.prototype.animateSprite = function( spriteId , animationId ) {
	if ( ! this.sprites[ spriteId ] ) {
		console.warn( 'Unknown sprite id: ' , spriteId ) ;
		return Promise.resolved ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return Promise.resolved ;
	}

	return this.animateGItem( this.sprites[ spriteId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.animateVg = function( gItemId , animationId ) {
	if ( ! this.vgs[ gItemId ] ) {
		console.warn( 'Unknown VG id: ' , gItemId ) ;
		return Promise.resolved ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return Promise.resolved ;
	}

	return this.animateGItem( this.vgs[ gItemId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.animateMarker = function( markerId , animationId ) {
	if ( ! this.markers[ markerId ] ) {
		console.warn( 'Unknown marker id: ' , markerId ) ;
		return Promise.resolved ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return Promise.resolved ;
	}

	return this.animateGItem( this.markers[ markerId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.animateCard = function( cardId , animationId ) {
	if ( ! this.cards[ cardId ] ) {
		console.warn( 'Unknown card id: ' , cardId ) ;
		return Promise.resolved ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return Promise.resolved ;
	}

	return this.animateGItem( this.cards[ cardId ] , this.animations[ animationId ] ) ;
} ;



// /!\ A GItem class must be created /!\
Dom.prototype.createGItem = function( data ) {
	var gItem = new Ngev() ;

	if ( data.type !== 'marker' ) {
		gItem.$wrapper = document.createElement( 'div' ) ;
		// At creation, the visibility is turned off, the initial update will turn it on again
		gItem.$wrapper.style.visibility = 'hidden' ;
		gItem.$wrapper.style.transition = 'none' ;
		gItem.$wrapper.classList.add( 'g-item-wrapper' , data.type + '-wrapper' ) ;
		this.$gfx.append( gItem.$wrapper ) ;
	}

	gItem.size = { mode: 'relative' , xy: 1 } ;
	gItem.position = { mode: 'relative' , x: 0 , y: 0 } ;
	gItem.transform = {} ;

	Object.assign( gItem , data ) ;
	gItem.defineStates( 'loaded' , 'loading' ) ;

	return gItem ;
} ;



Dom.prototype.clearGItem = function( gItem ) {
	if ( gItem.$locationSlot ) { gItem.$locationSlot.remove() ; }
	gItem.$wrapper.remove() ;
	/*
	gItem.$image.remove() ;
	if ( gItem.$mask ) { gItem.$mask.remove() ; }
	*/
} ;



/*
	Execute only DOM and critical stuff first.
*/
Dom.prototype.updateGItem = async function( gItem , data , initial = false ) {
	// The order matters
	if ( data.vgObject ) { this.updateGItemVgObject( gItem , data ) ; }
	else if ( data.vgMorph ) { this.updateGItemVgMorph( gItem , data ) ; }

	if ( data.url ) { await this.updateGItemImage( gItem , data ) ; }
	if ( data.backUrl ) { await this.updateGItemBackImage( gItem , data ) ; }
	if ( data.maskUrl ) { await this.updateGItemMask( gItem , data ) ; }
	if ( data.content ) { this.updateGItemContent( gItem , data ) ; }

	if ( data.button !== undefined ) { this.updateGItemButton( gItem , data ) ; }
	//if ( data.action !== undefined ) { this.updateGItemAction( gItem , data ) ; }

	if ( data.area ) {
		this.updateVgArea( gItem , data.area ) ;
	}

	if ( gItem.type === 'marker' && ( data.vg || data.location ) ) {
		this.updateMarkerLocation( gItem , data.vg , data.location ) ;
	}

	// For some unknown reasons, that timeout removes animation glitches
	//await Promise.resolveTimeout( 5 ) ;
	return this.updateGItemCosmetics( gItem , data , initial ) ;
} ;



/*
	Execute less important things, like things triggering animations
*/
Dom.prototype.updateGItemCosmetics = async function( gItem , data , initial = false ) {
	// The order matters

	// Should comes first: Transition,
	// Either remove them (for initial value) or set them to the user value before changing anything
	if ( ! initial && gItem.type !== 'marker' && data.transition !== undefined ) {
		if ( data.transition === null ) {
			gItem.$wrapper.style.transition = '' ;	// reset it to default stylesheet value
		}
		else if ( ! data.transition ) {
			gItem.$wrapper.style.transition = 'none' ;
		}
		else {
			gItem.$wrapper.style.transition = 'all ' + data.transition + 's' ;
		}
	}


	if ( data.location !== undefined && gItem.type !== 'marker' ) {
		// Should be triggered first, or pose/style would conflict with it
		await this.moveGItemToLocation( gItem , data ) ;
	}

	if ( data.pose !== undefined ) { this.updateGItemPose( gItem , data ) ; }
	if ( data.status ) { this.updateGItemStatus( gItem , data ) ; }

	// Use data.style, NOT gItem.style: we have to set only new/updated styles
	if ( data.style && gItem.$wrapper ) {
		delete data.style.position ;	// Forbidden style
		Object.assign( gItem.style , data.style ) ;
		domKit.css( gItem.$wrapper , data.style ) ;
	}

	if ( data.imageStyle && gItem.$image ) {
		delete data.imageStyle.position ;	// Forbidden style
		Object.assign( gItem.imageStyle , data.imageStyle ) ;
		domKit.css( gItem.$image , data.imageStyle ) ;
	}

	if ( data.backImageStyle && gItem.$backImage ) {
		delete data.backImageStyle.position ;	// Forbidden style
		Object.assign( gItem.backImageStyle , data.backImageStyle ) ;
		domKit.css( gItem.$backImage , data.backImageStyle ) ;
	}

	if ( data.maskStyle && gItem.$mask ) {
		delete data.maskStyle.position ;	// Forbidden style
		Object.assign( gItem.maskStyle , data.maskStyle ) ;
		domKit.css( gItem.$mask , data.maskStyle ) ;
	}

	if ( data.size || data.position ) { this.updateGItemTransform( gItem , data ) ; }

	if ( data.class ) {
		data.class = commonUtils.toClassObject( data.class ) ;
		Object.assign( gItem.class , data.class ) ;
		domKit.class( gItem.$wrapper || gItem.$image , data.class , 's-' ) ;
	}

	// Should comes last: for initial update, restore the transition value and turn visibility on
	if ( initial && gItem.type !== 'marker' ) {
		// At creation, the visibility is turned off, now we need to turn it on again
		gItem.$wrapper.style.visibility = 'visible' ;

		// If it's done immediately, the transition can kick in nonetheless
		//await Promise.resolveTimeout( 5 ) ;
		await Promise.resolveAtAnimationFrame() ;

		if ( data.transition === undefined || data.transition === null ) {
			gItem.$wrapper.style.transition = '' ;	// reset it to default stylesheet value
		}
		else if ( ! data.transition ) {
			gItem.$wrapper.style.transition = 'none' ;
		}
		else {
			gItem.$wrapper.style.transition = 'all ' + data.transition + 's' ;
		}
	}
} ;



// Load/replace the gItem image (data.url)
Dom.prototype.updateGItemImage = function( gItem , data ) {
	var promise = new Promise() ;

	gItem.vgObject = null ;

	if ( gItem.type === 'card' ) {
		gItem.$image.style.backgroundImage = 'url("' + this.cleanUrl( data.url ) + '")' ;
		promise.resolve() ;
		return promise ;
	}

	if ( data.url.endsWith( '.svg' ) ) {
		// Always wipe any existing $image element and pre-create the <svg> tag
		if ( gItem.$image ) { gItem.$image.remove() ; }

		if ( gItem.type === 'marker' ) {
			// If it's a marker, load it inside a <g> tag, that will be part of the main VG's <svg>
			// <svg> inside <svg> are great, but Chrome sucks at it (it does not support CSS transform, etc)
			gItem.$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' ) ;
		}
		else {
			gItem.$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'svg' ) ;
			gItem.$image.classList.add( 'svg' ) ;
		}

		switch ( gItem.type ) {
			case 'vg' :
				// Stop event propagation
				gItem.onClick = ( event ) => {
					//gItem.actionCallback( gItem.action ) ;
					event.stopPropagation() ;
				} ;

				gItem.$image.addEventListener( 'click' , gItem.onClick ) ;
				gItem.$image.classList.add( 'vg' ) ;
				this.uiLoadingCount ++ ;
				break ;
			case 'sprite' :
				gItem.$image.classList.add( 'sprite' ) ;
				break ;
			case 'marker' :
				gItem.$image.classList.add( 'marker' ) ;
				break ;
		}

		svgKit.load( this.cleanUrl( data.url ) , {
			removeSvgStyle: true ,
			//removeSize: true ,
			//removeIds: true ,
			removeComments: true ,
			removeExoticNamespaces: true ,
			//removeDefaultStyles: true ,
			as: gItem.$image
		} ).then( () => {
			console.warn( "loaded!" ) ;
			if ( gItem.type === 'vg' ) {
				this.setVgButtons( gItem.$image ) ;
				this.setVgPassiveHints( gItem.$image ) ;
				gItem.emit( 'loaded' ) ;
				if ( -- this.uiLoadingCount <= 0 ) { this.emit( 'uiLoaded' ) ; }
			}
			else {
				gItem.emit( 'loaded' ) ;
			}

			promise.resolve() ;
		} ) ;

		console.warn( "Aft load" ) ;
		gItem.emit( 'loading' ) ;
	}
	else {
		if ( ! gItem.$image || gItem.$image.tagName.toLowerCase() !== 'img' ) {
			if ( gItem.$image ) { gItem.$image.remove() ; }

			gItem.$image = document.createElement( 'img' ) ;

			// /!\ support VG that are not SVG??? /!\
			gItem.$image.classList.add( gItem.type ) ;
		}

		gItem.$image.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;
		gItem.$image.onload = () => promise.resolve() ;
	}

	if ( gItem.type !== 'marker' ) {
		gItem.$wrapper.append( gItem.$image ) ;
	}

	return promise ;
} ;



Dom.prototype.updateGItemVgObject = function( gItem , data ) {
	var vgObject = data.vgObject ;

	if ( ! ( vgObject instanceof svgKit.VG ) ) {
		vgObject = svgKit.objectToVG( vgObject ) ;
		if ( ! ( vgObject instanceof svgKit.VG ) ) {
			// Do nothing if it's not a VG object
			return ;
		}
	}

	// Save it now!
	gItem.vgObject = vgObject ;

	// Always wipe any existing $image element and pre-create the <svg> tag
	if ( gItem.$image ) { gItem.$image.remove() ; }

	if ( gItem.type === 'marker' ) {
		// If it's a marker, load it inside a <g> tag, that will be part of the main VG's <svg>
		// <svg> inside <svg> are great, but Chrome sucks at it (it does not support CSS transform, etc)
		gItem.$image = vgObject.renderDom( { overrideTag: 'g' } ) ;
	}
	else {
		// Add a removeSvgStyle:true options?
		gItem.$image = vgObject.renderDom() ;
		gItem.$image.classList.add( 'svg' ) ;
		gItem.$image.classList.add( 'vg-object' ) ;
	}

	switch ( gItem.type ) {
		case 'vg' :
			// Stop event propagation
			gItem.onClick = ( event ) => {
				//gItem.actionCallback( gItem.action ) ;
				event.stopPropagation() ;
			} ;

			gItem.$image.addEventListener( 'click' , gItem.onClick ) ;
			gItem.$image.classList.add( 'vg' ) ;
			this.setVgButtons( gItem.$image ) ;
			this.setVgPassiveHints( gItem.$image ) ;
			break ;
		case 'sprite' :
			gItem.$image.classList.add( 'sprite' ) ;
			break ;
		case 'marker' :
			gItem.$image.classList.add( 'marker' ) ;
			break ;
	}

	if ( gItem.type !== 'marker' ) {
		gItem.$wrapper.append( gItem.$image ) ;
	}

	return ;
} ;



Dom.prototype.updateGItemVgMorph = function( gItem , data ) {
	var vgObject = gItem.vgObject ;

	if ( ! vgObject ) {
		// Do nothing if it's not a VG object
		console.warn( "Has no VG object, abort..." ) ;
		return ;
	}

	//console.warn( "Got morph log:" , data.vgMorph ) ;
	vgObject.importMorphLog( data.vgMorph ) ;
	//console.warn( "After importing morph log:" , vgObject ) ;
	vgObject.morphDom() ;

	return ;
} ;



// Load/replace the gItem backImage (data.backUrl)
// /!\ Not async ATM: how to get a "load" event on a background-image???
Dom.prototype.updateGItemBackImage = function( gItem , data ) {
	if ( gItem.type === 'card' ) {
		gItem.$backImage.style.backgroundImage = 'url("' + this.cleanUrl( data.backUrl ) + '")' ;
		//gItem.$image.onload = () => promise.resolve() ;
	}

	return Promise.resolved ;
} ;



// Load/replace the gItem mask (data.maskUrl)
Dom.prototype.updateGItemMask = function( gItem , data ) {
	var promise = new Promise() ;

	if ( data.maskUrl.endsWith( '.svg' ) && gItem.type === 'sprite' ) {
		console.warn( 'has mask!' ) ;

		// Always wipe any existing $mask element and pre-create the <svg> tag
		if ( gItem.$mask ) { gItem.$mask.remove() ; }

		gItem.$mask = document.createElementNS( 'http://www.w3.org/2000/svg' , 'svg' ) ;
		gItem.$mask.classList.add( 'sprite-mask' ) ;

		svgKit.load( this.cleanUrl( data.maskUrl ) , {
			removeSvgStyle: true ,
			removeSize: true ,
			removeIds: true ,
			removeComments: true ,
			removeExoticNamespaces: true ,
			//removeDefaultStyles: true ,
			as: gItem.$mask
		} ).then( () => promise.resolve() ) ;

		gItem.$wrapper.append( gItem.$mask ) ;
		gItem.$wrapper.classList.add( 'has-mask' ) ;
	}
	else if ( gItem.$mask ) {
		gItem.$mask.remove() ;
		gItem.$wrapper.classList.remove( 'has-mask' ) ;
		promise.resolve() ;
	}

	return promise ;
} ;



// Update “framework” size/position
Dom.prototype.updateGItemTransform = function( gItem , data ) {
	var wrapperAspect , imageAspect , imageWidth , imageHeight ,
		scale , xMinOffset , yMinOffset , xFactor , yFactor ;

	// For instance, marker are excluded
	if ( ! gItem.$wrapper || ! gItem.$image ) { return ; }


	// First, assign new size and position
	// /!\ Size and position MUST be checked! /!\
	if ( data.size ) {
		gItem.size = data.size ;
	}

	if ( data.position ) {
		gItem.position = data.position ;
	}


	// Pre-compute few thing necessary for the following stuff
	if ( gItem.$image.tagName.toLowerCase() === 'svg' ) {
		// The SVG element is not a DOM HTML element, it does not have offsetWidth/offsetHeight,
		// hence it' a little bit trickier to get its real boxmodel size

		wrapperAspect = gItem.$wrapper.offsetWidth / gItem.$wrapper.offsetHeight ;
		imageAspect = gItem.$image.width.baseVal.value / gItem.$image.height.baseVal.value ;

		if ( imageAspect > wrapperAspect ) {
			imageWidth = gItem.$wrapper.offsetWidth ;
			imageHeight = imageWidth / imageAspect ;
		}
		else {
			imageHeight = gItem.$wrapper.offsetHeight ;
			imageWidth = imageHeight * imageAspect ;
		}
		console.log( "dbg svg:" , {
			wrapperAspect , imageAspect , imageWidth , imageHeight
		} ) ;
	}
	else {
		imageWidth = gItem.$image.offsetWidth ;
		imageHeight = gItem.$image.offsetHeight ;
	}


	// Compute scaling -- should comes first for this to work!
	switch ( gItem.size.mode ) {
		case 'area' :
		case 'areaMin' :
		default :
			// In this mode, the sprite is scaled relative to its container area.
			scale = gItem.transform.scaleX = gItem.transform.scaleY = gItem.size.xy ;
			console.log( "transform after .updateGItemSize()" , gItem.transform ) ;
			break ;
	}


	// Compute position
	switch ( gItem.position.mode ) {
		case 'areaInSpriteOut' :
			// In this mode, the sprite is positioned relative to its container area -1,-1 being bottom-left and 1,1 being top-right and 0,0 being the center
			// Any value in [-1,1] ensure the whole sprite is inside the area.
			// For values <-1 or >1 the extra are scaled using the sprite scale, e.g.:
			// x=-1.5 means that the sprite is on the left, its left half being invisible (outside the container), its right half being visible (inside the container).

			xMinOffset = yMinOffset = 0 ;
			xFactor = this.$gfx.offsetWidth - imageWidth ;
			yFactor = this.$gfx.offsetHeight - imageHeight ;

			if ( scale !== undefined ) {
				xMinOffset = -0.5 * imageWidth * ( 1 - scale ) ;
				yMinOffset = -0.5 * imageHeight * ( 1 - scale ) ;
				xFactor += imageWidth * ( 1 - scale ) ;
				yFactor += imageHeight * ( 1 - scale ) ;
			}

			console.log( "dbg:" , { xMinOffset , xFactor , yFactor } ) ;

			if ( gItem.position.x < -1 ) {
				gItem.transform.translateX = xMinOffset + ( gItem.position.x + 1 ) * imageWidth * scale ;
			}
			else if ( gItem.position.x > 1 ) {
				gItem.transform.translateX = xMinOffset + xFactor + ( gItem.position.x - 1 ) * imageWidth * scale ;
			}
			else {
				gItem.transform.translateX = xMinOffset + ( 0.5 + gItem.position.x / 2 ) * xFactor ;
			}

			if ( gItem.position.y < -1 ) {
				gItem.transform.translateY = yMinOffset + yFactor - ( gItem.position.y + 1 ) * imageHeight * scale ;
			}
			else if ( gItem.position.y > 1 ) {
				gItem.transform.translateY = yMinOffset - ( gItem.position.y - 1 ) * imageHeight * scale ;
			}
			else {
				gItem.transform.translateY = yMinOffset + ( 0.5 - gItem.position.y / 2 ) * yFactor ;
			}

			console.log( "transform after .updateGItemPosition()" , gItem.transform ) ;
			break ;

		case 'area' :
		default :
			// In this mode, the sprite is positioned relative to its container area -1,-1 being bottom-left and 1,1 being top-right and 0,0 being the center
			// Any value in [-1,1] ensure the whole sprite is inside the area.
			// Values <-1 or >1 still use the same linear coordinate (so are scaled using the container size).

			xMinOffset = yMinOffset = 0 ;
			xFactor = this.$gfx.offsetWidth - imageWidth ;
			yFactor = this.$gfx.offsetHeight - imageHeight ;

			if ( scale !== undefined ) {
				xMinOffset = -0.5 * imageWidth * ( 1 - scale ) ;
				yMinOffset = -0.5 * imageHeight * ( 1 - scale ) ;
				xFactor += imageWidth * ( 1 - scale ) ;
				yFactor += imageHeight * ( 1 - scale ) ;
			}

			console.log( "dbg:" , { xMinOffset , xFactor , yFactor } ) ;
			gItem.transform.translateX = xMinOffset + ( 0.5 + gItem.position.x / 2 ) * xFactor ;
			gItem.transform.translateY = yMinOffset + ( 0.5 - gItem.position.y / 2 ) * yFactor ;

			console.log( "transform after .updateGItemPosition()" , gItem.transform ) ;
			break ;
	}

	// Finally, create the transformation CSS string
	domKit.transform( gItem.$wrapper , gItem.transform ) ;
} ;



// Update content (data.content), card-only
Dom.prototype.updateGItemContent = function( gItem , data ) {
	var content , $content ;

	if ( gItem.type !== 'card' ) { return ; }

	for ( let contentName in data.content ) {
		content = data.content[ contentName ] ;
		$content = gItem.contents[ contentName ] ;

		if ( ! $content ) {
			$content = gItem.contents[ contentName ] = document.createElement( 'div' ) ;
			$content.classList.add( 'content-' + contentName ) ;
			gItem.$front.append( $content ) ;
		}

		$content.textContent = content ;
		$content.setAttribute( 'content' , content ) ;
	}
} ;



// Update pose (data.pose)
Dom.prototype.updateGItemPose = function( gItem , data ) {
	if ( typeof data.pose === 'string' ) {
		gItem.$wrapper.setAttribute( 'pose' , data.pose ) ;
		gItem.pose = data.pose ;
	}
	else {
		gItem.$wrapper.removeAttribute( 'pose' ) ;
		gItem.pose = null ;
	}
} ;



// Update status (data.status)
Dom.prototype.updateGItemStatus = function( gItem , data ) {
	var status , statusName ;

	for ( statusName in data.status ) {
		status = data.status[ statusName ] ;

		if ( status ) {
			gItem.$wrapper.classList.add( 'status-' + statusName ) ;

			if ( typeof status === 'number' || typeof status === 'string' ) {
				gItem.$wrapper.setAttribute( 'status-' + statusName , status ) ;
			}
		}
		else {
			gItem.$wrapper.classList.remove( 'status-' + statusName ) ;

			if ( gItem.$wrapper.hasAttribute( 'status-' + statusName ) ) {
				gItem.$wrapper.removeAttribute( 'status-' + statusName ) ;
			}
		}
	}
} ;



// Button ID (data.button)
Dom.prototype.updateGItemButton = function( gItem , data ) {
	var $element = gItem.$mask || gItem.$wrapper ;

	var buttonId = data.button ;

	$element.setAttribute( 'id' , 'button-' + buttonId ) ;
	$element.classList.add( 'button' ) ;
	$element.classList.add( 'disabled' ) ;
} ;



// /!\ DEPRECATED /!\
// Click action (data.action)
Dom.prototype.updateGItemAction = function( gItem , data ) {
	var $element = gItem.$mask || gItem.$image ;

	if ( data.action && ! gItem.action ) {
		gItem.onClick = ( event ) => {
			gItem.actionCallback( gItem.action ) ;
			event.stopPropagation() ;
		} ;

		$element.classList.add( 'button' ) ;
		$element.addEventListener( 'click' , gItem.onClick ) ;
	}
	else if ( ! data.action && gItem.action ) {
		$element.classList.remove( 'button' ) ;
		$element.removeEventListener( 'click' , gItem.onClick ) ;
	}

	gItem.action = data.action || null ;
} ;



// Move to a location and perform a FLIP (First Last Invert Play)
Dom.prototype.moveGItemToLocation = function( gItem , data ) {
	var promise = new Promise() ,
		locationName = data.location ;

	if ( gItem.location === locationName ) { promise.resolve() ; return promise ; }

	var $location , $oldLocation , oldLocationName , $slot , $oldSlot , direction , oldDirection ,
		siblingGItems , siblingSlotRectsBefore , siblingSlotRectsAfter ,
		slotSize , slotBbox , oldSlotBbox ;

	// Timeout value used to enable FLIP transition
	var flipTimeout = 10 ;

	oldLocationName = gItem.location ;
	$oldLocation = oldLocationName ? this.gItemLocations[ oldLocationName ] : this.$gfx ;
	$oldSlot = gItem.$locationSlot || this.$gfx ;
	gItem.location = locationName ;

	$location = locationName ? this.gItemLocations[ locationName ] : this.$gfx ;

	if ( ! $location ) {
		// Create the location if it doesn't exist
		$location = this.gItemLocations[ locationName ] = document.createElement( 'div' ) ;
		$location.classList.add( 'g-item-location' ) ;
		$location.classList.add( 'g-item-location-' + locationName ) ;
		this.$gfx.append( $location ) ;
	}

	// Save computed styles now
	var gItemComputedStyle = window.getComputedStyle( gItem.$wrapper ) ;
	var locationComputedStyle = window.getComputedStyle( $location ) ;

	// GItem size
	var gItemWidth = parseFloat( gItemComputedStyle.width ) ;
	var gItemHeight = parseFloat( gItemComputedStyle.height ) ;

	if ( $location === this.$gfx ) {
		$slot = this.$gfx ;
	}
	else {
		$slot = gItem.$locationSlot = document.createElement( 'div' ) ;
		$slot.classList.add( 'g-item-slot' ) ;
		$slot.style.order = gItem.order ;
		//$slot.style.zIndex = gItem.order ;	// Not needed, rendering preserve ordering, not DOM precedence, so it's ok
	}

	// Before appending, save all rects of existing sibling slots
	siblingGItems = [ ... Object.values( this.cards ) , ... Object.values( this.sprites ) , ... Object.values( this.vgs ) ]
		.filter( e => e !== gItem && e.location && ( e.location === locationName || e.location === oldLocationName ) ) ;

	siblingSlotRectsBefore = siblingGItems.map( e => e.$locationSlot.getBoundingClientRect() ) ;


	// Insert the slot, if it's not $gfx
	if ( $slot !== this.$gfx ) {
		// We should preserve the :last-child pseudo selector, since there isn't any :last-ordered-child for flex-box...
		if ( $location.lastChild && parseFloat( $location.lastChild.style.order ) > gItem.order ) {
			// The last item has a greater order, so we prepend instead
			$location.prepend( $slot ) ;
		}
		else {
			$location.append( $slot ) ;
		}
	}

	// Save the old slot BBox
	oldSlotBbox = $oldSlot.getBoundingClientRect() ;

	// Remove that slot now
	if ( $oldSlot !== this.$gfx ) { $oldSlot.remove() ; }


	// Get slots rects after
	siblingSlotRectsAfter = siblingGItems.map( e => e.$locationSlot.getBoundingClientRect() ) ;

	// Immediately compute the translation delta and the FLIP for siblings
	siblingGItems.forEach( ( siblingGItem , index ) => {
		var beforeRect = siblingSlotRectsBefore[ index ] ,
			afterRect = siblingSlotRectsAfter[ index ] ;

		var transitionStr = siblingGItem.$wrapper.style.transition ;
		var transformStr = siblingGItem.$wrapper.style.transform ;

		// Get the local transform, and patch it!
		var transformDelta = Object.assign( {} , siblingGItem.localTransform ) ;
		transformDelta.translateX += beforeRect.left - afterRect.left ;
		transformDelta.translateY += beforeRect.top - beforeRect.top ;

		// First, disable transitions, so the transform will apply now!
		siblingGItem.$wrapper.style.transition = 'none' ;
		siblingGItem.$wrapper.style.transform = domKit.stringifyTransform( transformDelta ) ;

		setTimeout( () => {
			// Re-enable transitions, restore the transform value
			siblingGItem.$wrapper.style.transition = transitionStr ;
			siblingGItem.$wrapper.style.transform = transformStr ;
		} , flipTimeout ) ;
	} ) ;


	var targetTransform = { translateX: 0 , translateY: 0 } ;

	// Scale transform
	switch ( locationComputedStyle.flexDirection ) {
		case 'row' :
		case 'row-reverse' :
			slotSize = parseFloat( locationComputedStyle.height ) ;
			targetTransform.scaleX = targetTransform.scaleY = slotSize / gItemHeight ;
			break ;
		case 'column' :
		case 'column-reverse' :
			slotSize = parseFloat( locationComputedStyle.width ) ;
			targetTransform.scaleX = targetTransform.scaleY = slotSize / gItemWidth ;
			break ;
		default :
			slotSize = parseFloat( locationComputedStyle.height ) ;
			targetTransform.scaleX = targetTransform.scaleY = slotSize / gItemHeight ;
			console.warn( 'flex-direction' , locationComputedStyle.flexDirection ) ;
	}

	// Translation compensation due to scaling, since the origin is in the middle
	targetTransform.translateX -= ( gItemWidth - gItemWidth * targetTransform.scaleX ) / 2 ;
	targetTransform.translateY -= ( gItemHeight - gItemHeight * targetTransform.scaleY ) / 2 ;

	var localTransform = gItem.localTransform ;
	gItem.localTransform = targetTransform ;

	// If this is not a true slot, then just put the gItem on this slot immediately
	if ( $oldSlot === this.$gfx ) {
		gItem.$wrapper.style.transform = domKit.stringifyTransform( targetTransform ) ;
		$slot.append( gItem.$wrapper ) ;
		promise.resolve() ;
		return promise ;
	}


	// Computed styles
	var oldLocationComputedStyle = window.getComputedStyle( $oldLocation ) ;

	// Old location direction
	switch ( oldLocationComputedStyle.flexDirection ) {
		case 'column' :
		case 'column-reverse' :
			oldDirection = 'column' ;
			break ;
		default :
			oldDirection = 'row' ;
	}

	// Compute the FLIP (First Last Invert Play)
	slotBbox = $slot.getBoundingClientRect() ;
	//console.warn( 'bboxes' , slotBbox ,  oldSlotBbox ) ;

	// Old/new difference
	var sourceTransform = {
		translateX: oldSlotBbox.left + localTransform.translateX - slotBbox.left ,
		translateY: oldSlotBbox.top + localTransform.translateY - slotBbox.top ,
		scaleX: localTransform.scaleX ,
		scaleY: localTransform.scaleY
	} ;

	gItem.$wrapper.style.transform = domKit.stringifyTransform( sourceTransform ) ;
	$slot.append( gItem.$wrapper ) ;

	// Do not initiate the new transform value in the same synchronous flow,
	// it would not animate anything
	setTimeout( () => {
		gItem.$wrapper.style.transform = domKit.stringifyTransform( targetTransform ) ;
		promise.resolve() ;
	} , flipTimeout ) ;

	return promise ;
} ;



Dom.prototype.updateVgArea = function( vg , areaData ) {
	var area ;

	if ( vg.type !== 'vg' ) { return ; }

	if ( ! vg.hasState( 'loaded' ) ) {
		vg.once( 'loaded' , this.updateVgArea.bind( this , vg , areaData ) ) ;
		return ;
	}

	for ( area in areaData ) {
		if ( ! vg.area[ area ] ) { vg.area[ area ] = {} ; }
		if ( ! vg.area[ area ].status ) { vg.area[ area ].status = {} ; }

		if ( areaData[ area ].hint !== undefined ) { vg.area[ area ].hint = areaData[ area ].hint || null ; }
		if ( areaData[ area ].status ) { Object.assign( vg.area[ area ].status , areaData[ area ].status ) ; }

		Array.from( vg.$image.querySelectorAll( '[area=' + area + ']' ) ).forEach( ( $element ) => {
			var statusName ;

			if ( areaData[ area ].hint !== undefined ) {
				if ( areaData[ area ].hint ) {
					$element.setAttribute( 'data-passive-hint' , areaData[ area ].hint ) ;
					$element.classList.add( 'passive-hint' ) ;
				}
				else {
					$element.removeAttribute( 'data-passive-hint' ) ;
					$element.classList.remove( 'passive-hint' ) ;
				}
			}

			if ( areaData[ area ].status ) {
				for ( statusName in areaData[ area ].status ) {
					if ( areaData[ area ].status[ statusName ] ) {
						$element.classList.add( 'status-' + statusName ) ;
					}
					else {
						$element.classList.remove( 'status-' + statusName ) ;
					}
				}
			}
		} ) ;
	}
} ;



Dom.prototype.updateMarkerLocation = function( marker , vgId , areaId ) {
	var vg , $area , areaBBox , markerViewBox , width , height , originX , originY , posX , posY ;


	// First, check that everything is ready and OK...
	if ( ! marker.hasState( 'loaded' ) ) {
		marker.once( 'loaded' , this.updateMarkerLocation.bind( this , marker , vgId , areaId ) ) ;
		return ;
	}

	if ( ! vgId ) { vgId = marker.vg ; }
	if ( ! areaId ) { areaId = marker.location ; }

	if ( ! this.vgs[ vgId ] ) {
		console.warn( 'Unknown VG id: ' , vgId ) ;
		return ;
	}

	vg = this.vgs[ vgId ] ;

	if ( ! vg.hasState( 'loaded' ) ) {
		vg.once( 'loaded' , this.updateMarkerLocation.bind( this , marker , vgId , areaId ) ) ;
		return ;
	}

	$area = vg.$image.querySelector( '[area=' + areaId + ']' ) ;

	if ( ! $area ) {
		console.warn( 'VG ' + vgId + ': area not found' , areaId ) ;
		return ;
	}


	// Once everything is ok, update the marker
	marker.vg = vgId ;
	marker.location = areaId ;


	// Get or compute the area active point
	areaBBox = $area.getBBox() ;
	posX = areaBBox.x + areaBBox.width / 2 ;
	posY = areaBBox.y + areaBBox.height / 2 ;


	// Now, compute the SVG marker position
	markerViewBox = svgKit.getViewBox( marker.$image ) ;
	width = parseFloat( marker.$image.getAttribute( 'width' ) ) || markerViewBox.width ;
	height = parseFloat( marker.$image.getAttribute( 'height' ) ) || markerViewBox.height ;

	if ( ! isNaN( originX = parseFloat( marker.$image.getAttribute( 'originX' ) ) ) ) {
		posX -= ( ( originX - markerViewBox.x ) / markerViewBox.width ) * width ;
	}

	if ( ! isNaN( originY = parseFloat( marker.$image.getAttribute( 'originY' ) ) ) ) {
		posY -= ( ( originY - markerViewBox.y ) / markerViewBox.height ) * height ;
	}

	//* Using CSS transform (Chrome and Firefox both support transition here)
	marker.$image.style.transform =
		'translate(' + posX + 'px , ' + posY + 'px )' +
		'scale(' + width / markerViewBox.width + ' , ' + height / markerViewBox.height + ')' ;
	//*/

	/* Using SVG's transform attribute (Chrome allows transition but not Firefox)
	marker.$image.setAttribute( 'transform' ,
		'translate(' + posX + ' , ' + posY + ' )' +
		'scale(' + width / markerViewBox.width + ' , ' + height / markerViewBox.height + ')'
	) ;
	//*/

	// Append the <g> tag to the main VG's <svg> now, if needed
	if ( marker.$image.ownerSVGElement !== vg.$image ) {
		vg.$image.append( marker.$image ) ;
	}
} ;



Dom.prototype.createGItemLocation = function( locationName ) {
	var $location ;

	if ( this.gItemLocations[ locationName ] ) { return ; }

	$location = this.gItemLocations[ locationName ] = document.createElement( 'div' ) ;
	$location.classList.add( 'g-item-location' ) ;
	$location.classList.add( 'g-item-location-' + locationName ) ;
	this.$gfx.append( $location ) ;
} ;



Dom.prototype.createCardMarkup = function( card ) {
	// .$wrapper is the placeholder, hover effects happen on it
	card.$card = document.createElement( 'div' ) ;
	card.$card.classList.add( 'card' ) ;
	card.$wrapper.append( card.$card ) ;

	card.$front = document.createElement( 'div' ) ;
	card.$front.classList.add( 'front' ) ;
	card.$card.append( card.$front ) ;

	card.$image = document.createElement( 'div' ) ;
	card.$image.classList.add( 'card-image' ) ;
	card.$front.append( card.$image ) ;

	card.$back = document.createElement( 'div' ) ;
	card.$back.classList.add( 'back' ) ;
	card.$card.append( card.$back ) ;

	card.$backImage = document.createElement( 'div' ) ;
	card.$backImage.classList.add( 'card-image' ) ;
	card.$back.append( card.$backImage ) ;
} ;



Dom.prototype.animateGItem = async function( gItem , animation ) {
	var frame , frameIndex = 0 ;

	gItem.animation = animation.id ;

	// What should be done if an animation is already running???

	//console.warn( "Animation: " , animation ) ;

	// If there is no frames, quit now
	if ( ! Array.isArray( animation.frames ) || ! animation.frames.length ) { return ; }

	for ( frame of animation.frames ) {
		// Update the gItem
		await this.updateGItem( gItem , frame ) ;
		await Promise.resolveTimeout( frame.duration * 1000 ) ;
	}

	// Restore something here?
	gItem.animation = null ;
} ;



Dom.prototype.defineAnimation = function( id , data ) {
	data.id = id ;
	this.animations[ id ] = data ;
} ;



Dom.prototype.setVgButtons = function( $svg ) {
	Array.from( $svg.querySelectorAll( '[button]' ) ).forEach( ( $element ) => {
		var buttonId = $element.getAttribute( 'button' ) ;

		$element.setAttribute( 'id' , 'button-' + buttonId ) ;

		if ( ! $element.getAttribute( 'area' ) ) {
			// Create a default area's name equals to the button's ID, if not present
			$element.setAttribute( 'area' , buttonId ) ;
		}

		$element.classList.add( 'button' ) ;
		$element.classList.add( 'disabled' ) ;
	} ) ;
} ;



Dom.prototype.setVgPassiveHints = function( $svg ) {
	Array.from( $svg.querySelectorAll( '[hint]' ) ).forEach( ( $element ) => {
		var hint = $element.getAttribute( 'hint' ) ;

		$element.setAttribute( 'data-passive-hint' , hint ) ;
		$element.classList.add( 'passive-hint' ) ;

		$element.addEventListener( 'mouseleave' , ( event ) => {
			this.clearHint() ;
			//event.stopPropagation() ; // useless for mouseleave events
		} ) ;

		$element.addEventListener( 'mouseenter' , ( event ) => {
			var $element_ = event.currentTarget ;
			var hint_ = $element_.getAttribute( 'data-passive-hint' ) ;
			if ( ! hint_ ) { return ; }
			this.setHint( hint_ , { passive: true } ) ;
			//event.stopPropagation() ; // useless for mouseenter events
		} ) ;
	} ) ;
} ;



/* SFX */



// maybe callback?
Dom.prototype.sound = function( data , callback ) {
	var endHandler ,
		$element = this[ '$sound' + this.nextSoundChannel ] ;

	console.warn( '$sound' + this.nextSoundChannel , data , $element ) ;
	this.nextSoundChannel = ( this.nextSoundChannel + 1 ) % 4 ;

	$element.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;
	$element.play() ;

	if ( callback ) {
		endHandler = () => {
			$element.removeEventListener( 'ended' , endHandler ) ;
			callback() ;
		} ;

		$element.addEventListener( 'ended' , endHandler ) ;
	}
} ;



Dom.prototype.music = function( data ) {
	var oldSrc = this.$music.getAttribute( 'src' ) ;

	if ( data.url ) {
		data.url = this.cleanUrl( data.url ) ;

		if ( oldSrc ) {
			if ( oldSrc !== data.url ) {
				soundFadeOut( this.$music , () => {
					this.$music.setAttribute( 'src' , data.url ) ;
					this.$music.play() ;
					soundFadeIn( this.$music ) ;
				} ) ;
			}
			else if ( this.$music.ended ) {
				// We are receiving a music event for the same last music url,
				// but last playback ended, so play it again.
				this.$music.play() ;
			}
		}
		else {
			this.$music.volume = 0 ;
			this.$music.setAttribute( 'src' , data.url ) ;
			this.$music.play() ;
			soundFadeIn( this.$music ) ;
		}
	}
	else if ( oldSrc ) {
		soundFadeOut( this.$music , () => {
			this.$music.removeAttribute( 'src' ) ;
		} ) ;
	}
} ;



var SOUND_FADE_TIMEOUT = 10 ;
var SOUND_FADE_VALUE = 0.01 ;



function soundFadeIn( $element , callback ) {
	if ( $element.__fadeTimer ) { clearTimeout( $element.__fadeTimer ) ; $element.__fadeTimer = null ; }

	if ( $element.volume >= 1 ) {
		if ( callback ) { callback() ; }
		return ;
	}

	$element.volume = Math.min( 1 , $element.volume + SOUND_FADE_VALUE ) ;
	$element.__fadeTimer = setTimeout( soundFadeIn.bind( undefined , $element , callback ) , SOUND_FADE_TIMEOUT ) ;
}



function soundFadeOut( $element , callback ) {
	if ( $element.__fadeTimer ) { clearTimeout( $element.__fadeTimer ) ; $element.__fadeTimer = null ; }

	if ( $element.volume <= 0 ) {
		if ( callback ) { callback() ; }
		return ;
	}

	$element.volume = Math.max( 0 , $element.volume - SOUND_FADE_VALUE ) ;
	$element.__fadeTimer = setTimeout( soundFadeOut.bind( undefined , $element , callback ) , SOUND_FADE_TIMEOUT ) ;
}


},{"../../commonUtils.js":5,"dom-kit":7,"nextgen-events/lib/browser.js":11,"seventh":25,"svg-kit":42}],2:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const dom = require( 'dom-kit' ) ;
const url = require( 'url' ) ;



function SpellcastClient( options ) {
	this.domain = options.domain || 'localhost' ;
	this.port = options.port || 80 ;
	this.path = options.path || '/' ;
	this.token = options.token || '' ;
	this.userName = options.name || 'unknown_' + Math.floor( Math.random() * 10000 ) ;
	this.ws = null ;
	this.proxy = null ;
}

module.exports = SpellcastClient ;

SpellcastClient.prototype = Object.create( Ngev.prototype ) ;
SpellcastClient.prototype.constructor = SpellcastClient ;



const uiList = {
	classic: require( './ui/classic.js' )
} ;



SpellcastClient.autoCreate = function() {
	var options = {
		port: window.location.port ,
		domain: window.location.hostname ,
		path: window.location.pathname
	} ;

	Object.assign( options , url.parse( window.location.href , true ).query ) ;

	window.spellcastClient = new SpellcastClient( options ) ;
	//window.spellcastClient.init() ;

	if ( ! options.ui ) { options.ui = [ 'classic' ] ; }
	else if ( ! Array.isArray( options.ui ) ) { options.ui = [ options.ui ] ; }

	window.spellcastClient.ui = options.ui ;

	return window.spellcastClient ;
} ;



SpellcastClient.prototype.run = function( callback ) {
	var isOpen = false ;

	this.proxy = new Ngev.Proxy() ;

	// Add the remote service we want to access
	this.proxy.addRemoteService( 'bus' ) ;

	this.ui.forEach( ( ui ) => {
		if ( uiList[ ui ] ) { new uiList[ ui ]( this.proxy.remoteServices.bus , this ) ; }
	} ) ;

	var wsUrl = 'ws://' + this.domain +
		( this.port ? ':' + this.port : '' ) +
		this.path +
		( this.token || '' ) ;

	console.log( 'Websocket URL:' , wsUrl ) ;
	this.ws = new WebSocket( wsUrl ) ;

	this.emit( 'connecting' ) ;

	this.ws.onerror = () => {

		if ( ! isOpen ) {
			// The connection has never opened, we can't connect to the server.
			console.log( "Can't open Websocket (error)..." ) ;
			this.emit( 'error' , 'unreachable' ) ;
			return ;
		}
	} ;

	this.ws.onopen = () => {

		isOpen = true ;

		// Send 'ready' to server?
		// No, let the UI send it.
		//this.proxy.remoteServices.bus.emit( 'ready' ) ;

		console.log( "Websocket opened!" ) ;
		this.emit( 'open' ) ;

		// Should be done after emitting 'open'
		this.proxy.remoteServices.bus.emit( 'authenticate' , {
			name: this.userName
		} ) ;

		if ( typeof callback === 'function' ) { callback() ; }
	} ;

	this.ws.onclose = () => {

		if ( ! isOpen ) {
			// The connection has never opened, we can't connect to the server.
			console.log( "Can't open Websocket (close)..." ) ;
			this.emit( 'error' , 'unreachable' ) ;
			return ;
		}

		isOpen = false ;
		this.proxy.destroy() ;
		console.log( "Websocket closed!" ) ;
		this.emit( 'close' ) ;
	} ;

	this.ws.onmessage = wsMessage => {

		var message ;

		try {
			message = JSON.parse( wsMessage.data ) ;
		}
		catch ( error ) {
			return ;
		}

		console.log( "Message received: " , message ) ;

		this.proxy.receive( message ) ;
	} ;

	this.proxy.send = message => {
		this.ws.send( JSON.stringify( message ) ) ;
	} ;
} ;



SpellcastClient.autoCreate() ;

dom.ready( () => {
	window.spellcastClient.run() ;

	// Debug
	// Style sheet reloader (F9 key)
	document.body.onkeypress = event => {
		if ( event.keyCode !== 120 ) { return ; }

		var href , sheets = document.querySelectorAll( 'link[rel=stylesheet]' ) ;

		for ( var i = 0 ; i < sheets.length ; i ++ ) {
			href = sheets[i].getAttribute( 'href' ).split( '?' )[0] + '?' + Math.random() ;
			sheets[i].setAttribute( 'href' , href ) ;
		}
	} ;
} ) ;


},{"./ui/classic.js":4,"dom-kit":7,"nextgen-events/lib/browser.js":11,"url":47}],3:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const toolkit = {} ;
module.exports = toolkit ;



const markupMethod = require( 'string-kit/lib/format.js' ).markupMethod ;
const escapeHtml = require( 'string-kit/lib/escape.js' ).html ;



const markupConfig = {
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
		"B": '<span class="bright blue">' ,
		"c": '<span class="cyan">' ,
		"C": '<span class="bright cyan">' ,
		"g": '<span class="green">' ,
		"G": '<span class="bright green">' ,
		"k": '<span class="black">' ,
		"K": '<span class="grey">' ,
		"m": '<span class="magenta">' ,
		"M": '<span class="bright magenta">' ,
		"r": '<span class="red">' ,
		"R": '<span class="bright red">' ,
		"w": '<span class="white">' ,
		"W": '<span class="bright white">' ,
		"y": '<span class="yellow">' ,
		"Y": '<span class="bright yellow">'
	}
} ;



toolkit.markup = ( ... args ) => {
	args[ 0 ] = escapeHtml( args[ 0 ] ).replace( /\n/ , '<br />' ) ;
	return markupMethod.apply( markupConfig , args ) ;
} ;



const MARKUP_REGEX = /\^\[([^\]]*)]|\^(.)|([^^]+)/g ;

toolkit.stripMarkup = text => text.replace(
	MARKUP_REGEX ,
	( match , complex , markup , raw ) =>
		raw ? raw :
		markup === '^' ? '^' :
		''
) ;


},{"string-kit/lib/escape.js":28,"string-kit/lib/format.js":29}],4:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const Ngev = require( 'nextgen-events/lib/browser.js' ) ;
const Dom = require( '../Dom.js' ) ;
// const treeExtend = require( 'tree-kit/lib/extend.js' ) ;
// const treeOps = require( 'kung-fig/lib/treeOps.js' ) ;
const toolkit = require( '../toolkit.js' ) ;



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

	this.commandConfig( { enabled: true } ) ;

	this.dom.preload() ;
}

module.exports = UI ;

UI.prototype = Object.create( Ngev.prototype ) ;
UI.prototype.constructor = UI ;



function arrayGetById( id ) { return this.find( ( e ) => { return e.id === id ; } ) ; }	// jshint ignore:line



// 'open' event on client
UI.prototype.initBus = function() {
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

	this.bus.on( 'showSprite' , UI.showSprite.bind( this ) , { async: true } ) ;
	this.bus.on( 'updateSprite' , UI.updateSprite.bind( this ) , { async: true } ) ;
	this.bus.on( 'animateSprite' , UI.animateSprite.bind( this ) , { async: true } ) ;
	this.bus.on( 'clearSprite' , UI.clearSprite.bind( this ) ) ;

	this.bus.on( 'showVg' , UI.showVg.bind( this ) ) ;
	this.bus.on( 'updateVg' , UI.updateVg.bind( this ) ) ;
	this.bus.on( 'animateVg' , UI.animateVg.bind( this ) ) ;
	this.bus.on( 'clearVg' , UI.clearVg.bind( this ) ) ;

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
	this.bus.on( 'commandConfig' , UI.prototype.commandConfig.bind( this ) ) ;

	//this.bus.on( 'splitRoles' , UI.splitRoles.bind( this ) ) ;
	this.bus.on( 'rejoinRoles' , UI.rejoinRoles.bind( this ) ) ;

	this.bus.on( 'pause' , UI.pause.bind( this ) ) ;
	this.bus.on( 'unpause' , UI.unpause.bind( this ) ) ;

	this.bus.on( 'wait' , UI.wait.bind( this ) ) ;
	this.bus.on( 'end' , UI.end.bind( this ) , { async: true } ) ;

	this.bus.on( 'custom' , UI.custom.bind( this ) ) ;

	this.bus.on( 'exit' , UI.exit.bind( this ) , { async: true } ) ;

	this.bus.emit( 'ready' ) ;

	this.defineStates( 'end' ) ;
} ;



UI.clientConnecting = function() {
	console.log( 'Connecting!' ) ;
	this.dom.clientStatus( 'connecting' ) ;
} ;



UI.clientOpen = function() {
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



UI.clientClose = function() {
	console.log( 'Closed!' ) ;
	this.dom.clientStatus( 'closed' ) ;
} ;



UI.clientError = function( code ) {
	switch ( code ) {
		case 'unreachable' :
			this.dom.clientStatus( 'unreachable' ) ;
			break ;
	}
} ;



UI.clientConfig = function( config ) {
	console.warn( 'Client config received: ' , config ) ;
	this.config = config ;

	if ( this.config.theme ) {
		this.dom.setTheme( this.config.theme ) ;
	}
} ;



UI.user = function( user_ ) {
	console.log( 'User received: ' , user_ ) ;
	this.user = user_ ;
} ;



UI.userList = function( users ) {
	console.log( 'User-list received: ' , users ) ;

	// Add the get method to the array
	users.get = arrayGetById ;
	this.users = users ;
} ;



UI.roleList = function( roles , unassignedUsers , assigned ) {
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
			this.bus.emit( 'selectRole' , roles[ index ].id ) ;
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
UI.message = function( text , options , callback ) {
	this.hasNewContent = true ;

	if ( ! options ) { options = {} ; }

	if ( options.speech ) {
		if ( ! options.speechLang ) { options.speechLang = this.config.defaultLocale ; }
		options.useService = this.config.hasSpeechService ;

		if ( options.speechOnly ) {
			this.dom.addSpeech( toolkit.stripMarkup( text ) , options , callback ) ;
		}
		else {
			let messageDone = false , speechDone = false ;

			this.dom.addMessage( toolkit.markup( text ) , options , () => {
				messageDone = true ;
				if ( speechDone ) { callback() ; }
			} ) ;

			this.dom.addSpeech( toolkit.stripMarkup( text ) , options , () => {
				speechDone = true ;
				if ( messageDone ) { callback() ; }
			} ) ;
		}
	}
	else {
		this.dom.addMessage( toolkit.markup( text ) , options , callback ) ;
	}
} ;



UI.indicators = function( data ) {
	this.dom.addIndicators( data ) ;
} ;



UI.status = function( data ) {
	this.dom.addIndicators( data , true ) ;
} ;



UI.panel = function( data , reset ) {
	this.dom.addPanel( data , reset ) ;
} ;



// 'enterScene' event
UI.enterScene = function( isGosub , toAltBuffer ) {
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
UI.leaveScene = function( isReturn , backToMainBuffer ) {
	if ( backToMainBuffer ) { this.dom.toMainBuffer() ; }
	//else { this.dom.newSegmentOnContent() ; }

	// if ( isReturn ) {}

	this.afterNext = this.afterNextTriggered = false ;
	this.afterLeave = true ;
} ;



// 'nextTriggered' event
UI.nextTriggered = function( nextId ) {
	var selected = this.nexts.find( e => e.id === nextId ) ;

	this.dom.newSegmentOnContent( 'inter-segment' ) ;

	if ( selected && selected.label && ! selected.button ) {
		this.dom.addSelectedChoice( selected.label ) ;
	}

	this.dom.clearChoices() ;
	this.afterNextTriggered = true ;
	this.hasNewContent = false ;
} ;



UI.nextList = function( nexts , undecidedRoleIds , options , isUpdate ) {
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
			this.bus.emit( 'selectNext' , nexts[ index ].id ) ;
		}
	} ;

	this.dom.setChoices( choices , undecidedNames , onSelect , { timeout: options.timeout , nextStyle: options.nextStyle } ) ;
} ;



// External raw output (e.g. shell command stdout)
UI.extOutput = function( output ) {
	alert( 'not coded ATM!' ) ;
	//process.stdout.write( output ) ;
} ;



// External raw error output (e.g. shell command stderr)
UI.extErrorOutput = function( output ) {
	alert( 'not coded ATM!' ) ;
	//process.stderr.write( output ) ;
} ;



// Text input field
UI.textInput = function( label , grantedRoleIds ) {
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



UI.prototype.commandConfig = function( config ) {
	console.warn( "Received command config:" , config ) ;
	if ( config.enabled === true ) {
		this.dom.enableCommand( ( message ) => {
			//console.log( 'inGame?' , this.inGame ) ;
			this.bus.emit( this.inGame ? 'command' : 'chat' , message ) ;
		} ) ;
	}
	else if ( config.enabled === false ) {
		this.dom.disableCommand() ;
	}
} ;



UI.pause = function( duration ) {
	console.log( "Received a pause event for" , duration , "seconds" ) ;
} ;



UI.unpause = function() {
	console.log( "Received an unpause event" ) ;
} ;



// rejoinRoles event (probably better to listen to that event before using it in the 'wait' event)
UI.rejoinRoles = function() {} ;



UI.wait = function( what ) {
	switch ( what ) {
		case 'otherBranches' :
			this.dom.setBigHint( "WAITING FOR OTHER BRANCHES TO FINISH..." , { wait: true , "pulse-animation": true } ) ;
			this.bus.once( 'rejoinRoles' , () => this.dom.clearHint() ) ;
			break ;
		default :
			this.dom.setBigHint( "WAITING FOR " + what , { wait: true , "pulse-animation": true } ) ;
	}
} ;



UI.theme = function( data ) {
	if ( ! data.url ) {
		if ( this.config.theme ) { this.dom.setTheme( this.config.theme ) ; }
		return ;
	}

	this.dom.setTheme( data ) ;
} ;



UI.image = function( data ) {
	this.dom.setSceneImage( data ) ;
} ;



UI.defineAnimation = function( id , data ) {
	this.dom.defineAnimation( id , data ) ;
} ;



UI.showSprite = function( id , data , callback ) {
	if ( ! data.url || typeof data.url !== 'string' ) {
		callback() ;
		return ;
	}

	data.actionCallback = UI.spriteActionCallback.bind( this ) ;
	this.dom.showSprite( id , data ).then( callback ) ;
} ;



UI.spriteActionCallback = function( action ) {
	console.warn( "Sprite action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateSprite = function( id , data , callback ) {
	this.dom.updateSprite( id , data ).then( callback ) ;
} ;



UI.animateSprite = function( spriteId , animationId , callback ) {
	this.dom.animateSprite( spriteId , animationId ).then( callback ) ;
} ;



UI.clearSprite = function( id ) {
	this.dom.clearSprite( id ) ;
} ;



UI.showVg = function( id , data ) {
	if ( ( ! data.url || typeof data.url !== 'string' ) && ( ! data.vgObject || typeof data.vgObject !== 'object' ) ) { return ; }

	data.actionCallback = UI.vgActionCallback.bind( this ) ;

	this.dom.showVg( id , data ) ;
} ;



UI.vgActionCallback = function( action ) {
	console.warn( "VG action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateVg = function( id , data ) {
	this.dom.updateVg( id , data ) ;
} ;



UI.animateVg = function( gItemId , animationId ) {
	this.dom.animateVg( gItemId , animationId ) ;
} ;



UI.clearVg = function( id ) {
	this.dom.clearVg( id ) ;
} ;



UI.showMarker = function( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	data.actionCallback = UI.markerActionCallback.bind( this ) ;

	this.dom.showMarker( id , data ) ;
} ;



UI.markerActionCallback = function( action ) {
	console.warn( "Marker action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateMarker = function( id , data ) {
	this.dom.updateMarker( id , data ) ;
} ;



UI.animateMarker = function( markerId , animationId ) {
	this.dom.animateMarker( markerId , animationId ) ;
} ;



UI.clearMarker = function( id ) {
	this.dom.clearMarker( id ) ;
} ;



UI.showCard = function( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	data.actionCallback = UI.cardActionCallback.bind( this ) ;

	this.dom.showCard( id , data ) ;
} ;



UI.cardActionCallback = function( action ) {
	console.warn( "Card action triggered: " , action ) ;
	this.bus.emit( 'action' , action ) ;
} ;



UI.updateCard = function( id , data ) {
	this.dom.updateCard( id , data ) ;
} ;



UI.animateCard = function( cardId , animationId ) {
	this.dom.animateCard( cardId , animationId ) ;
} ;



UI.clearCard = function( id ) {
	this.dom.clearCard( id ) ;
} ;



// add a callback here?
UI.sound = function( data ) {
	this.dom.sound( data ) ;
} ;



UI.music = function( data ) {
	this.dom.music( data ) ;
} ;



// End event
UI.end = function( result , data , callback ) {
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
UI.custom = function( event , data ) {
	console.log( "Received a custom event" , event , data ) ;
} ;



// Exit event
UI.exit = function( error , timeout , callback ) {
	console.log( 'exit cb' , callback ) ;
	this.once( 'end' , () => {
		// Add at least few ms, because DOM may be OK, but parallel image download are still in progress.
		// E.g.: after .setDialog()'s callback, boxes/geometric-gold.svg is not loaded.
		// Keep in mind that once the exit callback is sent, the remote server will disconnect us as soon as possible.
		setTimeout( 200 , callback ) ;
	} ) ;
} ;


},{"../Dom.js":1,"../toolkit.js":3,"nextgen-events/lib/browser.js":11}],5:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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
	Things that can be common between clients and server.
*/



exports.toClassObject = function toClassObject( data ) {
	var object = {} ;

	if ( ! data ) { return object ; }

	if ( typeof data === 'string' ) {
		object[ data ] = true ;
		return object ;
	}

	if ( typeof data === 'object' ) {
		if ( Array.isArray( data ) ) {
			data.forEach( e => object[ e ] = true ) ;
			return object ;
		}

		return data ;

	}

	return object ;
} ;


},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
(function (process){
/*
	Dom Kit

	Copyright (c) 2015 - 2018 Cédric Ronvel

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



var domParser , xmlSerializer ;

if ( process.browser ) {
	domParser = new DOMParser() ;
	xmlSerializer = new XMLSerializer() ;
}
else {
	var xmldom = require( '@cronvel/xmldom' ) ;
	domParser = new xmldom.DOMParser() ;
	xmlSerializer = new xmldom.XMLSerializer() ;
}



var domKit = {} ;
module.exports = domKit ;



// Like jQuery's $(document).ready()
domKit.ready = function( callback ) {
	document.addEventListener( 'DOMContentLoaded' , function internalCallback() {
		document.removeEventListener( 'DOMContentLoaded' , internalCallback , false ) ;
		callback() ;
	} , false ) ;
} ;



domKit.fromXml = function( xml ) {
	return domParser.parseFromString( xml , 'application/xml' ) ;
} ;



domKit.toXml = function( $doc ) {
	return xmlSerializer.serializeToString( $doc ) ;
} ;



// Return a fragment from html code
domKit.fromHtml = function( html ) {
	var i , $doc , $fragment ;

	// Fragment allow us to return a collection that... well... is not a collection,
	// and that's fine because the html code may contains multiple top-level element
	$fragment = document.createDocumentFragment() ;

	$doc = document.createElement( 'div' ) ;	// whatever type...

	// either .innerHTML or .insertAdjacentHTML()
	//$doc.innerHTML = html ;
	$doc.insertAdjacentHTML( 'beforeend' , html ) ;

	for ( i = 0 ; i < $doc.children.length ; i ++ ) {
		$fragment.appendChild( $doc.children[ i ] ) ;
	}

	return $fragment ;
} ;



domKit.appendJs = function( url ) {
	var $script = document.createElement( 'script' ) ;
	$script.setAttribute( 'src' , url ) ;
	document.body.appendChild( $script ) ;
} ;



// Batch processing, like array, HTMLCollection, and so on...
domKit.batch = function( method , elements , ... args ) {
	var i ;

	if ( elements instanceof Element ) {
		method( elements , ... args ) ;
	}
	else if ( Array.isArray( elements ) ) {
		for ( i = 0 ; i < elements.length ; i ++ ) {
			method( elements[ i ] , ... args ) ;
		}
	}
	else if ( elements instanceof NodeList || elements instanceof NamedNodeMap ) {
		for ( i = 0 ; i < elements.length ; i ++ ) {
			method( elements[ i ] , ... args ) ;
		}
	}
} ;



// Set a bunch of css properties given as an object
domKit.css = function( $element , object ) {
	var key ;

	for ( key in object ) {
		$element.style[ key ] = object[ key ] ;
	}
} ;



// Set a bunch of attributes given as an object
domKit.attr = function( $element , object , prefix ) {
	var key ;

	prefix = prefix || '' ;

	for ( key in object ) {
		if ( object[ key ] === null ) { $element.removeAttribute( prefix + key ) ; }
		else { $element.setAttribute( prefix + key , object[ key ] ) ; }
	}
} ;



// Set/unset a bunch of classes given as an object
domKit.class = function( $element , object , prefix ) {
	var key ;

	prefix = prefix || '' ;

	for ( key in object ) {
		if ( object[ key ] ) { $element.classList.add( prefix + key ) ; }
		else { $element.classList.remove( prefix + key ) ; }
	}
} ;



// Remove an element. A little shortcut that ease life...
domKit.remove = function( $element ) { $element.parentNode.removeChild( $element ) ; } ;



// Remove all children of an element
domKit.empty = function( $element ) {
	// $element.innerHTML = '' ;	// <-- According to jsPerf, this is 96% slower
	while ( $element.firstChild ) { $element.removeChild( $element.firstChild ) ; }
} ;



// Clone a source DOM tree and replace children of the destination
domKit.cloneInto = function( $source , $destination ) {
	domKit.empty( $destination ) ;
	$destination.appendChild( $source.cloneNode( true ) ) ;
} ;



// Same than cloneInto() without cloning anything
domKit.insertInto = function( $source , $destination ) {
	domKit.empty( $destination ) ;
	$destination.appendChild( $source ) ;
} ;



// Move all children of a node into another, after removing existing target's children
domKit.moveChildrenInto = function( $source , $destination ) {
	domKit.empty( $destination ) ;
	while ( $source.firstChild ) { $destination.appendChild( $source.firstChild ) ; }
} ;



// Move all attributes of an element into the destination
domKit.moveAttributes = function( $source , $destination ) {
	Array.from( $source.attributes ).forEach( ( attr ) => {
		var name = attr.name ;
		var value = attr.value ;

		$source.removeAttribute( name ) ;

		// Do not copy namespaced attributes for instance,
		// should probably protect this behind a third argument
		if ( name !== 'xmlns' && name.indexOf( ':' ) === -1 && value ) {
			//console.warn( 'moving: ' , name, value , $destination.getAttribute( name ) ) ;
			$destination.setAttribute( name , value ) ;
		}
	} ) ;
} ;



domKit.styleToAttribute = function( $element , property , blacklistedValues ) {
	if ( $element.style[ property ] && ( ! blacklistedValues || blacklistedValues.indexOf( $element.style[ property ] ) === -1 ) ) {
		$element.setAttribute( property , $element.style[ property ] ) ;
		$element.style[ property ] = null ;
	}
} ;



// Children of this element get all their ID prefixed, any url(#id) references are patched accordingly
domKit.prefixIds = function( $element , prefix ) {
	var elements , replacement = {} ;

	elements = $element.querySelectorAll( '*' ) ;

	domKit.batch( domKit.prefixIds.idAttributePass , elements , prefix , replacement ) ;
	domKit.batch( domKit.prefixIds.otherAttributesPass , elements , replacement ) ;
} ;



// Callbacks for domKit.prefixIds(), cleanly hidden behind its prefix

domKit.prefixIds.idAttributePass = function( $element , prefix , replacement ) {
	replacement[ $element.id ] = prefix + '.' + $element.id ;
	$element.id = replacement[ $element.id ] ;
} ;



domKit.prefixIds.otherAttributesPass = function( $element , replacement ) {
	domKit.batch( domKit.prefixIds.oneAttributeSubPass , $element.attributes , replacement ) ;
} ;



domKit.prefixIds.oneAttributeSubPass = function( attr , replacement ) {
	// We have to search all url(#id) like substring in the current attribute's value
	attr.value = attr.value.replace( /url\(#([^)]+)\)/g , ( match , id ) => {

		// No replacement? return the matched string
		if ( ! replacement[ id ] ) { return match ; }

		// Or return the replacement ID
		return 'url(#' + replacement[ id ] + ')' ;
	} ) ;
} ;



domKit.removeAllTags = function( $container , tagName , onlyIfEmpty ) {
	Array.from( $container.getElementsByTagName( tagName ) ).forEach( ( $element ) => {
		if ( ! onlyIfEmpty || ! $element.firstChild ) { $element.parentNode.removeChild( $element ) ; }
	} ) ;
} ;



domKit.removeAllAttributes = function( $container , attrName ) {
	// Don't forget to remove the ID of the container itself
	$container.removeAttribute( attrName ) ;

	Array.from( $container.querySelectorAll( '[' + attrName + ']' ) ).forEach( ( $element ) => {
		$element.removeAttribute( attrName ) ;
	} ) ;
} ;



domKit.preload = function( urls ) {
	if ( ! Array.isArray( urls ) ) { urls = [ urls ] ; }

	urls.forEach( ( url ) => {
		if ( domKit.preload.preloaded[ url ] ) { return ; }
		domKit.preload.preloaded[ url ] = new Image() ;
		domKit.preload.preloaded[ url ].src = url ;
	} ) ;
} ;

domKit.preload.preloaded = {} ;



/*
	Filter namespaces:

	* options `object` where:
		* blacklist `array` of `string` namespace of elements/attributes to remove
		* whitelist `array` of `string` namespace to elements/attributes to keep
		* primary `string` keep those elements but remove the namespace
*/
domKit.filterByNamespace = function( $container , options ) {
	var i , $child , namespace , tagName , split ;

	// Nothing to do? return now...
	if ( ! options || typeof options !== 'object' ) { return ; }

	domKit.filterAttributesByNamespace( $container , options ) ;

	for ( i = $container.childNodes.length - 1 ; i >= 0 ; i -- ) {
		$child = $container.childNodes[ i ] ;

		if ( $child.nodeType === 1 ) {
			if ( $child.tagName.indexOf( ':' ) !== -1 ) {
				split = $child.tagName.split( ':' ) ;
				namespace = split[ 0 ] ;
				tagName = split[ 1 ] ;

				if ( namespace === options.primary ) {
					$child.tagName = tagName ;
					domKit.filterByNamespace( $child , options ) ;
				}
				else if ( options.whitelist ) {
					if ( options.whitelist.indexOf( namespace ) !== -1 ) {
						domKit.filterByNamespace( $child , options ) ;
					}
					else {
						$container.removeChild( $child ) ;
					}
				}
				else if ( options.blacklist ) {
					if ( options.blacklist.indexOf( namespace ) !== -1 ) {
						$container.removeChild( $child ) ;
					}
					else {
						domKit.filterByNamespace( $child , options ) ;
					}
				}
				else {
					domKit.filterByNamespace( $child , options ) ;
				}
			}
			else {
				domKit.filterByNamespace( $child , options ) ;
			}
		}
	}
} ;



// Filter attributes by namespace
domKit.filterAttributesByNamespace = function( $container , options ) {
	var i , attr , namespace , attrName , value , split ;

	// Nothing to do? return now...
	if ( ! options || typeof options !== 'object' ) { return ; }

	for ( i = $container.attributes.length - 1 ; i >= 0 ; i -- ) {
		attr = $container.attributes[ i ] ;

		if ( attr.name.indexOf( ':' ) !== -1 ) {
			split = attr.name.split( ':' ) ;
			namespace = split[ 0 ] ;
			attrName = split[ 1 ] ;
			value = attr.value ;

			if ( namespace === options.primary ) {
				$container.removeAttributeNode( attr ) ;
				$container.setAttribute( attrName , value ) ;
			}
			else if ( options.whitelist ) {
				if ( options.whitelist.indexOf( namespace ) === -1 ) {
					$container.removeAttributeNode( attr ) ;
				}
			}
			else if ( options.blacklist ) {
				if ( options.blacklist.indexOf( namespace ) !== -1 ) {
					$container.removeAttributeNode( attr ) ;
				}
			}
		}
	}
} ;



// Remove comments
domKit.removeComments = function( $container ) {
	var i , $child ;

	for ( i = $container.childNodes.length - 1 ; i >= 0 ; i -- ) {
		$child = $container.childNodes[ i ] ;

		if ( $child.nodeType === 8 ) {
			$container.removeChild( $child ) ;
		}
		else if ( $child.nodeType === 1 ) {
			domKit.removeComments( $child ) ;
		}
	}
} ;



// Remove white-space-only text-node
domKit.removeWhiteSpaces = function( $container , onlyWhiteLines ) {
	var i , $child , $lastTextNode = null ;

	for ( i = $container.childNodes.length - 1 ; i >= 0 ; i -- ) {
		$child = $container.childNodes[ i ] ;
		//console.log( '$child.nodeType' , $child.nodeType ) ;

		if ( $child.nodeType === 3 ) {
			if ( onlyWhiteLines ) {
				if ( $lastTextNode ) {
					// When multiple text-node in a row
					$lastTextNode.nodeValue = ( $child.nodeValue + $lastTextNode.nodeValue ).replace( /^\s*(\n[\t ]*)$/ , '$1' ) ;
					$container.removeChild( $child ) ;
				}
				else {
					//console.log( "deb1: '" + $child.nodeValue + "'" ) ;
					$child.nodeValue = $child.nodeValue.replace( /^\s*(\n[\t ]*)$/ , '$1' ) ;
					$lastTextNode = $child ;
					//console.log( "deb2: '" + $child.nodeValue + "'" ) ;
				}
			}
			else if ( ! /\S/.test( $child.nodeValue ) ) {
				$container.removeChild( $child ) ;
			}
		}
		else if ( $child.nodeType === 1 ) {
			$lastTextNode = null ;
			domKit.removeWhiteSpaces( $child , onlyWhiteLines ) ;
		}
		else {
			$lastTextNode = null ;
		}
	}
} ;



// Transform-related method

domKit.parseMatrix = function( str ) {
	var matches = str.match( /(matrix|matrix3d)\(([0-9., -]+)\)/ ) ;

	if ( ! matches ) { return null ; }

	return matches[ 2 ].trim().split( / ?, ?/ ).map( ( e ) => {
		return parseFloat( e ) ;
	} ) ;
} ;



domKit.decomposeMatrix = function( mat ) {
	if ( mat.length === 6 ) { return domKit.decomposeMatrix2d( mat ) ; }
	if ( mat.length === 16 ) { return domKit.decomposeMatrix3d( mat ) ; }
	return null ;
} ;



// From: https://stackoverflow.com/questions/16359246/how-to-extract-position-rotation-and-scale-from-matrix-svg
domKit.decomposeMatrix2d = function( mat ) {
	var angle = Math.atan2( mat[1] , mat[0] ) ,
		denom = mat[0] * mat[0] + mat[1] * mat[1] ,
		scaleX = Math.sqrt( denom ) ,
		scaleY = ( mat[0] * mat[3] - mat[2] * mat[1] ) / scaleX ,
		skewX = Math.atan2( mat[0] * mat[2] + mat[1] * mat[3] , denom ) ;

	return {
		rotate: 180 * angle / Math.PI ,  // in degrees
		scaleX: scaleX ,
		scaleY: scaleY ,
		skewX: 180 * skewX / Math.PI ,  // in degree
		skewY: 0 ,  // always 0 in this decomposition
		translateX: mat[4] ,
		translateY: mat[5]
	} ;
} ;



// https://stackoverflow.com/questions/15024828/transforming-3d-matrix-into-readable-format
// supports only scale*rotate*translate matrix
domKit.decomposeMatrix3d = function( mat ) {
	var radians = Math.PI / 180 ;

	var sX = Math.sqrt( mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2] ) ,
		sY = Math.sqrt( mat[4] * mat[4] + mat[5] * mat[5] + mat[6] * mat[6] ) ,
		sZ = Math.sqrt( mat[8] * mat[8] + mat[9] * mat[9] + mat[10] * mat[10] ) ;

	var rX = Math.atan2( -mat[9] / sZ , mat[10] / sZ ) / radians ,
		rY = Math.asin( mat[8] / sZ ) / radians ,
		rZ = Math.atan2( -mat[4] / sY , mat[0] / sX ) / radians ;

	if ( mat[4] === 1 || mat[4] === -1 ) {
		rX = 0 ;
		rY = mat[4] * -Math.PI / 2 ;
		rZ = mat[4] * Math.atan2( mat[6] / sY , mat[5] / sY ) / radians ;
	}

	var tX = mat[12] / sX ,
		tY = mat[13] / sX ,
		tZ = mat[14] / sX ;

	return {
		translateX: tX ,
		translateY: tY ,
		translateZ: tZ ,
		rotateX: rX ,
		rotateY: rY ,
		rotateZ: rZ ,
		scaleX: sX ,
		scaleY: sY ,
		scaleZ: sZ
	} ;
} ;



domKit.stringifyTransform = function( object ) {
	var str = [] ;

	if ( object.translateX ) { str.push( 'translateX(' + object.translateX + 'px)' ) ; }
	if ( object.translateY ) { str.push( 'translateY(' + object.translateY + 'px)' ) ; }
	if ( object.translateZ ) { str.push( 'translateZ(' + object.translateZ + 'px)' ) ; }

	if ( object.rotate ) {
		str.push( 'rotate(' + object.rotate + 'deg)' ) ;
	}
	else {
		if ( object.rotateX ) { str.push( 'rotateX(' + object.rotateX + 'deg)' ) ; }
		if ( object.rotateY ) { str.push( 'rotateY(' + object.rotateY + 'deg)' ) ; }
		if ( object.rotateZ ) { str.push( 'rotateZ(' + object.rotateZ + 'deg)' ) ; }
	}

	if ( object.scale ) {
		str.push( 'scale(' + object.scale + ')' ) ;
	}
	else {
		if ( object.scaleX ) { str.push( 'scaleX(' + object.scaleX + ')' ) ; }
		if ( object.scaleY ) { str.push( 'scaleY(' + object.scaleY + ')' ) ; }
		if ( object.scaleZ ) { str.push( 'scaleZ(' + object.scaleZ + ')' ) ; }
	}

	if ( object.skewX ) { str.push( 'skewX(' + object.skewX + 'deg)' ) ; }
	if ( object.skewY ) { str.push( 'skewY(' + object.skewY + 'deg)' ) ; }

	return str.join( ' ' ) ;
} ;

domKit.transform = function( $element , transformObject ) {
	$element.style.transform = domKit.stringifyTransform( transformObject ) ;
} ;





/* Function useful for .batch() as callback */
/* ... to avoid defining again and again the same callback function */

// Change id
domKit.id = function( $element , id ) { $element.id = id ; } ;

// Like jQuery .text().
domKit.text = function( $element , text ) { $element.textContent = text ; } ;

// Like jQuery .html().
domKit.html = function( $element , html ) { $element.innerHTML = html ; } ;



}).call(this,require('_process'))
},{"@cronvel/xmldom":6,"_process":13}],8:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
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
(function (process,global,setImmediate){
/*
	Next-Gen Events

	Copyright (c) 2015 - 2019 Cédric Ronvel

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



// Some features needs a portable nextTick
const nextTick = process.browser ? window.setImmediate : process.nextTick ;



if ( ! global.__NEXTGEN_EVENTS__ ) {
	global.__NEXTGEN_EVENTS__ = {
		recursions: 0
	} ;
}

var globalData = global.__NEXTGEN_EVENTS__ ;



function NextGenEvents() {}
module.exports = NextGenEvents ;
NextGenEvents.prototype.__prototypeUID__ = 'nextgen-events/NextGenEvents' ;
NextGenEvents.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



/* Basic features, more or less compatible with Node.js */



NextGenEvents.SYNC = -Infinity ;
NextGenEvents.DESYNC = -1 ;

NextGenEvents.defaultMaxListeners = Infinity ;



// Not part of the prototype, because it should not pollute userland's prototype.
// It has an eventEmitter as 'this' anyway (always called using call()).
NextGenEvents.init = function() {
	Object.defineProperty( this , '__ngev' , {
		configurable: true ,
		value: new NextGenEvents.Internal()
	} ) ;
} ;



NextGenEvents.Internal = function( from ) {
	this.nice = NextGenEvents.SYNC ;
	this.interruptible = false ;
	this.contexts = {} ;
	this.desync = setImmediate ;
	this.depth = 0 ;

	// States by events
	this.states = {} ;

	// State groups by events
	this.stateGroups = {} ;

	// Listeners by events
	this.listeners = {
		// Special events
		error: [] ,
		interrupt: [] ,
		newListener: [] ,
		removeListener: []
	} ;

	this.hasListenerPriority = false ;
	this.maxListeners = NextGenEvents.defaultMaxListeners ;

	if ( from ) {
		this.nice = from.nice ;
		this.interruptible = from.interruptible ;
		Object.assign( this.states , from.states ) ,
		Object.assign( this.stateGroups , from.stateGroups ) ,

		Object.keys( from.listeners ).forEach( eventName => {
			this.listeners[ eventName ] = from.listeners[ eventName ].slice() ;
		} ) ;

		// Copy all contexts
		Object.keys( from.contexts ).forEach( contextName => {
			var context = from.contexts[ contextName ] ;
			this.contexts[ contextName ] = {
				nice: context.nice ,
				ready: true ,
				status: context.status ,
				serial: context.serial ,
				scopes: {}
			} ;
		} ) ;
	}
} ;



NextGenEvents.initFrom = function( from ) {
	if ( ! from.__ngev ) { NextGenEvents.init.call( from ) ; }

	Object.defineProperty( this , '__ngev' , {
		configurable: true ,
		value: new NextGenEvents.Internal( from.__ngev )
	} ) ;
} ;



/*
	Merge listeners of duplicated event bus:
		* listeners that are present locally but not in all foreigner are removed (one of the foreigner has removed it)
		* listeners that are not present locally but present in at least one foreigner are copied

	Not sure if it will ever go public, it was a very specific use-case (Spellcast).
*/
NextGenEvents.mergeListeners = function( foreigners ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	// Backup the current listeners...
	var oldListeners = this.__ngev.listeners ;


	// Reset listeners...
	this.__ngev.listeners = {} ;

	Object.keys( oldListeners ).forEach( eventName => {
		this.__ngev.listeners[ eventName ] = [] ;
	} ) ;

	foreigners.forEach( foreigner => {
		if ( ! foreigner.__ngev ) { NextGenEvents.init.call( foreigner ) ; }

		Object.keys( foreigner.__ngev.listeners ).forEach( eventName => {
			if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }
		} ) ;
	} ) ;


	// Now we can scan by eventName first
	Object.keys( this.__ngev.listeners ).forEach( eventName => {

		var i , iMax , blacklist = [] ;

		// First pass: find all removed listeners and add them to the blacklist
		if ( oldListeners[ eventName ] ) {
			oldListeners[ eventName ].forEach( listener => {
				for ( i = 0 , iMax = foreigners.length ; i < iMax ; i ++ ) {
					if (
						! foreigners[ i ].__ngev.listeners[ eventName ] ||
						foreigners[ i ].__ngev.listeners[ eventName ].indexOf( listener ) === -1
					) {
						blacklist.push( listener ) ;
						break ;
					}
				}
			} ) ;
		}

		// Second pass: add all listeners still not present and that are not blacklisted
		foreigners.forEach( foreigner => {

			foreigner.__ngev.listeners[ eventName ].forEach( listener => {
				if ( this.__ngev.listeners[ eventName ].indexOf( listener ) === -1 && blacklist.indexOf( listener ) === -1 ) {
					this.__ngev.listeners[ eventName ].push( listener ) ;
				}
			} ) ;
		} ) ;
	} ) ;
} ;



// Use it with .bind()
NextGenEvents.filterOutCallback = function( what , currentElement ) { return what !== currentElement ; } ;



// .addListener( eventName , [fn] , [options] )
NextGenEvents.prototype.addListener = function( eventName , fn , options ) {
	var listener , newListenerListeners ;

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

	// Argument management
	if ( ! eventName || typeof eventName !== 'string' ) {
		throw new TypeError( ".addListener(): argument #0 should be a non-empty string" ) ;
	}

	if ( typeof fn === 'function' ) {
		listener = {} ;

		if ( ! options || typeof options !== 'object' ) { options = {} ; }
	}
	else if ( options === true && fn && typeof fn === 'object' ) {
		// We want to use the current object as the listener object (used by Spellcast's serializer)
		options = listener = fn ;
		fn = undefined ;
	}
	else {
		options = fn ;

		if ( ! options || typeof options !== 'object' ) {
			throw new TypeError( ".addListener(): a function or an object with a 'fn' property which value is a function should be provided" ) ;
		}

		fn = undefined ;
		listener = {} ;
	}


	listener.fn = fn || options.fn ;
	listener.id = options.id !== undefined ? options.id : listener.fn ;
	listener.once = !! options.once ;
	listener.async = !! options.async ;
	listener.eventObject = !! options.eventObject ;
	listener.nice = options.nice !== undefined ? Math.floor( options.nice ) : NextGenEvents.SYNC ;
	listener.priority = + options.priority || 0 ;
	listener.context = options.context && ( typeof options.context === 'string' || typeof options.context === 'object' ) ? options.context : null ;

	if ( typeof listener.fn !== 'function' ) {
		throw new TypeError( ".addListener(): a function or an object with a 'fn' property which value is a function should be provided" ) ;
	}

	// Implicit context creation
	if ( typeof listener.context === 'string' ) {
		listener.context = this.__ngev.contexts[ listener.context ] || this.addListenerContext( listener.context ) ;
	}

	// Note: 'newListener' and 'removeListener' event return an array of listener, but not the event name.
	// So the event's name can be retrieved in the listener itself.
	listener.event = eventName ;

	if ( this.__ngev.listeners.newListener.length ) {
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

	if ( this.__ngev.hasListenerPriority ) {
		// order higher priority first
		this.__ngev.listeners[ eventName ].sort( ( a , b ) => b.priority - a.priority ) ;
	}

	if ( this.__ngev.listeners[ eventName ].length === this.__ngev.maxListeners + 1 ) {
		process.emitWarning(
			"Possible NextGenEvents memory leak detected. " + this.__ngev.listeners[ eventName ].length + ' ' +
			eventName + " listeners added. Use emitter.setMaxListeners() to increase limit" ,
			{ type: "MaxListenersExceededWarning" }
		) ;
	}

	if ( this.__ngev.states[ eventName ] ) { NextGenEvents.emitToOneListener( this.__ngev.states[ eventName ] , listener ) ; }

	return this ;
} ;

NextGenEvents.prototype.on = NextGenEvents.prototype.addListener ;



// Short-hand
// .once( eventName , [fn] , [options] )
NextGenEvents.prototype.once = function( eventName , fn , options ) {
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }

	return this.addListener( eventName , fn , options ) ;
} ;



// .waitFor( eventName )
// A Promise-returning .once() variant, only the first arg is returned
NextGenEvents.prototype.waitFor = function( eventName ) {
	return new Promise( resolve => {
		this.addListener( eventName , ( firstArg ) => resolve( firstArg ) , { once: true } ) ;
	} ) ;
} ;



// .waitForAll( eventName )
// A Promise-returning .once() variant, all args are returned as an array
NextGenEvents.prototype.waitForAll = function( eventName ) {
	return new Promise( resolve => {
		this.addListener( eventName , ( ... args ) => resolve( args ) , { once: true } ) ;
	} ) ;
} ;



NextGenEvents.prototype.removeListener = function( eventName , id ) {
	var i , length , newListeners = [] , removedListeners = [] ;

	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeListener(): argument #0 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

	length = this.__ngev.listeners[ eventName ].length ;

	// It's probably faster to create a new array of listeners
	for ( i = 0 ; i < length ; i ++ ) {
		if ( this.__ngev.listeners[ eventName ][ i ].id === id ) {
			removedListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
		}
		else {
			newListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
		}
	}

	this.__ngev.listeners[ eventName ] = newListeners ;

	if ( removedListeners.length && this.__ngev.listeners.removeListener.length ) {
		this.emit( 'removeListener' , removedListeners ) ;
	}

	return this ;
} ;

NextGenEvents.prototype.off = NextGenEvents.prototype.removeListener ;



NextGenEvents.prototype.removeAllListeners = function( eventName ) {
	var removedListeners ;

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	if ( eventName ) {
		// Remove all listeners for a particular event

		if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".removeAllListeners(): argument #0 should be undefined or a non-empty string" ) ; }

		if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

		removedListeners = this.__ngev.listeners[ eventName ] ;
		this.__ngev.listeners[ eventName ] = [] ;

		if ( removedListeners.length && this.__ngev.listeners.removeListener.length ) {
			this.emit( 'removeListener' , removedListeners ) ;
		}
	}
	else {
		// Remove all listeners for any events
		// 'removeListener' listeners cannot be triggered: they are already deleted
		this.__ngev.listeners = {
			// Special events
			error: [] ,
			interrupt: [] ,
			newListener: [] ,
			removeListener: []
		} ;
	}

	return this ;
} ;



NextGenEvents.listenerWrapper = function( listener , event , contextScope , serial , nice ) {
	var returnValue , listenerCallback ,
		eventMaster = event.master || event ,
		interruptible = !! event.master || event.emitter.__ngev.interruptible ;

	if ( eventMaster.interrupt ) { return ; }

	if ( listener.async ) {
		if ( contextScope ) {
			contextScope.ready = ! serial ;
		}

		if ( nice < 0 ) {
			if ( globalData.recursions >= -nice ) {
				event.emitter.__ngev.desync( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) ) ;
				return ;
			}
		}
		else {
			setTimeout( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) , nice ) ;
			return ;
		}

		listenerCallback = ( arg ) => {

			eventMaster.listenersDone ++ ;

			// Async interrupt
			if ( arg && interruptible && ! eventMaster.interrupt && event.name !== 'interrupt' ) {
				eventMaster.interrupt = arg ;

				if ( eventMaster.callback ) { NextGenEvents.emitCallback( event ) ; }

				event.emitter.emit( 'interrupt' , eventMaster.interrupt ) ;
			}
			else if ( eventMaster.listenersDone >= eventMaster.listeners.length && eventMaster.callback ) {
				NextGenEvents.emitCallback( event ) ;
			}

			// Process the queue if serialized
			if ( serial ) { NextGenEvents.processScopeQueue( contextScope , true , true ) ; }
		} ;

		if ( listener.eventObject ) { listener.fn( event , listenerCallback ) ; }
		else { returnValue = listener.fn( ... event.args , listenerCallback ) ; }
	}
	else {
		if ( nice < 0 ) {
			if ( globalData.recursions >= -nice ) {
				event.emitter.__ngev.desync( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) ) ;
				return ;
			}
		}
		else {
			setTimeout( NextGenEvents.listenerWrapper.bind( undefined , listener , event , contextScope , serial , NextGenEvents.SYNC ) , nice ) ;
			return ;
		}

		if ( listener.eventObject ) { listener.fn( event ) ; }
		else { returnValue = listener.fn( ... event.args ) ; }

		eventMaster.listenersDone ++ ;
	}

	// Interrupt if non-falsy return value, if the emitter is interruptible, not already interrupted (emit once),
	// and not within an 'interrupt' event.
	if ( returnValue && interruptible && ! eventMaster.interrupt && event.name !== 'interrupt' ) {
		eventMaster.interrupt = returnValue ;

		if ( eventMaster.callback ) { NextGenEvents.emitCallback( event ) ; }

		event.emitter.emit( 'interrupt' , eventMaster.interrupt ) ;
	}
	else if ( eventMaster.listenersDone >= eventMaster.listeners.length && eventMaster.callback ) {
		NextGenEvents.emitCallback( event ) ;
	}
} ;



// A unique event ID
var nextEventId = 0 ;



/*
	emit( [nice] , eventName , [arg1] , [arg2] , [...] , [emitCallback] )
*/
NextGenEvents.prototype.emit = function( ... args ) {
	var event = NextGenEvents.createEvent( this , ... args ) ;
	return NextGenEvents.emitEvent( event ) ;
} ;



NextGenEvents.prototype.waitForEmit = function( ... args ) {
	return new Promise( resolve => {
		this.emit( ... args , ( interrupt ) => resolve( interrupt ) ) ;
	} ) ;
} ;



// Create an event object
NextGenEvents.createEvent = function( emitter , ... args ) {
	var event = {
		emitter: emitter ,
		interrupt: null ,
		master: null ,	// For grouped-correlated events
		sync: true
	} ;

	// Arguments handling
	if ( typeof args[ 0 ] === 'number' ) {
		event.nice = Math.floor( args[ 0 ] ) ;
		event.name = args[ 1 ] ;

		if ( ! event.name || typeof event.name !== 'string' ) {
			throw new TypeError( ".emit(): when argument #0 is a number, argument #1 should be a non-empty string" ) ;
		}

		if ( typeof args[ args.length - 1 ] === 'function' ) {
			event.callback = args[ args.length - 1 ] ;
			event.args = args.slice( 2 , -1 ) ;
		}
		else {
			event.args = args.slice( 2 ) ;
		}
	}
	else {
		//event.nice = emitter.__ngev.nice ;
		event.name = args[ 0 ] ;

		if ( ! event.name || typeof event.name !== 'string' ) {
			throw new TypeError( ".emit(): argument #0 should be an number or a non-empty string" ) ;
		}

		if ( typeof args[ args.length - 1 ] === 'function' ) {
			event.callback = args[ args.length - 1 ] ;
			event.args = args.slice( 1 , -1 ) ;
		}
		else {
			event.args = args.slice( 1 ) ;
		}
	}

	return event ;
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
NextGenEvents.emitEvent = function( event ) {
	// /!\ Any change here *MUST* be reflected to NextGenEvents.emitIntricatedEvents() /!\
	var self = event.emitter ,
		i , iMax , count = 0 , state , removedListeners ;

	if ( ! self.__ngev ) { NextGenEvents.init.call( self ) ; }

	state = self.__ngev.states[ event.name ] ;

	// This is a state event, register it now!
	if ( state !== undefined ) {
		if ( state && event.args.length === state.args.length &&
			event.args.every( ( arg , index ) => arg === state.args[ index ] ) ) {
			// The emitter is already in this exact state, skip it now!
			return ;
		}

		// Unset all states of that group
		self.__ngev.stateGroups[ event.name ].forEach( ( eventName ) => {
			self.__ngev.states[ eventName ] = null ;
		} ) ;

		self.__ngev.states[ event.name ] = event ;
	}

	if ( ! self.__ngev.listeners[ event.name ] ) { self.__ngev.listeners[ event.name ] = [] ; }

	event.id = nextEventId ++ ;
	event.listenersDone = 0 ;

	if ( event.nice === undefined || event.nice === null ) { event.nice = self.__ngev.nice ; }

	// Trouble arise when a listener is removed from another listener, while we are still in the loop.
	// So we have to COPY the listener array right now!
	if ( ! event.listeners ) { event.listeners = self.__ngev.listeners[ event.name ].slice() ; }

	// Increment globalData.recursions
	globalData.recursions ++ ;
	event.depth = self.__ngev.depth ++ ;
	removedListeners = [] ;

	try {
		// Emit the event to all listeners!
		for ( i = 0 , iMax = event.listeners.length ; i < iMax ; i ++ ) {
			count ++ ;
			NextGenEvents.emitToOneListener( event , event.listeners[ i ] , removedListeners ) ;
		}
	}
	catch ( error ) {
		// Catch error, just to decrement globalData.recursions, re-throw after that...
		globalData.recursions -- ;
		self.__ngev.depth -- ;
		throw error ;
	}

	// Decrement globalData.recursions
	globalData.recursions -- ;
	if ( ! event.callback ) { self.__ngev.depth -- ; }

	// Emit 'removeListener' after calling listeners
	if ( removedListeners.length && self.__ngev.listeners.removeListener.length ) {
		self.emit( 'removeListener' , removedListeners ) ;
	}


	// 'error' event is a special case: it should be listened for, or it will throw an error
	if ( ! count ) {
		if ( event.name === 'error' ) {
			if ( event.args[ 0 ] ) { throw event.args[ 0 ] ; }
			else { throw Error( "Uncaught, unspecified 'error' event." ) ; }
		}

		if ( event.callback ) { NextGenEvents.emitCallback( event ) ; }
	}

	// Leaving sync mode
	event.sync = false ;

	return event ;
} ;



/*
	Spellcast-specific:
	Send interruptible events with listener-priority across multiple emitters.
	If an event is interrupted, all event are interrupted too.
	It has limited feature-support: no state-event, no builtin-event (not even 'error').
*/
NextGenEvents.emitIntricatedEvents = function( array , callback ) {
	var i , iMax , count = 0 , removedListeners ;

	if ( ! Array.isArray( array ) ) {
		throw new TypeError( '.emitCorrelatedEvents() argument should be an array' ) ;
	}

	var listenerEventRows = [] ,
		context = {
			nice: NextGenEvents.DESYNC ,
			ready: true ,
			status: NextGenEvents.CONTEXT_ENABLED ,
			serial: true ,
			scopes: {}
		} ,
		master = {
			sync: false ,
			nice: NextGenEvents.DESYNC ,
			context ,
			interrupt: null ,
			listeners: listenerEventRows ,	// because we need eventMaster.listeners.length
			listenersDone: 0 ,
			depth: 0 ,
			callback
		} ;

	array.forEach( eventParams => {
		var event = NextGenEvents.createEvent( ... eventParams ) ;
		event.master = master ;

		if ( ! event.emitter.__ngev ) { NextGenEvents.init.call( event.emitter ) ; }

		if ( ! event.emitter.__ngev.listeners[ event.name ] ) { event.emitter.__ngev.listeners[ event.name ] = [] ; }
		event.listeners = event.emitter.__ngev.listeners[ event.name ].slice() ;

		event.id = nextEventId ++ ;
		//event.listenersDone = 0 ;
		//event.nice = master.nice ;

		event.listeners.forEach( listener => listenerEventRows.push( { event , listener } ) ) ;
	} ) ;


	// Sort listeners
	listenerEventRows.sort( ( a , b ) => b.listener.priority - a.listener.priority ) ;

	// Increment globalData.recursions
	globalData.recursions ++ ;

	removedListeners = [] ;

	try {
		// Emit the event to all listeners!
		for ( i = 0 , iMax = listenerEventRows.length ; i < iMax ; i ++ ) {
			count ++ ;
			NextGenEvents.emitToOneListener( listenerEventRows[ i ].event , listenerEventRows[ i ].listener , removedListeners ) ;
		}
	}
	catch ( error ) {
		// Catch error, just to decrement globalData.recursions, re-throw after that...
		globalData.recursions -- ;
		throw error ;
	}

	// Decrement globalData.recursions
	globalData.recursions -- ;

	if ( ! count && master.callback ) { NextGenEvents.emitCallback( event ) ; }

	// Leaving sync mode
	master.sync = false ;
} ;



// If removedListeners is not given, then one-time listener emit the 'removeListener' event,
// if given: that's the caller business to do it
NextGenEvents.emitToOneListener = function( event , listener , removedListeners ) {
	var self = event.emitter ,
		eventMaster = event.master || event ,
		context = event.master ? event.master.context : listener.context ,
		contextScope , serial , currentNice , emitRemoveListener = false ;

	if ( context ) {
		// If the listener context is disabled...
		if ( context.status === NextGenEvents.CONTEXT_DISABLED ) { return ; }

		// The nice value for this listener...
		currentNice = Math.max( eventMaster.nice , listener.nice , context.nice ) ;
		serial = context.serial ;
		contextScope = NextGenEvents.getContextScope( context , eventMaster.depth ) ;
	}
	else {
		currentNice = Math.max( eventMaster.nice , listener.nice ) ;
	}


	if ( listener.once ) {
		// We should remove the current listener RIGHT NOW because of recursive .emit() issues:
		// one listener may eventually fire this very same event synchronously during the current loop.
		self.__ngev.listeners[ event.name ] = self.__ngev.listeners[ event.name ].filter(
			NextGenEvents.filterOutCallback.bind( undefined , listener )
		) ;

		if ( removedListeners ) { removedListeners.push( listener ) ; }
		else { emitRemoveListener = true ; }
	}

	if ( context && ( context.status === NextGenEvents.CONTEXT_QUEUED || ! contextScope.ready ) ) {
		// Almost all works should be done by .emit(), and little few should be done by .processScopeQueue()
		contextScope.queue.push( { event: event , listener: listener , nice: currentNice } ) ;
	}
	else {
		NextGenEvents.listenerWrapper( listener , event , contextScope , serial , currentNice ) ;
	}

	// Emit 'removeListener' after calling the listener
	if ( emitRemoveListener && self.__ngev.listeners.removeListener.length ) {
		self.emit( 'removeListener' , [ listener ] ) ;
	}
} ;



NextGenEvents.emitCallback = function( event ) {
	var callback ;

	if ( event.master ) {
		callback = event.master.callback ;
		delete event.master.callback ;

		if ( event.master.sync ) {
			nextTick( () => callback( event.master.interrupt , event ) ) ;
		}
		else {
			callback( event.master.interrupt , event ) ;
		}

		return ;
	}

	callback = event.callback ;
	delete event.callback ;

	if ( event.sync && event.emitter.__ngev.nice !== NextGenEvents.SYNC ) {
		// Force desync if global nice value is not SYNC
		event.emitter.__ngev.desync( () => {
			event.emitter.__ngev.depth -- ;
			callback( event.interrupt , event ) ;
		} ) ;
	}
	else {
		event.emitter.__ngev.depth -- ;
		callback( event.interrupt , event ) ;
	}
} ;



NextGenEvents.prototype.listeners = function( eventName ) {
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listeners(): argument #0 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

	// Do not return the array, shallow copy it
	return this.__ngev.listeners[ eventName ].slice() ;
} ;



NextGenEvents.listenerCount = function( emitter , eventName ) {
	if ( ! emitter || ! ( emitter instanceof NextGenEvents ) ) { throw new TypeError( ".listenerCount(): argument #0 should be an instance of NextGenEvents" ) ; }
	return emitter.listenerCount( eventName ) ;
} ;



NextGenEvents.prototype.listenerCount = function( eventName ) {
	if ( ! eventName || typeof eventName !== 'string' ) { throw new TypeError( ".listenerCount(): argument #1 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

	return this.__ngev.listeners[ eventName ].length ;
} ;



NextGenEvents.prototype.setNice = function( nice ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.nice = Math.floor( + nice || 0 ) ;
} ;



NextGenEvents.prototype.desyncUseNextTick = function( useNextTick ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.desync = useNextTick ? nextTick : setImmediate ;
} ;



NextGenEvents.prototype.setInterruptible = function( isInterruptible ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.interruptible = !! isInterruptible ;
} ;



NextGenEvents.prototype.setListenerPriority = function( hasListenerPriority ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.hasListenerPriority = !! hasListenerPriority ;
} ;



// Make two objects share the same event bus
NextGenEvents.share = function( source , target ) {
	if ( ! ( source instanceof NextGenEvents ) || ! ( target instanceof NextGenEvents ) ) {
		throw new TypeError( 'NextGenEvents.share() arguments should be instances of NextGenEvents' ) ;
	}

	if ( ! source.__ngev ) { NextGenEvents.init.call( source ) ; }

	Object.defineProperty( target , '__ngev' , {
		configurable: true ,
		value: source.__ngev
	} ) ;
} ;



NextGenEvents.reset = function( emitter ) {
	Object.defineProperty( emitter , '__ngev' , {
		configurable: true ,
		value: null
	} ) ;
} ;



NextGenEvents.prototype.getMaxListeners = function() {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return this.__ngev.maxListeners ;
} ;



NextGenEvents.prototype.setMaxListeners = function( n ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	this.__ngev.maxListeners = typeof n === 'number' && ! Number.isNaN( n ) ? Math.floor( n ) : NextGenEvents.defaultMaxListeners ;
	return this ;
} ;



// Sometime useful as a no-op callback...
NextGenEvents.noop = () => undefined ;





/* Next Gen feature: states! */



// .defineStates( exclusiveState1 , [exclusiveState2] , [exclusiveState3] , ... )
NextGenEvents.prototype.defineStates = function( ... states ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	states.forEach( ( state ) => {
		this.__ngev.states[ state ] = null ;
		this.__ngev.stateGroups[ state ] = states ;
	} ) ;
} ;



NextGenEvents.prototype.hasState = function( state ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return !! this.__ngev.states[ state ] ;
} ;



NextGenEvents.prototype.getAllStates = function() {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return Object.keys( this.__ngev.states ).filter( e => this.__ngev.states[ e ] ) ;
} ;





/* Next Gen feature: groups! */



NextGenEvents.groupAddListener = function( emitters , eventName , fn , options ) {
	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	fn = fn || options.fn ;
	delete options.fn ;

	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;

	emitters.forEach( ( emitter ) => {
		emitter.addListener( eventName , fn.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;

NextGenEvents.groupOn = NextGenEvents.groupAddListener ;



// Once per emitter
NextGenEvents.groupOnce = function( emitters , eventName , fn , options ) {
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }

	return this.groupAddListener( emitters , eventName , fn , options ) ;
} ;



// A Promise-returning .groupOnce() variant, it returns an array with only the first arg for each emitter's event
NextGenEvents.groupWaitFor = function( emitters , eventName ) {
	return Promise.all( emitters.map( emitter => emitter.waitFor( eventName ) ) ) ;
} ;



// A Promise-returning .groupOnce() variant, it returns an array of array for each emitter's event
NextGenEvents.groupWaitForAll = function( emitters , eventName ) {
	return Promise.all( emitters.map( emitter => emitter.waitForAll( eventName ) ) ) ;
} ;



// Globally once, only one event could be emitted, by the first emitter to emit
NextGenEvents.groupOnceFirst = function( emitters , eventName , fn , options ) {
	var fnWrapper , triggered = false ;

	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	fn = fn || options.fn ;
	delete options.fn ;

	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;

	fnWrapper = ( ... args ) => {
		if ( triggered ) { return ; }
		triggered = true ;
		NextGenEvents.groupRemoveListener( emitters , eventName , options.id ) ;
		fn( ... args ) ;
	} ;

	emitters.forEach( ( emitter ) => {
		emitter.once( eventName , fnWrapper.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;



// A Promise-returning .groupOnceFirst() variant, only the first arg is returned
NextGenEvents.groupWaitForFirst = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceFirst( emitters , eventName , ( firstArg ) => resolve( firstArg ) ) ;
	} ) ;
} ;



// A Promise-returning .groupOnceFirst() variant, all args are returned as an array
NextGenEvents.groupWaitForFirstAll = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceFirst( emitters , eventName , ( ... args ) => resolve( args ) ) ;
	} ) ;
} ;



// Globally once, only one event could be emitted, by the last emitter to emit
NextGenEvents.groupOnceLast = function( emitters , eventName , fn , options ) {
	var fnWrapper , triggered = false , count = emitters.length ;

	// Manage arguments
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	fn = fn || options.fn ;
	delete options.fn ;

	// Preserve the listener ID, so groupRemoveListener() will work as expected
	options.id = options.id || fn ;

	fnWrapper = ( ... args ) => {
		if ( triggered ) { return ; }
		if ( -- count ) { return ; }

		// So this is the last emitter...

		triggered = true ;
		// No need to remove listeners: there are already removed anyway
		//NextGenEvents.groupRemoveListener( emitters , eventName , options.id ) ;
		fn( ... args ) ;
	} ;

	emitters.forEach( ( emitter ) => {
		emitter.once( eventName , fnWrapper.bind( undefined , emitter ) , options ) ;
	} ) ;
} ;



// A Promise-returning .groupGlobalWaitFor() variant, only the first arg is returned
NextGenEvents.groupWaitForLast = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceLast( emitters , eventName , ( firstArg ) => resolve( firstArg ) ) ;
	} ) ;
} ;



// A Promise-returning .groupGlobalWaitFor() variant, all args are returned as an array
NextGenEvents.groupWaitForLastAll = function( emitters , eventName ) {
	return new Promise( resolve => {
		NextGenEvents.groupOnceLast( emitters , eventName , ( ... args ) => resolve( args ) ) ;
	} ) ;
} ;



NextGenEvents.groupRemoveListener = function( emitters , eventName , id ) {
	emitters.forEach( ( emitter ) => {
		emitter.removeListener( eventName , id ) ;
	} ) ;
} ;

NextGenEvents.groupOff = NextGenEvents.groupRemoveListener ;



NextGenEvents.groupRemoveAllListeners = function( emitters , eventName ) {
	emitters.forEach( ( emitter ) => {
		emitter.removeAllListeners( eventName ) ;
	} ) ;
} ;



NextGenEvents.groupEmit = function( emitters , ... args ) {
	var eventName , nice , argStart = 1 , argEnd , count = emitters.length ,
		callback , callbackWrapper , callbackTriggered = false ;

	if ( typeof args[ args.length - 1 ] === 'function' ) {
		argEnd = -1 ;
		callback = args[ args.length - 1 ] ;

		callbackWrapper = ( interruption ) => {
			if ( callbackTriggered ) { return ; }

			if ( interruption ) {
				callbackTriggered = true ;
				callback( interruption ) ;
			}
			else if ( ! -- count ) {
				callbackTriggered = true ;
				callback() ;
			}
		} ;
	}

	if ( typeof args[ 0 ] === 'number' ) {
		argStart = 2 ;
		nice = typeof args[ 0 ] ;
	}

	eventName = args[ argStart - 1 ] ;
	args = args.slice( argStart , argEnd ) ;

	emitters.forEach( ( emitter ) => {
		NextGenEvents.emitEvent( {
			emitter: emitter ,
			name: eventName ,
			args: args ,
			nice: nice ,
			callback: callbackWrapper
		} ) ;
	} ) ;
} ;



NextGenEvents.groupWaitForEmit = function( emitters , ... args ) {
	return new Promise( resolve => {
		NextGenEvents.groupEmit( emitters , ... args , ( interrupt ) => resolve( interrupt ) ) ;
	} ) ;
} ;



NextGenEvents.groupDefineStates = function( emitters , ... args ) {
	emitters.forEach( ( emitter ) => {
		emitter.defineStates( ... args ) ;
	} ) ;
} ;



// Bad names, but since they make their way through the API documentation,
// it should be kept for backward compatibility, but they are DEPRECATED.
NextGenEvents.groupGlobalOnce = NextGenEvents.groupOnceFirst ;
NextGenEvents.groupGlobalOnceAll = NextGenEvents.groupOnceLast ;





/* Next Gen feature: contexts! */



NextGenEvents.CONTEXT_ENABLED = 0 ;
NextGenEvents.CONTEXT_DISABLED = 1 ;
NextGenEvents.CONTEXT_QUEUED = 2 ;



NextGenEvents.prototype.addListenerContext = function( contextName , options ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".addListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var context = this.__ngev.contexts[ contextName ] ;

	if ( ! context ) {
		context = this.__ngev.contexts[ contextName ] = {
			nice: NextGenEvents.SYNC ,
			ready: true ,
			status: NextGenEvents.CONTEXT_ENABLED ,
			serial: false ,
			scopes: {}
		} ;
	}

	if ( options.nice !== undefined ) { context.nice = Math.floor( options.nice ) ; }
	if ( options.status !== undefined ) { context.status = options.status ; }
	if ( options.serial !== undefined ) { context.serial = !! options.serial ; }

	return context ;
} ;



NextGenEvents.prototype.getListenerContext = function( contextName ) {
	return this.__ngev.contexts[ contextName ] ;
} ;



NextGenEvents.getContextScope = function( context , scopeName ) {
	var scope = context.scopes[ scopeName ] ;

	if ( ! scope ) {
		scope = context.scopes[ scopeName ] = {
			ready: true ,
			queue: []
		} ;
	}

	return scope ;
} ;



NextGenEvents.prototype.disableListenerContext = function( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_DISABLED ;

	return this ;
} ;



NextGenEvents.prototype.enableListenerContext = function( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".enableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	var context = this.__ngev.contexts[ contextName ] ;

	context.status = NextGenEvents.CONTEXT_ENABLED ;

	Object.values( context.scopes ).forEach( contextScope => {
		if ( contextScope.queue.length > 0 ) { NextGenEvents.processScopeQueue( contextScope , context.serial ) ; }
	} ) ;

	return this ;
} ;



NextGenEvents.prototype.queueListenerContext = function( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".queueListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_QUEUED ;

	return this ;
} ;



NextGenEvents.prototype.serializeListenerContext = function( contextName , value ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".serializeListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].serial = value === undefined ? true : !! value ;

	return this ;
} ;



NextGenEvents.prototype.setListenerContextNice = function( contextName , nice ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".setListenerContextNice(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].nice = Math.floor( nice ) ;

	return this ;
} ;



NextGenEvents.prototype.destroyListenerContext = function( contextName ) {
	var i , length , context , eventName , newListeners , removedListeners = [] ;

	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	context = this.__ngev.contexts[ contextName ] ;
	if ( ! context ) { return ; }

	for ( eventName in this.__ngev.listeners ) {
		newListeners = null ;
		length = this.__ngev.listeners[ eventName ].length ;

		for ( i = 0 ; i < length ; i ++ ) {
			if ( this.__ngev.listeners[ eventName ][ i ].context === context ) {
				newListeners = [] ;
				removedListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
			else if ( newListeners ) {
				newListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
		}

		if ( newListeners ) { this.__ngev.listeners[ eventName ] = newListeners ; }
	}

	delete this.__ngev.contexts[ contextName ] ;

	if ( removedListeners.length && this.__ngev.listeners.removeListener.length ) {
		this.emit( 'removeListener' , removedListeners ) ;
	}

	return this ;
} ;



NextGenEvents.processScopeQueue = function( contextScope , serial , isCompletionCallback ) {
	var job , event , eventMaster , emitter ;

	if ( isCompletionCallback ) { contextScope.ready = true ; }

	// Increment recursion
	globalData.recursions ++ ;

	while ( contextScope.ready && contextScope.queue.length ) {
		job = contextScope.queue.shift() ;
		event = job.event ;
		eventMaster = event.master || event ;
		emitter = event.emitter ;

		// This event has been interrupted, drop it now!
		if ( eventMaster.interrupt ) { continue ; }

		NextGenEvents.listenerWrapper( job.listener , event , contextScope , serial , job.nice ) ;
	}

	// Decrement recursion
	globalData.recursions -- ;
} ;



// Backup for the AsyncTryCatch
NextGenEvents.on = NextGenEvents.prototype.on ;
NextGenEvents.once = NextGenEvents.prototype.once ;
NextGenEvents.off = NextGenEvents.prototype.off ;



if ( global.AsyncTryCatch ) {
	NextGenEvents.prototype.asyncTryCatchId = global.AsyncTryCatch.NextGenEvents.length ;
	global.AsyncTryCatch.NextGenEvents.push( NextGenEvents ) ;

	if ( global.AsyncTryCatch.substituted ) {
		global.AsyncTryCatch.substitute() ;
	}
}



// Load Proxy AT THE END (circular require)
NextGenEvents.Proxy = require( './Proxy.js' ) ;


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"../package.json":12,"./Proxy.js":10,"_process":13,"timers":46}],10:[function(require,module,exports){
/*
	Next-Gen Events

	Copyright (c) 2015 - 2019 Cédric Ronvel

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



function Proxy() {
	this.localServices = {} ;
	this.remoteServices = {} ;
	this.nextAckId = 1 ;
}

module.exports = Proxy ;

var NextGenEvents = require( './NextGenEvents.js' ) ;
var MESSAGE_TYPE = 'NextGenEvents/message' ;

function noop() {}



// Backward compatibility
Proxy.create = ( ... args ) => new Proxy( ... args ) ;



// Add a local service accessible remotely
Proxy.prototype.addLocalService = function( id , emitter , options ) {
	this.localServices[ id ] = LocalService.create( this , id , emitter , options ) ;
	return this.localServices[ id ] ;
} ;



// Add a remote service accessible locally
Proxy.prototype.addRemoteService = function( id ) {
	this.remoteServices[ id ] = RemoteService.create( this , id ) ;
	return this.remoteServices[ id ] ;
} ;



// Destroy the proxy
Proxy.prototype.destroy = function() {
	Object.keys( this.localServices ).forEach( ( id ) => {
		this.localServices[ id ].destroy() ;
		delete this.localServices[ id ] ;
	} ) ;

	Object.keys( this.remoteServices ).forEach( ( id ) => {
		this.remoteServices[ id ].destroy() ;
		delete this.remoteServices[ id ] ;
	} ) ;

	this.receive = this.send = noop ;
} ;



// Push an event message.
Proxy.prototype.push = function( message ) {
	if (
		message.__type !== MESSAGE_TYPE ||
		! message.service || typeof message.service !== 'string' ||
		! message.event || typeof message.event !== 'string' ||
		! message.method
	) {
		return ;
	}

	switch ( message.method ) {
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

		default :
			return ;
	}
} ;



// This is the method to receive and decode data from the other side of the communication channel, most of time another proxy.
// In most case, this should be overwritten.
Proxy.prototype.receive = function( raw ) {
	this.push( raw ) ;
} ;



// This is the method used to send data to the other side of the communication channel, most of time another proxy.
// This MUST be overwritten in any case.
Proxy.prototype.send = function() {
	throw new Error( 'The send() method of the Proxy MUST be extended/overwritten' ) ;
} ;



/* Local Service */



function LocalService( proxy , id , emitter , options ) { return LocalService.create( proxy , id , emitter , options ) ; }
Proxy.LocalService = LocalService ;



LocalService.create = function( proxy , id , emitter , options ) {
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
		destroyed: { value: false , writable: true , enumerable: true }
	} ) ;

	return self ;
} ;



// Destroy a service
LocalService.prototype.destroy = function() {
	Object.keys( this.events ).forEach( ( eventName ) => {
		this.emitter.off( eventName , this.events[ eventName ] ) ;
		delete this.events[ eventName ] ;
	} ) ;

	this.emitter = null ;
	this.destroyed = true ;
} ;



// Remote want to emit on the local service
LocalService.prototype.receiveEmit = function( message ) {
	if ( this.destroyed || ! this.canEmit || ( message.ack && ! this.canAck ) ) { return ; }

	var event = {
		emitter: this.emitter ,
		name: message.event ,
		args: message.args || []
	} ;

	if ( message.ack ) {
		event.callback = ( interruption ) => {

			this.proxy.send( {
				__type: MESSAGE_TYPE ,
				service: this.id ,
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
LocalService.prototype.receiveListen = function( message ) {
	if ( this.destroyed || ! this.canListen || ( message.ack && ! this.canAck ) ) { return ; }

	if ( message.ack ) {
		if ( this.events[ message.event ] ) {
			if ( this.events[ message.event ].ack ) { return ; }

			// There is already an event, but not featuring ack, remove that listener now
			this.emitter.off( message.event , this.events[ message.event ] ) ;
		}

		this.events[ message.event ] = LocalService.forwardWithAck.bind( this ) ;
		this.events[ message.event ].ack = true ;
		this.emitter.on( message.event , this.events[ message.event ] , { eventObject: true , async: true } ) ;
	}
	else {
		if ( this.events[ message.event ] ) {
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
LocalService.prototype.receiveIgnore = function( message ) {
	if ( this.destroyed || ! this.canListen ) { return ; }

	if ( ! this.events[ message.event ] ) { return ; }

	this.emitter.off( message.event , this.events[ message.event ] ) ;
	this.events[ message.event ] = null ;
} ;



//
LocalService.prototype.receiveAckEvent = function( message ) {
	if (
		this.destroyed || ! this.canListen || ! this.canAck || ! message.ack ||
		! this.events[ message.event ] || ! this.events[ message.event ].ack
	) {
		return ;
	}

	this.internalEvents.emit( 'ack' , message ) ;
} ;



// Send an event from the local service to remote
LocalService.forward = function( event ) {
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
LocalService.forwardWithAck = function( event , callback ) {
	if ( this.destroyed ) { return ; }

	if ( ! event.callback ) {
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

	var onAck = ( message ) => {
		if ( triggered || message.ack !== ackId ) { return ; }	// Not our ack...
		//if ( message.event !== event ) { return ; }	// Do we care?
		triggered = true ;
		this.internalEvents.off( 'ack' , onAck ) ;
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



RemoteService.create = function( proxy , id ) {
	var self = Object.create( RemoteService.prototype , {
		proxy: { value: proxy , enumerable: true } ,
		id: { value: id , enumerable: true } ,
		// This is the emitter where everything is routed to
		emitter: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		internalEvents: { value: Object.create( NextGenEvents.prototype ) , writable: true , enumerable: true } ,
		events: { value: {} , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true }

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
RemoteService.prototype.destroy = function() {
	this.emitter.removeAllListeners() ;
	this.emitter = null ;
	Object.keys( this.events ).forEach( ( eventName ) => { delete this.events[ eventName ] ; } ) ;
	this.destroyed = true ;
} ;



// Local code want to emit to remote service
RemoteService.prototype.emit = function( eventName , ... args ) {
	if ( this.destroyed ) { return ; }

	var callback , ackId , triggered ;

	if ( typeof eventName === 'number' ) { throw new TypeError( 'Cannot emit with a nice value on a remote service' ) ; }

	if ( typeof args[ args.length - 1 ] !== 'function' ) {
		this.proxy.send( {
			__type: MESSAGE_TYPE ,
			service: this.id ,
			method: 'emit' ,
			event: eventName ,
			args: args
		} ) ;

		return ;
	}

	callback = args.pop() ;
	ackId = this.proxy.nextAckId ++ ;
	triggered = false ;

	var onAck = ( message ) => {
		if ( triggered || message.ack !== ackId ) { return ; }	// Not our ack...
		//if ( message.event !== event ) { return ; }	// Do we care?
		triggered = true ;
		this.internalEvents.off( 'ack' , onAck ) ;
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
RemoteService.prototype.addListener = function( eventName , fn , options ) {
	if ( this.destroyed ) { return ; }

	// Manage arguments the same way NextGenEvents#addListener() does
	if ( typeof fn !== 'function' ) { options = fn ; fn = undefined ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	options.fn = fn || options.fn ;

	this.emitter.addListener( eventName , options ) ;

	// No event was added...
	if ( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) { return ; }

	// If the event is successfully listened to and was not remotely listened...
	if ( options.async && this.events[ eventName ] !== EVENT_ACK ) {
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
	else if ( ! options.async && ! this.events[ eventName ] ) {
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
RemoteService.prototype.removeListener = function( eventName , id ) {
	if ( this.destroyed ) { return ; }

	this.emitter.removeListener( eventName , id ) ;

	// If no more listener are locally tied to with event and the event was remotely listened...
	if (
		( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) &&
		this.events[ eventName ]
	) {
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
RemoteService.prototype.receiveEvent = function( message ) {
	if ( this.destroyed || ! this.events[ message.event ] ) { return ; }

	var event = {
		emitter: this.emitter ,
		name: message.event ,
		args: message.args || []
	} ;

	if ( message.ack ) {
		event.callback = () => {

			this.proxy.send( {
				__type: MESSAGE_TYPE ,
				service: this.id ,
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
	if ( ! this.emitter.__ngev.listeners[ eventName ] || ! this.emitter.__ngev.listeners[ eventName ].length ) {
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
RemoteService.prototype.receiveAckEmit = function( message ) {
	if ( this.destroyed || ! message.ack || this.events[ message.event ] !== EVENT_ACK ) {
		return ;
	}

	this.internalEvents.emit( 'ack' , message ) ;
} ;


},{"./NextGenEvents.js":9}],11:[function(require,module,exports){
(function (process){
/*
	Next-Gen Events

	Copyright (c) 2015 - 2019 Cédric Ronvel

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



if ( typeof window.setImmediate !== 'function' ) {
	window.setImmediate = fn => setTimeout( fn , 0 ) ;
}

if ( ! process.emitWarning ) {
	// Looks like browserify don't have this
	process.emitWarning = () => undefined ;
}

module.exports = require( './NextGenEvents.js' ) ;
module.exports.isBrowser = true ;


}).call(this,require('_process'))
},{"./NextGenEvents.js":9,"_process":13}],12:[function(require,module,exports){
module.exports={
  "_from": "nextgen-events@^1.2.1",
  "_id": "nextgen-events@1.3.0",
  "_inBundle": false,
  "_integrity": "sha512-eBz5mrO4Hw2eenPVm0AVPHuAzg/RZetAWMI547RH8O9+a0UYhCysiZ3KoNWslnWNlHetb9kzowEshsKsmFo2YQ==",
  "_location": "/nextgen-events",
  "_phantomChildren": {},
  "_requested": {
    "type": "range",
    "registry": true,
    "raw": "nextgen-events@^1.2.1",
    "name": "nextgen-events",
    "escapedName": "nextgen-events",
    "rawSpec": "^1.2.1",
    "saveSpec": null,
    "fetchSpec": "^1.2.1"
  },
  "_requiredBy": [
    "#USER",
    "/",
    "/server-kit",
    "/terminal-kit"
  ],
  "_resolved": "https://registry.npmjs.org/nextgen-events/-/nextgen-events-1.3.0.tgz",
  "_shasum": "a32665d1ab6f026448b19d75c4603ec20292fa22",
  "_spec": "nextgen-events@^1.2.1",
  "_where": "/home/cedric/inside/github/spellcast",
  "author": {
    "name": "Cédric Ronvel"
  },
  "bugs": {
    "url": "https://github.com/cronvel/nextgen-events/issues"
  },
  "bundleDependencies": false,
  "config": {
    "tea-time": {
      "coverDir": [
        "lib"
      ]
    }
  },
  "copyright": {
    "title": "Next-Gen Events",
    "years": [
      2015,
      2019
    ],
    "owner": "Cédric Ronvel"
  },
  "dependencies": {},
  "deprecated": false,
  "description": "The next generation of events handling for javascript! New: abstract away the network!",
  "devDependencies": {
    "browserify": "^16.2.2",
    "uglify-js-es6": "^2.8.9",
    "ws": "^5.1.1"
  },
  "directories": {
    "test": "test"
  },
  "engines": {
    "node": ">=6.0.0"
  },
  "homepage": "https://github.com/cronvel/nextgen-events#readme",
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
  "license": "MIT",
  "main": "lib/NextGenEvents.js",
  "name": "nextgen-events",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/cronvel/nextgen-events.git"
  },
  "scripts": {
    "test": "tea-time -R dot"
  },
  "version": "1.3.0"
}

},{}],13:[function(require,module,exports){
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
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":15,"./encode":16}],18:[function(require,module,exports){
(function (process,global){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":13}],19:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



var Promise = require( './seventh.js' ) ;



Promise.promisifyNodeApi = ( api , suffix , multiSuffix , filter , anything ) => {
	var keys ;

	suffix = suffix || 'Async' ;
	multiSuffix = multiSuffix || 'AsyncAll' ;
	filter = filter || ( key => key[ 0 ] !== '_' && ! key.endsWith( 'Sync' ) ) ;

	if ( anything ) {
		keys = [] ;

		for ( let key in api ) {
			if ( typeof api[ key ] === 'function' ) { keys.push( key ) ; }
		}
	}
	else {
		keys = Object.keys( api ) ;
	}

	keys.filter( key => {
		if ( typeof api[ key ] !== 'function' ) { return false ; }

		// If it has any enumerable properties on its prototype, it's a constructor
		for ( let trash in api[ key ].prototype ) { return false ; }

		return filter( key , api ) ;
	} )
		.forEach( key => {
			const targetKey = key + suffix ;
			const multiTargetKey = key + multiSuffix ;

			// Do nothing if it already exists
			if ( ! api[ targetKey ] ) {
				api[ targetKey ] = Promise.promisify( api[ key ] , api ) ;
			}

			if ( ! api[ multiTargetKey ] ) {
				api[ multiTargetKey ] = Promise.promisifyAll( api[ key ] , api ) ;
			}
		} ) ;
} ;



Promise.promisifyAnyNodeApi = ( api , suffix , multiSuffix , filter ) => {
	Promise.promisifyNodeApi( api , suffix , multiSuffix , filter , true ) ;
} ;



},{"./seventh.js":25}],20:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



var Promise = require( './seventh.js' ) ;



// This object is used as a special unique value for array hole (see Promise.filter())
const HOLE = {} ;

function noop() {}



Promise.all = ( iterable ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		allPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then(
					value_ => {
						if ( settled ) { return ; }

						values[ promiseIndex ] = value_ ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							allPromise._resolveValue( values ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						allPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		allPromise._resolveValue( values ) ;
	}

	return allPromise ;
} ;



// Maybe faster, but can't find any reasonable grounds for that ATM
//Promise.all =
Promise._allArray = ( iterable ) => {
	var length = iterable.length ;

	if ( ! length ) { Promise._resolveValue( [] ) ; }

	var index ,
		runtime = {
			settled: false ,
			count: 0 ,
			length: length ,
			values: [] ,
			allPromise: new Promise()
		} ;

	for ( index = 0 ; ! runtime.settled && index < length ; index ++ ) {
		Promise._allArrayOne( iterable[ index ] , index , runtime ) ;
	}

	return runtime.allPromise ;
} ;



// internal for allArray
Promise._allArrayOne = ( value , index , runtime ) => {
	Promise._bareThen( value ,
		value_ => {
			if ( runtime.settled ) { return ; }

			runtime.values[ index ] = value_ ;
			runtime.count ++ ;

			if ( runtime.count >= runtime.length ) {
				runtime.settled = true ;
				runtime.allPromise._resolveValue( runtime.values ) ;
			}
		} ,
		error => {
			if ( runtime.settled ) { return ; }
			runtime.settled = true ;
			runtime.allPromise.reject( error ) ;
		}
	) ;
} ;


// Promise.all() with an iterator
Promise.every =
Promise.map = ( iterable , iterator ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		allPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					return iterator( value_ , promiseIndex ) ;
				} )
				.then(
					value_ => {
						if ( settled ) { return ; }

						values[ promiseIndex ] = value_ ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							allPromise._resolveValue( values ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						allPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		allPromise._resolveValue( values ) ;
	}

	return allPromise ;
} ;



/*
	It works symmetrically with Promise.all(), the resolve and reject logic are switched.
	Therefore, it resolves to the first resolving promise OR reject if all promises are rejected
	with, as a reason, the array of all promise rejection reasons.
*/
Promise.any = ( iterable ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value ,
		errors = [] ,
		anyPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then(
					value_ => {
						if ( settled ) { return ; }

						settled = true ;
						anyPromise._resolveValue( value_ ) ;
					} ,
					error => {
						if ( settled ) { return ; }

						errors[ promiseIndex ] = error ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							anyPromise.reject( errors ) ;
						}
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		anyPromise.reject( new RangeError( 'Promise.any(): empty array' ) ) ;
	}

	return anyPromise ;
} ;



// Like Promise.any() but with an iterator
Promise.some = ( iterable , iterator ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value ,
		errors = [] ,
		anyPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					return iterator( value_ , promiseIndex ) ;
				} )
				.then(
					value_ => {
						if ( settled ) { return ; }

						settled = true ;
						anyPromise._resolveValue( value_ ) ;
					} ,
					error => {
						if ( settled ) { return ; }

						errors[ promiseIndex ] = error ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							anyPromise.reject( errors ) ;
						}
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		anyPromise.reject( new RangeError( 'Promise.any(): empty array' ) ) ;
	}

	return anyPromise ;
} ;



/*
	More closed to Array#filter().
	The iterator should return truthy if the array element should be kept,
	or falsy if the element should be filtered out.
	Any rejection reject the whole promise.
*/
Promise.filter = ( iterable , iterator ) => {
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		filterPromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		index ++ ;

		// Create a scope to keep track of the promise's own index
		( () => {
			const promiseIndex = index ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					values[ promiseIndex ] = value_ ;
					return iterator( value_ , promiseIndex ) ;
				} )
				.then(
					iteratorValue => {
						if ( settled ) { return ; }

						count ++ ;

						if ( ! iteratorValue ) { values[ promiseIndex ] = HOLE ; }

						if ( count >= length ) {
							settled = true ;
							values = values.filter( e => e !== HOLE ) ;
							filterPromise._resolveValue( values ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						filterPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	length = index + 1 ;

	if ( ! length ) {
		filterPromise._resolveValue( values ) ;
	}
	else if ( count >= length ) {
		settled = true ;
		values = values.filter( e => e !== HOLE ) ;
		filterPromise._resolveValue( values ) ;
	}

	return filterPromise ;
} ;



// forEach performs reduce as well, if a third argument is supplied
// Force a function statement because we are using arguments.length, so we can support accumulator equals to undefined
Promise.foreach =
Promise.forEach = function( iterable , iterator , accumulator ) {
	var index = -1 ,
		isReduce = arguments.length >= 3 ,
		it = iterable[Symbol.iterator]() ,
		forEachPromise = new Promise() ,
		lastPromise = Promise.resolve( accumulator ) ;

	// The array-like may contains promises that could be rejected before being handled
	if ( Promise.warnUnhandledRejection ) { Promise._handleAll( iterable ) ; }

	var nextElement = () => {
		lastPromise.then(
			accumulator_ => {
				let { value , done } = it.next() ;
				index ++ ;

				if ( done ) {
					forEachPromise.resolve( accumulator_ ) ;
				}
				else {
					lastPromise = Promise.resolve( value ).then(
						isReduce ?
							value_ => iterator( accumulator_ , value_ , index ) :
							value_ => iterator( value_ , index )
					) ;

					nextElement() ;
				}
			} ,
			error => {
				forEachPromise.reject( error ) ;

				// We have to eat all remaining promise errors
				for ( ;; ) {
					let { value , done } = it.next() ;
					if ( done ) { break ; }

					//if ( ( value instanceof Promise ) || ( value instanceof NativePromise ) )
					if ( Promise.isThenable( value ) ) {
						value.then( noop , noop ) ;
					}
				}
			}
		) ;
	} ;

	nextElement() ;

	return forEachPromise ;
} ;



Promise.reduce = ( iterable , iterator , accumulator ) => {
	// Force 3 arguments
	return Promise.forEach( iterable , iterator , accumulator ) ;
} ;



/*
	Same than map, but iterate over an object and produce an object.
	Think of it as a kind of Object#map() (which of course does not exist).
*/
Promise.mapObject = ( inputObject , iterator ) => {
	var settled = false ,
		count = 0 ,
		i , key , keys = Object.keys( inputObject ) ,
		length = keys.length ,
		value , outputObject = {} ,
		mapPromise = new Promise() ;

	for ( i = 0 ; ! settled && i < length ; i ++ ) {
		key = keys[ i ] ;
		value = inputObject[ key ] ;

		// Create a scope to keep track of the promise's own key
		( () => {
			const promiseKey = key ;

			Promise.resolve( value )
				.then( value_ => {
					if ( settled ) { return ; }
					return iterator( value_ , promiseKey ) ;
				} )
				.then(
					value_ => {
						if ( settled ) { return ; }

						outputObject[ promiseKey ] = value_ ;
						count ++ ;

						if ( count >= length ) {
							settled = true ;
							mapPromise._resolveValue( outputObject ) ;
						}
					} ,
					error => {
						if ( settled ) { return ; }
						settled = true ;
						mapPromise.reject( error ) ;
					}
				) ;
		} )() ;
	}

	if ( ! length ) {
		mapPromise._resolveValue( outputObject ) ;
	}

	return mapPromise ;
} ;



// Like map, but with a concurrency limit
Promise.concurrent = ( limit , iterable , iterator ) => {
	var index = -1 , settled = false ,
		running = 0 ,
		count = 0 , length = Infinity ,
		value , done = false ,
		values = [] ,
		it = iterable[Symbol.iterator]() ,
		concurrentPromise = new Promise() ;

	// The array-like may contains promises that could be rejected before being handled
	if ( Promise.warnUnhandledRejection ) { Promise._handleAll( iterable ) ; }

	limit = limit || 1 ;

	const runBatch = () => {
		while ( ! done && running < limit ) {

			//console.log( "Pre" , index ) ;
			( { value , done } = it.next() ) ;

			if ( done ) {
				length = index + 1 ;

				if ( count >= length ) {
					settled = true ;
					concurrentPromise._resolveValue( values ) ;
					return ;
				}
				break ;
			}

			if ( settled ) { break ; }

			index ++ ;

			// Create a scope to keep track of the promise's own index
			( () => {
				const promiseIndex = index ;

				running ++ ;
				//console.log( "Launch" , promiseIndex ) ;

				Promise.resolve( value )
					.then( value_ => {
						if ( settled ) { return ; }
						return iterator( value_ , promiseIndex ) ;
					} )
					.then(
						value_ => {
						//console.log( "Done" , promiseIndex , value_ ) ;
							if ( settled ) { return ; }

							values[ promiseIndex ] = value_ ;
							count ++ ;
							running -- ;

							//console.log( "count/length" , count , length ) ;
							if ( count >= length ) {
								settled = true ;
								concurrentPromise._resolveValue( values ) ;
								return ;
							}

							if ( running < limit ) {
								runBatch() ;
								return ;
							}
						} ,
						error => {
							if ( settled ) { return ; }
							settled = true ;
							concurrentPromise.reject( error ) ;
						}
					) ;
			} )() ;
		}
	} ;

	runBatch() ;

	if ( index < 0 ) {
		concurrentPromise._resolveValue( values ) ;
	}

	return concurrentPromise ;
} ;



/*
	Like native Promise.race(), it is hanging forever if the array is empty.
	It resolves or rejects to the first resolved/rejected promise.
*/
Promise.race = ( iterable ) => {
	var settled = false ,
		value ,
		racePromise = new Promise() ;

	for ( value of iterable ) {
		if ( settled ) { break ; }

		Promise.resolve( value )
			.then(
				value_ => {
					if ( settled ) { return ; }

					settled = true ;
					racePromise._resolveValue( value_ ) ;
				} ,
				error => {
					if ( settled ) { return ; }

					settled = true ;
					racePromise.reject( error ) ;
				}
			) ;
	}

	return racePromise ;
} ;


},{"./seventh.js":25}],21:[function(require,module,exports){
(function (process,global,setImmediate){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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
	Prerequisite.
*/



const NativePromise = global.Promise ;

// Cross-platform next tick function
var nextTick ;

if ( ! process.browser ) {
	nextTick = process.nextTick ;
}
else {
	// Browsers suck, they don't have setImmediate() except IE/Edge.
	// A module is needed to emulate it.
	require( 'setimmediate' ) ;
	nextTick = setImmediate ;
}



/*
	Constructor.
*/



function Promise( fn ) {
	this.fn = fn ;
	this._then = Promise._dormantThen ;
	this.value = null ;
	this.thenHandlers = null ;
	this.handledRejection = null ;

	if ( this.fn ) {
		this._exec() ;
	}
}

module.exports = Promise ;



Promise.Native = NativePromise ;
Promise.warnUnhandledRejection = true ;



Promise.prototype._exec = function() {
	this._then = Promise._pendingThen ;

	try {
		this.fn(
			// Don't return anything, it would create nasty bugs! E.g.:
			// bad: error => this.reject( error_ )
			// good: error_ => { this.reject( error_ ) ; }
			result_ => { this.resolve( result_ ) ; } ,
			error_ => { this.reject( error_ ) ; }
		) ;
	}
	catch ( error ) {
		this.reject( error ) ;
	}
} ;



/*
	Resolve/reject and then-handlers management.
*/



Promise.prototype.resolve = Promise.prototype.fulfill = function( value ) {
	// Throw an error?
	if ( this._then.settled ) { return this ; }

	if ( Promise.isThenable( value ) ) {
		this._execThenPromise( value ) ;
		return this ;
	}

	return this._resolveValue( value ) ;
} ;



Promise.prototype._resolveValue = function( value ) {
	this._then = Promise._fulfilledThen ;
	this.value = value ;
	if ( this.thenHandlers && this.thenHandlers.length ) { this._execFulfillHandlers() ; }

	return this ;
} ;



// Faster on node v8.x
Promise.prototype._execThenPromise = function( thenPromise ) {
	try {
		thenPromise.then(
			result_ => { this.resolve( result_ ) ; } ,
			error_ => { this.reject( error_ ) ; }
		) ;
	}
	catch ( error ) {
		this.reject( error ) ;
	}
} ;



Promise.prototype.reject = function( error ) {
	// Throw an error?
	if ( this._then.settled ) { return this ; }

	this._then = Promise._rejectedThen ;
	this.value = error ;

	if ( this.thenHandlers && this.thenHandlers.length ) {
		this._execRejectionHandlers() ;
	}
	else if ( Promise.warnUnhandledRejection && ! this.handledRejection ) {
		this._unhandledRejection() ;
	}

	return this ;
} ;



Promise.prototype._execFulfillHandlers = function() {
	var i ,
		length = this.thenHandlers.length ;

	// Do cache the length, if a handler is synchronously added, it will be called on next tick
	for ( i = 0 ; i < length ; i += 3 ) {
		if ( this.thenHandlers[ i + 1 ] ) {
			this._execOneFulfillHandler( this.thenHandlers[ i ] , this.thenHandlers[ i + 1 ] ) ;
		}
		else {
			this.thenHandlers[ i ].resolve( this.value ) ;
		}
	}
} ;



// Faster on node v8.x?
//*
Promise.prototype._execOneFulfillHandler = function( promise , onFulfill ) {
	try {
		promise.resolve( onFulfill( this.value ) ) ;
	}
	catch ( error_ ) {
		promise.reject( error_ ) ;
	}
} ;
//*/



Promise.prototype._execRejectionHandlers = function() {
	var i ,
		length = this.thenHandlers.length ;

	// Do cache the length, if a handler is synchronously added, it will be called on next tick
	for ( i = 0 ; i < length ; i += 3 ) {
		if ( this.thenHandlers[ i + 2 ] ) {
			this._execOneRejectHandler( this.thenHandlers[ i ] , this.thenHandlers[ i + 2 ] ) ;
		}
		else {
			this.thenHandlers[ i ].reject( this.value ) ;
		}
	}
} ;



// Faster on node v8.x?
//*
Promise.prototype._execOneRejectHandler = function( promise , onReject ) {
	try {
		promise.resolve( onReject( this.value ) ) ;
	}
	catch ( error_ ) {
		promise.reject( error_ ) ;
	}
} ;
//*/



Promise.prototype.resolveTimeout = Promise.prototype.fulfillTimeout = function( time , result ) {
	setTimeout( () => this.resolve( result ) , time ) ;
} ;



Promise.prototype.rejectTimeout = function( time , error ) {
	setTimeout( () => this.reject( error ) , time ) ;
} ;



/*
	.then() variants depending on the state
*/



// .then() variant when the promise is dormant
Promise._dormantThen = function( onFulfill , onReject ) {
	if ( this.fn ) {
		// If this is a dormant promise, wake it up now!
		this._exec() ;

		// Return now, some sync stuff can change the status
		return this._then( onFulfill , onReject ) ;
	}

	var promise = new Promise() ;

	if ( ! this.thenHandlers ) {
		this.thenHandlers = [ promise , onFulfill , onReject ] ;
	}
	else {
		//this.thenHandlers.push( onFulfill ) ;
		this.thenHandlers[ this.thenHandlers.length ] = promise ;
		this.thenHandlers[ this.thenHandlers.length ] = onFulfill ;
		this.thenHandlers[ this.thenHandlers.length ] = onReject ;
	}

	return promise ;
} ;

Promise._dormantThen.settled = false ;



// .then() variant when the promise is pending
Promise._pendingThen = function( onFulfill , onReject ) {
	var promise = new Promise() ;

	if ( ! this.thenHandlers ) {
		this.thenHandlers = [ promise , onFulfill , onReject ] ;
	}
	else {
		//this.thenHandlers.push( onFulfill ) ;
		this.thenHandlers[ this.thenHandlers.length ] = promise ;
		this.thenHandlers[ this.thenHandlers.length ] = onFulfill ;
		this.thenHandlers[ this.thenHandlers.length ] = onReject ;
	}

	return promise ;
} ;

Promise._pendingThen.settled = false ;



// .then() variant when the promise is fulfilled
Promise._fulfilledThen = function( onFulfill ) {
	if ( ! onFulfill ) { return this ; }

	var promise = new Promise() ;

	// This handler should not fire in this code sync flow
	nextTick( () => {
		try {
			promise.resolve( onFulfill( this.value ) ) ;
		}
		catch ( error ) {
			promise.reject( error ) ;
		}
	} ) ;

	return promise ;
} ;

Promise._fulfilledThen.settled = true ;



// .then() variant when the promise is rejected
Promise._rejectedThen = function( onFulfill , onReject ) {
	if ( ! onReject ) { return this ; }

	this.handledRejection = true ;
	var promise = new Promise() ;

	// This handler should not fire in this code sync flow
	nextTick( () => {
		try {
			promise.resolve( onReject( this.value ) ) ;
		}
		catch ( error ) {
			promise.reject( error ) ;
		}
	} ) ;

	return promise ;
} ;

Promise._rejectedThen.settled = true ;



/*
	.then() and short-hands.
*/



Promise.prototype.then = function( onFulfill , onReject ) {
	return this._then( onFulfill , onReject ) ;
} ;



Promise.prototype.catch = function( onReject = () => undefined ) {
	return this._then( undefined , onReject ) ;
} ;



Promise.prototype.finally = function( onSettled ) {
	return this._then( onSettled , onSettled ) ;
} ;



Promise.prototype.tap = Promise.prototype.tapThen = function( onFulfill ) {
	this._then( onFulfill , undefined ) ;
	return this ;
} ;



Promise.prototype.tapCatch = function( onReject ) {
	this._then( undefined , onReject ) ;
	return this ;
} ;



Promise.prototype.tapFinally = function( onSettled ) {
	this._then( onSettled , onSettled ) ;
	return this ;
} ;



// Any unhandled error throw ASAP
Promise.prototype.fatal = function() {
	this._then( undefined , error => {
		// Throw async, otherwise it would be catched by .then()
		nextTick( () => { throw error ; } ) ;
	} ) ;
} ;



Promise.prototype.done = function( onFulfill , onReject ) {
	this._then( onFulfill , onReject ).fatal() ;
	return this ;
} ;



Promise.prototype.callback = function( cb ) {
	this._then(
		value => { cb( undefined , value ) ; } ,
		error => { cb( error ) ; }
	).fatal() ;

	return this ;
} ;



Promise.prototype.callbackAll = function( cb ) {
	this._then(
		values => {
			if ( Array.isArray( values ) ) { cb( undefined , ... values ) ; }
			else { cb( undefined , values ) ; }
		} ,
		error => { cb( error ) ; }
	).fatal() ;

	return this ;
} ;



/*
	The reverse of .callback(), it calls the function with a callback argument and return a promise that resolve or reject depending on that callback invocation.
	Usage:
		await Promise.callback( callback => myFunctionRelyingOnCallback( [arg1] , [arg2] , [...] , callback ) ;
*/
Promise.callback = function( fn ) {
	return new Promise( ( resolve , reject ) => {
		fn( ( error , arg ) => {
			if ( error ) { reject( error ) ; }
			else { resolve( arg ) ; }
		} ) ;
	} ) ;
} ;



Promise.callbackAll = function( fn ) {
	return new Promise( ( resolve , reject ) => {
		fn( ( error , ... args ) => {
			if ( error ) { reject( error ) ; }
			else { resolve( args ) ; }
		} ) ;
	} ) ;
} ;



Promise.prototype.toPromise =	// <-- DEPRECATED, use .propagate
Promise.prototype.propagate = function( promise ) {
	this._then(
		value => { promise.resolve( value ) ; } ,
		error => { promise.reject( error ) ; }
	) ;

	return this ;
} ;





/*
	Foreign promises facilities
*/



Promise.propagate = function( foreignPromise , promise ) {
	foreignPromise.then(
		value => { promise.resolve( value ) ; } ,
		error => { promise.reject( error ) ; }
	) ;

	return foreignPromise ;
} ;



Promise.finally = function( foreignPromise , onSettled ) {
	return foreignPromise.then( onSettled , onSettled ) ;
} ;





/*
	Static factories.
*/



Promise.resolve = Promise.fulfill = function( value ) {
	if ( Promise.isThenable( value ) ) { return Promise.fromThenable( value ) ; }
	return Promise._resolveValue( value ) ;
} ;



Promise._resolveValue = function( value ) {
	var promise = new Promise() ;
	promise._then = Promise._fulfilledThen ;
	promise.value = value ;
	return promise ;
} ;



Promise.reject = function( error ) {
	//return new Promise().reject( error ) ;
	var promise = new Promise() ;
	promise._then = Promise._rejectedThen ;
	promise.value = error ;
	return promise ;
} ;



Promise.resolveTimeout = Promise.fulfillTimeout = function( timeout , value ) {
	return new Promise( resolve => setTimeout( () => resolve( value ) , timeout ) ) ;
} ;



Promise.rejectTimeout = function( timeout , error ) {
	return new Promise( ( resolve , reject ) => setTimeout( () => reject( error ) , timeout ) ) ;
} ;



Promise.resolveNextTick = Promise.fulfillNextTick = function( value ) {
	return new Promise( resolve => nextTick( () => resolve( value ) ) ) ;
} ;



Promise.rejectNextTick = function( error ) {
	return new Promise( ( resolve , reject ) => nextTick( () => reject( error ) ) ) ;
} ;



// A dormant promise is activated the first time a then handler is assigned
Promise.dormant = function( fn ) {
	var promise = new Promise() ;
	promise.fn = fn ;
	return promise ;
} ;



// Try-catched Promise.resolve( fn() )
Promise.try = function( fn ) {
	try {
		return Promise.resolve( fn() ) ;
	}
	catch ( error ) {
		return Promise.reject( error ) ;
	}
} ;



/*
	Thenables.
*/



Promise.isThenable = function( value ) {
	return value && typeof value === 'object' && typeof value.then === 'function' ;
} ;



// We assume a thenable object here
Promise.fromThenable = function( thenable ) {
	if ( thenable instanceof Promise ) { return thenable ; }

	return new Promise( ( resolve , reject ) => {
		thenable.then(
			value => { resolve( value ) ; } ,
			error => { reject( error ) ; }
		) ;
	} ) ;
} ;



// When you just want a fast then() function out of anything, without any desync and unchainable
Promise._bareThen = function( value , onFulfill , onReject ) {
	//if ( Promise.isThenable( value ) )
	if( value && typeof value === 'object' ) {
		if ( value instanceof Promise ) {
			if ( value._then === Promise._fulfilledThen ) { onFulfill( value.value ) ; }
			else if ( value._then === Promise._rejectedThen ) { onReject( value.value ) ; }
			else { value._then( onFulfill , onReject ) ; }
		}
		else if ( typeof value.then === 'function' ) {
			value.then( onFulfill , onReject ) ;
		}
		else {
			onFulfill( value ) ;
		}
	}
	else {
		onFulfill( value ) ;
	}
} ;



/*
	Misc.
*/



// Internal usage, mark all promises as handled ahead of time, useful for series,
// because a warning would be displayed for unhandled rejection for promises that are not yet processed.
Promise._handleAll = function( iterable ) {
	var value ;

	for ( value of iterable ) {
		//if ( ( value instanceof Promise ) || ( value instanceof NativePromise ) )
		if ( Promise.isThenable( value ) ) {
			value.handledRejection = true ;
		}
	}
} ;



Promise.prototype._unhandledRejection = function() {
	// This promise is currently unhandled
	// If still unhandled at the end of the synchronous block of code,
	// output an error message.

	this.handledRejection = false ;

	// Don't know what is the correct way to inform node.js about that.
	// There is no doc about that, and emitting unhandledRejection,
	// does not produce what is expected.

	//process.emit( 'unhandledRejection' , this.value , this ) ;

	/*
	nextTick( () => {
		if ( this.handledRejection === false )
		{
			process.emit( 'unhandledRejection' , this.value , this ) ;
		}
	} ) ;
	*/

	// It looks like 'await' inside a 'try-catch' does not handle the promise soon enough -_-'
	//const nextTick_ = nextTick ;
	const nextTick_ = cb => setTimeout( cb , 0 ) ;

	//*
	if ( this.value instanceof Error ) {
		nextTick_( () => {
			if ( this.handledRejection === false ) {
				this.value.message = 'Unhandled promise rejection: ' + this.value.message ;
				console.error( this.value ) ;
			}
		} ) ;
	}
	else {
		// Avoid starting the stack trace in the nextTick()...
		let error_ = new Error( 'Unhandled promise rejection' ) ;
		nextTick_( () => {
			if ( this.handledRejection === false ) {
				console.error( error_ ) ;
				console.error( 'Rejection reason:' , this.value ) ;
			}
		} ) ;
	}
	//*/
} ;



Promise.prototype.getStatus = function() {
	switch ( this._then ) {
		case Promise._dormantThen :
			return 'dormant' ;
		case Promise._pendingThen :
			return 'pending' ;
		case Promise._fulfilledThen :
			return 'fulfilled' ;
		case Promise._rejectedThen :
			return 'rejected' ;
	}
} ;



Promise.prototype.inspect = function() {
	switch ( this._then ) {
		case Promise._dormantThen :
			return 'Promise { <DORMANT> }' ;
		case Promise._pendingThen :
			return 'Promise { <PENDING> }' ;
		case Promise._fulfilledThen :
			return 'Promise { <FULFILLED> ' + this.value + ' }' ;
		case Promise._rejectedThen :
			return 'Promise { <REJECTED> ' + this.value + ' }' ;
	}
} ;



// A shared dummy promise, when you just want to return an immediately thenable
Promise.resolved = Promise.dummy = Promise.resolve() ;





/*
	Browser specific.
*/



if ( process.browser ) {
	Promise.prototype.resolveAtAnimationFrame = function( value ) {
		window.requestAnimationFrame( () => this.resolve( value ) ) ;
	} ;

	Promise.prototype.rejectAtAnimationFrame = function( error ) {
		window.requestAnimationFrame( () => this.reject( error ) ) ;
	} ;

	Promise.resolveAtAnimationFrame = function( value ) {
		return new Promise( resolve => window.requestAnimationFrame( () => resolve( value ) ) ) ;
	} ;

	Promise.rejectAtAnimationFrame = function( error ) {
		return new Promise( ( resolve , reject ) => window.requestAnimationFrame( () => reject( error ) ) ) ;
	} ;
}


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"_process":13,"setimmediate":18,"timers":46}],22:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



var Promise = require( './seventh.js' ) ;



Promise.promisifyAll = ( nodeAsyncFn , thisBinding ) => {
	// Little optimization here to have a promisified function as fast as possible
	if ( thisBinding ) {
		return ( ... args ) => {
			return new Promise( ( resolve , reject ) => {
				nodeAsyncFn.call( thisBinding , ... args , ( error , ... cbArgs ) => {
					if ( error ) {
						if ( cbArgs.length && error instanceof Error ) { error.args = cbArgs ; }
						reject( error ) ;
					}
					else {
						resolve( cbArgs ) ;
					}
				} ) ;
			} ) ;
		} ;
	}

	return function( ... args ) {
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( this , ... args , ( error , ... cbArgs ) => {
				if ( error ) {
					if ( cbArgs.length && error instanceof Error ) { error.args = cbArgs ; }
					reject( error ) ;
				}
				else {
					resolve( cbArgs ) ;
				}
			} ) ;
		} ) ;
	} ;

} ;



// Same than .promisifyAll() but only return the callback args #1 instead of an array of args from #1 to #n
Promise.promisify = ( nodeAsyncFn , thisBinding ) => {
	// Little optimization here to have a promisified function as fast as possible
	if ( thisBinding ) {
		return ( ... args ) => {
			return new Promise( ( resolve , reject ) => {
				nodeAsyncFn.call( thisBinding , ... args , ( error , cbArg ) => {
					if ( error ) {
						if ( cbArg !== undefined && error instanceof Error ) { error.arg = cbArg ; }
						reject( error ) ;
					}
					else {
						resolve( cbArg ) ;
					}
				} ) ;
			} ) ;
		} ;
	}

	return function( ... args ) {
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( this , ... args , ( error , cbArg ) => {
				if ( error ) {
					if ( cbArg !== undefined && error instanceof Error ) { error.arg = cbArg ; }
					reject( error ) ;
				}
				else {
					resolve( cbArg ) ;
				}
			} ) ;
		} ) ;
	} ;
} ;



/*
	Pass a function that will be called every time the decoratee return something.
*/
Promise.returnValueInterceptor = ( interceptor , asyncFn , thisBinding ) => {
	return function( ... args ) {
		var returnVal = asyncFn.call( thisBinding || this , ... args ) ;
		interceptor( returnVal ) ;
		return returnVal ;
	} ;
} ;



/*
	Run only once, return always the same promise.
*/
Promise.once = ( asyncFn , thisBinding ) => {
	var triggered = false ;
	var result ;

	return function( ... args ) {
		if ( ! triggered ) {
			triggered = true ;
			result = asyncFn.call( thisBinding || this , ... args ) ;
		}

		return result ;
	} ;
} ;



/*
	The decoratee execution does not overlap, multiple calls are serialized.
*/
Promise.serialize = ( asyncFn , thisBinding ) => {
	var lastPromise = new Promise.resolve() ;

	return function( ... args ) {
		var promise = new Promise() ;

		lastPromise.finally( () => {
			Promise.propagate( asyncFn.call( thisBinding || this , ... args ) , promise ) ;
		} ) ;

		lastPromise = promise ;

		return promise ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress, but return the promise of the action in progress.
*/
Promise.debounce = ( asyncFn , thisBinding ) => {
	var inProgress = null ;

	const outWrapper = () => {
		inProgress = null ;
	} ;

	return function( ... args ) {
		if ( inProgress ) { return inProgress ; }

		inProgress = asyncFn.call( thisBinding || this , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



/*
	Like .debouce(), but the last promise is returned for some extra time after it resolved
*/
Promise.debounceDelay = ( delay , asyncFn , thisBinding ) => {
	var inProgress = null ;

	const outWrapper = () => {
		setTimeout( () => inProgress = null , delay ) ;
	} ;

	return function( ... args ) {
		if ( inProgress ) { return inProgress ; }

		inProgress = asyncFn.call( thisBinding || this , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress.
	Instead, the decoratee is called when finished once and only once, if it was tried one or more time during its progress.
	In case of multiple calls, the arguments of the last call will be used.
	The use case is .update()/.refresh()/.redraw() functions.
*/
Promise.debounceUpdate = ( asyncFn , thisBinding ) => {
	var inProgress = null ;
	var nextUpdateWith = null ;
	var nextUpdatePromise = null ;

	const outWrapper = () => {
		var args , sharedPromise ;

		inProgress = null ;

		if ( nextUpdateWith ) {
			args = nextUpdateWith ;
			nextUpdateWith = null ;
			sharedPromise = nextUpdatePromise ;
			nextUpdatePromise = null ;

			// Call the asyncFn again
			inProgress = asyncFn.call( ... args ) ;

			// Forward the result to the pending promise
			Promise.propagate( inProgress , sharedPromise ) ;

			// BTW, trigger again the outWrapper
			Promise.finally( inProgress , outWrapper ) ;

			return inProgress ;
		}
	} ;

	return function( ... args ) {
		var localThis = thisBinding || this ;

		if ( inProgress ) {
			if ( ! nextUpdatePromise ) { nextUpdatePromise = new Promise() ; }
			nextUpdateWith = [ localThis , ... args ] ;
			return nextUpdatePromise ;
		}

		inProgress = asyncFn.call( localThis , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



// Used to ensure that the sync is done immediately if not busy
Promise.NO_DELAY = {} ;

// Used to ensure that the sync is done immediately if not busy, but for the first of a batch
Promise.BATCH_NO_DELAY = {} ;

/*
	Debounce for synchronization algorithm.
	Get two functions, one for getting from upstream, one for a full sync with upstream (getting AND updating).
	No operation overlap for a given resourceId.
	Depending on the configuration, it is either like .debounce() or like .debounceUpdate().

	*Params:
		fn: the function
		thisBinding: the this binding, if any
		delay: the minimum delay between to call
			for get: nothing is done is the delay is not met, simply return the last promise
			for update/fullSync, it waits for that delay before synchronizing again
		onDebounce: *ONLY* for GET ATM, a callback called when debounced
*/
Promise.debounceSync = ( getParams , fullSyncParams ) => {
	var perResourceData = new Map() ;

	const getResourceData = resourceId => {
		var resourceData = perResourceData.get( resourceId ) ;

		if ( ! resourceData ) {
			resourceData = {
				inProgress: null ,
				inProgressIsFull: null ,
				last: null ,				// Get or full sync promise
				lastTime: null ,			// Get or full sync time
				lastFullSync: null ,		// last full sync promise
				lastFullSyncTime: null ,	// last full sync time
				nextFullSyncPromise: null ,	// the promise for the next fullSync iteration
				nextFullSyncWith: null , 	// the 'this' and arguments for the next fullSync iteration
				noDelayBatches: new Set()		// only the first of the batch has no delay
			} ;

			perResourceData.set( resourceId , resourceData ) ;
		}

		return resourceData ;
	} ;


	const outWrapper = ( resourceData , level ) => {
		// level 2: fullSync, 1: get, 0: nothing but a delay
		var delta , args , sharedPromise , now = new Date() ;
		//lastTime = resourceData.lastTime , lastFullSyncTime = resourceData.lastFullSyncTime ;

		resourceData.inProgress = null ;

		if ( level >= 2 ) { resourceData.lastFullSyncTime = resourceData.lastTime = now ; }
		else if ( level >= 1 ) { resourceData.lastTime = now ; }

		if ( resourceData.nextFullSyncWith ) {
			if ( fullSyncParams.delay && resourceData.lastFullSyncTime && ( delta = now - resourceData.lastFullSyncTime - fullSyncParams.delay ) < 0 ) {
				resourceData.inProgress = Promise.resolveTimeout( -delta + 1 ) ;	// Strangely, sometime it is trigerred 1ms too soon
				resourceData.inProgress.finally( () => outWrapper( resourceData , 0 ) ) ;
				return resourceData.nextFullSyncPromise ;
			}

			args = resourceData.nextFullSyncWith ;
			resourceData.nextFullSyncWith = null ;
			sharedPromise = resourceData.nextFullSyncPromise ;
			resourceData.nextFullSyncPromise = null ;

			// Call the fullSyncParams.fn again
			resourceData.lastFullSync = resourceData.last = resourceData.inProgress = fullSyncParams.fn.call( ... args ) ;

			// Forward the result to the pending promise
			Promise.propagate( resourceData.inProgress , sharedPromise ) ;

			// BTW, trigger again the outWrapper
			Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 2 ) ) ;

			return resourceData.inProgress ;
		}
	} ;

	const getInWrapper = function( resourceId , ... args ) {
		var noDelay = false ,
			localThis = getParams.thisBinding || this ,
			resourceData = getResourceData( resourceId ) ;

		if ( args[ 0 ] === Promise.NO_DELAY ) {
			noDelay = true ;
			args.shift() ;
		}
		else if ( args[ 0 ] === Promise.BATCH_NO_DELAY ) {
			args.shift() ;
			let batchId = args.shift() ;
			if ( ! resourceData.noDelayBatches.has( batchId ) ) {
				resourceData.noDelayBatches.add( batchId ) ;
				noDelay = true ;
			}
		}

		if ( resourceData.inProgress ) { return resourceData.inProgress ; }

		if ( ! noDelay && getParams.delay && resourceData.lastTime && new Date() - resourceData.lastTime < getParams.delay ) {
			if ( typeof getParams.onDebounce === 'function' ) { getParams.onDebounce( resourceId , ... args ) ; }
			return resourceData.last ;
		}

		resourceData.last = resourceData.inProgress = getParams.fn.call( localThis , resourceId , ... args ) ;
		resourceData.inProgressIsFull = false ;
		Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 1 ) ) ;
		return resourceData.inProgress ;
	} ;

	const fullSyncInWrapper = function( resourceId , ... args ) {
		var delta ,
			noDelay = false ,
			localThis = fullSyncParams.thisBinding || this ,
			resourceData = getResourceData( resourceId ) ;

		if ( args[ 0 ] === Promise.NO_DELAY ) {
			noDelay = true ;
			args.shift() ;
		}
		else if ( args[ 0 ] === Promise.BATCH_NO_DELAY ) {
			args.shift() ;
			let batchId = args.shift() ;
			if ( ! resourceData.noDelayBatches.has( batchId ) ) {
				resourceData.noDelayBatches.add( batchId ) ;
				noDelay = true ;
			}
		}

		if ( ! resourceData.inProgress && ! noDelay && fullSyncParams.delay && resourceData.lastFullSyncTime && ( delta = new Date() - resourceData.lastFullSyncTime - fullSyncParams.delay ) < 0 ) {
			resourceData.inProgress = Promise.resolveTimeout( -delta + 1 ) ;	// Strangely, sometime it is trigerred 1ms too soon
			Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 0 ) ) ;
		}

		if ( resourceData.inProgress ) {
			// No difference between in-progress is 'get' or 'fullSync'
			if ( ! resourceData.nextFullSyncPromise ) { resourceData.nextFullSyncPromise = new Promise() ; }
			resourceData.nextFullSyncWith = [ localThis , resourceId , ... args ] ;
			return resourceData.nextFullSyncPromise ;
		}

		resourceData.lastFullSync = resourceData.last = resourceData.inProgress = fullSyncParams.fn.call( localThis , resourceId , ... args ) ;
		Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 2 ) ) ;
		return resourceData.inProgress ;
	} ;

	return [ getInWrapper , fullSyncInWrapper ] ;
} ;



Promise.timeout = ( timeout , asyncFn , thisBinding ) => {
	return function( ... args ) {
		var promise = asyncFn.call( thisBinding || this , ... args ) ;
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		return promise ;
	} ;

} ;



// Like .timeout(), but here the timeout value is not passed at creation, but as the first arg of each call
Promise.variableTimeout = ( asyncFn , thisBinding ) => {
	return function( timeout , ... args ) {
		var promise = asyncFn.call( thisBinding || this , ... args ) ;
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		return promise ;
	} ;

} ;



/*
Promise.retry = ( retryCount , retryTimeout , timeoutMultiplier , asyncFn , thisBinding ) => {

	return ( ... args ) => {

		var lastError ,
			count = retryCount ,
			timeout = retryTimeout ,
			globalPromise = new Promise() ;

		const callAgain = () => {
			if ( count -- < 0 ) {
				globalPromise.reject( lastError ) ;
				return ;
			}

			var promise = asyncFn.call( thisBinding , ... args ) ;

			promise.then(
				//( value ) => globalPromise.resolve( value ) ,
				( value ) => {
					globalPromise.resolve( value ) ;
				} ,
				( error ) => {
					lastError = error ;
					setTimeout( callAgain , timeout ) ;
					timeout *= timeoutMultiplier ;
				}
			) ;
		} ;

		callAgain() ;

		return globalPromise ;
	} ;
} ;



Promise.variableRetry = ( asyncFn , thisBinding ) => {

	return ( retryCount , retryTimeout , timeoutMultiplier , ... args ) => {

		var lastError ,
			count = retryCount ,
			timeout = retryTimeout ,
			globalPromise = new Promise() ;

		const callAgain = () => {
			if ( count -- < 0 ) {
				globalPromise.reject( lastError ) ;
				return ;
			}

			var promise = asyncFn.call( thisBinding , ... args ) ;

			promise.then(
				( value ) => globalPromise.resolve( value ) ,
				( error ) => {
					lastError = error ;
					setTimeout( callAgain , timeout ) ;
					timeout *= timeoutMultiplier ;
				}
			) ;
		} ;

		callAgain() ;

		return globalPromise ;
	} ;
} ;
*/


},{"./seventh.js":25}],23:[function(require,module,exports){
(function (process){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



var Promise = require( './seventh.js' ) ;



/*
	Asynchronously exit.

	Wait for all listeners of the 'asyncExit' event (on the 'process' object) to have called their callback.
	The listeners receive the exit code about to be produced and a completion callback.
*/

var exitInProgress = false ;

Promise.asyncExit = function( exitCode , timeout ) {
	// Already exiting? no need to call it twice!
	if ( exitInProgress ) { return ; }

	exitInProgress = true ;

	var listeners = process.listeners( 'asyncExit' ) ;

	if ( ! listeners.length ) { process.exit( exitCode ) ; return ; }

	if ( timeout === undefined ) { timeout = 1000 ; }

	const callListener = listener => {

		if ( listener.length < 3 ) {
			// This listener does not have a callback, it is interested in the event but does not need to perform critical stuff.
			// E.g. a server will not accept connection or data anymore, but doesn't need cleanup.
			listener( exitCode , timeout ) ;
			return Promise.dummy ;
		}

		// This listener have a callback, it probably has critical stuff to perform before exiting.
		// E.g. a server that needs to gracefully exit will not accept connection or data anymore,
		// but still want to deliver request in progress.
		return new Promise( resolve => {
			listener( exitCode , timeout , () => { resolve() ; } ) ;
		} ) ;

	} ;

	// We don't care about errors here... We are exiting!
	Promise.map( listeners , callListener )
		.finally( () => process.exit( exitCode ) ) ;

	// Quit anyway if it's too long
	setTimeout( () => process.exit( exitCode ) , timeout ) ;
} ;



// A timeout that ensure a task get the time to perform its action (when there are CPU-bound tasks)
Promise.resolveSafeTimeout = function( timeout , value ) {
	return new Promise( resolve => {
		setTimeout( () => {
			setTimeout( () => {
				setTimeout( () => {
					setTimeout( () => resolve( value ) , 0 ) ;
				} , timeout / 2 ) ;
			} , timeout / 2 ) ;
		} , 0 ) ;
	} ) ;
} ;


}).call(this,require('_process'))
},{"./seventh.js":25,"_process":13}],24:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



var Promise = require( './seventh.js' ) ;



/*
	This parasite the native promise, bringing some of seventh features into them.
*/

Promise.parasite = () => {

	var compatibleProtoFn = [
		'tap' , 'tapCatch' , 'finally' ,
		'fatal' , 'done' ,
		'callback' , 'callbackAll'
	] ;

	compatibleProtoFn.forEach( fn => Promise.Native.prototype[ fn ] = Promise.prototype[ fn ] ) ;
	Promise.Native.prototype._then = Promise.Native.prototype.then ;
} ;


},{"./seventh.js":25}],25:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



const seventh = require( './core.js' ) ;
module.exports = seventh ;

// The order matters
require( './batch.js' ) ;
require( './wrapper.js' ) ;
require( './decorators.js' ) ;
require( './api.js' ) ;
require( './parasite.js' ) ;
require( './misc.js' ) ;


},{"./api.js":19,"./batch.js":20,"./core.js":21,"./decorators.js":22,"./misc.js":23,"./parasite.js":24,"./wrapper.js":26}],26:[function(require,module,exports){
/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



var Promise = require( './seventh.js' ) ;



Promise.timeLimit = ( timeout , asyncFnOrPromise ) => {
	return new Promise( ( resolve , reject ) => {
		if ( typeof asyncFnOrPromise === 'function' ) { asyncFnOrPromise = asyncFnOrPromise() ; }
		Promise.resolve( asyncFnOrPromise ).then( resolve , reject ) ;
		setTimeout( () => reject( new Error( "Timeout" ) ) , timeout ) ;
	} ) ;
} ;



/*
	options:
		retries: number of retry
		coolDown: time before retrying
		raiseFactor: time multiplier for each successive cool down
		maxCoolDown: maximum cool-down, the raising time is capped to this value
		timeout: time before assuming it has failed, 0 = no time limit
		catch: `function` (optional) if absent, the function is always retried until it reaches the limit,
			if present, that catch-function is used like a normal promise catch block, the function is retry
			only if the catch-function does not throw or return a rejecting promise
*/
Promise.retry = ( options , asyncFn ) => {
	var count = options.retries || 1 ,
		coolDown = options.coolDown || 0 ,
		raiseFactor = options.raiseFactor || 1 ,
		maxCoolDown = options.maxCoolDown || Infinity ,
		timeout = options.timeout || 0 ,
		catchFn = options.catch || null ;

	const oneTry = () => {
		return ( timeout ? Promise.timeLimit( timeout , asyncFn ) : asyncFn() ).catch( error => {
			if ( ! count -- ) { throw error ; }

			var currentCoolDown = coolDown ;
			coolDown = Math.min( coolDown * raiseFactor , maxCoolDown ) ;

			if ( catchFn ) {
				// Call the custom catch function
				// Let it crash, if it throw we are already in a .catch() block
				return Promise.resolve( catchFn( error ) ).then( () => Promise.resolveTimeout( currentCoolDown ).then( oneTry ) ) ;
			}

			return Promise.resolveTimeout( currentCoolDown ).then( oneTry ) ;
		} ) ;
	} ;

	return oneTry() ;
} ;



// Resolve once an event is fired
Promise.onceEvent = ( emitter , eventName ) => {
	return new Promise( resolve => emitter.once( eventName , resolve ) ) ;
} ;



// Resolve once an event is fired, resolve with an array of arguments
Promise.onceEventAll = ( emitter , eventName ) => {
	return new Promise( resolve => emitter.once( eventName , ( ... args ) => resolve( args ) ) ) ;
} ;



// Resolve once an event is fired, or reject on error
Promise.onceEventOrError = ( emitter , eventName , excludeEvents , _internalAllArgs = false ) => {
	return new Promise( ( resolve , reject ) => {
		var altRejects ;

		// We care about removing listener, especially 'error', because if an error kick in after, it should throw because there is no listener
		var resolve_ = ( ... args ) => {
			emitter.removeListener( 'error' , reject_ ) ;

			if ( altRejects ) {
				for ( let event in altRejects ) {
					emitter.removeListener( event , altRejects[ event ] ) ;
				}
			}

			resolve( _internalAllArgs ? args : args[ 0 ] ) ;
		} ;

		var reject_ = arg => {
			emitter.removeListener( eventName , resolve_ ) ;

			if ( altRejects ) {
				for ( let event in altRejects ) {
					emitter.removeListener( event , altRejects[ event ] ) ;
				}
			}

			reject( arg ) ;
		} ;

		emitter.once( eventName , resolve_ ) ;
		emitter.once( 'error' , reject_ ) ;

		if ( excludeEvents ) {
			if ( ! Array.isArray( excludeEvents ) ) { excludeEvents = [ excludeEvents ] ; }

			altRejects = {} ;

			excludeEvents.forEach( event => {
				var altReject = ( ... args ) => {
					emitter.removeListener( 'error' , reject_ ) ;
					emitter.removeListener( eventName , resolve_ ) ;

					var error = new Error( "Received an excluded event: " + event ) ;
					error.event = event ;
					error.eventArgs = args ;
					reject( error ) ;
				} ;

				emitter.once( event , altReject ) ;

				altRejects[ event ] = altReject ;
			} ) ;
		}
	} ) ;
} ;



// Resolve once an event is fired, or reject on error, resolve with an array of arguments, reject with the first argument
Promise.onceEventAllOrError = ( emitter , eventName , excludeEvents ) => {
	return Promise.onceEventOrError( emitter , eventName , excludeEvents , true ) ;
} ;


},{"./seventh.js":25}],27:[function(require,module,exports){
/*
	String Kit

	Copyright (c) 2014 - 2019 Cédric Ronvel

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
	grey: '\x1b[90m' ,
	gray: '\x1b[90m' ,
	brightBlack: '\x1b[90m' ,
	brightRed: '\x1b[91m' ,
	brightGreen: '\x1b[92m' ,
	brightYellow: '\x1b[93m' ,
	brightBlue: '\x1b[94m' ,
	brightMagenta: '\x1b[95m' ,
	brightCyan: '\x1b[96m' ,
	brightWhite: '\x1b[97m' ,

	defaultBgColor: '\x1b[49m' ,
	bgBlack: '\x1b[40m' ,
	bgRed: '\x1b[41m' ,
	bgGreen: '\x1b[42m' ,
	bgYellow: '\x1b[43m' ,
	bgBlue: '\x1b[44m' ,
	bgMagenta: '\x1b[45m' ,
	bgCyan: '\x1b[46m' ,
	bgWhite: '\x1b[47m' ,
	bgGrey: '\x1b[100m' ,
	bgGray: '\x1b[100m' ,
	bgBrightBlack: '\x1b[100m' ,
	bgBrightRed: '\x1b[101m' ,
	bgBrightGreen: '\x1b[102m' ,
	bgBrightYellow: '\x1b[103m' ,
	bgBrightBlue: '\x1b[104m' ,
	bgBrightMagenta: '\x1b[105m' ,
	bgBrightCyan: '\x1b[106m' ,
	bgBrightWhite: '\x1b[107m'
} ;


},{}],28:[function(require,module,exports){
/*
	String Kit

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



// From Mozilla Developper Network
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
exports.regExp = exports.regExpPattern = str => str.replace( /([.*+?^${}()|[\]/\\])/g , '\\$1' ) ;

// This replace any single $ by a double $$
exports.regExpReplacement = str => str.replace( /\$/g , '$$$$' ) ;

// Escape for string.format()
// This replace any single % by a double %%
exports.format = str => str.replace( /%/g , '%%' ) ;

exports.jsSingleQuote = str => exports.control( str ).replace( /'/g , "\\'" ) ;
exports.jsDoubleQuote = str => exports.control( str ).replace( /"/g , '\\"' ) ;

exports.shellArg = str => '\'' + str.replace( /'/g , "'\\''" ) + '\'' ;



var escapeControlMap = {
	'\r': '\\r' ,
	'\n': '\\n' ,
	'\t': '\\t' ,
	'\x7f': '\\x7f'
} ;

// Escape \r \n \t so they become readable again, escape all ASCII control character as well, using \x syntaxe
exports.control = ( str , keepNewLineAndTab = false ) => str.replace( /[\x00-\x1f\x7f]/g , match => {
	if ( keepNewLineAndTab && ( match === '\n' || match === '\t' ) ) { return match ; }
	if ( escapeControlMap[ match ] !== undefined ) { return escapeControlMap[ match ] ; }
	var hex = match.charCodeAt( 0 ).toString( 16 ) ;
	if ( hex.length % 2 ) { hex = '0' + hex ; }
	return '\\x' + hex ;
} ) ;



var escapeHtmlMap = {
	'&': '&amp;' ,
	'<': '&lt;' ,
	'>': '&gt;' ,
	'"': '&quot;' ,
	"'": '&#039;'
} ;

// Only escape & < > so this is suited for content outside tags
exports.html = str => str.replace( /[&<>]/g , match => escapeHtmlMap[ match ] ) ;

// Escape & < > " so this is suited for content inside a double-quoted attribute
exports.htmlAttr = str => str.replace( /[&<>"]/g , match => escapeHtmlMap[ match ] ) ;

// Escape all html special characters & < > " '
exports.htmlSpecialChars = str => str.replace( /[&<>"']/g , match => escapeHtmlMap[ match ] ) ;

// Percent-encode all control chars and codepoint greater than 255 using percent encoding
exports.unicodePercentEncode = str => str.replace( /[\x00-\x1f\u0100-\uffff\x7f%]/g , match => {
	try {
		return encodeURI( match ) ;
	}
	catch ( error ) {
		// encodeURI can throw on bad surrogate pairs, but we just strip those characters
		return '' ;
	}
} ) ;

// Encode HTTP header value
exports.httpHeaderValue = str => exports.unicodePercentEncode( str ) ;


},{}],29:[function(require,module,exports){
(function (Buffer){
/*
	String Kit

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const inspect = require( './inspect.js' ).inspect ;
const inspectError = require( './inspect.js' ).inspectError ;
const escape = require( './escape.js' ) ;
const ansi = require( './ansi.js' ) ;
const unicode = require( './unicode.js' ) ;
const naturalSort = require( './naturalSort.js' ) ;



/*
	%%		a single %
	%s		string
	%S		string, interpret ^ formatting
	%r		raw string: without sanitizer
	%n		natural: output the most natural representation for this type, object entries are sorted by keys
	%N		even more natural: avoid type hinting marks like bracket for array
	%f		float
	%e		for scientific notation
	%d	%i	integer
	%u		unsigned integer
	%U		unsigned positive integer (>0)
	%k		number with metric system prefixes
	%t		time duration, convert ms into H:min:s
	%h		hexadecimal
	%x		hexadecimal, force pair of symbols (e.g. 'f' -> '0f')
	%o		octal
	%b		binary
	%z		base64
	%Z		base64url
	%O		object (like inspect, but with ultra minimal options)
	%I		call string-kit's inspect()
	%Y		call string-kit's inspect(), but do not inspect non-enumerable
	%E		call string-kit's inspectError()
	%J		JSON.stringify()
	%D		drop
	%F		filter function existing in the 'this' context, e.g. %[filter:%a%a]F
	%a		argument for a function

	Candidate format:
	%A		for automatic type? probably not good: it's like %n Natural
	%c		for char? (can receive a string or an integer translated into an UTF8 chars)
	%C		for currency formating?
	%B		for Buffer objects?
*/

exports.formatMethod = function( ... args ) {
	var str = args[ 0 ] ;

	if ( typeof str !== 'string' ) {
		if ( ! str ) { str = '' ; }
		else if ( typeof str.toString === 'function' ) { str = str.toString() ; }
		else { str = '' ; }
	}

	var arg , autoIndex = 1 , length = args.length ,
		hasMarkup = false , shift = null , markupStack = [] ;

	if ( this.markupReset && this.startingMarkupReset ) {
		str = ( typeof this.markupReset === 'function' ? this.markupReset( markupStack ) : this.markupReset ) + str ;
	}

	//console.log( 'format args:' , arguments ) ;

	// /!\ each changes here should be reported on string.format.count() and string.format.hasFormatting() too /!\
	//str = str.replace( /\^(.?)|%(?:([+-]?)([0-9]*)(?:\/([^\/]*)\/)?([a-zA-Z%])|\[([a-zA-Z0-9_]+)(?::([^\]]*))?\])/g ,
	str = str.replace( /\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/g ,
		( match , markup , doublePercent , relative , index , modeArg , mode ) => {

			var replacement , i , tmp , fn , fnArgString , argMatches , argList = [] ;

			//console.log( 'replaceArgs:' , arguments ) ;
			if ( doublePercent ) { return '%' ; }

			if ( markup ) {
				if ( this.noMarkup ) { return '^' + markup ; }
				if ( markup === '^' ) { return '^' ; }

				if ( this.shiftMarkup && this.shiftMarkup[ markup ] ) {
					shift = this.shiftMarkup[ markup ] ;
					return '' ;
				}

				if ( shift ) {
					if ( ! this.shiftedMarkup || ! this.shiftedMarkup[ shift ] || ! this.shiftedMarkup[ shift ][ markup ] ) {
						return '' ;
					}

					hasMarkup = true ;

					if ( typeof this.shiftedMarkup[ shift ][ markup ] === 'function' ) {
						replacement = this.shiftedMarkup[ shift ][ markup ]( markupStack ) ;
						// method should manage markup stack themselves
					}
					else {
						replacement = this.shiftedMarkup[ shift ][ markup ] ;
						markupStack.push( replacement ) ;
					}

					shift = null ;
				}
				else {
					if ( ! this.markup || ! this.markup[ markup ] ) {
						return '' ;
					}

					hasMarkup = true ;

					if ( typeof this.markup[ markup ] === 'function' ) {
						replacement = this.markup[ markup ]( markupStack ) ;
						// method should manage markup stack themselves
					}
					else {
						replacement = this.markup[ markup ] ;
						markupStack.push( replacement ) ;
					}
				}

				return replacement ;
			}


			if ( index ) {
				index = parseInt( index , 10 ) ;

				if ( relative ) {
					if ( relative === '+' ) { index = autoIndex + index ; }
					else if ( relative === '-' ) { index = autoIndex - index ; }
				}
			}
			else {
				index = autoIndex ;
			}

			autoIndex ++ ;

			if ( index >= length || index < 1 ) { arg = undefined ; }
			else { arg = args[ index ] ; }

			if ( modes[ mode ] ) {
				replacement = modes[ mode ]( arg , modeArg , this ) ;
				if ( this.argumentSanitizer && ! modes[ mode ].noSanitize ) { replacement = this.argumentSanitizer( replacement ) ; }
				if ( modeArg && ! modes[ mode ].noCommonModeArg ) { replacement = commonModeArg( replacement , modeArg ) ; }
				return replacement ;
			}

			// Function mode
			if ( mode === 'F' ) {
				autoIndex -- ;	// %F does not eat any arg

				if ( modeArg === undefined ) { return '' ; }
				tmp = modeArg.split( ':' ) ;
				fn = tmp[ 0 ] ;
				fnArgString = tmp[ 1 ] ;
				if ( ! fn ) { return '' ; }

				if ( fnArgString && ( argMatches = fnArgString.match( /%([+-]?)([0-9]*)[a-zA-Z]/g ) ) ) {
					//console.log( argMatches ) ;
					//console.log( fnArgString ) ;
					for ( i = 0 ; i < argMatches.length ; i ++ ) {
						relative = argMatches[ i ][ 1 ] ;
						index = argMatches[ i ][ 2 ] ;

						if ( index ) {
							index = parseInt( index , 10 ) ;

							if ( relative ) {
								if ( relative === '+' ) { index = autoIndex + index ; }		// jshint ignore:line
								else if ( relative === '-' ) { index = autoIndex - index ; }	// jshint ignore:line
							}
						}
						else {
							index = autoIndex ;
						}

						autoIndex ++ ;

						if ( index >= length || index < 1 ) { argList[ i ] = undefined ; }
						else { argList[ i ] = args[ index ] ; }
					}
				}

				if ( ! this || ! this.fn || typeof this.fn[ fn ] !== 'function' ) { return '' ; }
				return this.fn[ fn ].apply( this , argList ) ;
			}

			return '' ;
		}
	) ;

	if ( hasMarkup && this.markupReset && this.endingMarkupReset ) {
		str += typeof this.markupReset === 'function' ? this.markupReset( markupStack ) : this.markupReset ;
	}

	if ( this.extraArguments ) {
		for ( ; autoIndex < length ; autoIndex ++ ) {
			arg = args[ autoIndex ] ;
			if ( arg === null || arg === undefined ) { continue ; }
			else if ( typeof arg === 'string' ) { str += arg ; }
			else if ( typeof arg === 'number' ) { str += arg ; }
			else if ( typeof arg.toString === 'function' ) { str += arg.toString() ; }
		}
	}

	return str ;
} ;



// --- MODES ---

const modes = {} ;



// string
modes.s = arg => {
	if ( typeof arg === 'string' ) { return arg ; }
	if ( arg === null || arg === undefined || arg === true || arg === false ) { return '(' + arg + ')' ; }
	if ( typeof arg === 'number' ) { return '' + arg ; }
	if ( typeof arg.toString === 'function' ) { return arg.toString() ; }
	return '(' + arg + ')' ;
} ;

modes.r = arg => modes.s( arg ) ;
modes.r.noSanitize = true ;



// string, interpret ^ formatting
modes.S = ( arg , modeArg , options ) => {
	// We do the sanitizing part on our own
	var interpret = str => exports.markupMethod.call( options , options.argumentSanitizer ? options.argumentSanitizer( str ) : str ) ;

	if ( typeof arg === 'string' ) { return interpret( arg ) ; }
	if ( arg === null || arg === undefined || arg === true || arg === false ) { return '(' + arg + ')' ; }
	if ( typeof arg === 'number' ) { return '' + arg ; }
	if ( typeof arg.toString === 'function' ) { return interpret( arg.toString() ) ; }
	return interpret( '(' + arg + ')' ) ;
} ;

modes.S.noSanitize = true ;
modes.S.noCommonModeArg = true ;



// natural (WIP)
modes.N = ( arg , isSubCall ) => {
	if ( typeof arg === 'string' ) { return arg ; }

	if ( arg === null || arg === undefined || arg === true || arg === false || typeof arg === 'number' ) {
		return '' + arg ;
	}

	if ( Array.isArray( arg ) ) {
		arg = arg.map( e => modes.N( e , true ) ) ;

		if ( isSubCall ) {
			return '[' + arg.join( ',' ) + ']' ;
		}

		return arg.join( ', ' ) ;
	}

	if ( Buffer.isBuffer( arg ) ) {
		arg = [ ... arg ].map( e => {
			e = e.toString( 16 ) ;
			if ( e.length === 1 ) { e = '0' + e ; }
			return e ;
		} ) ;
		return '<' + arg.join( ' ' ) + '>' ;
	}

	var proto = Object.getPrototypeOf( arg ) ;

	if ( proto === null || proto === Object.prototype ) {
		// Plain objects
		arg = Object.entries( arg ).sort( naturalSort )
			.map( e => e[ 0 ] + ': ' + modes.N( e[ 1 ] , true ) ) ;

		if ( isSubCall ) {
			return '{' + arg.join( ', ' ) + '}' ;
		}

		return arg.join( ', ' ) ;
	}

	if ( typeof arg.inspect === 'function' ) { return arg.inspect() ; }
	if ( typeof arg.toString === 'function' ) { return arg.toString() ; }

	return '(' + arg + ')' ;
} ;

modes.n = arg => modes.N( arg , true ) ;



// float
modes.f = ( arg , modeArg ) => {
	var match , k , v , lv , n , step = 0 ,
		toFixed , toFixedIfDecimal , padding ;

	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg !== 'number' ) { arg = 0 ; }

	if ( modeArg ) {
		MODE_ARG_FORMAT_REGEX.lastIndex = 0 ;

		while ( ( match = MODE_ARG_FORMAT_REGEX.exec( modeArg ) ) ) {
			[ , k , v ] = match ;

			if ( k === 'z' ) {
				padding = + v ;
			}
			else if ( ! k ) {
				if ( v[ 0 ] === '.' ) {
					lv = v[ v.length - 1 ] ;

					if ( lv === '!' ) {
						n = parseInt( v.slice( 1 , -1 ) , 10 ) ;
						step = 10 ** ( -n ) ;
						toFixed = n ;
					}
					else if ( lv === '?' ) {
						n = parseInt( v.slice( 1 , -1 ) , 10 ) ;
						step = 10 ** ( -n ) ;
						toFixed = n ;
						toFixedIfDecimal = true ;
					}
					else {
						n = parseInt( v.slice( 1 ) , 10 ) ;
						step = 10 ** ( -n ) ;
					}
				}
				else if ( v[ v.length - 1 ] === '.' ) {
					n = parseInt( v.slice( 0 , -1 ) , 10 ) ;
					step = 10 ** n ;
				}
				else {
					n = parseInt( v , 10 ) ;
					step = 10 ** ( Math.ceil( Math.log10( arg + Number.EPSILON ) + Number.EPSILON ) - n ) ;
				}
			}
		}
	}

	if ( step ) { arg = round( arg , step ) ; }

	if ( toFixed !== undefined && ( ! toFixedIfDecimal || arg !== Math.trunc( arg ) ) ) {
		arg = arg.toFixed( toFixed ) ;
	}
	else {
		arg = '' + arg ;
	}

	if ( padding ) {
		n = arg.indexOf( '.' ) ;
		if ( n === -1 ) { n = arg.length ; }
		if ( arg[ 0 ] === '-' ) {
			if ( n - 1 < padding ) {
				arg = '-' + '0'.repeat( 1 + padding - n ) + arg.slice( 1 ) ;
			}
		}
		else if ( n < padding ) {
			arg = '0'.repeat( padding - n ) + arg ;
		}
	}

	return arg ;
} ;

modes.f.noSanitize = true ;



// scientific notation
modes.e = ( arg , modeArg ) => {
	var match , k , v ;

	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg !== 'number' ) { arg = 0 ; }

	if ( modeArg ) {
		MODE_ARG_FORMAT_REGEX.lastIndex = 0 ;

		if ( ( match = MODE_ARG_FORMAT_REGEX.exec( modeArg ) ) ) {
			[ , k , v ] = match ;

			if ( ! k ) {
				return '' + arg.toExponential( parseInt( v , 10 ) - 1 ) ;
			}
		}
	}

	return '' + arg.toExponential() ;

} ;

modes.e.noSanitize = true ;



// integer
modes.d = modes.i = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg === 'number' ) { return '' + Math.floor( arg ) ; }
	return '0' ;
} ;

modes.i.noSanitize = true ;



// unsigned integer
modes.u = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ) ; }
	return '0' ;
} ;

modes.u.noSanitize = true ;



// unsigned positive integer
modes.U = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 1 ) ; }
	return '1' ;
} ;

modes.U.noSanitize = true ;



// metric system
modes.k = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg !== 'number' ) { return '0' ; }
	return metricPrefix( arg ) ;
} ;

modes.k.noSanitize = true ;



// Degree, minutes and seconds.
// Unlike %t which receive ms, here the input is in degree.
modes.m = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg !== 'number' ) { return '(NaN)' ; }

	var minus = '' ;
	if ( arg < 0 ) { minus = '-' ; arg = -arg ; }

	var degrees = epsilonFloor( arg ) ,
		frac = arg - degrees ;

	if ( ! frac ) { return minus + degrees + '°' ; }

	var minutes = epsilonFloor( frac * 60 ) ,
		seconds = epsilonFloor( frac * 3600 - minutes * 60 ) ;

	if ( seconds ) {
		return minus + degrees + '°' + ( '' + minutes ).padStart( 2 , '0' ) + '′' + ( '' + seconds ).padStart( 2 , '0' ) + '″' ;
	}

	return minus + degrees + '°' + ( '' + minutes ).padStart( 2 , '0' ) + '′' ;

} ;

modes.m.noSanitize = true ;



// time duration, transform ms into H:min:s
// Later it should format Date as well: number=duration, date object=date
// Note that it would not replace moment.js, but it could uses it.
modes.t = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg !== 'number' ) { return '(NaN)' ; }

	var s = Math.floor( arg / 1000 ) ;
	if ( s < 60 ) { return s + 's' ; }

	var min = Math.floor( s / 60 ) ;
	s = s % 60 ;
	if ( min < 60 ) { return min + 'min' + ( '' + s ).padStart( 2 , '0' ) + 's' ; }

	var h = Math.floor( min / 60 ) ;
	min = min % 60 ;
	//if ( h < 24 ) { return h + 'h' + zeroPadding( min ) +'min' + zeroPadding( s ) + 's' ; }

	return h + 'h' + ( '' + min ).padStart( 2 , '0' ) + 'min' + ( '' + s ).padStart( 2 , '0' ) + 's' ;
} ;

modes.t.noSanitize = true ;



// unsigned hexadecimal
modes.h = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 16 ) ; }
	return '0' ;
} ;

modes.h.noSanitize = true ;



// unsigned hexadecimal, force pair of symboles
modes.x = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg !== 'number' ) { return '00' ; }

	var value = '' + Math.max( Math.floor( arg ) , 0 ).toString( 16 ) ;

	if ( value.length % 2 ) { value = '0' + value ; }
	return value ;
} ;

modes.x.noSanitize = true ;



// unsigned octal
modes.o = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 8 ) ; }
	return '0' ;
} ;

modes.o.noSanitize = true ;



// unsigned binary
modes.b = arg => {
	if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
	if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 2 ) ; }
	return '0' ;
} ;

modes.b.noSanitize = true ;



// base64
modes.z = arg => {
	if ( typeof arg === 'string' ) { arg = Buffer.from( arg ) ; }
	else if ( ! Buffer.isBuffer( arg ) ) { return '' ; }
	return arg.toString( 'base64' ) ;
} ;



// base64url
modes.Z = arg => {
	if ( typeof arg === 'string' ) { arg = Buffer.from( arg ) ; }
	else if ( ! Buffer.isBuffer( arg ) ) { return '' ; }
	return arg.toString( 'base64' ).replace( /\+/g , '-' )
		.replace( /\//g , '_' )
		.replace( /[=]{1,2}$/g , '' ) ;
} ;



// Inspect
const I_OPTIONS = {} ;
modes.I = ( arg , modeArg , options ) => genericInspectMode( arg , modeArg , options , I_OPTIONS ) ;
modes.I.noSanitize = true ;



// More minimalist inspect
const Y_OPTIONS = {
	noFunc: true ,
	enumOnly: true ,
	noDescriptor: true ,
	useInspect: true ,
	useInspectPropertyBlackList: true
} ;
modes.Y = ( arg , modeArg , options ) => genericInspectMode( arg , modeArg , options , Y_OPTIONS ) ;
modes.Y.noSanitize = true ;



// Even more minimalist inspect
const O_OPTIONS = { minimal: true , noIndex: true } ;
modes.O = ( arg , modeArg , options ) => genericInspectMode( arg , modeArg , options , O_OPTIONS ) ;
modes.O.noSanitize = true ;



// Inspect error
const E_OPTIONS = {} ;
modes.E = ( arg , modeArg , options ) => genericInspectMode( arg , modeArg , options , E_OPTIONS , true ) ;
modes.E.noSanitize = true ;



// JSON
modes.J = arg => arg === undefined ? 'null' : JSON.stringify( arg ) ;



// drop
modes.D = () => '' ;
modes.D.noSanitize = true ;



var defaultFormatter = {
	argumentSanitizer: str => escape.control( str , true ) ,
	extraArguments: true ,
	color: false ,
	noMarkup: false ,
	endingMarkupReset: true ,
	startingMarkupReset: false ,
	markupReset: ansi.reset ,
	shiftMarkup: {
		'#': 'background'
	} ,
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
	} ,
	shiftedMarkup: {
		background: {
			":": ansi.reset ,
			" ": ansi.reset + " " ,

			"b": ansi.bgBlue ,
			"B": ansi.bgBrightBlue ,
			"c": ansi.bgCyan ,
			"C": ansi.bgBrightCyan ,
			"g": ansi.bgGreen ,
			"G": ansi.bgBrightGreen ,
			"k": ansi.bgBlack ,
			"K": ansi.bgBrightBlack ,
			"m": ansi.bgMagenta ,
			"M": ansi.bgBrightMagenta ,
			"r": ansi.bgRed ,
			"R": ansi.bgBrightRed ,
			"w": ansi.bgWhite ,
			"W": ansi.bgBrightWhite ,
			"y": ansi.bgYellow ,
			"Y": ansi.bgBrightYellow
		}
	}
} ;

exports.createFormatter = ( options ) => exports.formatMethod.bind( Object.assign( {} , defaultFormatter , options ) ) ;
exports.format = exports.formatMethod.bind( defaultFormatter ) ;
exports.format.default = defaultFormatter ;



exports.markupMethod = function( str ) {
	if ( typeof str !== 'string' ) {
		if ( ! str ) { str = '' ; }
		else if ( typeof str.toString === 'function' ) { str = str.toString() ; }
		else { str = '' ; }
	}

	var hasMarkup = false , shift = null , markupStack = [] ;

	if ( this.markupReset && this.startingMarkupReset ) {
		str = ( typeof this.markupReset === 'function' ? this.markupReset( markupStack ) : this.markupReset ) + str ;
	}

	//console.log( 'format args:' , arguments ) ;

	str = str.replace( /\^(.?)/g , ( match , markup ) => {
		var replacement ;

		if ( markup === '^' ) { return '^' ; }

		if ( this.shiftMarkup && this.shiftMarkup[ markup ] ) {
			shift = this.shiftMarkup[ markup ] ;
			return '' ;
		}

		if ( shift ) {
			if ( ! this.shiftedMarkup || ! this.shiftedMarkup[ shift ] || ! this.shiftedMarkup[ shift ][ markup ] ) {
				return '' ;
			}

			hasMarkup = true ;

			if ( typeof this.shiftedMarkup[ shift ][ markup ] === 'function' ) {
				replacement = this.shiftedMarkup[ shift ][ markup ]( markupStack ) ;
				// method should manage markup stack themselves
			}
			else {
				replacement = this.shiftedMarkup[ shift ][ markup ] ;
				markupStack.push( replacement ) ;
			}

			shift = null ;
		}
		else {
			if ( ! this.markup || ! this.markup[ markup ] ) {
				return '' ;
			}

			hasMarkup = true ;

			if ( typeof this.markup[ markup ] === 'function' ) {
				replacement = this.markup[ markup ]( markupStack ) ;
				// method should manage markup stack themselves
			}
			else {
				replacement = this.markup[ markup ] ;
				markupStack.push( replacement ) ;
			}
		}

		return replacement ;
	} ) ;

	if ( hasMarkup && this.markupReset && this.endingMarkupReset ) {
		str += typeof this.markupReset === 'function' ? this.markupReset( markupStack ) : this.markupReset ;
	}

	return str ;
} ;



exports.createMarkup = ( options ) => exports.markupMethod.bind( Object.assign( {} , defaultFormatter , options ) ) ;
exports.markup = exports.markupMethod.bind( defaultFormatter ) ;



// Count the number of parameters needed for this string
exports.format.count = function( str ) {
	var match , index , relative , autoIndex = 1 , maxIndex = 0 ;

	if ( typeof str !== 'string' ) { return 0 ; }

	// This regex differs slightly from the main regex: we do not count '%%' and %F is excluded
	var regexp = /%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-EG-Z])/g ;


	while ( ( match = regexp.exec( str ) ) !== null ) {
		//console.log( match ) ;
		relative = match[ 1 ] ;
		index = match[ 2 ] ;

		if ( index ) {
			index = parseInt( index , 10 ) ;

			if ( relative ) {
				if ( relative === '+' ) { index = autoIndex + index ; }
				else if ( relative === '-' ) { index = autoIndex - index ; }
			}
		}
		else {
			index = autoIndex ;
		}

		autoIndex ++ ;

		if ( maxIndex < index ) { maxIndex = index ; }
	}

	return maxIndex ;
} ;



// Tell if this string contains formatter chars
exports.format.hasFormatting = function( str ) {
	if ( str.search( /\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/ ) !== -1 ) { return true ; }
	return false ;
} ;



// ModeArg formats

// The format for commonModeArg
const COMMON_MODE_ARG_FORMAT_REGEX = /([a-zA-Z])(.[^a-zA-Z]*)/g ;

// The format for specific mode arg
const MODE_ARG_FORMAT_REGEX = /([a-zA-Z]|^)(.[^a-zA-Z]*)/g ;



// Called when there is a modeArg and the mode allow common mode arg
// CONVENTION: reserve upper-cased letters for common mode arg
function commonModeArg( str , modeArg ) {
	var match , k , v ;

	COMMON_MODE_ARG_FORMAT_REGEX.lastIndex = 0 ;

	while ( ( match = COMMON_MODE_ARG_FORMAT_REGEX.exec( modeArg ) ) ) {
		[ , k , v ] = match ;

		if ( k === 'L' ) {
			let width = unicode.width( str ) ;
			v = + v || 1 ;

			if ( width > v ) {
				str = unicode.truncateWidth( str , v - 1 ).trim() + '…' ;
				width = unicode.width( str ) ;
			}

			if ( width < v ) { str = ' '.repeat( v - width ) + str ; }
		}
		else if ( k === 'R' ) {
			let width = unicode.width( str ) ;
			v = + v || 1 ;

			if ( width > v ) {
				str = unicode.truncateWidth( str , v - 1 ).trim() + '…' ;
				width = unicode.width( str ) ;
			}

			if ( width < v ) { str = str + ' '.repeat( v - width ) ; }
		}
	}

	return str ;
}



// Generic inspect
function genericInspectMode( arg , modeArg , options , modeOptions , isInspectError = false ) {
	var match , k , v ,
		outputMaxLength ,
		maxLength ,
		depth = 3 ,
		style = options && options.color ? 'color' : 'none' ;

	if ( modeArg ) {
		MODE_ARG_FORMAT_REGEX.lastIndex = 0 ;

		while ( ( match = MODE_ARG_FORMAT_REGEX.exec( modeArg ) ) ) {
			[ , k , v ] = match ;

			if ( k === 'c' ) {
				if ( v === '+' ) { style = 'color' ; }
				else if ( v === '-' ) { style = 'none' ; }
			}
			else if ( k === 'l' ) {
				// total output max length
				outputMaxLength = parseInt( v , 10 ) || undefined ;
			}
			else if ( k === 's' ) {
				// string max length
				maxLength = parseInt( v , 10 ) || undefined ;
			}
			else if ( ! k ) {
				depth = parseInt( v , 10 ) || 1 ;
			}
		}
	}

	if ( isInspectError ) {
		return inspectError( Object.assign( {
			depth , style , outputMaxLength , maxLength
		} , modeOptions ) , arg ) ;
	}

	return inspect( Object.assign( {
		depth , style , outputMaxLength , maxLength
	} , modeOptions ) , arg ) ;
}



// From math-kit module
// /!\ Should be updated with the new way the math-kit module do it!!! /!\
const EPSILON = 0.0000000001 ;
const INVERSE_EPSILON = Math.round( 1 / EPSILON ) ;

function epsilonRound( v ) {
	return Math.round( v * INVERSE_EPSILON ) / INVERSE_EPSILON ;
}

function epsilonFloor( v ) {
	return Math.floor( v + EPSILON ) ;
}

// Round with precision
function round( v , step ) {
	// use: v * ( 1 / step )
	// not: v / step
	// reason: epsilon rounding errors
	return epsilonRound( step * Math.round( v * ( 1 / step ) ) ) ;
}



// Metric prefix
const MUL_PREFIX = [ '' , 'k' , 'M' , 'G' , 'T' , 'P' , 'E' , 'Z' , 'Y' ] ;
const SUB_MUL_PREFIX = [ '' , 'm' , 'µ' , 'n' , 'p' , 'f' , 'a' , 'z' , 'y' ] ;
const IROUND_STEP = [ 100 , 10 , 1 ] ;



function metricPrefix( n ) {
	var log , logDiv3 , logMod , base , prefix ;

	if ( ! n || n === 1 ) { return '' + n ; }
	if ( n < 0 ) { return '-' + metricPrefix( -n ) ; }

	if ( n > 1 ) {
		log = Math.floor( Math.log10( n ) ) ;
		logDiv3 = Math.floor( log / 3 ) ;
		logMod = log % 3 ;
		base = iround( n / ( Math.pow( 1000 , logDiv3 ) ) , IROUND_STEP[ logMod ] ) ;
		prefix = MUL_PREFIX[ logDiv3 ] ;
	}
	else {
		log = Math.floor( Math.log10( n ) ) ;
		logDiv3 = Math.floor( log / 3 ) ;
		logMod = log % 3 ;
		if ( logMod < 0 ) { logMod += 3 ; }
		base = iround( n / ( Math.pow( 1000 , logDiv3 ) ) , IROUND_STEP[ logMod ] ) ;
		prefix = SUB_MUL_PREFIX[ -logDiv3 ] ;
	}

	return '' + base + prefix ;
}



function iround( v , istep ) {
	return Math.round( ( v + Number.EPSILON ) * istep ) / istep ;
}


}).call(this,require("buffer").Buffer)
},{"./ansi.js":27,"./escape.js":28,"./inspect.js":30,"./naturalSort.js":31,"./unicode.js":32,"buffer":6}],30:[function(require,module,exports){
(function (Buffer,process){
/*
	String Kit

	Copyright (c) 2014 - 2019 Cédric Ronvel

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
	Variable inspector.
*/

"use strict" ;



const escape = require( './escape.js' ) ;
const ansi = require( './ansi.js' ) ;

const EMPTY = {} ;



/*
	Inspect a variable, return a string ready to be displayed with console.log(), or even as an HTML output.

	Options:
		* style:
			* 'none': (default) normal output suitable for console.log() or writing in a file
			* 'inline': like 'none', but without newlines
			* 'color': colorful output suitable for terminal
			* 'html': html output
			* any object: full controle, inheriting from 'none'
		* depth: depth limit, default: 3
		* maxLength: length limit for strings, default: 250
		* outputMaxLength: length limit for the inspect output string, default: 5000
		* noFunc: do not display functions
		* noDescriptor: do not display descriptor information
		* noArrayProperty: do not display array properties
		* noIndex: do not display array indexes
		* noType: do not display type and constructor
		* enumOnly: only display enumerable properties
		* funcDetails: display function's details
		* proto: display object's prototype
		* sort: sort the keys
		* minimal: imply noFunc: true, noDescriptor: true, noType: true, noArrayProperty: true, enumOnly: true, proto: false and funcDetails: false.
		  Display a minimal JSON-like output
		* protoBlackList: `Set` of blacklisted object prototype (will not recurse inside it)
		* propertyBlackList: `Set` of blacklisted property names (will not even display it)
		* useInspect: use .inspect() method when available on an object (default to false)
		* useInspectPropertyBlackList: if set and if the object to be inspected has an 'inspectPropertyBlackList' property which value is a `Set`,
		  use it like the 'propertyBlackList' option
*/

function inspect( options , variable ) {
	if ( arguments.length < 2 ) { variable = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var runtime = { depth: 0 , ancestors: [] } ;

	if ( ! options.style ) { options.style = inspectStyle.none ; }
	else if ( typeof options.style === 'string' ) { options.style = inspectStyle[ options.style ] ; }
	// Too slow:
	//else { options.style = Object.assign( {} , inspectStyle.none , options.style ) ; }

	if ( options.depth === undefined ) { options.depth = 3 ; }
	if ( options.maxLength === undefined ) { options.maxLength = 250 ; }
	if ( options.outputMaxLength === undefined ) { options.outputMaxLength = 5000 ; }

	// /!\ nofunc is deprecated
	if ( options.nofunc ) { options.noFunc = true ; }

	if ( options.minimal ) {
		options.noFunc = true ;
		options.noDescriptor = true ;
		options.noType = true ;
		options.noArrayProperty = true ;
		options.enumOnly = true ;
		options.proto = false ;
		options.funcDetails = false ;
	}

	var str = inspect_( runtime , options , variable ) ;

	if ( str.length > options.outputMaxLength ) {
		str = options.style.truncate( str , options.outputMaxLength ) ;
	}

	return str ;
}



function inspect_( runtime , options , variable ) {
	var i , funcName , length , proto , propertyList , constructor , keyIsProperty ,
		type , pre , indent , isArray , isFunc , specialObject ,
		str = '' , key = '' , descriptorStr = '' , descriptor , nextAncestors ;


	// Prepare things (indentation, key, descriptor, ... )

	type = typeof variable ;
	indent = options.style.tab.repeat( runtime.depth ) ;

	if ( type === 'function' && options.noFunc ) { return '' ; }

	if ( runtime.key !== undefined ) {
		if ( runtime.descriptor ) {
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

		if ( runtime.keyIsProperty ) {
			if ( keyNeedingQuotes( runtime.key ) ) {
				key = '"' + options.style.key( runtime.key ) + '": ' ;
			}
			else {
				key = options.style.key( runtime.key ) + ': ' ;
			}
		}
		else if ( ! options.noIndex ) {
			key = options.style.index( runtime.key ) ;
		}

		if ( descriptorStr ) { descriptorStr = ' ' + options.style.type( descriptorStr ) ; }
	}

	pre = runtime.noPre ? '' : indent + key ;


	// Describe the current variable

	if ( variable === undefined ) {
		str += pre + options.style.constant( 'undefined' ) + descriptorStr + options.style.newline ;
	}
	else if ( variable === EMPTY ) {
		str += pre + options.style.constant( '[empty]' ) + descriptorStr + options.style.newline ;
	}
	else if ( variable === null ) {
		str += pre + options.style.constant( 'null' ) + descriptorStr + options.style.newline ;
	}
	else if ( variable === false ) {
		str += pre + options.style.constant( 'false' ) + descriptorStr + options.style.newline ;
	}
	else if ( variable === true ) {
		str += pre + options.style.constant( 'true' ) + descriptorStr + options.style.newline ;
	}
	else if ( type === 'number' ) {
		str += pre + options.style.number( variable.toString() ) +
			( options.noType ? '' : ' ' + options.style.type( 'number' ) ) +
			descriptorStr + options.style.newline ;
	}
	else if ( type === 'string' ) {
		if ( variable.length > options.maxLength ) {
			str += pre + '"' + options.style.string( escape.control( variable.slice( 0 , options.maxLength - 1 ) ) ) + '…"' +
				( options.noType ? '' : ' ' + options.style.type( 'string' ) + options.style.length( '(' + variable.length + ' - TRUNCATED)' ) ) +
				descriptorStr + options.style.newline ;
		}
		else {
			str += pre + '"' + options.style.string( escape.control( variable ) ) + '"' +
				( options.noType ? '' : ' ' + options.style.type( 'string' ) + options.style.length( '(' + variable.length + ')' ) ) +
				descriptorStr + options.style.newline ;
		}
	}
	else if ( Buffer.isBuffer( variable ) ) {
		str += pre + options.style.inspect( variable.inspect() ) +
			( options.noType ? '' : ' ' + options.style.type( 'Buffer' ) + options.style.length( '(' + variable.length + ')' ) ) +
			descriptorStr + options.style.newline ;
	}
	else if ( type === 'object' || type === 'function' ) {
		funcName = length = '' ;
		isFunc = false ;

		if ( type === 'function' ) {
			isFunc = true ;
			funcName = ' ' + options.style.funcName( ( variable.name ? variable.name : '(anonymous)' ) ) ;
			length = options.style.length( '(' + variable.length + ')' ) ;
		}

		isArray = false ;

		if ( Array.isArray( variable ) ) {
			isArray = true ;
			length = options.style.length( '(' + variable.length + ')' ) ;
		}

		if ( ! variable.constructor ) { constructor = '(no constructor)' ; }
		else if ( ! variable.constructor.name ) { constructor = '(anonymous)' ; }
		else { constructor = variable.constructor.name ; }

		constructor = options.style.constructorName( constructor ) ;
		proto = Object.getPrototypeOf( variable ) ;

		str += pre ;

		if ( ! options.noType ) {
			if ( runtime.forceType ) { str += options.style.type( runtime.forceType ) ; }
			else { str += constructor + funcName + length + ' ' + options.style.type( type ) + descriptorStr ; }

			if ( ! isFunc || options.funcDetails ) { str += ' ' ; }	// if no funcDetails imply no space here
		}

		if ( isArray && options.noArrayProperty ) {
			propertyList = [ ... Array( variable.length ).keys() ] ;
		}
		else {
			propertyList = Object.getOwnPropertyNames( variable ) ;
		}

		if ( options.sort ) { propertyList.sort() ; }

		// Special Objects
		specialObject = specialObjectSubstitution( variable , runtime , options ) ;

		if ( options.protoBlackList && options.protoBlackList.has( proto ) ) {
			str += options.style.limit( '[skip]' ) + options.style.newline ;
		}
		else if ( specialObject !== undefined ) {
			if ( typeof specialObject === 'string' ) {
				str += '=> ' + specialObject + options.style.newline ;
			}
			else {
				str += '=> ' + inspect_(
					{
						depth: runtime.depth ,
						ancestors: runtime.ancestors ,
						noPre: true
					} ,
					options ,
					specialObject
				) ;
			}
		}
		else if ( isFunc && ! options.funcDetails ) {
			str += options.style.newline ;
		}
		else if ( ! propertyList.length && ! options.proto ) {
			str += ( isArray ? '[]' : '{}' ) + options.style.newline ;
		}
		else if ( runtime.depth >= options.depth ) {
			str += options.style.limit( '[depth limit]' ) + options.style.newline ;
		}
		else if ( runtime.ancestors.indexOf( variable ) !== -1 ) {
			str += options.style.limit( '[circular]' ) + options.style.newline ;
		}
		else {
			str += ( isArray && options.noType && options.noArrayProperty ? '[' : '{' ) + options.style.newline ;

			// Do not use .concat() here, it doesn't works as expected with arrays...
			nextAncestors = runtime.ancestors.slice() ;
			nextAncestors.push( variable ) ;

			for ( i = 0 ; i < propertyList.length && str.length < options.outputMaxLength ; i ++ ) {
				if ( ! isArray && (
					( options.propertyBlackList && options.propertyBlackList.has( propertyList[ i ] ) )
					|| ( options.useInspectPropertyBlackList && ( variable.inspectPropertyBlackList instanceof Set ) && variable.inspectPropertyBlackList.has( propertyList[ i ] ) )
				) ) {
					//str += options.style.limit( '[skip]' ) + options.style.newline ;
					continue ;
				}

				if ( isArray && options.noArrayProperty && ! ( propertyList[ i ] in variable ) ) {
					// Hole in the array (sparse array, item deleted, ...)
					str += inspect_(
						{
							depth: runtime.depth + 1 ,
							ancestors: nextAncestors ,
							key: propertyList[ i ] ,
							keyIsProperty: false
						} ,
						options ,
						EMPTY
					) ;
				}
				else {
					try {
						descriptor = Object.getOwnPropertyDescriptor( variable , propertyList[ i ] ) ;
						if ( ! descriptor.enumerable && options.enumOnly ) { continue ; }
						keyIsProperty = ! isArray || ! descriptor.enumerable || isNaN( propertyList[ i ] ) ;

						if ( ! options.noDescriptor && descriptor && ( descriptor.get || descriptor.set ) ) {
							str += inspect_(
								{
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
						else {
							str += inspect_(
								{
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
						str += inspect_(
							{
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

				if ( i < propertyList.length - 1 ) { str += options.style.comma ; }
			}

			if ( options.proto ) {
				str += inspect_(
					{
						depth: runtime.depth + 1 ,
						ancestors: nextAncestors ,
						key: '__proto__' ,
						keyIsProperty: true
					} ,
					options ,
					proto
				) ;
			}

			str += indent + ( isArray && options.noType && options.noArrayProperty ? ']' : '}' ) ;
			str += options.style.newline ;
		}
	}


	// Finalizing


	if ( runtime.depth === 0 ) {
		if ( options.style.trim ) { str = str.trim() ; }
		if ( options.style === 'html' ) { str = escape.html( str ) ; }
	}

	return str ;
}

exports.inspect = inspect ;



function keyNeedingQuotes( key ) {
	if ( ! key.length ) { return true ; }
	return false ;
}



var promiseStates = [ 'pending' , 'fulfilled' , 'rejected' ] ;



// Some special object are better written down when substituted by something else
function specialObjectSubstitution( object , runtime , options ) {
	if ( typeof object.constructor !== 'function' ) {
		// Some objects have no constructor, e.g.: Object.create(null)
		//console.error( object ) ;
		return ;
	}

	if ( object instanceof String ) {
		return object.toString() ;
	}

	if ( object instanceof RegExp ) {
		return object.toString() ;
	}

	if ( object instanceof Date ) {
		return object.toString() + ' [' + object.getTime() + ']' ;
	}

	if ( typeof Set === 'function' && object instanceof Set ) {
		// This is an ES6 'Set' Object
		return Array.from( object ) ;
	}

	if ( typeof Map === 'function' && object instanceof Map ) {
		// This is an ES6 'Map' Object
		return Array.from( object ) ;
	}

	if ( object instanceof Promise ) {
		if ( process && process.binding && process.binding( 'util' ) && process.binding( 'util' ).getPromiseDetails ) {
			let details = process.binding( 'util' ).getPromiseDetails( object ) ;
			let state =  promiseStates[ details[ 0 ] ] ;
			let str = 'Promise <' + state + '>' ;

			if ( state === 'fulfilled' ) {
				str += ' ' + inspect_(
					{
						depth: runtime.depth ,
						ancestors: runtime.ancestors ,
						noPre: true
					} ,
					options ,
					details[ 1 ]
				) ;
			}
			else if ( state === 'rejected' ) {
				if ( details[ 1 ] instanceof Error ) {
					str += ' ' + inspectError(
						{
							style: options.style ,
							noErrorStack: true
						} ,
						details[ 1 ]
					) ;
				}
				else {
					str += ' ' + inspect_(
						{
							depth: runtime.depth ,
							ancestors: runtime.ancestors ,
							noPre: true
						} ,
						options ,
						details[ 1 ]
					) ;
				}
			}

			return str ;
		}
	}

	if ( object._bsontype ) {
		// This is a MongoDB ObjectID, rather boring to display in its original form
		// due to esoteric characters that confuse both the user and the terminal displaying it.
		// Substitute it to its string representation
		return object.toString() ;
	}

	if ( options.useInspect && typeof object.inspect === 'function' ) {
		return object.inspect() ;
	}

	return ;
}



/*
	Options:
		noErrorStack: set to true if the stack should not be displayed
*/
function inspectError( options , error ) {
	var str = '' , stack , type , code ;

	if ( arguments.length < 2 ) { error = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( ! ( error instanceof Error ) ) {
		return "inspectError(): it's not an error, using regular variable inspection: " + inspect( options , error ) ;
	}

	if ( ! options.style ) { options.style = inspectStyle.none ; }
	else if ( typeof options.style === 'string' ) { options.style = inspectStyle[ options.style ] ; }

	if ( error.stack && ! options.noErrorStack ) { stack = inspectStack( options , error.stack ) ; }

	type = error.type || error.constructor.name ;
	code = error.code || error.name || error.errno || error.number ;

	str += options.style.errorType( type ) +
		( code ? ' [' + options.style.errorType( code ) + ']' : '' ) + ': ' ;
	str += options.style.errorMessage( error.message ) + '\n' ;

	if ( stack ) { str += options.style.errorStack( stack ) + '\n' ; }

	if ( error.from ) {
		str += options.style.newline + options.style.errorFromMessage( 'From error:' ) + options.style.newline + inspectError( options , error.from ) ;
	}

	return str ;
}

exports.inspectError = inspectError ;



function inspectStack( options , stack ) {
	if ( arguments.length < 2 ) { stack = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( ! options.style ) { options.style = inspectStyle.none ; }
	else if ( typeof options.style === 'string' ) { options.style = inspectStyle[ options.style ] ; }

	if ( ! stack ) { return ; }

	if ( ( options.browser || process.browser ) && stack.indexOf( '@' ) !== -1 ) {
		// Assume a Firefox-compatible stack-trace here...
		stack = stack
			.replace( /[</]*(?=@)/g , '' )	// Firefox output some WTF </</</</< stuff in its stack trace -- removing that
			.replace(
				/^\s*([^@]*)\s*@\s*([^\n]*)(?::([0-9]+):([0-9]+))?$/mg ,
				( matches , method , file , line , column ) => {
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
	else {
		stack = stack.replace( /^[^\n]*\n/ , '' ) ;
		stack = stack.replace(
			/^\s*(at)\s+(?:(?:(async|new)\s+)?([^\s:()[\]\n]+(?:\([^)]+\))?)\s)?(?:\[as ([^\s:()[\]\n]+)\]\s)?(?:\(?([^:()[\]\n]+):([0-9]+):([0-9]+)\)?)?$/mg ,
			( matches , at , keyword , method , as , file , line , column ) => {
				return options.style.errorStack( '    at ' ) +
					( keyword ? options.style.errorStackKeyword( keyword ) + ' ' : '' ) +
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

var inspectStyleNoop = str => str ;



inspectStyle.none = {
	trim: false ,
	tab: '    ' ,
	newline: '\n' ,
	comma: '' ,
	limit: inspectStyleNoop ,
	type: str => '<' + str + '>' ,
	constant: inspectStyleNoop ,
	funcName: inspectStyleNoop ,
	constructorName: str => '<' + str + '>' ,
	length: inspectStyleNoop ,
	key: inspectStyleNoop ,
	index: str => '[' + str + '] ' ,
	number: inspectStyleNoop ,
	inspect: inspectStyleNoop ,
	string: inspectStyleNoop ,
	errorType: inspectStyleNoop ,
	errorMessage: inspectStyleNoop ,
	errorStack: inspectStyleNoop ,
	errorStackKeyword: inspectStyleNoop ,
	errorStackMethod: inspectStyleNoop ,
	errorStackMethodAs: inspectStyleNoop ,
	errorStackFile: inspectStyleNoop ,
	errorStackLine: inspectStyleNoop ,
	errorStackColumn: inspectStyleNoop ,
	errorFromMessage: inspectStyleNoop ,
	truncate: ( str , maxLength ) => str.slice( 0 , maxLength - 1 ) + '…'
} ;



inspectStyle.inline = Object.assign( {} , inspectStyle.none , {
	trim: true ,
	tab: '' ,
	newline: ' ' ,
	comma: ', ' ,
	length: () => '' ,
	index: () => ''
	//type: () => '' ,
} ) ;



inspectStyle.color = Object.assign( {} , inspectStyle.none , {
	limit: str => ansi.bold + ansi.brightRed + str + ansi.reset ,
	type: str => ansi.italic + ansi.brightBlack + str + ansi.reset ,
	constant: str => ansi.cyan + str + ansi.reset ,
	funcName: str => ansi.italic + ansi.magenta + str + ansi.reset ,
	constructorName: str => ansi.magenta + str + ansi.reset ,
	length: str => ansi.italic + ansi.brightBlack + str + ansi.reset ,
	key: str => ansi.green + str + ansi.reset ,
	index: str => ansi.blue + '[' + str + ']' + ansi.reset + ' ' ,
	number: str => ansi.cyan + str + ansi.reset ,
	inspect: str => ansi.cyan + str + ansi.reset ,
	string: str => ansi.blue + str + ansi.reset ,
	errorType: str => ansi.red + ansi.bold + str + ansi.reset ,
	errorMessage: str => ansi.red + ansi.italic + str + ansi.reset ,
	errorStack: str => ansi.brightBlack + str + ansi.reset ,
	errorStackKeyword: str => ansi.italic + ansi.bold + str + ansi.reset ,
	errorStackMethod: str => ansi.brightYellow + str + ansi.reset ,
	errorStackMethodAs: str => ansi.yellow + str + ansi.reset ,
	errorStackFile: str => ansi.brightCyan + str + ansi.reset ,
	errorStackLine: str => ansi.blue + str + ansi.reset ,
	errorStackColumn: str => ansi.magenta + str + ansi.reset ,
	errorFromMessage: str => ansi.yellow + ansi.underline + str + ansi.reset ,
	truncate: ( str , maxLength ) => {
		var trail = ansi.gray + '…' + ansi.reset ;
		str = str.slice( 0 , maxLength - trail.length ) ;

		// Search for an ansi escape sequence at the end, that could be truncated.
		// The longest one is '\x1b[107m': 6 characters.
		var lastEscape = str.lastIndexOf( '\x1b' ) ;
		if ( lastEscape >= str.length - 6 ) { str = str.slice( 0 , lastEscape ) ; }

		return str + trail ;
	}
} ) ;



inspectStyle.html = Object.assign( {} , inspectStyle.none , {
	tab: '&nbsp;&nbsp;&nbsp;&nbsp;' ,
	newline: '<br />' ,
	limit: str => '<span style="color:red">' + str + '</span>' ,
	type: str => '<i style="color:gray">' + str + '</i>' ,
	constant: str => '<span style="color:cyan">' + str + '</span>' ,
	funcName: str => '<i style="color:magenta">' + str + '</i>' ,
	constructorName: str => '<span style="color:magenta">' + str + '</span>' ,
	length: str => '<i style="color:gray">' + str + '</i>' ,
	key: str => '<span style="color:green">' + str + '</span>' ,
	index: str => '<span style="color:blue">[' + str + ']</span> ' ,
	number: str => '<span style="color:cyan">' + str + '</span>' ,
	inspect: str => '<span style="color:cyan">' + str + '</span>' ,
	string: str => '<span style="color:blue">' + str + '</span>' ,
	errorType: str => '<span style="color:red">' + str + '</span>' ,
	errorMessage: str => '<span style="color:red">' + str + '</span>' ,
	errorStack: str => '<span style="color:gray">' + str + '</span>' ,
	errorStackKeyword: str => '<i>' + str + '</i>' ,
	errorStackMethod: str => '<span style="color:yellow">' + str + '</span>' ,
	errorStackMethodAs: str => '<span style="color:yellow">' + str + '</span>' ,
	errorStackFile: str => '<span style="color:cyan">' + str + '</span>' ,
	errorStackLine: str => '<span style="color:blue">' + str + '</span>' ,
	errorStackColumn: str => '<span style="color:gray">' + str + '</span>' ,
	errorFromMessage: str => '<span style="color:yellow">' + str + '</span>'
} ) ;


}).call(this,{"isBuffer":require("../../is-buffer/index.js")},require('_process'))
},{"../../is-buffer/index.js":8,"./ansi.js":27,"./escape.js":28,"_process":13}],31:[function(require,module,exports){
/*
	HTTP Requester

	Copyright (c) 2015 - 2019 Cédric Ronvel

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
 * Natural Sort algorithm for Javascript - Version 0.8 - Released under MIT license
 * Author: Jim Palmer (based on chunking idea from Dave Koelle)
 */
module.exports = function( a , b ) {
	var re = /(^([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)?$|^0x[\da-fA-F]+$|\d+)/g ,
		sre = /^\s+|\s+$/g ,   // trim pre-post whitespace
		snre = /\s+/g ,        // normalize all whitespace to single ' ' character
		dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[/-]\d{1,4}[/-]\d{1,4}|^\w+, \w+ \d+, \d{4})/ ,
		hre = /^0x[0-9a-f]+$/i ,
		ore = /^0/ ,
		i = function( s ) {
			return ( '' + s ).toLowerCase().replace( sre , '' ) ;
		} ,
		// convert all to strings strip whitespace
		x = i( a ) || '' ,
		y = i( b ) || '' ,
		// chunk/tokenize
		xN = x.replace( re , '\0$1\0' ).replace( /\0$/ , '' )
			.replace( /^\0/ , '' )
			.split( '\0' ) ,
		yN = y.replace( re , '\0$1\0' ).replace( /\0$/ , '' )
			.replace( /^\0/ , '' )
			.split( '\0' ) ,
		// numeric, hex or date detection
		xD = parseInt( x.match( hre ) , 16 ) || ( xN.length !== 1 && Date.parse( x ) ) ,
		yD = parseInt( y.match( hre ) , 16 ) || xD && y.match( dre ) && Date.parse( y ) || null ,
		normChunk = function( s , l ) {
			// normalize spaces; find floats not starting with '0', string or 0 if not defined (Clint Priest)
			return ( ! s.match( ore ) || l === 1 ) && parseFloat( s ) || s.replace( snre , ' ' ).replace( sre , '' ) || 0 ;	// jshint ignore:line
		} ,
		oFxNcL , oFyNcL ;
	// first try and sort Hex codes or Dates
	if ( yD ) {
		if ( xD < yD ) { return -1 ; }
		else if ( xD > yD ) { return 1 ; }
	}
	// natural sorting through split numeric strings and default strings
	for( var cLoc = 0 , xNl = xN.length , yNl = yN.length , numS = Math.max( xNl , yNl ) ; cLoc < numS ; cLoc ++ ) {
		oFxNcL = normChunk( xN[cLoc] , xNl ) ;
		oFyNcL = normChunk( yN[cLoc] , yNl ) ;
		// handle numeric vs string comparison - number < string - (Kyle Adams)
		if ( isNaN( oFxNcL ) !== isNaN( oFyNcL ) ) { return ( isNaN( oFxNcL ) ) ? 1 : -1 ; }
		// rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
		else if ( typeof oFxNcL !== typeof oFyNcL ) {
			oFxNcL += '' ;
			oFyNcL += '' ;
		}
		if ( oFxNcL < oFyNcL ) { return -1 ; }
		if ( oFxNcL > oFyNcL ) { return 1 ; }
	}
	return 0 ;
} ;


},{}],32:[function(require,module,exports){
/*
	String Kit

	Copyright (c) 2014 - 2019 Cédric Ronvel

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
	Javascript does not use UTF-8 but UCS-2.
	The purpose of this module is to process correctly strings containing UTF-8 characters that take more than 2 bytes.

	Since the punycode module is deprecated in Node.js v8.x, this is an adaptation of punycode.ucs2.x
	as found on Aug 16th 2017 at: https://github.com/bestiejs/punycode.js/blob/master/punycode.js.
*/



// Create the module and export it
const unicode = {} ;
module.exports = unicode ;



unicode.encode = array => String.fromCodePoint( ... array ) ;



// Decode a string into an array of unicode codepoints
unicode.decode = str => {
	var value , extra , counter = 0 , output = [] ,
		length = str.length ;

	while ( counter < length ) {
		value = str.charCodeAt( counter ++ ) ;

		if ( value >= 0xD800 && value <= 0xDBFF && counter < length ) {
			// It's a high surrogate, and there is a next character.
			extra = str.charCodeAt( counter ++ ) ;

			if ( ( extra & 0xFC00 ) === 0xDC00 ) {	// Low surrogate.
				output.push( ( ( value & 0x3FF ) << 10 ) + ( extra & 0x3FF ) + 0x10000 ) ;
			}
			else {
				// It's an unmatched surrogate; only append this code unit, in case the
				// next code unit is the high surrogate of a surrogate pair.
				output.push( value ) ;
				counter -- ;
			}
		}
		else {
			output.push( value ) ;
		}
	}

	return output ;
} ;



// Decode only the first char
// Mostly an adaptation of .decode(), not factorized for performance's sake (used by Terminal-kit)
unicode.firstCodePoint = str => {
	var extra ,
		value = str.charCodeAt( 0 ) ;

	if ( value >= 0xD800 && value <= 0xDBFF && str.length >= 2 ) {
		// It's a high surrogate, and there is a next character.
		extra = str.charCodeAt( 1 ) ;

		if ( ( extra & 0xFC00 ) === 0xDC00 ) {	// Low surrogate.
			return ( ( value & 0x3FF ) << 10 ) + ( extra & 0x3FF ) + 0x10000 ;
		}
	}

	return value ;
} ;



// Extract only the first char
// Mostly an adaptation of .decode(), not factorized for performance's sake (used by Terminal-kit)
unicode.firstChar = str => {
	var extra ,
		value = str.charCodeAt( 0 ) ;

	if ( value >= 0xD800 && value <= 0xDBFF && str.length >= 2 ) {
		// It's a high surrogate, and there is a next character.
		extra = str.charCodeAt( 1 ) ;

		if ( ( extra & 0xFC00 ) === 0xDC00 ) {	// Low surrogate.
			return str.slice( 0 , 2 ) ;
		}
	}

	return str[ 0 ] ;
} ;



// Decode a string into an array of unicode characters
// Mostly an adaptation of .decode(), not factorized for performance's sake (used by Terminal-kit)
unicode.toArray = str => {
	var value , extra , counter = 0 , output = [] ,
		length = str.length ;

	while ( counter < length ) {
		value = str.charCodeAt( counter ++ ) ;

		if ( value >= 0xD800 && value <= 0xDBFF && counter < length ) {
			// It's a high surrogate, and there is a next character.
			extra = str.charCodeAt( counter ++ ) ;

			if ( ( extra & 0xFC00 ) === 0xDC00 ) {	// Low surrogate.
				output.push( str.slice( counter - 2 , counter ) ) ;
			}
			else {
				// It's an unmatched surrogate; only append this code unit, in case the
				// next code unit is the high surrogate of a surrogate pair.
				output.push( str[ counter - 2 ] ) ;
				counter -- ;
			}
		}
		else {
			output.push( str[ counter - 1 ] ) ;
		}
	}

	return output ;
} ;



// Decode a string into an array of unicode characters
// Wide chars have an additionnal filler cell, so position is correct
// Mostly an adaptation of .decode(), not factorized for performance's sake (used by Terminal-kit)
unicode.toCells = ( Cell , str , tabWidth = 4 , linePosition = 0 , ... extraCellArgs ) => {
	var value , extra , counter = 0 , output = [] ,
		fillSize ,
		length = str.length ;

	while ( counter < length ) {
		value = str.charCodeAt( counter ++ ) ;

		if ( value === 0x0a ) {	// New line
			linePosition = 0 ;
		}
		else if ( value === 0x09 ) {	// Tab
			// Depends upon the next tab-stop
			fillSize = tabWidth - ( linePosition % tabWidth ) - 1 ;
			output.push( new Cell( '\t' , ... extraCellArgs ) ) ;
			linePosition += 1 + fillSize ;
			while ( fillSize -- ) { output.push( new Cell( null , ... extraCellArgs ) ) ; }
		}
		else if ( value >= 0xD800 && value <= 0xDBFF && counter < length ) {
			// It's a high surrogate, and there is a next character.
			extra = str.charCodeAt( counter ++ ) ;

			if ( ( extra & 0xFC00 ) === 0xDC00 ) {	// Low surrogate.
				value = ( ( value & 0x3FF ) << 10 ) + ( extra & 0x3FF ) + 0x10000 ;
				output.push(  new Cell( str.slice( counter - 2 , counter ) , ... extraCellArgs )  ) ;
				linePosition ++ ;

				if ( unicode.codePointWidth( value ) === 2 ) {
					linePosition ++ ;
					output.push( new Cell( null , ... extraCellArgs ) ) ;
				}
			}
			else {
				// It's an unmatched surrogate, remove it.
				// Preserve current char in case the next code unit is the high surrogate of a surrogate pair.
				counter -- ;
			}
		}
		else {
			output.push(  new Cell( str[ counter - 1 ] , ... extraCellArgs )  ) ;
			linePosition ++ ;

			if ( unicode.codePointWidth( value ) === 2 ) {
				output.push( new Cell( null , ... extraCellArgs ) ) ;
				linePosition ++ ;
			}
		}
	}

	return output ;
} ;



unicode.fromCells = ( cells ) => {
	return cells.map( cell => cell.filler ? '' : cell.char ).join( '' ) ;
} ;



// Get the length of an unicode string
// Mostly an adaptation of .decode(), not factorized for performance's sake (used by Terminal-kit)
unicode.length = str => {
	var value , extra , counter = 0 , uLength = 0 ,
		length = str.length ;

	while ( counter < length ) {
		value = str.charCodeAt( counter ++ ) ;

		if ( value >= 0xD800 && value <= 0xDBFF && counter < length ) {
			// It's a high surrogate, and there is a next character.
			extra = str.charCodeAt( counter ++ ) ;

			if ( ( extra & 0xFC00 ) !== 0xDC00 ) {
				// It's an unmatched surrogate; only append this code unit, in case the
				// next code unit is the high surrogate of a surrogate pair.
				counter -- ;
			}
		}

		uLength ++ ;
	}

	return uLength ;
} ;



// Return the width of a string in a terminal/monospace font
unicode.width = str => {
	var count = 0 ;
	unicode.decode( str ).forEach( code => count += unicode.codePointWidth( code ) ) ;
	return count ;
} ;



// Return the width of an array of string in a terminal/monospace font
unicode.arrayWidth = ( array , limit ) => {
	var index , count = 0 ;

	if ( limit === undefined ) { limit = array.length ; }

	for ( index = 0 ; index < limit ; index ++ ) {
		count += unicode.isFullWidth( array[ index ] ) ? 2 : 1 ;
	}

	return count ;
} ;



// Return a string that does not exceed the limit
// Mostly an adaptation of .decode(), not factorized for performance's sake (used by Terminal-kit)
unicode.widthLimit =	// DEPRECATED
unicode.truncateWidth = ( str , limit ) => {
	var value , extra , counter = 0 , lastCounter = 0 , width = 0 ,
		length = str.length ;

	while ( counter < length ) {
		value = str.charCodeAt( counter ++ ) ;

		if ( value >= 0xD800 && value <= 0xDBFF && counter < length ) {
			// It's a high surrogate, and there is a next character.
			extra = str.charCodeAt( counter ++ ) ;

			if ( ( extra & 0xFC00 ) === 0xDC00 ) {	// Low surrogate.
				value = ( ( value & 0x3FF ) << 10 ) + ( extra & 0x3FF ) + 0x10000 ;
			}
			else {
				// It's an unmatched surrogate; only append this code unit, in case the
				// next code unit is the high surrogate of a surrogate pair.
				counter -- ;
			}
		}

		width += unicode.codePointWidth( value ) ;

		if ( width > limit ) {
			return str.slice( 0 , lastCounter ) ;
		}

		lastCounter = counter ;
	}

	// The string remains unchanged
	return str ;
} ;



/*
	Returns:
		0: single char
		1: leading surrogate
		-1: trailing surrogate

	Note: it does not check input, to gain perfs.
*/
unicode.surrogatePair = char => {
	var code = char.charCodeAt( 0 ) ;

	if ( code < 0xd800 || code >= 0xe000 ) { return 0 ; }
	else if ( code < 0xdc00 ) { return 1 ; }
	return -1 ;
} ;



/*
	Check if a character is a full-width char or not.
*/
unicode.isFullWidth = char => {
	if ( char.length <= 1 ) { return unicode.isFullWidthCodePoint( char.codePointAt( 0 ) ) ; }
	return unicode.isFullWidthCodePoint( unicode.firstCodePoint( char ) ) ;
} ;


// Return the width of a char, leaner than .width() for one char
unicode.charWidth = char => {
	if ( char.length <= 1 ) { return unicode.codePointWidth( char.codePointAt( 0 ) ) ; }
	return unicode.codePointWidth( unicode.firstCodePoint( char ) ) ;
} ;



/*
	Check if a codepoint represent a full-width char or not.

	Borrowed from Node.js source, from readline.js.
*/
unicode.codePointWidth = code => {
	// Code points are derived from:
	// http://www.unicode.org/Public/UNIDATA/EastAsianWidth.txt
	if ( code >= 0x1100 && (
		code <= 0x115f ||	// Hangul Jamo
			0x2329 === code || // LEFT-POINTING ANGLE BRACKET
			0x232a === code || // RIGHT-POINTING ANGLE BRACKET
			// CJK Radicals Supplement .. Enclosed CJK Letters and Months
			( 0x2e80 <= code && code <= 0x3247 && code !== 0x303f ) ||
			// Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
			0x3250 <= code && code <= 0x4dbf ||
			// CJK Unified Ideographs .. Yi Radicals
			0x4e00 <= code && code <= 0xa4c6 ||
			// Hangul Jamo Extended-A
			0xa960 <= code && code <= 0xa97c ||
			// Hangul Syllables
			0xac00 <= code && code <= 0xd7a3 ||
			// CJK Compatibility Ideographs
			0xf900 <= code && code <= 0xfaff ||
			// Vertical Forms
			0xfe10 <= code && code <= 0xfe19 ||
			// CJK Compatibility Forms .. Small Form Variants
			0xfe30 <= code && code <= 0xfe6b ||
			// Halfwidth and Fullwidth Forms
			0xff01 <= code && code <= 0xff60 ||
			0xffe0 <= code && code <= 0xffe6 ||
			// Kana Supplement
			0x1b000 <= code && code <= 0x1b001 ||
			// Enclosed Ideographic Supplement
			0x1f200 <= code && code <= 0x1f251 ||
			// CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
			0x20000 <= code && code <= 0x3fffd ) ) {
		return 2 ;
	}

	return 1 ;
} ;

// For a true/false type of result
unicode.isFullWidthCodePoint = code => unicode.codePointWidth( code ) === 2 ;



// Convert normal ASCII chars to their full-width counterpart
unicode.toFullWidth = str => {
	return String.fromCodePoint( ... unicode.decode( str ).map( code =>
		code >= 33 && code <= 126  ?  0xff00 + code - 0x20  :  code
	) ) ;
} ;


},{}],33:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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
	VG: Vector Graphics.
	A portable structure describing some vector graphics.
*/

const svgKit = require( './svg-kit.js' ) ;
const VGContainer = require( './VGContainer.js' ) ;

var autoId = 0 ;



function VG( options ) {
	VGContainer.call( this , options ) ;

	this.id = ( options && options.id ) || 'vg_' + ( autoId ++ ) ;
	this.viewBox = {
		x: 0 , y: 0 , width: 100 , height: 100
	} ;

	this.css = [] ;
	this.invertY = false ;

	if ( options ) { this.set( options ) ; }
}

module.exports = VG ;



VG.prototype = Object.create( VGContainer.prototype ) ;
VG.prototype.constructor = VG ;
VG.prototype.__prototypeUID__ = 'svg-kit/VG' ;
VG.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VG.prototype.svgTag = 'svg' ;

VG.prototype.svgAttributes = function( root = this ) {
	var attr = {
		xmlns: "http://www.w3.org/2000/svg" ,
		viewBox: this.viewBox.x + ' ' + ( root.invertY ? -this.viewBox.y - this.viewBox.height : this.viewBox.y ) + ' ' + this.viewBox.width + ' ' + this.viewBox.height
	} ;

	return attr ;
} ;



VG.prototype.set = function( data ) {
	VGContainer.prototype.set.call( this , data ) ;

	if ( data.viewBox && typeof data.viewBox === 'object' ) {
		if ( data.viewBox.x !== undefined ) { this.viewBox.x = data.viewBox.x ; }
		if ( data.viewBox.y !== undefined ) { this.viewBox.y = data.viewBox.y ; }
		if ( data.viewBox.width !== undefined ) { this.viewBox.width = data.viewBox.width ; }
		if ( data.viewBox.height !== undefined ) { this.viewBox.height = data.viewBox.height ; }
	}

	if ( data.css && Array.isArray( data.css ) ) {
		this.css.length = 0 ;
		for ( let rule of data.css ) {
			this.addCssRule( rule ) ;
		}
	}

	if ( data.invertY !== undefined ) { this.invertY = !! data.invertY ; }
} ;



/*
    To update a style:
    $style = $element.querySelector( 'style' ) ;
    $style.sheet <-- this is a StyleSheet object
    $style.sheet.cssRules
    $style.sheet.cssRules[0].type                   type:1 for style rules, other can be important rules (3), media rule (4), keyframes rule (7)
    $style.sheet.cssRules[0].selectorText           the selector for this rule
    $style.sheet.cssRules[0].style.<cssProperty>    it works like any $element.style
    $style.sheet.insertRule( <cssText> , index )    insert a new CSS rule, passing a pure CSS string, the index is where it should be inserted (default to 0: at the begining)
    $style.sheet.deleteRule( index )                delete the rule at this index, see $style.sheet.length
    ...
*/

VG.prototype.addCssRule = function( rule ) {
	if ( ! rule || typeof rule !== 'object' || ! rule.select || ! rule.style || typeof rule.style !== 'object' ) { return ; }
	this.css.push( rule ) ;
} ;


},{"../package.json":45,"./VGContainer.js":34,"./svg-kit.js":42}],34:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const svgKit = require( './svg-kit.js' ) ;
const VGItem = require( './VGItem.js' ) ;



function VGContainer( options ) {
	VGItem.call( this , options ) ;
	this.items = [] ;
}

module.exports = VGContainer ;

VGContainer.prototype = Object.create( VGItem.prototype ) ;
VGContainer.prototype.constructor = VGContainer ;
VGContainer.prototype.__prototypeUID__ = 'svg-kit/VGContainer' ;
VGContainer.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VGContainer.prototype.isContainer = true ;



VGContainer.prototype.set = function( data ) {
	VGItem.prototype.set.call( this , data ) ;

	if ( data.items && Array.isArray( data.items ) ) {
		for ( let item of data.items ) {
			this.items.push( svgKit.objectToVG( item ) ) ;
		}
	}
} ;



VGContainer.prototype.exportMorphLog = function() {
	var hasInner = false , inner = {} ;

	this.items.forEach( ( item , index ) => {
		var log = item.exportMorphLog() ;
		if ( log ) {
			inner[ index ] = log ;
			hasInner = true ;
		}
	} ) ;

	if ( ! hasInner && ! this.morphLog.length ) { return null ; }

	var output = {} ;
	if ( this.morphLog.length ) { output.l = [ ... this.morphLog ] ; }
	if ( hasInner ) { output.i = inner ; }

	this.morphLog.length = 0 ;
	return output ;
} ;



VGContainer.prototype.importMorphLog = function( log ) {
	var key , index ;

	if ( ! log ) {
		this.morphLog.length = 0 ;
		return ;
	}

	if ( ! log.l || ! log.l.length ) { this.morphLog.length = 0 ; }
	else { this.morphLog = log.l ; }

	if ( log.i ) {
		for ( key in log.i ) {
			index = + key ;
			if ( this.items[ index ] ) {
				this.items[ index ].importMorphLog( log.i[ key ] ) ;
			}
		}
	}
} ;



// Update the DOM, based upon the morphLog
VGContainer.prototype.morphDom = function( root = this ) {
	this.items.forEach( item => item.morphDom( root ) ) ;
	this.morphLog.forEach( entry => this.morphOneEntryDom( entry , root ) ) ;
	this.morphLog.length = 0 ;
	return this.$element ;
} ;


},{"../package.json":45,"./VGItem.js":37,"./svg-kit.js":42}],35:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const VGItem = require( './VGItem.js' ) ;



function VGEllipse( options ) {
	VGItem.call( this , options ) ;

	this.x = 0 ;
	this.y = 0 ;
	this.rx = 0 ;
	this.ry = 0 ;

	if ( options ) { this.set( options ) ; }
}

module.exports = VGEllipse ;

VGEllipse.prototype = Object.create( VGItem.prototype ) ;
VGEllipse.prototype.constructor = VGEllipse ;
VGEllipse.prototype.__prototypeUID__ = 'svg-kit/VGEllipse' ;
VGEllipse.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VGEllipse.prototype.svgTag = 'ellipse' ;

VGEllipse.prototype.svgAttributes = function( root = this ) {
	var attr = {
		cx: this.x ,
		cy: root.invertY ? -this.y : this.y ,
		rx: this.rx ,
		ry: this.ry
	} ;

	return attr ;
} ;



VGEllipse.prototype.set = function( data ) {
	VGItem.prototype.set.call( this , data ) ;

	// Interop'
	if ( data.cx !== undefined ) { this.x = data.cx ; }
	if ( data.cy !== undefined ) { this.y = data.cy ; }

	if ( data.x !== undefined ) { this.x = data.x ; }
	if ( data.y !== undefined ) { this.y = data.y ; }
	if ( data.r !== undefined ) { this.rx = this.ry = data.r ; }
	if ( data.rx !== undefined ) { this.rx = data.rx ; }
	if ( data.ry !== undefined ) { this.ry = data.ry ; }
} ;


},{"../package.json":45,"./VGItem.js":37}],36:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const svgKit = require( './svg-kit.js' ) ;
const VGContainer = require( './VGContainer.js' ) ;



function VGGroup( options ) {
	VGContainer.call( this , options ) ;
	if ( options ) { this.set( options ) ; }
}

module.exports = VGGroup ;

VGGroup.prototype = Object.create( VGContainer.prototype ) ;
VGGroup.prototype.constructor = VGGroup ;
VGGroup.prototype.__prototypeUID__ = 'svg-kit/VGGroup' ;
VGGroup.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VGGroup.prototype.svgTag = 'g' ;

VGGroup.prototype.set = function( data ) {
	VGContainer.prototype.set.call( this , data ) ;
} ;


},{"../package.json":45,"./VGContainer.js":34,"./svg-kit.js":42}],37:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const camel = require( 'string-kit/lib/camel' ) ;
const escape = require( 'string-kit/lib/escape' ) ;



function VGItem( options ) {
	this.id = null ;
	this.class = new Set() ;
	this.style = {} ;
	this.data = null ;		// User custom data, e.g. data-* attributes

	// Spellcast data
	this.button = null ;
	this.hint = null ;
	this.area = null ;

	this.morphLog = [] ;
	this.$element = null ;
	this.$style = null ;
}

module.exports = VGItem ;

VGItem.prototype.__prototypeUID__ = 'svg-kit/VGItem' ;
VGItem.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VGItem.prototype.isContainer = false ;
VGItem.prototype.svgTag = 'none' ;
VGItem.prototype.svgAttributes = () => ( {} ) ;



VGItem.prototype.toJSON = function() {
	var object = Object.assign( {} , this ) ;

	object._type = this.__prototypeUID__ ;

	if ( this.class.size ) { object.class = [ ... this.class ] ; }
	else { delete object.class ; }

	if ( ! object.id ) { delete object.id ; }
	if ( ! object.data ) { delete object.data ; }
	if ( ! object.button ) { delete object.button ; }
	if ( ! object.hint ) { delete object.hint ; }
	if ( ! object.area ) { delete object.area ; }

	delete object.morphLog ;
	delete object.$element ;
	delete object.$style ;

	return object ;
} ;



VGItem.prototype.set = function( data ) {
	if ( data.id !== undefined ) { this.id = data.id || null ; }

	if ( data.class ) {
		if ( typeof data.class === 'string' ) {
			this.class.clear() ;
			this.class.add( data.class ) ;
		}
		else if ( Array.isArray( data.class ) || ( data.class instanceof Set ) ) {
			this.class.clear() ;

			for ( let className of data.class ) {
				this.class.add( className ) ;
			}
		}
		else if ( typeof data.class === 'object' ) {
			for ( let className in data.class ) {
				if ( data.class[ className ] ) { this.class.add( className ) ; }
				else { this.class.delete( className ) ; }
			}
		}
	}

	if ( data.style ) {
		for ( let key in data.style ) {
			// Stored in the camelCase variant
			this.style[ this.toCamelCase( key ) ] = data.style[ key ] === null ? '' : data.style[ key ] ;
		}
	}

	if ( data.data !== undefined ) {
		// User custom data, e.g. data-* attributes
		if ( ! data.data ) {
			this.data = null ;
		}
		else {
			if ( ! this.data ) { this.data = {} ; }
			Object.assign( this.data , data.data ) ;
		}
	}

	if ( data.button !== undefined ) { this.button = data.button || null ; }
	if ( data.hint !== undefined ) { this.hint = data.hint || null ; }
	if ( data.area !== undefined ) { this.area = data.area || null ; }
} ;



var morphVersion = 0 ;

VGItem.prototype.morph = function( data ) {
	var log = Object.assign( {} , data ) ;
	log._v = morphVersion ++ ;
	this.morphLog.push( log ) ;
	this.set( data ) ;
} ;



VGItem.prototype.exportMorphLog = function() {
	if ( ! this.morphLog.length ) { return null ; }
	var output = { l: [ ... this.morphLog ] } ;
	this.morphLog.length = 0 ;
	return output ;
} ;



VGItem.prototype.importMorphLog = function( log ) {
	if ( ! log || ! log.l || ! log.l.length ) { this.morphLog.length = 0 ; }
	else { this.morphLog = log.l ; }
} ;



// Use the preserveUpperCase option, cause the value can be in camelCased already
VGItem.prototype.toCamelCase = value => camel.toCamelCase( value , true ) ;

VGItem.prototype.escape = function( value ) {
	if ( typeof value === 'object' ) { return null ; }
	if ( typeof value !== 'string' ) { return value ; }
	return escape.htmlAttr( value ) ;
} ;



// Render the Vector Graphic as a text SVG
VGItem.prototype.renderText = function( root = this ) {
	var key , rule , str = '' , styleStr = '' ,
		attr = this.svgAttributes( root ) ;

	str += '<' + this.svgTag ;

	if ( this.id ) { str += ' id="' + this.escape( this.id ) + '"' ; }
	if ( this.button ) { str += ' button="' + this.escape( this.button ) + '"' ; }
	if ( this.hint ) { str += ' hint="' + this.escape( this.hint ) + '"' ; }
	if ( this.area ) { str += ' area="' + this.escape( this.area ) + '"' ; }

	if ( this.class.size ) {
		str += ' class="' ;
		let first = true ;
		for ( let className of this.class ) {
			if ( ! first ) { str += ' ' ; }
			str += this.escape( className ) ;
			first = false ;
		}
		str += '"' ;
	}

	for ( key in attr ) {
		str += ' ' + key + '="' + this.escape( attr[ key ] ) + '"' ;
	}

	if ( this.data ) {
		for ( key in this.data ) {
			str += ' data-' + this.escape( key ) + '="' + this.escape( this.data[ key ] ) + '"' ;
		}
	}

	for ( key in this.style ) {
		// Key is in camelCase, but should use dash
		styleStr += this.escape( camel.camelCaseToDash( key ) ) + ':' + this.escape( this.style[ key ] ) + ';' ;
	}

	if ( styleStr ) {
		str += ' style="' + styleStr + '"' ;
	}

	if ( this.svgTextNode ) {
		str += this.svgTextNode() ;
	}

	if ( ! this.isContainer ) {
		str += ' />' ;
		return str ;
	}

	str += '>' ;

	// StyleSheet inside a <style> tag
	if ( this.css && this.css.length ) {
		str += '<style>\n' ;

		for ( rule of this.css ) {
			str += rule.select + ' {\n' ;
			for ( key in rule.style ) {
				str += '    ' + this.escape( camel.camelCaseToDash( key ) ) + ': ' + this.escape( rule.style[ key ] ) + ';\n' ;
			}
			str += '}\n' ;
		}

		str += '</style>' ;
	}

	// Inner content
	if ( this.items ) {
		for ( let item of this.items ) {
			str += item.renderText( root ) ;
		}
	}

	str += '</' + this.svgTag + '>' ;
	return str ;
} ;



// Render the Vector Graphic inside a browser, as DOM SVG
VGItem.prototype.renderDom = function( options = {} , root = this ) {
	var key , rule , cssStr ,
		attr = this.svgAttributes( root ) ;

	this.$element = document.createElementNS( 'http://www.w3.org/2000/svg' , options.overrideTag || this.svgTag ) ;

	if ( this.id ) { this.$element.setAttribute( 'id' , this.id ) ; }
	if ( this.button ) { this.$element.setAttribute( 'button' , this.button ) ; }
	if ( this.hint ) { this.$element.setAttribute( 'hint' , this.hint ) ; }
	if ( this.area ) { this.$element.setAttribute( 'area' , this.area ) ; }

	if ( this.class.size ) {
		this.class.forEach( className => this.$element.classList.add( className ) ) ;
	}

	for ( key in attr ) {
		this.$element.setAttribute( key , attr[ key ] ) ;
	}

	if ( this.data ) {
		for ( key in this.data ) {
			this.$element.setAttribute( 'data-' + key , this.data[ key ] ) ;
		}
	}

	for ( key in this.style ) {
		// Key is already in camelCase
		this.$element.style[ key ] = this.style[ key ] ;
	}

	if ( this.svgTextNode ) {
		this.$element.appendChild( document.createTextNode( this.svgTextNode() ) ) ;
	}

	if ( ! this.isContainer ) { return this.$element ; }

	// StyleSheet inside a <style> tag
	if ( this.css && this.css.length ) {
		this.$style = document.createElementNS( 'http://www.w3.org/2000/svg' , 'style' ) ;
		//this.$style = document.createElement( 'style' ) ;

		cssStr = '' ;

		for ( rule of this.css ) {
			cssStr += rule.select + ' {\n' ;

			for ( key in rule.style ) {
				// Key is in camelCase, but should use dash
				cssStr += this.escape( camel.camelCaseToDash( key ) ) + ': ' + this.escape( rule.style[ key ] ) + ';\n' ;
			}

			cssStr += '}\n' ;

			// WARNING: this.$style.sheet does not work at that moment, it seems to be added only after behind inserted into the DOM,
			// so we construct a text-node instead of pure rule insertion
			//this.$style.sheet.insertRule( cssStr , this.$style.sheet.length ) ;
		}

		this.$style.appendChild( document.createTextNode( cssStr ) ) ;
		this.$element.appendChild( this.$style ) ;
	}

	// Inner content
	if ( this.items ) {
		for ( let item of this.items ) {
			this.$element.appendChild( item.renderDom( undefined , root ) ) ;
		}
	}

	return this.$element ;
} ;



// Update the DOM, based upon the morphLog
VGItem.prototype.morphDom = function( root = this ) {
	this.morphLog.forEach( entry => this.morphOneEntryDom( entry , root ) ) ;
	this.morphLog.length = 0 ;
	return this.$element ;
} ;



VGItem.prototype.morphOneEntryDom = function( data , root = this ) {
	var key ;

	// Disallow id changes?
	//if ( data.id ) { this.$element.setAttribute( 'id' , data.id ) ; }

	if ( data.button ) { this.$element.setAttribute( 'button' , data.button ) ; }
	if ( data.hint ) { this.$element.setAttribute( 'hint' , data.hint ) ; }
	if ( data.area ) { this.$element.setAttribute( 'area' , data.area ) ; }

	if ( data.class ) {
		if ( Array.isArray( data.class ) ) {
			this.$element.setAttribute( 'class' , data.class.join( ' ' ) ) ;
		}
		else if ( data.class instanceof Set ) {
			this.$element.setAttribute( 'class' , [ ... data.class ].join( ' ' ) ) ;
		}
		else if ( typeof data.class === 'object' ) {
			for ( let className in data.class ) {
				if ( data.class[ className ] ) { this.$element.classList.add( className ) ; }
				else { this.$element.classList.remove( className ) ; }
			}
		}
	}

	if ( data.attr ) {
		for ( key in data.attr ) {
			this.$element.setAttribute( key , data.attr[ key ] ) ;
		}
	}

	if ( data.data ) {
		for ( key in data.data ) {
			this.$element.setAttribute( 'data-' + key , data.data[ key ] ) ;
		}
	}

	if ( data.style ) {
		for ( key in data.style ) {
			// Key is already in camelCase
			this.$element.style[ key ] = data.style[ key ] === null ? '' : data.style[ key ] ;
		}
	}
} ;


},{"../package.json":45,"string-kit/lib/camel":43,"string-kit/lib/escape":44}],38:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const VGItem = require( './VGItem.js' ) ;



function VGPath( options ) {
	VGItem.call( this , options ) ;

	this.commands = [] ;

	if ( options ) { this.set( options ) ; }
}

module.exports = VGPath ;

VGPath.prototype = Object.create( VGItem.prototype ) ;
VGPath.prototype.constructor = VGPath ;
VGPath.prototype.__prototypeUID__ = 'svg-kit/VGPath' ;
VGPath.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VGPath.prototype.svgTag = 'path' ;

VGPath.prototype.svgAttributes = function( root = this ) {
	var attr = {
		// That enigmatic SVG attribute 'd' probably means 'data' or 'draw'
		d: this.toD( root )
	} ;

	return attr ;
} ;



VGPath.prototype.set = function( data ) {
	VGItem.prototype.set.call( this , data ) ;
	if ( Array.isArray( data.commands ) ) { this.commands = data.commands ; }
} ;



// Build the SVG 'd' attribute
VGPath.prototype.toD = function( root = this ) {
	var build = {
		root: root ,
		d: '' ,
		pu: false ,	// Pen Up, when true, turtle-like commands move without tracing anything
		cx: 0 ,		// cursor position x
		cy: 0 ,		// cursor position y
		ca: root.invertY ? -Math.PI / 2 : Math.PI / 2		// cursor angle, default to positive Y-axis
	} ;

	this.commands.forEach( ( command , index ) => {
		if ( index ) { build.d += ' ' ; }
		builders[ command.type ]( command , build ) ;
	} ) ;

	return build.d ;
} ;



const degToRad = deg => deg * Math.PI / 180 ;
const radToDeg = rad => rad * 180 / Math.PI ;



const builders = {} ;

builders.close = ( command , build ) => {
	build.d += 'z' ;
} ;

builders.move = ( command , build ) => {
	var y = build.root.invertY ? -command.y : command.y ;

	if ( command.rel ) {
		build.d += 'm ' + command.x + ' ' + y ;
		build.cx += command.x ;
		build.cy += y ;
	}
	else {
		build.d += 'M ' + command.x + ' ' + y ;
		build.cx = command.x ;
		build.cy = y ;
	}
} ;

builders.line = ( command , build ) => {
	var y = build.root.invertY ? -command.y : command.y ;

	if ( command.rel ) {
		build.d += 'l ' + command.x + ' ' + y ;
		build.cx += command.x ;
		build.cy += y ;
	}
	else {
		build.d += 'L ' + command.x + ' ' + y ;
		build.cx = command.x ;
		build.cy = y ;
	}
} ;

builders.curve = ( command , build ) => {
	var cy1 = build.root.invertY ? -command.cy1 : command.cy1 ,
		cy2 = build.root.invertY ? -command.cy2 : command.cy2 ,
		y = build.root.invertY ? -command.y : command.y ;

	if ( command.rel ) {
		build.d += 'c ' + command.cx1 + ' ' + cy1 + ' ' + command.cx2 + ' ' + cy2 + ' '  + command.x + ' ' + y ;
		build.cx += command.x ;
		build.cy += y ;
	}
	else {
		build.d += 'C ' + command.cx1 + ' ' + cy1 + ' ' + command.cx2 + ' ' + cy2 + ' '  + command.x + ' ' + y ;
		build.cx = command.x ;
		build.cy = y ;
	}
} ;

builders.smoothCurve = ( command , build ) => {
	var cy = build.root.invertY ? -command.cy : command.cy ,
		y = build.root.invertY ? -command.y : command.y ;

	if ( command.rel ) {
		build.d += 's ' + command.cx + ' ' + cy + ' ' + command.x + ' ' + y ;
		build.cx += command.x ;
		build.cy += y ;
	}
	else {
		build.d += 'S ' + command.cx + ' ' + cy + ' ' + command.x + ' ' + y ;
		build.cx = command.x ;
		build.cy = y ;
	}
} ;

builders.qCurve = ( command , build ) => {
	var cy = build.root.invertY ? -command.cy : command.cy ,
		y = build.root.invertY ? -command.y : command.y ;

	if ( command.rel ) {
		build.d += 'q ' + command.cx + ' ' + cy + ' ' + command.x + ' ' + y ;
		build.cx += command.x ;
		build.cy += y ;
	}
	else {
		build.d += 'Q ' + command.cx + ' ' + cy + ' ' + command.x + ' ' + y ;
		build.cx = command.x ;
		build.cy = y ;
	}
} ;

builders.smoothQCurve = ( command , build ) => {
	var y = build.root.invertY ? -command.y : command.y ;

	if ( command.rel ) {
		build.d += 't ' + command.x + ' ' + y ;
		build.cx += command.x ;
		build.cy += y ;
	}
	else {
		build.d += 'T ' + command.x + ' ' + y ;
		build.cx = command.x ;
		build.cy = y ;
	}
} ;

builders.arc = ( command , build ) => {
	var ra = build.root.invertY ? -command.ra : command.ra ,
		pr = build.root.invertY ? ! command.pr : command.pr ,
		y = build.root.invertY ? -command.y : command.y ;

	if ( command.rel ) {
		build.d += 'a ' + command.rx + ' ' + command.ry + ' ' + ra + ' ' + ( + command.la ) + ' '  + ( + pr ) + ' ' + command.x + ' ' + y ;
		build.cx += command.x ;
		build.cy += y ;
	}
	else {
		build.d += 'A ' + command.rx + ' ' + command.ry + ' ' + ra + ' ' + ( + command.la ) + ' '  + ( + pr ) + ' ' + command.x + ' ' + y ;
		build.cx = command.x ;
		build.cy = y ;
	}
} ;

// VG-specific

/*
	Approximation of circles using cubic bezier curves.

	Controle point distance/radius ratio for quarter of circle: 0.55228475 or 4/3 (sqrt(2)-1)
	For half of a circle: 4/3

	From: https://www.tinaja.com/glib/bezcirc2.pdf
	The arc is bissected by the X-axis.
	x0 = cos( / 2)			y0 = sin( / 2)
	x3 = x1					y3 = - y0
	x1 = (4 - x0) / 3		y1 = (1 - x0)(3 - x0) / 3 y0
	x2 = x1					y2 = -y1

	This distance ensure that the mid-time point is exactly on the arc.
	It works very well for angle ranging from 0-90°, can be good enough for 90-180°,
	but it's bad for greater than 180°.
	In fact it's not possible to approximate a 270° arc with a single cubic bezier curve.
*/
function controleDistance( angle ) {
	if ( ! angle ) { return 0 ; }
	var angleRad = degToRad( angle ) ;
	var x0 = Math.cos( angleRad / 2 ) ,
		y0 = Math.sin( angleRad / 2 ) ,
		x1 = ( 4 - x0 ) / 3 ,
		y1 = ( 1 - x0 ) * ( 3 - x0 ) / ( 3 * y0 ) ;
	return Math.sqrt( ( x0 - x1 ) ** 2 + ( y0 - y1 ) ** 2 ) ;
}

builders.centerArc = ( command , build ) => {

	// ---------------------------------------------------------------------------------- NOT CODED ----------------------------------------------------------------

	// It's supposed to ease circle creation inside path, converting them to SVG curves...

	var { x , y , cx , cy } = command ;

	if ( command.rel ) {
		x += build.cx ;
		y += build.cy ;
		cx += build.cx ;
		cy += build.cy ;
	}

	var startAngle = Math.atan2( build.cy - cy , build.cx - cx ) ,
		endAngle = Math.atan2( y - cy , x - cx ) ;

	build.cx = x ;
	build.cy = y ;
} ;

// Turtle-like

builders.pen = ( command , build ) => {
	build.pu = command.u ;
} ;

builders.forward = ( command , build ) => {
	var dx = command.l * Math.cos( build.ca ) ,
		dy = command.l * Math.sin( build.ca ) ;

	if ( build.pu ) { build.d += 'm ' + dx + ' ' + dy ; }
	else { build.d += 'l ' + dx + ' ' + dy ; }

	build.cx += dx ;
	build.cy += dy ;
} ;

builders.turn = ( command , build ) => {
	var a = build.root.invertY ? -command.a : command.a ;

	if ( command.rel ) {
		build.ca += degToRad( a ) ;
	}
	else {
		build.ca = degToRad( a ) ;
	}
} ;

builders.forwardTurn = ( command , build ) => {
	var a = build.root.invertY ? -command.a : command.a ;

	/*
		We will first transpose to a circle of center 0,0 and we are starting at x=radius,y=0 and moving positively
	*/
	var angleRad = degToRad( a ) ,
		angleSign = angleRad >= 0 ? 1 : -1 ,
		alpha = Math.abs( angleRad ) ,
		radius = command.l / alpha ,
		trX = radius * Math.cos( alpha ) ,
		trY = radius * Math.sin( alpha ) ,
		dist = Math.sqrt( ( radius - trX ) ** 2 + trY ** 2 ) ,
		beta = Math.atan2( radius - trX , trY ) ;	// beta is the deviation

	var dx = dist * Math.cos( build.ca + angleSign * beta ) ,
		dy = dist * Math.sin( build.ca + angleSign * beta ) ;

	if ( build.pu ) {
		build.d += 'm ' + dx + ' ' + dy ;
	}
	else {
		build.d += 'a ' + radius + ' ' + radius + ' 0 ' + ( alpha > Math.PI ? 1 : 0 ) + ' '  + ( angleRad >= 0 ? 1 : 0 ) + ' ' + dx + ' ' + dy ;
	}

	build.cx += dx ;
	build.cy += dy ;
	build.ca += angleRad ;
} ;



/*
	First, true SVG path commands
*/

VGPath.prototype.close = function() {
	this.commands.push( { type: 'close' } ) ;
} ;

VGPath.prototype.move = function( data ) {
	this.commands.push( {
		type: 'move' ,
		rel: true ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.moveTo = function( data ) {
	this.commands.push( {
		type: 'move' ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.line = function( data ) {
	this.commands.push( {
		type: 'line' ,
		rel: true ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.lineTo = function( data ) {
	this.commands.push( {
		type: 'line' ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.curve = function( data ) {
	this.commands.push( {
		type: 'curve' ,
		rel: true ,
		cx1: data.cx1 || 0 ,
		cy1: data.cy1 || 0 ,
		cx2: data.cx2 || 0 ,
		cy2: data.cy2 || 0 ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.curveTo = function( data ) {
	this.commands.push( {
		type: 'curve' ,
		cx1: data.cx1 || 0 ,
		cy1: data.cy1 || 0 ,
		cx2: data.cx2 || 0 ,
		cy2: data.cy2 || 0 ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.smoothCurve = function( data ) {
	this.commands.push( {
		type: 'smoothCurve' ,
		rel: true ,
		cx: data.cx || data.cx2 || 0 ,
		cy: data.cy || data.cy2 || 0 ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.smoothCurveTo = function( data ) {
	this.commands.push( {
		type: 'smoothCurve' ,
		cx: data.cx || data.cx2 || 0 ,
		cy: data.cy || data.cy2 || 0 ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

// q-curve = Quadratic curve, it uses just one controle point instead of two
VGPath.prototype.qCurve = function( data ) {
	this.commands.push( {
		type: 'qCurve' ,
		rel: true ,
		cx: data.cx || data.cx1 || 0 ,
		cy: data.cy || data.cy1 || 0 ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.qCurveTo = function( data ) {
	this.commands.push( {
		type: 'qCurve' ,
		cx: data.cx || data.cx1 || 0 ,
		cy: data.cy || data.cy1 || 0 ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.smoothQCurve = function( data ) {
	this.commands.push( {
		type: 'smoothQCurve' ,
		rel: true ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.smoothQCurveTo = function( data ) {
	this.commands.push( {
		type: 'smoothQCurve' ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.arc = function( data ) {
	this.commands.push( {
		type: 'arc' ,
		rel: true ,
		rx: data.rx || 0 ,
		ry: data.ry || 0 ,
		ra: data.ra || data.a || 0 ,	// x-axis rotation
		la:
			data.largeArc !== undefined ? !! data.largeArc :
			data.longArc !== undefined ? !! data.longArc :
			data.la !== undefined ? !! data.la :
			false ,
		pr:
			data.positiveRotation !== undefined ? !! data.positiveRotation :
			data.sweep !== undefined ? !! data.sweep :		// <- this is the SVG term
			data.pr !== undefined ? !! data.pr :
			true ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.arcTo = function( data ) {
	this.commands.push( {
		type: 'arc' ,
		rx: data.rx || 0 ,
		ry: data.ry || 0 ,
		ra: data.ra || data.a || 0 ,	// x-axis rotation
		la:
			data.largeArc !== undefined ? !! data.largeArc :
			data.longArc !== undefined ? !! data.longArc :
			data.la !== undefined ? !! data.la :
			false ,
		pr:
			data.positiveRotation !== undefined ? !! data.positiveRotation :
			data.sweep !== undefined ? !! data.sweep :		// <- this is the SVG term
			data.pr !== undefined ? !! data.pr :
			true ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

// All angles use positive as Y-axis to X-axis (Spellcast usage)
VGPath.prototype.negativeArc = function( data ) {
	this.commands.push( {
		type: 'arc' ,
		rel: true ,
		rx: data.rx || 0 ,
		ry: data.ry || 0 ,
		ra: -( data.ra || data.a || 0 ) ,	// x-axis rotation
		la:
			data.largeArc !== undefined ? !! data.largeArc :
			data.longArc !== undefined ? !! data.longArc :
			data.la !== undefined ? !! data.la :
			false ,
		pr: ! (
			data.positiveRotation !== undefined ? !! data.positiveRotation :
			data.sweep !== undefined ? !! data.sweep :		// <- this is the SVG term
			data.pr !== undefined ? !! data.pr :
			true
		) ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

// All angles use positive as Y-axis to X-axis (Spellcast usage)
VGPath.prototype.negativeArcTo = function( data ) {
	this.commands.push( {
		type: 'arc' ,
		rx: data.rx || 0 ,
		ry: data.ry || 0 ,
		ra: -( data.ra || data.a || 0 ) ,	// x-axis rotation
		la:
			data.largeArc !== undefined ? !! data.largeArc :
			data.longArc !== undefined ? !! data.longArc :
			data.la !== undefined ? !! data.la :
			false ,
		pr: ! (
			data.positiveRotation !== undefined ? !! data.positiveRotation :
			data.sweep !== undefined ? !! data.sweep :		// <- this is the SVG term
			data.pr !== undefined ? !! data.pr :
			true
		) ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;



/*
	VG-specific commands
*/

// Better arc-like command, but use curve behind the scene
VGPath.prototype.centerArc = function( data ) {
	this.commands.push( {
		type: 'centerArc' ,
		rel: true ,
		cx: data.cx || 0 ,
		cy: data.cy || 0 ,
		la: data.largeArc !== undefined ? !! data.largeArc :
		data.longArc !== undefined ? !! data.longArc :
		data.la !== undefined ? !! data.la :
		false ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;

VGPath.prototype.centerArcTo = function( data ) {
	this.commands.push( {
		type: 'centerArc' ,
		cx: data.cx || 0 ,
		cy: data.cy || 0 ,
		la: data.largeArc !== undefined ? !! data.largeArc :
		data.longArc !== undefined ? !! data.longArc :
		data.la !== undefined ? !! data.la :
		false ,
		x: data.x || 0 ,
		y: data.y || 0
	} ) ;
} ;



/*
	Turtle-like commands
*/

VGPath.prototype.penUp = function( data ) {
	this.commands.push( {
		type: 'pen' ,
		u: true
	} ) ;
} ;

VGPath.prototype.penDown = function( data ) {
	this.commands.push( {
		type: 'pen' ,
		u: false
	} ) ;
} ;

VGPath.prototype.forward = function( data ) {
	this.commands.push( {
		type: 'forward' ,
		l: typeof data === 'number' ? data : data.length || data.l || 0
	} ) ;
} ;

VGPath.prototype.backward = function( data ) {
	this.commands.push( {
		type: 'forward' ,
		l: -( typeof data === 'number' ? data : data.length || data.l || 0 )
	} ) ;
} ;

// Turn using positive as X-axis to Y-axis
VGPath.prototype.turn = function( data ) {
	this.commands.push( {
		type: 'turn' ,
		rel: true ,
		a: typeof data === 'number' ? data : data.angle || data.a || 0
	} ) ;
} ;

// Turn from X-axis to Y-axis
VGPath.prototype.turnTo = function( data ) {
	this.commands.push( {
		type: 'turn' ,
		a: typeof data === 'number' ? data : data.angle || data.a || 0
	} ) ;
} ;

// Turn using positive as Y-axis to X-axis (Spellcast usage)
VGPath.prototype.negativeTurn = function( data ) {
	this.commands.push( {
		type: 'turn' ,
		rel: true ,
		a: -( typeof data === 'number' ? data : data.angle || data.a || 0 )
	} ) ;
} ;

// Turn from Y-axis to X-axis (clockwise when Y point upward, the invert of the standard 2D computer graphics) (Spellcast usage)
VGPath.prototype.negativeTurnTo = function( data ) {
	this.commands.push( {
		type: 'turn' ,
		a: 90 - ( typeof data === 'number' ? data : data.angle || data.a || 0 )
	} ) ;
} ;

// A turtle-like way of doing a curve: combine a forward and turn, moving along a circle
VGPath.prototype.forwardTurn = function( data ) {
	this.commands.push( {
		type: 'forwardTurn' ,
		l: data.length || data.l || 0 ,
		a: data.angle || data.a || 0
	} ) ;
} ;

// Turn using positive as Y-axis to X-axis (clockwise when Y point upward, the invert of the standard 2D computer graphics) (Spellcast usage)
VGPath.prototype.forwardNegativeTurn = function( data ) {
	this.commands.push( {
		type: 'forwardTurn' ,
		l: data.length || data.l || 0 ,
		a: -( data.angle || data.a || 0 )
	} ) ;
} ;


},{"../package.json":45,"./VGItem.js":37}],39:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const VGItem = require( './VGItem.js' ) ;



function VGRect( options ) {
	VGItem.call( this , options ) ;

	this.x = 0 ;
	this.y = 0 ;
	this.width = 0 ;
	this.height = 0 ;

	// Round corner radius
	this.rx = 0 ;
	this.ry = 0 ;

	if ( options ) { this.set( options ) ; }
}

module.exports = VGRect ;

VGRect.prototype = Object.create( VGItem.prototype ) ;
VGRect.prototype.constructor = VGRect ;
VGRect.prototype.__prototypeUID__ = 'svg-kit/VGRect' ;
VGRect.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VGRect.prototype.svgTag = 'rect' ;

VGRect.prototype.svgAttributes = function( root = this ) {
	var attr = {
		x: this.x ,
		y: root.invertY ? -this.y : this.y ,
		width: this.width ,
		height: this.height ,
		rx: this.rx ,
		ry: this.ry
	} ;

	return attr ;
} ;



VGRect.prototype.set = function( data ) {
	VGItem.prototype.set.call( this , data ) ;

	if ( data.x !== undefined ) { this.x = data.x ; }
	if ( data.y !== undefined ) { this.y = data.y ; }
	if ( data.width !== undefined ) { this.width = data.width ; }
	if ( data.height !== undefined ) { this.height = data.height ; }

	// Round corner radius
	if ( data.r !== undefined ) { this.rx = this.ry = data.r ; }
	if ( data.rx !== undefined ) { this.rx = data.rx ; }
	if ( data.ry !== undefined ) { this.ry = data.ry ; }
} ;


},{"../package.json":45,"./VGItem.js":37}],40:[function(require,module,exports){
/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const VGItem = require( './VGItem.js' ) ;



/*
	/!\ Must support text on path
*/

function VGText( options ) {
	VGItem.call( this , options ) ;

	this.x = 0 ;
	this.y = 0 ;
	this.text = '' ;
	this.anchor = null ;		// the CSS 'text-anchors', can be 'start', 'middle' or 'end', in VG it default to 'middle' instead of 'start'
	this.length = null ;		// the length of the text, textLength in SVG
	this.adjustGlyph = false ;	// true make SVG's 'lengthAdjust' set to 'spacingAndGlyphs', false does not set it (the default for SVG being 'spacing')

	// Position text relative to the previous text element
	//this.dx = 0 ;
	//this.dy = 0 ;

	if ( options ) { this.set( options ) ; }
}

module.exports = VGText ;

VGText.prototype = Object.create( VGItem.prototype ) ;
VGText.prototype.constructor = VGText ;
VGText.prototype.__prototypeUID__ = 'svg-kit/VGText' ;
VGText.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



VGText.prototype.svgTag = 'text' ;

VGText.prototype.svgAttributes = function( root = this ) {
	var attr = {
		x: this.x ,
		y: root.invertY ? -this.y : this.y ,
		'text-anchor': this.anchor || 'middle'
	} ;

	if ( this.length !== null ) { attr.textLength = this.length ; }
	if ( this.adjustGlyph !== null ) { attr.lengthAdjust = 'spacingAndGlyphs' ; }

	return attr ;
} ;



VGText.prototype.svgTextNode = function() {
	// Text-formatting should be possible
	return this.text ;
} ;



VGText.prototype.set = function( data ) {
	VGItem.prototype.set.call( this , data ) ;

	if ( data.x !== undefined ) { this.x = data.x ; }
	if ( data.y !== undefined ) { this.y = data.y ; }

	if ( data.text !== undefined ) { this.text = data.text ; }

	// Interop'
	if ( data.textAnchor !== undefined ) { this.anchor = data.textAnchor ; }
	if ( data.anchor !== undefined ) { this.anchor = data.anchor ; }

	// Interop'
	if ( data.textLength !== undefined ) { this.length = data.textLength ; }
	if ( data.length !== undefined ) { this.length = data.length ; }

	// Interop'
	if ( data.lengthAdjust === 'spacingAndGlyphs' ) { this.adjustGlyph = true ; }
	else if ( data.lengthAdjust === 'spacing' ) { this.adjustGlyph = false ; }
	if ( data.adjustGlyph !== undefined ) { this.adjustGlyph = !! data.adjustGlyph ; }
} ;


},{"../package.json":45,"./VGItem.js":37}],41:[function(require,module,exports){
/*
	SVG Kit

	Copyright (c) 2017 - 2019 Cédric Ronvel

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



const path = {} ;
module.exports = path ;



path.dFromPoints = ( points , invertY ) => {
	var yMul = invertY ? -1 : 1 ,
		str = 'M' ;

	points.forEach( point => {
		str += ' ' + point.x + ',' + ( point.y * yMul ) ;
	} ) ;

	return str ;
} ;


},{}],42:[function(require,module,exports){
(function (process){
/*
	SVG Kit

	Copyright (c) 2017 - 2019 Cédric Ronvel

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



const fs = require( 'fs' ).promises ;
const domKit = require( 'dom-kit' ) ;
const Promise = require( 'seventh' ) ;
const escape = require( 'string-kit/lib/escape.js' ) ;

function noop() {}



const svgKit = {} ;
module.exports = svgKit ;

svgKit.path = require( './path.js' ) ;

svgKit.VG = require( './VG.js' ) ;
svgKit.VGItem = require( './VGItem.js' ) ;
svgKit.VGContainer = require( './VGContainer.js' ) ;
svgKit.VGGroup = require( './VGGroup.js' ) ;
svgKit.VGRect = require( './VGRect.js' ) ;
svgKit.VGEllipse = require( './VGEllipse.js' ) ;
svgKit.VGPath = require( './VGPath.js' ) ;
svgKit.VGText = require( './VGText.js' ) ;



/*
	load( url , [options] )

	* url: the URL of the .svg file
	* options: (optional) object of options, transmitted to .inject() and .patch()

	Return a promise resolving to the SVG DOM document.
*/
svgKit.load = async function( url , options = {} ) {
	var content , $doc , $svg ;

	if ( ! process.browser ) {
		// Use Node.js 'fs' module
		if ( url.substring( 0 , 7 ) === 'file://' ) { url = url.slice( 7 ) ; }
		content = await fs.readFile( url , 'utf8' ) ;
		$doc = domKit.fromXml( content ) ;
	}
	else {
		// Use an AJAX HTTP Request
		$doc = await svgKit.ajax( url ) ;
	}

	if ( options.removeComments ) {
		domKit.removeComments( $doc ) ;
		delete options.removeComments ;
	}

	$svg = $doc.documentElement ;
	svgKit.inject( $svg , options ) ;
	return $svg ;
} ;



svgKit.loadFromString = async function( content , options = {} ) {
	var $doc = domKit.fromXml( content ) ;

	if ( options.removeComments ) {
		domKit.removeComments( $doc ) ;
		delete options.removeComments ;
	}

	var $svg = $doc.documentElement ;
	svgKit.inject( $svg , options ) ;
	return $svg ;
} ;



svgKit.ajax = function( url ) {
	var promise = new Promise() ,
		xhr = new XMLHttpRequest() ;

	xhr.responseType = 'document' ;

	xhr.onreadystatechange = () => {
		// From MDN: In the event of a communication error (such as the webserver going down),
		// an exception will be thrown when attempting to access the 'status' property.

		try {
			if ( xhr.readyState === 4 ) {
				if ( xhr.status === 200 ) {
					promise.resolve( xhr.responseXML ) ;
				}
				else if ( xhr.status === 0 && xhr.responseXML ) {	// Yay, loading with file:// does not provide any status...
					promise.resolve( xhr.responseXML ) ;
				}
				else if ( xhr.status ) { promise.reject( xhr.status ) ; }
				else { promise.reject( new Error( "[svg-kit] ajaxStatus(): Error with falsy status" ) ) ; }
			}
		}
		catch ( error ) {
			promise.reject( error ) ;
		}
	} ;

	xhr.open( 'GET' , url ) ;
	xhr.send() ;

	return promise ;
} ;



/*
	Fix few <svg> things in order to inject it in the dom

	* $svg: the svg element
	* options: options object, where:
		* into: `DOMElement` an element where the .svg file should be loaded into
		* as: `DOMElement` a <svg> element where the .svg file should replace, almost like the "into" option,
		  useful when a <svg> tag should be created synchronously to start doing stuffs on it,
		  and let the asynchronous loading works in the background
		* all other options are passed to .patch()
*/
svgKit.inject = function( $svg , options ) {
	svgKit.patch( $svg , options ) ;

	if ( options.into ) { options.into.appendChild( $svg ) ; }

	// Better to avoid to check the tag name:
	// it's too defensive and it prevents from loading inside a <g> tag
	if ( options.as ) { //&& options.as.tagName.toLowerCase() === 'svg' )
		domKit.moveAttributes( $svg , options.as ) ;
		domKit.moveChildrenInto( $svg , options.as ) ;
	}
} ;



/*
	Fix few <svg> things.

	* $svg: the svg element
	* options: options object, where:
		* id: `string` the id attribute of the <svg> tag (recommanded)
		* removeIds: `boolean` remove all 'id' attributes
		* prefixIds: `string` prefix all IDs and patch url #ref
		* hidden: `boolean` turn the svg hidden (useful to apply modification before the show)
		* class: `string` or `object` (key=class, value=true/false) to add/remove on the <svg> tag
		* removeSize: `boolean` remove the width and height attribute and style from the <svg> tag
		* removeSvgStyle: `boolean` remove the top-level style attribute of the <svg> tag
		* removeDefaultStyles: `boolean` used to removed meaningless style pollution
		* css: `object` a css object to apply on the <svg> tag
		* colorClass: `boolean` a very specialized option. It moves all stroke and fill color inline styles to attribute
		  on all drawing elements and add the "primary" class to those that are class-less.
		  Since CSS has a greater priority than attributes (but lesser than inline styles), this allows us to controle
		  color using CSS.
		* removeComments: `boolean` remove all comment nodes
		* removeWhiteSpaces: `boolean` remove all white-space
		* removeWhiteLines: `boolean` remove all empty lines
		* removeExoticNamespaces: `boolean` remove all tag and attributes that have a namespace different than svg,
		  the svg namespace is stripped
*/
svgKit.patch = function( $svg , options ) {
	var viewBox , width , height ;

	svgKit.lightCleanup( $svg ) ;

	// Fix id, if necessary
	if ( options.id !== undefined ) {
		if ( typeof options.id === 'string' ) { $svg.setAttribute( 'id' , options.id ) ; }
		else if ( ! options.id ) { $svg.removeAttribute( 'id' ) ; }
	}

	if ( options.class ) {
		if ( typeof options.class === 'string' ) { $svg.classList.add( options.class ) ; }
		else if ( typeof options.class === 'object' ) { domKit.class( $svg , options.class ) ; }
	}

	if ( options.hidden ) { $svg.style.visibility = 'hidden' ; }

	if ( options.prefixIds ) { domKit.prefixIds( $svg , options.prefixIds ) ; }
	if ( options.removeIds ) { domKit.removeAllAttributes( $svg , 'id' ) ; }

	if ( options.removeSvgStyle ) { $svg.removeAttribute( 'style' ) ; }
	if ( options.removeDefaultStyles ) { svgKit.removeDefaultStyles( $svg ) ; }
	if ( options.removeComments ) { domKit.removeComments( $svg ) ; }

	if ( options.removeExoticNamespaces ) {
		domKit.filterByNamespace( $svg , { primary: 'svg' , whitelist: [] } ) ;
	}

	if ( options.removeSize ) {
		// Save and remove the width and height attribute
		width = $svg.getAttribute( 'width' ) || $svg.style.width ;
		height = $svg.getAttribute( 'height' ) || $svg.style.height ;

		$svg.removeAttribute( 'height' ) ;
		$svg.removeAttribute( 'width' ) ;
		$svg.style.width = null ;
		$svg.style.height = null ;

		// if the $svg don't have a viewBox attribute, set it now from the width and height (it works most of time)
		if ( ! $svg.getAttribute( 'viewBox' ) && width && height ) {
			viewBox = '0 0 ' + width + ' ' + height ;
			$svg.setAttribute( 'viewBox' , viewBox ) ;
		}
	}

	if ( options.css ) { domKit.css( $svg , options.css ) ; }

	if ( options.colorClass ) { svgKit.colorClass( $svg ) ; }

	if ( options.removeWhiteSpaces ) { domKit.removeWhiteSpaces( $svg ) ; }
	else if ( options.removeWhiteLines ) { domKit.removeWhiteSpaces( $svg , true ) ; }
} ;



svgKit.patchDocument = function( $doc , options ) {
	var removeWhiteSpaces = options.removeWhiteSpaces ,
		removeWhiteLines = options.removeWhiteLines ,
		removeComments = options.removeComments ;

	delete options.removeWhiteSpaces ;
	delete options.removeWhiteLines ;
	delete options.removeComments ;

	if ( removeComments ) { domKit.removeComments( $doc ) ; }

	svgKit.patch( $doc.documentElement , options ) ;

	if ( removeWhiteSpaces ) { domKit.removeWhiteSpaces( $doc ) ; }
	else if ( removeWhiteLines ) { domKit.removeWhiteSpaces( $doc , true ) ; }
} ;



svgKit.lightCleanup = function( $svg ) {
	domKit.removeAllTags( $svg , 'metadata' ) ;
	domKit.removeAllTags( $svg , 'script' ) ;
	domKit.removeAllTags( $svg , 'defs' , true ) ;	// all empty defs
} ;



// List of svg tags that actually display things
const drawingTags = [
	'path' ,
	'circle' ,
	'ellipse' ,
	'line' ,
	'rect' ,
	'polyline' ,
	'polygone' ,
	'text' ,
	'textPath'
] ;



const defaultStyles = [
	[ 'font-style' , 'normal' ] ,
	[ 'font-weight' , 'normal' ] ,
	[ 'font-variant' , 'normal' ] ,
	[ 'font-stretch' , 'normal' ] ,
	[ 'font-size' , 'medium' ] ,
	[ 'line-height' , 'normal' ] ,
	[ 'font-variant-ligatures' , 'normal' ] ,
	//[ 'font-family' , 'sans-serif' ] ,
	[ 'font-variant-position' , 'normal' ] ,
	[ 'font-variant-caps' , 'normal' ] ,
	[ 'font-variant-numeric' , 'normal' ] ,
	[ 'font-variant-alternates' , 'normal' ] ,
	[ 'font-variant-east-asian' , 'normal' ] ,
	[ 'font-feature-settings' , 'normal' ] ,
	[ 'text-indent' , '0' ] ,
	[ 'text-align' , 'start' ] ,
	[ 'text-decoration' , 'none' ] ,
	[ 'text-decoration-line' , 'none' ] ,
	[ 'text-decoration-style' , 'solid' ] ,
	[ 'text-decoration-color' , '#000000' ] ,
	[ 'letter-spacing' , 'normal' ] ,
	[ 'word-spacing' , 'normal' ] ,
	[ 'text-transform' , 'none' ] ,
	[ 'writing-mode' , 'lr-tb' ] ,
	[ 'direction' , 'ltr' ] ,
	[ 'text-orientation' , 'mixed' ] ,
	[ 'dominant-baseline' , 'auto' ] ,
	[ 'baseline-shift' , 'baseline' ] ,
	[ 'text-anchor' , 'start' ] ,
	[ 'white-space' , 'normal' ] ,
	[ 'shape-padding' , '0' ] ,
	[ 'display' , 'inline' ] ,
	[ 'visibility' , 'visible' ] ,
	[ 'overflow' , 'visible' ] ,
	[ 'opacity' , '1' ] ,
	[ 'isolation' , 'auto' ] ,
	[ 'mix-blend-mode' , 'normal' ] ,
	[ 'color-interpolation' , 'sRGB' ] ,
	[ 'color-interpolation-filters' , 'linearRGB' ] ,
	[ 'solid-color' , '#000000' ] ,
	[ 'solid-opacity' , '1' ] ,
	[ 'vector-effect' , 'none' ] ,
	[ 'fill-rule' , 'nonzero' ] ,
	[ 'clip-rule' , 'nonzero' ] ,
	[ 'color-rendering' , 'auto' ] ,
	[ 'image-rendering' , 'auto' ] ,
	[ 'shape-rendering' , 'auto' ] ,
	[ 'text-rendering' , 'auto' ] ,
	[ 'enable-background' , 'accumulate' ] ,
	[ 'stroke-dasharray' , 'none' ] ,
	[ 'stroke-dashoffset' , '0' ] ,
	[ 'paint-order' , 'normal' ] ,
	[ 'paint-order' , 'fill stroke markers' ]
] ;



svgKit.colorClass = function( $svg ) {
	drawingTags.forEach( ( tagName ) => {
		Array.from( $svg.getElementsByTagName( tagName ) ).forEach( ( $element ) => {
			// Beware, $element.className does not work as expected for SVG
			if ( ! $element.getAttribute( 'class' ) ) {
				$element.classList.add( 'primary' ) ;
			}

			// move style to attribute if they are not 'none'
			domKit.styleToAttribute( $element , 'fill' , [ 'none' ] ) ;
			domKit.styleToAttribute( $element , 'stroke' , [ 'none' ] ) ;
		} ) ;
	} ) ;
} ;



// Remove styles set to a default/unused value
svgKit.removeDefaultStyles = function( $svg ) {
	drawingTags.forEach( ( tagName ) => {
		Array.from( $svg.getElementsByTagName( tagName ) ).forEach( ( $element ) => {
			var styles = $element.getAttribute( 'style' ) ;

			defaultStyles.forEach( array => {
				var k = array[ 0 ] ;
				var v = array[ 1 ] ;

				styles = styles.replace(
					new RegExp( '(^|;) *' + escape.regExp( k ) + ' *: *' + escape.regExp( v ) + ' *(?:;|$)' ) ,
					( full , pre ) => pre
				) ;
			} ) ;

			$element.setAttribute( 'style' , styles ) ;
		} ) ;
	} ) ;
} ;



// Should remove all tags and attributes that have non-registered namespace,
// e.g.: sodipodi, inkscape, etc...
//svgKit.heavyCleanup = function( svgElement ) {} ;



svgKit.getViewBox = function( $svg ) {
	var raw = $svg.getAttribute( 'viewBox' ) ;

	if ( ! raw ) { return null ; }

	var array = raw.split( / +/ ) ;

	return {
		x: parseFloat( array[ 0 ] , 10 ) ,
		y: parseFloat( array[ 1 ] , 10 ) ,
		width: parseFloat( array[ 2 ] , 10 ) ,
		height: parseFloat( array[ 3 ] , 10 )
	} ;
} ;



svgKit.setViewBox = function( $svg , viewBox ) {
	$svg.setAttribute( 'viewBox' , viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height ) ;
} ;



svgKit.toAreaArray = function( object ) {
	if ( object.min && object.max ) {
		// Math Kit BoundingBox2D
		return [
			object.min.x ,
			object.min.y ,
			object.max.x - object.min.x ,
			object.max.y - object.min.y
		] ;
	}
	else if ( object.xmin !== undefined && object.xmax !== undefined && object.ymin !== undefined && object.ymax !== undefined ) {
		return [
			object.xmin ,
			object.ymin ,
			object.xmax - object.xmin ,
			object.ymax - object.ymin
		] ;
	}
	else if ( object.x !== undefined && object.y !== undefined && object.width !== undefined && object.height !== undefined ) {
		return [
			object.x ,
			object.y ,
			object.width ,
			object.height
		] ;
	}

	return [ 0 , 0 , 100 , 100 ] ;
} ;



svgKit.standalone = function( content , viewBox ) {
	var output = '<?xml version="1.0" encoding="UTF-8"?>\n' ;

	if ( ! Array.isArray( viewBox ) ) { viewBox = svgKit.toAreaArray( viewBox ) ; }

	output += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox.join( ' ' ) + '">\n' ;

	// ?
	// width="500"
	// height="500"

	output += content ;
	output += '\n</svg>\n' ;

	return output ;
} ;



svgKit.unserializeVG = str => svgKit.objectToVG( JSON.parse( str ) ) ;

svgKit.objectToVG = function( object ) {
	if ( ! object._type || ! object._type.startsWith( 'svg-kit/' ) ) { return object ; }
	var className = object._type.slice( 8 ) ;
	if ( ! svgKit[ className ] ) { return object ; }
	return new svgKit[ className ]( object ) ;
} ;


}).call(this,require('_process'))
},{"./VG.js":33,"./VGContainer.js":34,"./VGEllipse.js":35,"./VGGroup.js":36,"./VGItem.js":37,"./VGPath.js":38,"./VGRect.js":39,"./VGText.js":40,"./path.js":41,"_process":13,"dom-kit":7,"fs":6,"seventh":25,"string-kit/lib/escape.js":44}],43:[function(require,module,exports){
/*
	String Kit

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



var camel = {} ;
module.exports = camel ;



// Transform alphanum separated by underscore or minus to camel case
camel.toCamelCase = function( str , preserveUpperCase = false ) {
	if ( ! str || typeof str !== 'string' ) { return '' ; }

	return str.replace( /^[\s_-]*([^\s_-]+)|[\s_-]+([^\s_-]?)([^\s_-]*)/g , ( match , firstWord , firstLetter , endOfWord ) => {

		if ( preserveUpperCase ) {
			if ( firstWord ) { return firstWord ; }
			if ( ! firstLetter ) { return '' ; }
			return firstLetter.toUpperCase() + endOfWord ;
		}

		if ( firstWord ) { return firstWord.toLowerCase() ; }
		if ( ! firstLetter ) { return '' ; }
		return firstLetter.toUpperCase() + endOfWord.toLowerCase() ;

	} ) ;
} ;



camel.camelCaseToSeparated = function( str , separator = ' ' ) {
	if ( ! str || typeof str !== 'string' ) { return '' ; }

	return str.replace( /^([A-Z])|([A-Z])/g , ( match , firstLetter , letter ) => {

		if ( firstLetter ) { return firstLetter.toLowerCase() ; }
		return separator + letter.toLowerCase() ;
	} ) ;
} ;



// Transform camel case to alphanum separated by minus
camel.camelCaseToDash =
camel.camelCaseToDashed = ( str ) => camel.camelCaseToSeparated( str , '-' ) ;


},{}],44:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],45:[function(require,module,exports){
module.exports={
  "_from": "svg-kit@0.2.3",
  "_id": "svg-kit@0.2.3",
  "_inBundle": false,
  "_integrity": "sha512-foEXyUwrL2r3ie15sO6a/KQ2qQLzfvjZ/xw+d0JWa5SzPly9Rgs7iJaQaeLjpsNucAtQ+XRM+jcI5cHPpDptkA==",
  "_location": "/svg-kit",
  "_phantomChildren": {},
  "_requested": {
    "type": "version",
    "registry": true,
    "raw": "svg-kit@0.2.3",
    "name": "svg-kit",
    "escapedName": "svg-kit",
    "rawSpec": "0.2.3",
    "saveSpec": null,
    "fetchSpec": "0.2.3"
  },
  "_requiredBy": [
    "#USER",
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/svg-kit/-/svg-kit-0.2.3.tgz",
  "_shasum": "7bbd11739ddd1b402648eb199d1f1e5d91007cc1",
  "_spec": "svg-kit@0.2.3",
  "_where": "/home/cedric/inside/github/spellcast",
  "author": {
    "name": "Cédric Ronvel"
  },
  "bin": {
    "svgkit": "bin/svgkit"
  },
  "bugs": {
    "url": "https://github.com/cronvel/svg-kit/issues"
  },
  "bundleDependencies": false,
  "copyright": {
    "title": "SVG Kit",
    "years": [
      2017,
      2019
    ],
    "owner": "Cédric Ronvel"
  },
  "dependencies": {
    "@cronvel/xmldom": "^0.1.31",
    "dom-kit": "^0.3.14",
    "minimist": "^1.2.0",
    "seventh": "^0.7.30",
    "string-kit": "^0.10.1",
    "terminal-kit": "^1.31.4"
  },
  "deprecated": false,
  "description": "A small SVG toolkit.",
  "devDependencies": {},
  "directories": {
    "test": "test"
  },
  "homepage": "https://github.com/cronvel/svg-kit#readme",
  "keywords": [
    "svg"
  ],
  "license": "MIT",
  "main": "lib/svg-kit.js",
  "name": "svg-kit",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/cronvel/svg-kit.git"
  },
  "scripts": {
    "test": "tea-time -R dot"
  },
  "version": "0.2.3"
}

},{}],46:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":13,"timers":46}],47:[function(require,module,exports){
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

},{"./util":48,"punycode":14,"querystring":17}],48:[function(require,module,exports){
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
