(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SpellcastClient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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



var Ngev = require( 'nextgen-events/lib/browser.js' ) ;
var domKit = require( 'dom-kit' ) ;
var svgKit = require( 'svg-kit' ) ;
var commonUtils = require( '../../commonUtils.js' ) ;



function noop() {}



function Dom() { return Dom.create() ; }
module.exports = Dom ;
Dom.prototype = Object.create( Ngev.prototype ) ;
Dom.prototype.constructor = Dom ;



Dom.create = function create() {
	var self = Object.create( Dom.prototype ) ;

	self.$body = document.querySelector( 'body' ) ;
	self.$spellcast = document.querySelector( 'spellcast' ) ;
	self.$theme = document.querySelector( '#theme' ) ;
	self.$gfx = document.querySelector( '#gfx' ) ;
	self.$sceneImage = document.querySelector( '.scene-image' ) ;
	self.$main = document.querySelector( 'main' ) ;
	self.$mainBuffer = document.querySelector( '#main-buffer' ) ;
	self.$altBuffer = document.querySelector( '#alt-buffer' ) ;
	self.$closeAltButton = document.querySelector( '#button-close-alt' ) ;
	self.$dialogWrapper = document.querySelector( '#dialog-wrapper' ) ;
	self.$hint = document.querySelector( '#hint' ) ;
	self.$lobby = document.querySelector( '#lobby' ) ;
	self.$clientStatus = self.$lobby.querySelector( '.client-status' ) ;
	self.$status = document.querySelector( '#status' ) ;
	self.$panel = document.querySelector( '#panel' ) ;
	self.$music = document.querySelector( '#music' ) ;
	self.$sound0 = document.querySelector( '#sound0' ) ;
	self.$sound1 = document.querySelector( '#sound1' ) ;
	self.$sound2 = document.querySelector( '#sound2' ) ;
	self.$sound3 = document.querySelector( '#sound3' ) ;

	self.choices = [] ;

	self.newSegmentNeeded = null ;
	self.onSelect = null ;
	self.onLeave = null ;
	self.onEnter = null ;
	self.toMainBuffer() ;

	self.nextSoundChannel = 0 ;

	self.sprites = {} ;
	self.uis = {} ;
	self.markers = {} ;
	self.cards = {} ;
	self.cardLocations = {} ;
	self.animations = {} ;

	self.hintTimer = null ;
	self.sceneImageOnTimer = null ;
	self.onChatSubmit = null ;

	// The number of UI loading in progress
	self.uiLoadingCount = 0 ;

	self.initEvents() ;

	return self ;
} ;



Dom.prototype.cleanUrl = function cleanUrl( url ) {
	if ( url[ 0 ] === '/' ) { return url ; }
	return '/script/' + url ;
} ;



Dom.prototype.setTheme = function setTheme( theme ) {
	this.$theme.setAttribute( 'href' , this.cleanUrl( theme.url ) ) ;
} ;



Dom.prototype.preload = function preload() {
	domKit.preload( [
		'/icons/plugged.svg' ,
		'/icons/plugging.svg' ,
		'/icons/unplugged.svg' ,
		'/icons/unreachable-plug.svg'
	] ) ;
} ;



Dom.prototype.initEvents = function initEvents() {
	this.$main.addEventListener( 'click' , () => this.emit( 'continue' ) , false ) ;
	this.$gfx.addEventListener( 'click' , () => this.toggleSceneImage() , false ) ;
	this.$dialogWrapper.addEventListener( 'click' , () => this.clearDialog() , false ) ;

	// Things that can get the .toggled class when clicked
	this.$lobby.addEventListener( 'click' , () => { this.$lobby.classList.toggle( 'toggled' ) ; } ) ;
	this.$status.addEventListener( 'click' , () => { this.$status.classList.toggle( 'toggled' ) ; } ) ;
	this.$panel.addEventListener( 'click' , () => { this.$panel.classList.toggle( 'toggled' ) ; } ) ;
} ;



Dom.prototype.toggleSceneImage = function toggleSceneImage() {
	if ( this.$gfx.classList.contains( 'toggled' ) ) { this.sceneImageOff() ; }
	else { this.sceneImageOn() ; }
} ;



Dom.prototype.sceneImageOn = function sceneImageOn() {
	if ( this.sceneImageOnTimer !== null ) { clearTimeout( this.sceneImageOnTimer ) ; this.sceneImageOnTimer = null ; }

	this.$gfx.classList.add( 'toggled' ) ;
	this.$spellcast.classList.add( 'gfx-toggled' ) ;
	this.sceneImageOnTimer = setTimeout( this.sceneImageOff.bind( this ) , 8000 ) ;
} ;



Dom.prototype.sceneImageOff = function sceneImageOff() {
	if ( this.sceneImageOnTimer !== null ) { clearTimeout( this.sceneImageOnTimer ) ; this.sceneImageOnTimer = null ; }

	this.$gfx.classList.remove( 'toggled' ) ;
	this.$spellcast.classList.remove( 'gfx-toggled' ) ;
} ;



// return true if switched
Dom.prototype.toMainBuffer = function toMainBuffer() {
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
Dom.prototype.toAltBuffer = function toAltBuffer() {
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
Dom.prototype.getSwitchedElements = function getSwitchedElements() {
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



Dom.prototype.clientStatus = function clientStatus( status ) {
	this.$clientStatus.setAttribute( 'data-status' , status ) ;
	//this.$clientStatus.setAttribute( 'alt' , status ) ;
	this.$clientStatus.setAttribute( 'title' , status ) ;
} ;



Dom.prototype.setMultiplayer = function setMultiplayer( value , callback ) {
	callback = callback || noop ;

	if ( value || value === undefined ) {
		this.$spellcast.classList.add( 'multiplayer' ) ;
	}
	else {
		this.$spellcast.classList.remove( 'multiplayer' ) ;
	}

	callback() ;
} ;



Dom.prototype.clear = function clear( callback ) {
	callback = callback || noop ;
	domKit.empty( this.$hint ) ;
	domKit.empty( this.$dialogWrapper ) ;
	domKit.empty( this.$activeMessages ) ;
	domKit.empty( this.$choices ) ;
	callback() ;
} ;



Dom.prototype.clearMessages = function clearMessages( callback ) {
	callback = callback || noop ;
	domKit.empty( this.$activeMessages ) ;
	callback() ;
} ;



Dom.prototype.clearHistory = function clearHistory( callback ) {
	callback = callback || noop ;
	domKit.empty( this.$history ) ;
	callback() ;
} ;



Dom.prototype.newSegment = function newSegment( type ) {
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



Dom.prototype.moveToHistory = function moveToHistory() {
	var i , iMax ;

	var children = Array.from( this.$activeMessages.children ) ;

	iMax = children.length - 2 ;

	while ( iMax >= 0 && children[ iMax ].tagName.toLowerCase() === 'inter-segment' ) {
		iMax -- ;
	}

	if ( iMax < 0 ) { return ; }

	for ( i = 0 ; i <= iMax ; i ++ ) {
		this.$history.appendChild( children[ i ] ) ;
	}

	children[ iMax ].scrollIntoView( false ) ;
} ;




// Postpone new segment creation until new content
Dom.prototype.newSegmentOnContent = function newSegmentOnContent( type ) {
	type = type || 'segment' ;
	this.newSegmentNeeded = type ;
} ;



Dom.prototype.addSelectedChoice = function addSelectedChoice( text ) {
	var $text = document.createElement( 'p' ) ;
	$text.classList.add( 'chosen' ) ;
	$text.textContent = text ;

	if ( this.newSegmentNeeded ) { this.newSegment( this.newSegmentNeeded ) ; }

	this.$activeSegment.appendChild( $text ) ;
} ;



Dom.prototype.addMessage = function addMessage( text , options , callback ) {
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



Dom.prototype.messageNext = function messageNext( value , callback ) {
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



Dom.prototype.addIndicators = function addIndicators( indicators , isStatus , callback ) {
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



Dom.prototype.createChoiceEventHandlers = function createChoiceEventHandlers( onSelect ) {
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



Dom.prototype.addPanel = function addPanel( panel , clear , callback ) {
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



Dom.prototype.clearChoices = function clearChoices( callback ) {
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



Dom.prototype.addChoices = function addChoices( choices , onSelect , callback ) {
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



Dom.prototype.getChoiceColumnsCount = function getChoiceColumnsCount( choices ) {
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
Dom.prototype.setChoices = function setChoices( choices , undecidedNames , onSelect , options , callback ) {
	options = options || {} ;
	callback = callback || noop ;

	this.clearChoices( () => {

		switch ( options.style ) {
			case 'inline' :
			case 'smallInline' :
			case 'list' :
			case 'smallList' :
				this.$choices.setAttribute( 'data-choice-style' , options.style ) ;
				break ;
			case 'table' :
				this.$choices.setAttribute( 'data-choice-style' , options.style ) ;
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



Dom.prototype.choiceTimeout = function choiceTimeout( timeout ) {
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



Dom.prototype.textInputDisabled = function textInputDisabled( options ) {
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



Dom.prototype.textInput = function textInput( options , callback ) {
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

	var finalize = function finalize( event ) {
		event.preventDefault() ;

		$form.removeEventListener( 'submit' , finalize ) ;
		$input.setAttribute( 'disabled' , true ) ;
		callback( $input.value ) ;
	} ;

	$form.addEventListener( 'submit' , finalize ) ;
} ;



Dom.prototype.enableChat = function enableChat( callback ) {
	if ( ! this.onChatSubmit ) {
		this.onChatSubmit = ( event ) => {
			event.preventDefault() ;
			callback( this.$chatInput.value ) ;
			this.$chatInput.value = '' ;
		} ;

		this.$chatForm.addEventListener( 'submit' , this.onChatSubmit ) ;

		this.$chat.classList.remove( 'hidden' ) ;
		this.$chatInput.removeAttribute( 'disabled' ) ;
	}
} ;



Dom.prototype.disableChat = function disableChat() {
	this.$chatForm.removeEventListener( 'submit' , this.onChatSubmit ) ;
	this.onChatSubmit = null ;

	this.$chat.classList.add( 'hidden' ) ;
	this.$chatInput.setAttribute( 'disabled' , true ) ;
} ;



Dom.prototype.clearHint = function clearHint() {
	if ( this.hintTimer !== null ) { clearTimeout( this.hintTimer ) ; this.hintTimer = null ; }

	//domKit.empty( this.$hint ) ;
	this.$hint.classList.add( 'empty' ) ;

	this.hintTimer = setTimeout( () => {
		domKit.empty( this.$hint ) ;
	} , 3000 ) ;
} ;



Dom.prototype.setHint = function setHint( text , classes ) {
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
Dom.prototype.setBigHint = function setBigHint( text , classes ) {
	var $hint = document.createElement( 'h2' ) ;
	$hint.textContent = text ;
	if ( classes ) { domKit.class( $hint , classes ) ; }
	domKit.empty( this.$hint ) ;
	this.$hint.appendChild( $hint ) ;
} ;



Dom.prototype.clearDialog = function clearDialog() {
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
Dom.prototype.setDialog = function setDialog( text , options , callback ) {
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



Dom.prototype.setSceneImage = function setSceneImage( data ) {
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



Dom.prototype.clearSprite = function clearSprite( id ) {
	if ( ! this.sprites[ id ] ) {
		console.warn( 'Unknown sprite id: ' , id ) ;
		return ;
	}

	this.clearUiObject( this.sprites[ id ] ) ;

	delete this.sprites[ id ] ;
} ;



Dom.prototype.clearUi = function clearUi( id ) {
	if ( ! this.uis[ id ] ) {
		console.warn( 'Unknown UI id: ' , id ) ;
		return ;
	}

	this.clearUiObject( this.uis[ id ] ) ;

	delete this.uis[ id ] ;
} ;



Dom.prototype.clearMarker = function clearMarker( id ) {
	if ( ! this.markers[ id ] ) {
		console.warn( 'Unknown Marker id: ' , id ) ;
		return ;
	}

	this.clearUiObject( this.markers[ id ] ) ;

	delete this.markers[ id ] ;
} ;



Dom.prototype.clearCard = function clearCard( id ) {
	if ( ! this.cards[ id ] ) {
		console.warn( 'Unknown Card id: ' , id ) ;
		return ;
	}

	this.clearCardObject( this.cards[ id ] ) ;

	delete this.cards[ id ] ;
} ;



Dom.prototype.showSprite = function showSprite( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	if ( this.sprites[ id ] ) { this.clearUiObject( this.sprites[ id ] ) ; }

	var sprite = this.sprites[ id ] = this.createUiObject( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'sprite' ,
		class: data.class ,
		style: {} ,
		animation: null
	} ) ;

	this.updateUiObject( sprite , data ) ;
} ;



Dom.prototype.showUi = function showUi( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	if ( this.uis[ id ] ) { this.clearUiObject( this.uis[ id ] ) ; }

	var ui = this.uis[ id ] = this.createUiObject( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'ui' ,
		class: data.class ,
		style: {} ,
		area: {} ,
		animation: null
	} ) ;

	this.updateUiObject( ui , data ) ;
} ;



Dom.prototype.showMarker = function showMarker( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	if ( this.markers[ id ] ) { this.clearUiObject( this.markers[ id ] ) ; }

	var marker = this.markers[ id ] = this.createUiObject( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'marker' ,
		ui: null ,
		location: null ,
		class: data.class ,
		style: {} ,
		animation: null
	} ) ;

	this.updateUiObject( marker , data ) ;
} ;



var cardAutoIncrement = 0 ;

Dom.prototype.showCard = function showCard( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }
	
	if ( this.cards[ id ] ) { this.clearCardObject( this.cards[ id ] ) ; }

	var marker = this.cards[ id ] = this.createUiObject( {
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

	this.updateCardObject( marker , data ) ;
} ;



Dom.prototype.updateSprite = function updateSprite( id , data ) {
	if ( ! this.sprites[ id ] ) {
		console.warn( 'Unknown sprite id: ' , id ) ;
		return ;
	}

	this.updateUiObject( this.sprites[ id ] , data ) ;
} ;



Dom.prototype.updateUi = function updateUi( id , data ) {
	if ( ! this.uis[ id ] ) {
		console.warn( 'Unknown UI id: ' , id ) ;
		return ;
	}

	this.updateUiObject( this.uis[ id ] , data ) ;
} ;



Dom.prototype.updateMarker = function updateMarker( id , data ) {
	if ( ! this.markers[ id ] ) {
		console.warn( 'Unknown marker id: ' , id ) ;
		return ;
	}

	this.updateUiObject( this.markers[ id ] , data ) ;
} ;



Dom.prototype.updateCard = function updateCard( id , data ) {
	if ( ! this.cards[ id ] ) {
		console.warn( 'Unknown card id: ' , id ) ;
		return ;
	}

	this.updateCardObject( this.cards[ id ] , data ) ;
} ;



Dom.prototype.animateSprite = function animateSprite( spriteId , animationId ) {
	if ( ! this.sprites[ spriteId ] ) {
		console.warn( 'Unknown sprite id: ' , spriteId ) ;
		return ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return ;
	}

	this.animateUiObject( this.sprites[ spriteId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.animateUi = function animateUi( uiId , animationId ) {
	if ( ! this.uis[ uiId ] ) {
		console.warn( 'Unknown UI id: ' , uiId ) ;
		return ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return ;
	}

	this.animateUiObject( this.uis[ uiId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.animateMarker = function animateMarker( markerId , animationId ) {
	if ( ! this.markers[ markerId ] ) {
		console.warn( 'Unknown marker id: ' , markerId ) ;
		return ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return ;
	}

	this.animateUiObject( this.markers[ markerId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.animateCard = function animateCard( cardId , animationId ) {
	if ( ! this.cards[ cardId ] ) {
		console.warn( 'Unknown card id: ' , cardId ) ;
		return ;
	}

	if ( ! this.animations[ animationId ] ) {
		console.warn( 'Unknown animation id: ' , animationId ) ;
		return ;
	}

	this.animateUiObject( this.cards[ cardId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.createUiObject = function createUiObject( data ) {
	var ui = new Ngev() ;
	Object.assign( ui , data ) ;
	ui.defineStates( 'loaded' , 'loading' ) ;

	return ui ;
} ;



Dom.prototype.clearUiObject = function clearUiObject( ui ) {
	ui.$image.remove() ;
	if ( ui.$mask ) { ui.$mask.remove() ; }
} ;



Dom.prototype.updateUiObject = function updateUiObject( ui , data ) {
	var $element ;

	if ( ! data.style || typeof data.style !== 'object' ) { data.style = {} ; }

	// Forbidden styles:
	delete data.style.position ;

	// Load/replace the ui image, if needed
	if ( data.url ) {
		if ( data.url.endsWith( '.svg' ) ) {
			// Always wipe any existing $image element and pre-create the <svg> tag
			if ( ui.$image ) { ui.$image.remove() ; }

			if ( ui.type === 'marker' ) {
				// If it's a marker, load it inside a <g> tag, that will be part of the main UI's <svg>
				// <svg> inside <svg> are great, but Chrome sucks at it (it does not support CSS transform, etc)
				ui.$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' ) ;
			}
			else {
				ui.$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'svg' ) ;
				ui.$image.classList.add( 'svg' ) ;
			}

			switch ( ui.type ) {
				case 'ui' :
					// Stop event propagation
					ui.onClick = ( event ) => {
						//ui.actionCallback( ui.action ) ;
						event.stopPropagation() ;
					} ;

					ui.$image.addEventListener( 'click' , ui.onClick ) ;
					ui.$image.classList.add( 'ui' ) ;
					this.uiLoadingCount ++ ;
					break ;
				case 'sprite' :
					ui.$image.classList.add( 'sprite' ) ;
					break ;
				case 'marker' :
					ui.$image.classList.add( 'marker' ) ;
					break ;
			}

			svgKit.load( this.cleanUrl( data.url ) , {
				removeSvgStyle: true ,
				//removeSize: true ,
				//removeIds: true ,
				removeComments: true ,
				removeExoticNamespaces: true ,
				//removeDefaultStyles: true ,
				as: ui.$image
			} , () => {

				if ( ui.type === 'ui' ) {
					this.setUiButtons( ui.$image ) ;
					this.setUiPassiveHints( ui.$image ) ;
					ui.emit( 'loaded' ) ;
					if ( -- this.uiLoadingCount <= 0 ) { this.emit( 'uiLoaded' ) ; }
				}
				else {
					ui.emit( 'loaded' ) ;
				}
			} ) ;

			ui.emit( 'loading' ) ;
		}
		else {
			if ( ! ui.$image || ui.$image.tagName.toLowerCase() !== 'img' ) {
				if ( ui.$image ) { ui.$image.remove() ; }

				ui.$image = document.createElement( 'img' ) ;

				// /!\ support UI that are not SVG??? /!\
				ui.$image.classList.add( ui.type ) ;
			}

			ui.$image.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;
		}

		if ( ui.type !== 'marker' ) {
			this.$gfx.append( ui.$image ) ;
		}
	}

	// Load/replace the sprite/ui mask, if needed
	if ( data.maskUrl && data.maskUrl.endsWith( '.svg' ) && ui.type === 'sprite' ) {
		console.warn( 'has mask!' ) ;

		// Always wipe any existing $mask element and pre-create the <svg> tag
		if ( ui.$mask ) { ui.$mask.remove() ; }

		ui.$mask = document.createElementNS( 'http://www.w3.org/2000/svg' , 'svg' ) ;
		ui.$mask.classList.add( 'sprite-mask' ) ;

		svgKit.load( this.cleanUrl( data.maskUrl ) , {
			removeSvgStyle: true ,
			removeSize: true ,
			removeIds: true ,
			removeComments: true ,
			removeExoticNamespaces: true ,
			//removeDefaultStyles: true ,
			as: ui.$mask
		} ) ;

		this.$gfx.append( ui.$mask ) ;
	}

	// /!\ DEPRECATED /!\
	// Click action
	if ( data.action !== undefined ) {
		$element = ui.$mask || ui.$image ;

		if ( data.action && ! ui.action ) {
			ui.onClick = ( event ) => {
				ui.actionCallback( ui.action ) ;
				event.stopPropagation() ;
			} ;

			$element.classList.add( 'button' ) ;
			$element.addEventListener( 'click' , ui.onClick ) ;
		}
		else if ( ! data.action && ui.action ) {
			$element.classList.remove( 'button' ) ;
			$element.removeEventListener( 'click' , ui.onClick ) ;
		}

		ui.action = data.action || null ;
	}

	// Use data.style, NOT ui.style: we have to set only new/updated styles
	if ( data.style ) {
		Object.assign( ui.style , data.style ) ;
		domKit.css( ui.$image , data.style ) ;

		// Update the mask, if any
		if ( ui.$mask ) {
			console.warn( 'update mask!' ) ;
			domKit.css( ui.$mask , data.style ) ;
		}
	}

	if ( data.class ) {
		data.class = commonUtils.toClassObject( data.class ) ;
		console.log( "Data.class" , data.class ) ;
		Object.assign( ui.class , data.class ) ;
		domKit.class( ui.$image , data.class , 's-' ) ;

		// Update the mask, if any
		if ( ui.$mask ) {
			console.warn( 'update mask!' ) ;
			domKit.class( ui.$mask , data.class , 's-' ) ;
		}
	}

	if ( data.area ) {
		this.updateUiArea( ui , data.area ) ;
	}

	if ( data.ui || data.location ) {
		this.updateMarkerLocation( ui , data.ui , data.location ) ;
	}
} ;



Dom.prototype.updateUiArea = function updateUiArea( ui , areaData ) {
	var area ;

	if ( ui.type !== 'ui' ) { return ; }

	if ( ! ui.hasState( 'loaded' ) ) {
		ui.once( 'loaded' , this.updateUiArea.bind( this , ui , areaData ) ) ;
		return ;
	}

	for ( area in areaData ) {
		if ( ! ui.area[ area ] ) { ui.area[ area ] = {} ; }
		if ( ! ui.area[ area ].status ) { ui.area[ area ].status = {} ; }

		if ( areaData[ area ].hint !== undefined ) { ui.area[ area ].hint = areaData[ area ].hint || null ; }
		if ( areaData[ area ].status ) { Object.assign( ui.area[ area ].status , areaData[ area ].status ) ; }

		Array.from( ui.$image.querySelectorAll( '[area=' + area + ']' ) ).forEach( ( $element ) => {	// jshint ignore:line
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



Dom.prototype.updateMarkerLocation = function updateMarkerLocation( marker , uiId , areaId ) {
	var ui , $area , areaBBox , markerViewBox , width , height , originX , originY , posX , posY ;


	// First, check that everything is ready and OK...
	if ( ! marker.hasState( 'loaded' ) ) {
		marker.once( 'loaded' , this.updateMarkerLocation.bind( this , marker , uiId , areaId ) ) ;
		return ;
	}

	if ( ! uiId ) { uiId = marker.ui ; }
	if ( ! areaId ) { areaId = marker.location ; }

	if ( ! this.uis[ uiId ] ) {
		console.warn( 'Unknown UI id: ' , uiId ) ;
		return ;
	}

	ui = this.uis[ uiId ] ;

	if ( ! ui.hasState( 'loaded' ) ) {
		ui.once( 'loaded' , this.updateMarkerLocation.bind( this , marker , uiId , areaId ) ) ;
		return ;
	}

	$area = ui.$image.querySelector( '[area=' + areaId + ']' ) ;

	if ( ! $area ) {
		console.warn( 'UI ' + uiId + ': area not found' , areaId ) ;
		return ;
	}


	// Once everything is ok, update the marker
	marker.ui = uiId ;
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

	// Append the <g> tag to the main UI's <svg> now, if needed
	if ( marker.$image.ownerSVGElement !== ui.$image ) {
		ui.$image.append( marker.$image ) ;
	}
} ;



Dom.prototype.clearCardObject = function clearCardObject( card ) {
	if ( card.$locationSlot ) { card.$locationSlot.remove() ; }
	card.$wrapper.remove() ;
} ;



Dom.prototype.updateCardObject = function updateCardObject( card , data ) {
	var contentName , content , $content , statusName , status ;

	if ( ! card.$wrapper ) {
		this.createCardMarkup( card ) ;
		//this.$gfx.append( card.$wrapper ) ;
	}

	if ( data.url ) {
		card.$image.style.backgroundImage = 'url("' + this.cleanUrl( data.url ) + '")' ;
		delete data.url ;
	}

	if ( data.backUrl ) {
		card.$backImage.style.backgroundImage = 'url("' + this.cleanUrl( data.backUrl ) + '")' ;
		delete data.backUrl ;
	}

	if ( data.content ) {
		for ( contentName in data.content ) {
			content = data.content[ contentName ] ;
			$content = card.contents[ contentName ] ;

			if ( ! $content ) {
				$content = card.contents[ contentName ] = document.createElement( 'div' ) ;
				$content.classList.add( 'content-' + contentName ) ;
				card.$front.append( $content ) ;
			}

			$content.textContent = content ;
			$content.setAttribute( 'content' , content ) ;
		}

		delete data.content ;
	}

	// Location where to insert it in the DOM,
	// it needs a callback to ensure that transition effects has correctly happened
	if ( data.location && card.location !== data.location ) {
		this.moveCardTo( card , data.location , () => {
			this.updateCardObject( card , data ) ;
		} ) ;
		delete data.location ;
		return ;
	}

	if ( data.pose !== undefined ) {
		if ( typeof data.pose === 'string' ) {
			card.$wrapper.setAttribute( 'pose' , data.pose ) ;
			card.pose = data.pose ;
		}
		else {
			card.$wrapper.removeAttribute( 'pose' ) ;
			card.pose = null ;
		}
	}

	if ( data.status ) {
		for ( statusName in data.status ) {
			status = data.status[ statusName ] ;

			if ( status ) {
				card.$wrapper.classList.add( 'status-' + statusName ) ;

				if ( typeof status === 'number' || typeof status === 'string' ) {
					card.$wrapper.setAttribute( 'status-' + statusName , status ) ;
				}
			}
			else {
				card.$wrapper.classList.remove( 'status-' + statusName ) ;

				if ( card.$wrapper.hasAttribute( 'status-' + statusName ) ) {
					card.$wrapper.removeAttribute( 'status-' + statusName ) ;
				}
			}
		}
	}

	if ( data.style ) {
		Object.assign( card.style , data.style ) ;
		domKit.css( card.$wrapper , data.style ) ;
	}

	if ( data.imageStyle ) {
		Object.assign( card.imageStyle , data.imageStyle ) ;
		domKit.css( card.$image , data.imageStyle ) ;
	}
} ;



Dom.prototype.createCardMarkup = function createCardMarkup( card ) {
	// The wrapper is the placeholder, hover effects happen on it
	card.$wrapper = document.createElement( 'div' ) ;
	card.$wrapper.classList.add( 'card-wrapper' ) ;

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



Dom.prototype.createCardLocation = function createCardLocation( locationName ) {
	var $location ;

	if ( this.cardLocations[ locationName ] ) { return ; }

	$location = this.cardLocations[ locationName ] = document.createElement( 'div' ) ;
	$location.classList.add( 'card-location' ) ;
	$location.classList.add( 'card-location-' + locationName ) ;
	this.$gfx.append( $location ) ;
} ;



Dom.prototype.moveCardTo = function moveCardTo( card , locationName , callback ) {
	var $location , $oldLocation , oldLocationName , $slot , $oldSlot , direction , oldDirection ,
		siblingCards , siblingSlotRectsBefore , siblingSlotRectsAfter ,
		slotSize , slotBbox , oldSlotBbox ;

	// Timeout value used to enable FLIP transition
	var flipTimeout = 10 ;

	if ( card.location === locationName ) { callback() ; return ; }

	$location = this.cardLocations[ locationName ] ;
	$oldSlot = card.$locationSlot ;

	if ( card.location ) {
		oldLocationName = card.location ;
		$oldLocation = this.cardLocations[ card.location ] ;
	}

	if ( ! $location ) {
		$location = this.cardLocations[ locationName ] = document.createElement( 'div' ) ;
		$location.classList.add( 'card-location' ) ;
		$location.classList.add( 'card-location-' + locationName ) ;
		this.$gfx.append( $location ) ;
	}

	if ( ! $oldSlot ) {
		// Chrome requires it to be rendered for computed styles to work, otherwise: brace yourself, the NaN are coming!
		this.$gfx.append( card.$wrapper ) ;
	}

	// Computed styles
	var cardComputedStyle = window.getComputedStyle( card.$wrapper ) ;
	var locationComputedStyle = window.getComputedStyle( $location ) ;

	// Card size
	var cardWidth = parseFloat( cardComputedStyle.width ) ;
	var cardHeight = parseFloat( cardComputedStyle.height ) ;

	card.location = locationName ;
	$slot = card.$locationSlot = document.createElement( 'div' ) ;
	$slot.classList.add( 'card-slot' ) ;
	$slot.style.order = card.order ;
	//$slot.style.zIndex = card.order ;	// Not needed, rendering preserve ordering, not DOM precedence, so it's ok

	// Before appending, save all rects of existing sibling slots
	siblingCards = Object.values( this.cards )
	.filter( e => e !== card && ( e.location === locationName || e.location === oldLocationName ) ) ;

	siblingSlotRectsBefore = siblingCards.map( e => e.$locationSlot.getBoundingClientRect() ) ;


	// We should preserve the :last-child pseudo selector, since there isn't any :last-ordered-child for flex-box...
	if ( $location.lastChild && parseFloat( $location.lastChild.style.order ) > card.order ) {
		// The last item has a greater order, so we prepend instead
		$location.prepend( $slot ) ;
	}
	else {
		$location.append( $slot ) ;
	}

	if ( $oldSlot ) {
		oldSlotBbox = $oldSlot.getBoundingClientRect() ;
		$oldSlot.remove() ;
	}


	// Get slots rects after
	siblingSlotRectsAfter = siblingCards.map( e => e.$locationSlot.getBoundingClientRect() ) ;

	// Immediately compute the translation delta and the FLIP for siblings
	siblingCards.forEach( ( siblingCard , index ) => {
		var beforeRect = siblingSlotRectsBefore[ index ] ,
			afterRect = siblingSlotRectsAfter[ index ] ;

		var transitionStr = siblingCard.$wrapper.style.transition ;
		var transformStr = siblingCard.$wrapper.style.transform ;

		// Get the local transform, and patch it!
		var transformDelta = Object.assign( {} , siblingCard.localTransform ) ;
		transformDelta.translateX += beforeRect.left - afterRect.left ;
		transformDelta.translateY += beforeRect.top - beforeRect.top ;

		// First, disable transitions, so the transform will apply now!
		siblingCard.$wrapper.style.transition = 'none' ;
		siblingCard.$wrapper.style.transform = domKit.stringifyTransform( transformDelta ) ;

		setTimeout( () => {
			// Re-enable transitions, restore the transform value
			siblingCard.$wrapper.style.transition = transitionStr ;
			siblingCard.$wrapper.style.transform = transformStr ;
		} , flipTimeout ) ;
	} ) ;


	var targetTransform = { translateX: 0 , translateY: 0 } ;

	// Scale transform
	switch ( locationComputedStyle.flexDirection ) {
		case 'row' :
		case 'row-reverse' :
			slotSize = parseFloat( locationComputedStyle.height ) ;
			targetTransform.scaleX = targetTransform.scaleY = slotSize / cardHeight ;
			break ;
		case 'column' :
		case 'column-reverse' :
			slotSize = parseFloat( locationComputedStyle.width ) ;
			targetTransform.scaleX = targetTransform.scaleY = slotSize / cardWidth ;
			break ;
		default :
			slotSize = parseFloat( locationComputedStyle.height ) ;
			targetTransform.scaleX = targetTransform.scaleY = slotSize / cardHeight ;
			console.warn( 'flex-direction' , locationComputedStyle.flexDirection ) ;
	}

	// Translation compensation due to scaling, since the origin is in the middle
	targetTransform.translateX -= ( cardWidth - cardWidth * targetTransform.scaleX ) / 2 ;
	targetTransform.translateY -= ( cardHeight - cardHeight * targetTransform.scaleY ) / 2 ;

	var localTransform = card.localTransform ;
	card.localTransform = targetTransform ;


	// If there is no older position, then just put the card on its slot immediately
	if ( ! $oldSlot ) {
		card.$wrapper.style.transform = domKit.stringifyTransform( targetTransform ) ;
		$slot.append( card.$wrapper ) ;
		callback() ;
		return ;
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

	card.$wrapper.style.transform = domKit.stringifyTransform( sourceTransform ) ;
	$slot.append( card.$wrapper ) ;

	// Do not initiate the new transform value in the same synchronous flow,
	// it would not animate anything
	setTimeout( () => {
		card.$wrapper.style.transform = domKit.stringifyTransform( targetTransform ) ;
		callback() ;
	} , flipTimeout ) ;
} ;



Dom.prototype.animateUiObject = function animateUiObject( ui , animation ) {
	var frame , frameIndex = 0 ;

	ui.animation = animation.id ;

	// What should be done if an animation is already running???

	//console.warn( "Animation: " , animation ) ;

	// If there is no frames, quit now
	if ( ! Array.isArray( animation.frames ) || ! animation.frames.length ) { return ; }

	var nextFrame = () => {
		frame = animation.frames[ frameIndex ] ;

		// Update the ui
		this.updateUiObject( ui , frame ) ;

		if ( ++ frameIndex < animation.frames.length ) {
			setTimeout( nextFrame , frame.duration * 1000 ) ;
		}
		else {
			// This is the end of the animation...
			// Restore something here?
			ui.animation = null ;
		}
	} ;

	nextFrame() ;
} ;



Dom.prototype.defineAnimation = function defineAnimation( id , data ) {
	data.id = id ;
	this.animations[ id ] = data ;
} ;



Dom.prototype.setUiButtons = function setUiButtons( $svg ) {
	Array.from( $svg.querySelectorAll( '[button]' ) ).forEach( ( $element ) => {
		var buttonName = $element.getAttribute( 'button' ) ;

		$element.setAttribute( 'id' , 'button-' + buttonName ) ;

		if ( ! $element.getAttribute( 'area' ) ) {
			// Create a default area's name equals to the button's name, if not present
			$element.setAttribute( 'area' , buttonName ) ;
		}

		$element.classList.add( 'button' ) ;
		$element.classList.add( 'disabled' ) ;
	} ) ;
} ;



Dom.prototype.setUiPassiveHints = function setUiPassiveHints( $svg ) {
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
Dom.prototype.sound = function sound( data ) {
	var element = this[ '$sound' + this.nextSoundChannel ] ;
	console.warn( '$sound' + this.nextSoundChannel , data , element ) ;
	this.nextSoundChannel = ( this.nextSoundChannel + 1 ) % 4 ;

	element.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;

	element.play() ;
} ;



Dom.prototype.music = function music( data ) {
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



function soundFadeIn( element , callback ) {
	if ( element.__fadeTimer ) { clearTimeout( element.__fadeTimer ) ; element.__fadeTimer = null ; }

	if ( element.volume >= 1 ) {
		if ( callback ) { callback() ; }
		return ;
	}

	element.volume = Math.min( 1 , element.volume + SOUND_FADE_VALUE ) ;
	element.__fadeTimer = setTimeout( soundFadeIn.bind( undefined , element , callback ) , SOUND_FADE_TIMEOUT ) ;
}



function soundFadeOut( element , callback ) {
	if ( element.__fadeTimer ) { clearTimeout( element.__fadeTimer ) ; element.__fadeTimer = null ; }

	if ( element.volume <= 0 ) {
		if ( callback ) { callback() ; }
		return ;
	}

	element.volume = Math.max( 0 , element.volume - SOUND_FADE_VALUE ) ;
	element.__fadeTimer = setTimeout( soundFadeOut.bind( undefined , element , callback ) , SOUND_FADE_TIMEOUT ) ;
}


},{"../../commonUtils.js":5,"dom-kit":7,"nextgen-events/lib/browser.js":11,"svg-kit":22}],2:[function(require,module,exports){
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

/* global window, WebSocket */



var Ngev = require( 'nextgen-events/lib/browser.js' ) ;
var dom = require( 'dom-kit' ) ;
var url = require( 'url' ) ;



function SpellcastClient( options ) { return SpellcastClient.create( options ) ; }
module.exports = SpellcastClient ;
SpellcastClient.prototype = Object.create( Ngev.prototype ) ;
SpellcastClient.prototype.constructor = SpellcastClient ;



SpellcastClient.create = function create( options ) {
	var self = Object.create( SpellcastClient.prototype , {
		token: { value: options.token || 'null' , writable: true , enumerable: true } ,
		port: { value: options.port || 80 , writable: true , enumerable: true } ,
		userName: {
			value: options.name || 'unknown_' + Math.floor( Math.random() * 10000 ) , writable: true , enumerable: true
		} ,
		ws: { value: null , writable: true , enumerable: true } ,
		proxy: { value: null , writable: true , enumerable: true }
	} ) ;

	return self ;
} ;



var uiList = {
	classic: require( './ui/classic.js' )
} ;



SpellcastClient.autoCreate = function autoCreate() {
	var options = url.parse( window.location.href , true ).query ;

	window.spellcastClient = SpellcastClient.create( options ) ;
	//window.spellcastClient.init() ;

	if ( ! options.ui ) { options.ui = [ 'classic' ] ; }
	else if ( ! Array.isArray( options.ui ) ) { options.ui = [ options.ui ] ; }

	window.spellcastClient.ui = options.ui ;

	return window.spellcastClient ;
} ;



SpellcastClient.prototype.run = function run( callback ) {
	var self = this , isOpen = false ;

	this.proxy = new Ngev.Proxy() ;

	// Add the remote service we want to access
	this.proxy.addRemoteService( 'bus' ) ;

	this.ui.forEach( ( ui ) => {
		if ( uiList[ ui ] ) { uiList[ ui ]( self.proxy.remoteServices.bus , self ) ; }
	} ) ;

	this.ws = new WebSocket( 'ws://127.0.0.1:' + this.port + '/' + this.token ) ;

	this.emit( 'connecting' ) ;

	this.ws.onerror = function onError() {

		if ( ! isOpen ) {
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

		if ( ! isOpen ) {
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

dom.ready( () => {
	window.spellcastClient.run() ;

	// Debug
	// Style sheet reloader (F9 key)
	document.body.onkeypress = function( event ) {
		if ( event.keyCode !== 120 ) { return ; }

		var href , sheets = document.querySelectorAll( 'link[rel=stylesheet]' ) ;

		for ( var i = 0 ; i < sheets.length ; i ++ ) {
			href = sheets[i].getAttribute( 'href' ).split( '?' )[0] + '?' + Math.random() ;
			sheets[i].setAttribute( 'href' , href ) ;
		}
	} ;
} ) ;



},{"./ui/classic.js":4,"dom-kit":7,"nextgen-events/lib/browser.js":11,"url":23}],3:[function(require,module,exports){
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



toolkit.markup = function( ... args ) {
	args[ 0 ] = escapeHtml( args[ 0 ] ).replace( /\n/ , '<br />' ) ;
	return markupMethod.apply( markupConfig , args ) ;
} ;


},{"string-kit/lib/escape.js":19,"string-kit/lib/format.js":20}],4:[function(require,module,exports){
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



var Dom = require( '../Dom.js' ) ;
// var treeExtend = require( 'tree-kit/lib/extend.js' ) ;
// var treeOps = require( 'kung-fig/lib/treeOps.js' ) ;
var toolkit = require( '../toolkit.js' ) ;



function UI( bus , client , self ) {
	console.log( Array.from( arguments ) ) ;	// eslint-disable-line

	if ( ! self ) {
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
			dom: { value: Dom.create() }
		} ) ;
	}

	self.client.once( 'connecting' , UI.clientConnecting.bind( self ) ) ;
	self.client.once( 'open' , UI.clientOpen.bind( self ) ) ;
	self.client.once( 'close' , UI.clientClose.bind( self ) ) ;
	self.client.on( 'error' , UI.clientError.bind( self ) ) ;

	self.dom.enableChat( ( message ) => {
		console.log( 'inGame?' , self.inGame ) ;
		self.bus.emit( self.inGame ? 'command' : 'chat' , message ) ;
	} ) ;

	self.dom.preload() ;

	return self ;
}

module.exports = UI ;



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

	this.bus.on( 'wait' , UI.wait.bind( this ) ) ;
	this.bus.on( 'end' , UI.end.bind( this ) , { async: true } ) ;

	this.bus.on( 'exit' , UI.exit.bind( this ) ) ;

	this.bus.emit( 'ready' ) ;
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
			label: role.label ,
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

		var roles = next.roleIds.map( id => { return this.roles.get( id ).label ; } ) ;

		if ( next.label ) { charCount += next.label.length ; }

		choices.push( {
			index: i ,
			label: next.label || 'Next' ,
			image: next.image ,
			button: next.button ,
			groupBreak: !! next.groupBreak ,
			//orderedList: nexts.length > 1 ,
			type: 'next' ,
			selectedBy: roles
		} ) ;
	} ) ;

	if ( ! options.style || options.style === 'auto' ) {
		if ( this.roles.length <= 1 && choices.length <= 3 && charCount < 20 ) {
			options.style = 'inline' ;
		}
		else if ( choices.length > 8 ) {
			options.style = 'smallList' ;
		}
		else {
			options.style = 'list' ;
		}
	}

	if ( undecidedRoleIds.length && this.roles.length ) {
		undecidedNames = undecidedRoleIds.map( ( e ) => { return this.roles.get( e ).label ; } ) ;
	}

	var onSelect = index => {
		if ( nexts[ index ].roleIds.indexOf( this.roleId ) !== -1 ) {
			this.bus.emit( 'selectNext' , null ) ;
		}
		else {
			this.bus.emit( 'selectNext' , index ) ;
		}
	} ;

	this.dom.setChoices( choices , undecidedNames , onSelect , { timeout: options.timeout , style: options.style } ) ;
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

	switch ( result ) {
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
UI.exit = function exit() {
	//term( "\n" ) ;
	//term.styleReset() ;
} ;

},{"../Dom.js":1,"../toolkit.js":3}],5:[function(require,module,exports){
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



// Load modules

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
domKit.ready = function ready( callback ) {
	document.addEventListener( 'DOMContentLoaded' , function internalCallback() {
		document.removeEventListener( 'DOMContentLoaded' , internalCallback , false ) ;
		callback() ;
	} , false ) ;
} ;



domKit.fromXml = function fromXml( xml ) {
	return domParser.parseFromString( xml , 'application/xml' ) ;
} ;



domKit.toXml = function fromXml( $doc ) {
	return xmlSerializer.serializeToString( $doc ) ;
} ;



// Return a fragment from html code
domKit.fromHtml = function fromHtml( html ) {
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



// Batch processing, like array, HTMLCollection, and so on...
domKit.batch = function batch( method , elements , ... args ) {
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
domKit.css = function css( $element , object ) {
	var key ;

	for ( key in object ) {
		$element.style[ key ] = object[ key ] ;
	}
} ;



// Set a bunch of attributes given as an object
domKit.attr = function attr( $element , object , prefix ) {
	var key ;

	prefix = prefix || '' ;

	for ( key in object ) {
		if ( object[ key ] === null ) { $element.removeAttribute( prefix + key ) ; }
		else { $element.setAttribute( prefix + key , object[ key ] ) ; }
	}
} ;



// Set/unset a bunch of classes given as an object
domKit.class = function class_( $element , object , prefix ) {
	var key ;

	prefix = prefix || '' ;

	for ( key in object ) {
		if ( object[ key ] ) { $element.classList.add( prefix + key ) ; }
		else { $element.classList.remove( prefix + key ) ; }
	}
} ;



// Remove an element. A little shortcut that ease life...
domKit.remove = function remove( $element ) { $element.parentNode.removeChild( $element ) ; } ;



// Remove all children of an element
domKit.empty = function empty( $element ) {
	// $element.innerHTML = '' ;	// <-- According to jsPerf, this is 96% slower
	while ( $element.firstChild ) { $element.removeChild( $element.firstChild ) ; }
} ;



// Clone a source DOM tree and replace children of the destination
domKit.cloneInto = function cloneInto( $source , $destination ) {
	domKit.empty( $destination ) ;
	$destination.appendChild( $source.cloneNode( true ) ) ;
} ;



// Same than cloneInto() without cloning anything
domKit.insertInto = function insertInto( $source , $destination ) {
	domKit.empty( $destination ) ;
	$destination.appendChild( $source ) ;
} ;



// Move all children of a node into another, after removing existing target's children
domKit.moveChildrenInto = function moveChildrenInto( $source , $destination ) {
	domKit.empty( $destination ) ;
	while ( $source.firstChild ) { $destination.appendChild( $source.firstChild ) ; }
} ;



// Move all attributes of an element into the destination
domKit.moveAttributes = function moveAttributes( $source , $destination ) {
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



domKit.styleToAttribute = function styleToAttribute( $element , property , blacklistedValues ) {
	if ( $element.style[ property ] && ( ! blacklistedValues || blacklistedValues.indexOf( $element.style[ property ] ) === -1 ) ) {
		$element.setAttribute( property , $element.style[ property ] ) ;
		$element.style[ property ] = null ;
	}
} ;



// Children of this element get all their ID prefixed, any url(#id) references are patched accordingly
domKit.prefixIds = function prefixIds( $element , prefix ) {
	var elements , replacement = {} ;

	elements = $element.querySelectorAll( '*' ) ;

	domKit.batch( domKit.prefixIds.idAttributePass , elements , prefix , replacement ) ;
	domKit.batch( domKit.prefixIds.otherAttributesPass , elements , replacement ) ;
} ;

// Callbacks for domKit.prefixIds(), cleanly hidden behind its prefix

domKit.prefixIds.idAttributePass = function idAttributePass( $element , prefix , replacement ) {
	replacement[ $element.id ] = prefix + '.' + $element.id ;
	$element.id = replacement[ $element.id ] ;
} ;

domKit.prefixIds.otherAttributesPass = function otherAttributesPass( $element , replacement ) {
	domKit.batch( domKit.prefixIds.oneAttributeSubPass , $element.attributes , replacement ) ;
} ;

domKit.prefixIds.oneAttributeSubPass = function oneAttributeSubPass( attr , replacement ) {

	// We have to search all url(#id) like substring in the current attribute's value
	attr.value = attr.value.replace( /url\(#([^)]+)\)/g , ( match , id ) => {

		// No replacement? return the matched string
		if ( ! replacement[ id ] ) { return match ; }

		// Or return the replacement ID
		return 'url(#' + replacement[ id ] + ')' ;
	} ) ;
} ;



domKit.removeAllTags = function removeAllTags( $container , tagName , onlyIfEmpty ) {
	Array.from( $container.getElementsByTagName( tagName ) ).forEach( ( $element ) => {
		if ( ! onlyIfEmpty || ! $element.firstChild ) { $element.parentNode.removeChild( $element ) ; }
	} ) ;
} ;



domKit.removeAllAttributes = function removeAllAttributes( $container , attrName ) {
	// Don't forget to remove the ID of the container itself
	$container.removeAttribute( attrName ) ;

	Array.from( $container.querySelectorAll( '[' + attrName + ']' ) ).forEach( ( $element ) => {
		$element.removeAttribute( attrName ) ;
	} ) ;
} ;



domKit.preload = function preload( urls ) {
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
domKit.filterByNamespace = function filterByNamespace( $container , options ) {
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
domKit.filterAttributesByNamespace = function filterAttributesByNamespace( $container , options ) {
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
domKit.removeComments = function removeComments( $container ) {
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
domKit.removeWhiteSpaces = function removeWhiteSpaces( $container , onlyWhiteLines ) {
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

domKit.parseMatrix = function parseMatrix( str ) {
	var matches = str.match( /(matrix|matrix3d)\(([0-9., -]+)\)/ ) ;

	if ( ! matches ) { return null ; }

	return matches[ 2 ].trim().split( / ?, ?/ ).map( ( e ) => {
		return parseFloat( e ) ;
	} ) ;
} ;



domKit.decomposeMatrix = function decomposeMatrix( mat ) {
	if ( mat.length === 6 ) { return domKit.decomposeMatrix2d( mat ) ; }
	if ( mat.length === 16 ) { return domKit.decomposeMatrix3d( mat ) ; }
	return null ;
} ;



// From: https://stackoverflow.com/questions/16359246/how-to-extract-position-rotation-and-scale-from-matrix-svg
domKit.decomposeMatrix2d = function decomposeMatrix2d( mat ) {
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
domKit.decomposeMatrix3d = function decomposeMatrix3d( mat ) {
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



domKit.stringifyTransform = function stringifyTransform( object ) {
	var str = [] ;

	if ( object.translateX ) { str.push( 'translateX(' + object.translateX + 'px)' ) ; }
	if ( object.translateY ) { str.push( 'translateY(' + object.translateY + 'px)' ) ; }
	if ( object.translateZ ) { str.push( 'translateZ(' + object.translateZ + 'px)' ) ; }
	if ( object.rotate ) { str.push( 'rotate(' + object.rotate + 'deg)' ) ; }
	if ( object.rotateX ) { str.push( 'rotateX(' + object.rotateX + 'deg)' ) ; }
	if ( object.rotateY ) { str.push( 'rotateY(' + object.rotateY + 'deg)' ) ; }
	if ( object.rotateZ ) { str.push( 'rotateZ(' + object.rotateZ + 'deg)' ) ; }
	if ( object.scaleX ) { str.push( 'scaleX(' + object.scaleX + ')' ) ; }
	if ( object.scaleY ) { str.push( 'scaleY(' + object.scaleY + ')' ) ; }
	if ( object.scaleZ ) { str.push( 'scaleZ(' + object.scaleZ + ')' ) ; }
	if ( object.skewX ) { str.push( 'skewX(' + object.skewX + 'deg)' ) ; }
	if ( object.skewY ) { str.push( 'skewY(' + object.skewY + 'deg)' ) ; }

	return str.join( ' ' ) ;
} ;





/* Function useful for .batch() as callback */
/* ... to avoid defining again and again the same callback function */

// Change id
domKit.id = function id_( $element , id ) { $element.id = id ; } ;

// Like jQuery .text().
domKit.text = function text_( $element , text ) { $element.textContent = text ; } ;

// Like jQuery .html().
domKit.html = function html_( $element , html ) { $element.innerHTML = html ; } ;



}).call(this,require('_process'))
},{"@cronvel/xmldom":6,"_process":13}],8:[function(require,module,exports){
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
(function (process,global){
/*
	Next-Gen Events

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

// Not part of the prototype, because it should not pollute userland's prototype.
// It has an eventEmitter as 'this' anyway (always called using call()).
NextGenEvents.init = function init() {
	Object.defineProperty( this , '__ngev' , {
		configurable: true ,
		value: new NextGenEvents.Internal()
	} ) ;
} ;



NextGenEvents.Internal = function Internal( from ) {
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

			this.addListenerContext( contextName , {
				nice: context.nice ,
				status: context.status ,
				serial: context.serial
			} ) ;
		} ) ;
	}
} ;



NextGenEvents.initFrom = function initFrom( from ) {
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
*/
NextGenEvents.mergeListeners = function mergeListeners( foreigners ) {
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
NextGenEvents.prototype.addListener = function addListener( eventName , fn , options ) {
	var listener = {} , newListenerListeners ;

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! this.__ngev.listeners[ eventName ] ) { this.__ngev.listeners[ eventName ] = [] ; }

	if ( ! eventName || typeof eventName !== 'string' ) {
		throw new TypeError( ".addListener(): argument #0 should be a non-empty string" ) ;
	}

	if ( typeof fn !== 'function' ) {
		if ( options === true && fn && typeof fn === 'object' ) {
			// We want to use the current object as the listener object (used by Spellcast's serializer)
			options = listener = fn ;
			fn = undefined ;
		}
		else {
			options = fn ;
			fn = undefined ;
		}
	}

	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	listener.fn = fn || options.fn ;
	listener.id = options.id !== undefined ? options.id : listener.fn ;
	listener.once = !! options.once ;
	listener.async = !! options.async ;
	listener.eventObject = !! options.eventObject ;
	listener.nice = options.nice !== undefined ? Math.floor( options.nice ) : NextGenEvents.SYNC ;
	listener.context = typeof options.context === 'string' ? options.context : null ;

	if ( typeof listener.fn !== 'function' ) {
		throw new TypeError( ".addListener(): a function or an object with a 'fn' property which value is a function should be provided" ) ;
	}

	// Implicit context creation
	if ( listener.context && typeof listener.context === 'string' && ! this.__ngev.contexts[ listener.context ] ) {
		this.addListenerContext( listener.context ) ;
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

	if ( this.__ngev.states[ eventName ] ) { NextGenEvents.emitToOneListener( this.__ngev.states[ eventName ] , listener ) ; }

	return this ;
} ;

NextGenEvents.prototype.on = NextGenEvents.prototype.addListener ;



// Shortcut
// .once( eventName , [fn] , [options] )
NextGenEvents.prototype.once = function once( eventName , fn , options ) {
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }

	return this.addListener( eventName , fn , options ) ;
} ;



NextGenEvents.prototype.removeListener = function removeListener( eventName , id ) {
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



NextGenEvents.prototype.removeAllListeners = function removeAllListeners( eventName ) {
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
		this.__ngev.listeners = {} ;
	}

	return this ;
} ;



NextGenEvents.listenerWrapper = function listenerWrapper( listener , event , contextScope , serial ) {
	var returnValue , listenerCallback ;

	if ( event.interrupt ) { return ; }

	if ( listener.async ) {
		if ( contextScope ) {
			contextScope.ready = ! serial ;
		}

		listenerCallback = ( arg ) => {

			event.listenersDone ++ ;

			// Async interrupt
			if ( arg && event.emitter.__ngev.interruptible && ! event.interrupt && event.name !== 'interrupt' ) {
				event.interrupt = arg ;

				if ( event.callback ) { NextGenEvents.emitCallback( event ) ; }

				event.emitter.emit( 'interrupt' , event.interrupt ) ;
			}
			else if ( event.listenersDone >= event.listeners.length && event.callback ) {
				NextGenEvents.emitCallback( event ) ;
			}

			// Process the queue if serialized
			if ( serial ) { NextGenEvents.processScopeQueue( event.emitter , contextScope , true , true ) ; }
		} ;

		if ( listener.eventObject ) { listener.fn( event , listenerCallback ) ; }
		else { returnValue = listener.fn.apply( undefined , event.args.concat( listenerCallback ) ) ; }
	}
	else {
		if ( listener.eventObject ) { listener.fn( event ) ; }
		else { returnValue = listener.fn.apply( undefined , event.args ) ; }

		event.listenersDone ++ ;
	}

	// Interrupt if non-falsy return value, if the emitter is interruptible, not already interrupted (emit once),
	// and not within an 'interrupt' event.
	if ( returnValue && event.emitter.__ngev.interruptible && ! event.interrupt && event.name !== 'interrupt' ) {
		event.interrupt = returnValue ;

		if ( event.callback ) { NextGenEvents.emitCallback( event ) ; }

		event.emitter.emit( 'interrupt' , event.interrupt ) ;
	}
	else if ( event.listenersDone >= event.listeners.length && event.callback ) {
		NextGenEvents.emitCallback( event ) ;
	}
} ;



// A unique event ID
var nextEventId = 0 ;



/*
	emit( [nice] , eventName , [arg1] , [arg2] , [...] , [emitCallback] )
*/
NextGenEvents.prototype.emit = function emit( ... args ) {
	var event ;

	event = {
		emitter: this ,
		interrupt: null ,
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
		//event.nice = this.__ngev.nice ;
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
NextGenEvents.emitEvent = function emitEvent( event ) {
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
	event.once = !! event.once ;

	if ( event.nice === undefined || event.nice === null ) { event.nice = self.__ngev.nice ; }

	// Trouble arise when a listener is removed from another listener, while we are still in the loop.
	// So we have to COPY the listener array right now!
	if ( ! event.listeners ) { event.listeners = self.__ngev.listeners[ event.name ].slice() ; }

	// Increment globalData.recursions
	globalData.recursions ++ ;
	event.depth = self.__ngev.depth ++ ;
	removedListeners = [] ;

	// Emit the event to all listeners!
	for ( i = 0 , iMax = event.listeners.length ; i < iMax ; i ++ ) {
		count ++ ;
		NextGenEvents.emitToOneListener( event , event.listeners[ i ] , removedListeners ) ;
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



// If removedListeners is not given, then one-time listener emit the 'removeListener' event,
// if given: that's the caller business to do it
NextGenEvents.emitToOneListener = function emitToOneListener( event , listener , removedListeners ) {
	var self = event.emitter ,
		context , contextScope , serial , currentNice , emitRemoveListener = false ;

	context = listener.context && self.__ngev.contexts[ listener.context ] ;

	// If the listener context is disabled...
	if ( context && context.status === NextGenEvents.CONTEXT_DISABLED ) { return ; }

	// The nice value for this listener...
	if ( context ) {
		currentNice = Math.max( event.nice , listener.nice , context.nice ) ;
		serial = context.serial ;
		contextScope = NextGenEvents.getContextScope( context , event.depth ) ;
	}
	else {
		currentNice = Math.max( event.nice , listener.nice ) ;
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
		try {
			if ( currentNice < 0 ) {
				if ( globalData.recursions >= -currentNice ) {
					self.__ngev.desync( NextGenEvents.listenerWrapper.bind( self , listener , event , contextScope , serial ) ) ;
				}
				else {
					NextGenEvents.listenerWrapper.call( self , listener , event , contextScope , serial ) ;
				}
			}
			else {
				setTimeout( NextGenEvents.listenerWrapper.bind( self , listener , event , contextScope , serial ) , currentNice ) ;
			}
		}
		catch ( error ) {
			// Catch error, just to decrement globalData.recursions, re-throw after that...
			globalData.recursions -- ;
			throw error ;
		}
	}

	// Emit 'removeListener' after calling the listener
	if ( emitRemoveListener && self.__ngev.listeners.removeListener.length ) {
		self.emit( 'removeListener' , [ listener ] ) ;
	}
} ;



NextGenEvents.emitCallback = function emitCallback( event ) {
	var callback = event.callback ;
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



NextGenEvents.prototype.listeners = function listeners( eventName ) {
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



NextGenEvents.prototype.setNice = function setNice( nice ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	//if ( typeof nice !== 'number' ) { throw new TypeError( ".setNice(): argument #0 should be a number" ) ; }

	this.__ngev.nice = Math.floor( + nice || 0 ) ;
} ;



NextGenEvents.prototype.desyncUseNextTick = function desyncUseNextTick( useNextTick ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	//if ( typeof nice !== 'number' ) { throw new TypeError( ".setNice(): argument #0 should be a number" ) ; }

	this.__ngev.desync = useNextTick ? nextTick : setImmediate ;
} ;



NextGenEvents.prototype.setInterruptible = function setInterruptible( value ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	//if ( typeof nice !== 'number' ) { throw new TypeError( ".setNice(): argument #0 should be a number" ) ; }

	this.__ngev.interruptible = !! value ;
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



NextGenEvents.reset = function reset( emitter ) {
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
NextGenEvents.prototype.defineStates = function defineStates( ... states ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	states.forEach( ( state ) => {
		this.__ngev.states[ state ] = null ;
		this.__ngev.stateGroups[ state ] = states ;
	} ) ;
} ;



NextGenEvents.prototype.hasState = function hasState( state ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return !! this.__ngev.states[ state ] ;
} ;



NextGenEvents.prototype.getAllStates = function getAllStates() {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	return Object.keys( this.__ngev.states ).filter( e => this.__ngev.states[ e ] ) ;
} ;





/* Next Gen feature: groups! */



NextGenEvents.groupAddListener = function groupAddListener( emitters , eventName , fn , options ) {
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
NextGenEvents.groupOnce = function groupOnce( emitters , eventName , fn , options ) {
	if ( fn && typeof fn === 'object' ) { fn.once = true ; }
	else if ( options && typeof options === 'object' ) { options.once = true ; }
	else { options = { once: true } ; }

	return this.groupAddListener( emitters , eventName , fn , options ) ;
} ;



// Globally once, only one event could be emitted, by the first emitter to emit
NextGenEvents.groupGlobalOnce = function groupGlobalOnce( emitters , eventName , fn , options ) {
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



// Globally once, only one event could be emitted, by the last emitter to emit
NextGenEvents.groupGlobalOnceAll = function groupGlobalOnceAll( emitters , eventName , fn , options ) {
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



NextGenEvents.groupRemoveListener = function groupRemoveListener( emitters , eventName , id ) {
	emitters.forEach( ( emitter ) => {
		emitter.removeListener( eventName , id ) ;
	} ) ;
} ;

NextGenEvents.groupOff = NextGenEvents.groupRemoveListener ;



NextGenEvents.groupRemoveAllListeners = function groupRemoveAllListeners( emitters , eventName ) {
	emitters.forEach( ( emitter ) => {
		emitter.removeAllListeners( eventName ) ;
	} ) ;
} ;



NextGenEvents.groupEmit = function groupEmit( emitters , ... args ) {
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



NextGenEvents.groupDefineStates = function groupDefineStates( emitters , ... args ) {
	emitters.forEach( ( emitter ) => {
		emitter.defineStates( ... args ) ;
	} ) ;
} ;





/* Next Gen feature: contexts! */



NextGenEvents.CONTEXT_ENABLED = 0 ;
NextGenEvents.CONTEXT_DISABLED = 1 ;
NextGenEvents.CONTEXT_QUEUED = 2 ;



NextGenEvents.prototype.addListenerContext = function addListenerContext( contextName , options ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".addListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var context = this.__ngev.contexts[ contextName ] ;

	if ( ! context ) {
		context = this.__ngev.contexts[ contextName ] = {
			nice: NextGenEvents.SYNC ,
			ready: true ,
			status: NextGenEvents.CONTEXT_ENABLED ,
			scopes: {}
		} ;
	}

	if ( options.nice !== undefined ) { context.nice = Math.floor( options.nice ) ; }
	if ( options.status !== undefined ) { context.status = options.status ; }
	if ( options.serial !== undefined ) { context.serial = !! options.serial ; }

	return this ;
} ;



NextGenEvents.getContextScope = function getContextScope( context , scopeName ) {
	var scope = context.scopes[ scopeName ] ;

	if ( ! scope ) {
		scope = context.scopes[ scopeName ] = {
			ready: true ,
			queue: []
		} ;
	}

	return scope ;
} ;



NextGenEvents.prototype.disableListenerContext = function disableListenerContext( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_DISABLED ;

	return this ;
} ;



NextGenEvents.prototype.enableListenerContext = function enableListenerContext( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".enableListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	var context = this.__ngev.contexts[ contextName ] ;

	context.status = NextGenEvents.CONTEXT_ENABLED ;

	Object.values( context.scopes ).forEach( contextScope => {
		if ( contextScope.queue.length > 0 ) { NextGenEvents.processScopeQueue( this , contextScope , context.serial ) ; }
	} ) ;

	return this ;
} ;



NextGenEvents.prototype.queueListenerContext = function queueListenerContext( contextName ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".queueListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].status = NextGenEvents.CONTEXT_QUEUED ;

	return this ;
} ;



NextGenEvents.prototype.serializeListenerContext = function serializeListenerContext( contextName , value ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".serializeListenerContext(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].serial = value === undefined ? true : !! value ;

	return this ;
} ;



NextGenEvents.prototype.setListenerContextNice = function setListenerContextNice( contextName , nice ) {
	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }
	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".setListenerContextNice(): argument #0 should be a non-empty string" ) ; }
	if ( ! this.__ngev.contexts[ contextName ] ) { this.addListenerContext( contextName ) ; }

	this.__ngev.contexts[ contextName ].nice = Math.floor( nice ) ;

	return this ;
} ;



NextGenEvents.prototype.destroyListenerContext = function destroyListenerContext( contextName ) {
	var i , length , eventName , newListeners , removedListeners = [] ;

	if ( ! contextName || typeof contextName !== 'string' ) { throw new TypeError( ".disableListenerContext(): argument #0 should be a non-empty string" ) ; }

	if ( ! this.__ngev ) { NextGenEvents.init.call( this ) ; }

	// We don't care if a context actually exists, all listeners tied to that contextName will be removed

	for ( eventName in this.__ngev.listeners ) {
		newListeners = null ;
		length = this.__ngev.listeners[ eventName ].length ;

		for ( i = 0 ; i < length ; i ++ ) {
			if ( this.__ngev.listeners[ eventName ][ i ].context === contextName ) {
				newListeners = [] ;
				removedListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
			else if ( newListeners ) {
				newListeners.push( this.__ngev.listeners[ eventName ][ i ] ) ;
			}
		}

		if ( newListeners ) { this.__ngev.listeners[ eventName ] = newListeners ; }
	}

	if ( this.__ngev.contexts[ contextName ] ) { delete this.__ngev.contexts[ contextName ] ; }

	if ( removedListeners.length && this.__ngev.listeners.removeListener.length ) {
		this.emit( 'removeListener' , removedListeners ) ;
	}

	return this ;
} ;



NextGenEvents.processScopeQueue = function processScopeQueue( self , contextScope , serial , isCompletionCallback ) {
	var job ;

	if ( isCompletionCallback ) { contextScope.ready = true ; }

	// Increment recursion
	globalData.recursions ++ ;

	while ( contextScope.ready && contextScope.queue.length ) {
		job = contextScope.queue.shift() ;

		// This event has been interrupted, drop it now!
		if ( job.event.interrupt ) { continue ; }

		try {
			if ( job.nice < 0 ) {
				if ( globalData.recursions >= -job.nice ) {
					self.__ngev.desync( NextGenEvents.listenerWrapper.bind( self , job.listener , job.event , contextScope , serial ) ) ;
				}
				else {
					NextGenEvents.listenerWrapper.call( self , job.listener , job.event , contextScope , serial ) ;
				}
			}
			else {
				setTimeout( NextGenEvents.listenerWrapper.bind( self , job.listener , job.event , contextScope , serial ) , job.nice ) ;
			}
		}
		catch ( error ) {
			// Catch error, just to decrement globalData.recursions, re-throw after that...
			globalData.recursions -- ;
			throw error ;
		}
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


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":12,"./Proxy.js":10,"_process":13}],10:[function(require,module,exports){
/*
	Next-Gen Events

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



// Create the object && export it
function Proxy() { return Proxy.create() ; }
module.exports = Proxy ;

var NextGenEvents = require( './NextGenEvents.js' ) ;
var MESSAGE_TYPE = 'NextGenEvents/message' ;

function noop() {}



Proxy.create = function create() {
	var self = Object.create( Proxy.prototype , {
		localServices: { value: {} , enumerable: true } ,
		remoteServices: { value: {} , enumerable: true } ,
		nextAckId: { value: 1 , writable: true , enumerable: true }
	} ) ;

	return self ;
} ;



// Add a local service accessible remotely
Proxy.prototype.addLocalService = function addLocalService( id , emitter , options ) {
	this.localServices[ id ] = LocalService.create( this , id , emitter , options ) ;
	return this.localServices[ id ] ;
} ;



// Add a remote service accessible locally
Proxy.prototype.addRemoteService = function addRemoteService( id ) {
	this.remoteServices[ id ] = RemoteService.create( this , id ) ;
	return this.remoteServices[ id ] ;
} ;



// Destroy the proxy
Proxy.prototype.destroy = function destroy() {
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
Proxy.prototype.push = function push( message ) {
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
Proxy.prototype.receive = function receive( raw ) {
	this.push( raw ) ;
} ;



// This is the method used to send data to the other side of the communication channel, most of time another proxy.
// This MUST be overwritten in any case.
Proxy.prototype.send = function send() {
	throw new Error( 'The send() method of the Proxy MUST be extended/overwritten' ) ;
} ;



/* Local Service */



function LocalService( proxy , id , emitter , options ) { return LocalService.create( proxy , id , emitter , options ) ; }
Proxy.LocalService = LocalService ;



LocalService.create = function create( proxy , id , emitter , options ) {
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
LocalService.prototype.destroy = function destroy() {
	Object.keys( this.events ).forEach( ( eventName ) => {
		this.emitter.off( eventName , this.events[ eventName ] ) ;
		delete this.events[ eventName ] ;
	} ) ;

	this.emitter = null ;
	this.destroyed = true ;
} ;



// Remote want to emit on the local service
LocalService.prototype.receiveEmit = function receiveEmit( message ) {
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
LocalService.prototype.receiveListen = function receiveListen( message ) {
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
LocalService.prototype.receiveIgnore = function receiveIgnore( message ) {
	if ( this.destroyed || ! this.canListen ) { return ; }

	if ( ! this.events[ message.event ] ) { return ; }

	this.emitter.off( message.event , this.events[ message.event ] ) ;
	this.events[ message.event ] = null ;
} ;



//
LocalService.prototype.receiveAckEvent = function receiveAckEvent( message ) {
	if (
		this.destroyed || ! this.canListen || ! this.canAck || ! message.ack ||
		! this.events[ message.event ] || ! this.events[ message.event ].ack
	) {
		return ;
	}

	this.internalEvents.emit( 'ack' , message ) ;
} ;



// Send an event from the local service to remote
LocalService.forward = function forward( event ) {
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
LocalService.forwardWithAck = function forwardWithAck( event , callback ) {
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



RemoteService.create = function create( proxy , id ) {
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
RemoteService.prototype.destroy = function destroy() {
	this.emitter.removeAllListeners() ;
	this.emitter = null ;
	Object.keys( this.events ).forEach( ( eventName ) => { delete this.events[ eventName ] ; } ) ;
	this.destroyed = true ;
} ;



// Local code want to emit to remote service
RemoteService.prototype.emit = function emit( eventName , ... args ) {
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
RemoteService.prototype.addListener = function addListener( eventName , fn , options ) {
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
RemoteService.prototype.removeListener = function removeListener( eventName , id ) {
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
RemoteService.prototype.receiveEvent = function receiveEvent( message ) {
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
RemoteService.prototype.receiveAckEmit = function receiveAckEmit( message ) {
	if ( this.destroyed || ! message.ack || this.events[ message.event ] !== EVENT_ACK ) {
		return ;
	}

	this.internalEvents.emit( 'ack' , message ) ;
} ;



},{"./NextGenEvents.js":9}],11:[function(require,module,exports){
/*
	Next-Gen Events

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

/* global window */



if ( typeof window.setImmediate !== 'function' ) {
	window.setImmediate = function setImmediate( fn ) {
		setTimeout( fn , 0 ) ;
	} ;
}

module.exports = require( './NextGenEvents.js' ) ;
module.exports.isBrowser = true ;

},{"./NextGenEvents.js":9}],12:[function(require,module,exports){
module.exports={
  "_from": "nextgen-events@0.13.0",
  "_id": "nextgen-events@0.13.0",
  "_inBundle": false,
  "_integrity": "sha512-+MuSfdF10xlUG2F7elNM3YENy+QnEBtetCPrQnYwCKFCIFw/UGbDXDjW9Vn/cvHBUTH4Y7DRgz6HZlLEM7zHYg==",
  "_location": "/nextgen-events",
  "_phantomChildren": {},
  "_requested": {
    "type": "version",
    "registry": true,
    "raw": "nextgen-events@0.13.0",
    "name": "nextgen-events",
    "escapedName": "nextgen-events",
    "rawSpec": "0.13.0",
    "saveSpec": null,
    "fetchSpec": "0.13.0"
  },
  "_requiredBy": [
    "#USER",
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/nextgen-events/-/nextgen-events-0.13.0.tgz",
  "_shasum": "320771b90eea892ec09398d9de69233e58677b2a",
  "_spec": "nextgen-events@0.13.0",
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
      2018
    ],
    "owner": "Cédric Ronvel"
  },
  "dependencies": {},
  "deprecated": false,
  "description": "The next generation of events handling for javascript! New: abstract away the network!",
  "devDependencies": {
    "browserify": "^14.4.0",
    "expect.js": "^0.3.1",
    "jshint": "^2.9.2",
    "mocha": "^2.5.3",
    "uglify-js-es6": "^2.8.9",
    "ws": "^3.2.0"
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
    "test": "mocha -R dot"
  },
  "version": "0.13.0"
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
/*
	String Kit

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

	defaultBgColor: '\x1b[49m' ,
	bgBlack: '\x1b[40m' ,
	bgRed: '\x1b[41m' ,
	bgGreen: '\x1b[42m' ,
	bgYellow: '\x1b[43m' ,
	bgBlue: '\x1b[44m' ,
	bgMagenta: '\x1b[45m' ,
	bgCyan: '\x1b[46m' ,
	bgWhite: '\x1b[47m' ,
	bgBrightBlack: '\x1b[100m' ,
	bgBrightRed: '\x1b[101m' ,
	bgBrightGreen: '\x1b[102m' ,
	bgBrightYellow: '\x1b[103m' ,
	bgBrightBlue: '\x1b[104m' ,
	bgBrightMagenta: '\x1b[105m' ,
	bgBrightCyan: '\x1b[106m' ,
	bgBrightWhite: '\x1b[107m'
} ;



},{}],19:[function(require,module,exports){
/*
	String Kit

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

/*
	Escape collection.
*/



"use strict" ;



// From Mozilla Developper Network
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
exports.regExp = exports.regExpPattern = function escapeRegExpPattern( str ) {
	return str.replace( /([.*+?^${}()|[\]/\\])/g , '\\$1' ) ;
} ;

exports.regExpReplacement = function escapeRegExpReplacement( str ) {
	return str.replace( /\$/g , '$$$$' ) ;	// This replace any single $ by a double $$
} ;



exports.format = function escapeFormat( str ) {
	return str.replace( /%/g , '%%' ) ;	// This replace any single % by a double %%
} ;



exports.jsSingleQuote = function escapeJsSingleQuote( str ) {
	return exports.control( str ).replace( /'/g , "\\'" ) ;
} ;

exports.jsDoubleQuote = function escapeJsDoubleQuote( str ) {
	return exports.control( str ).replace( /"/g , '\\"' ) ;
} ;



exports.shellArg = function escapeShellArg( str ) {
	return '\'' + str.replace( /'/g , "'\\''" ) + '\'' ;
} ;



var escapeControlMap = {
	'\r': '\\r' , '\n': '\\n' , '\t': '\\t' , '\x7f': '\\x7f'
} ;

// Escape \r \n \t so they become readable again, escape all ASCII control character as well, using \x syntaxe
exports.control = function escapeControl( str ) {
	return str.replace( /[\x00-\x1f\x7f]/g , ( match ) => {
		if ( escapeControlMap[ match ] !== undefined ) { return escapeControlMap[ match ] ; }
		var hex = match.charCodeAt( 0 ).toString( 16 ) ;
		if ( hex.length % 2 ) { hex = '0' + hex ; }
		return '\\x' + hex ;
	} ) ;
} ;



var escapeHtmlMap = {
	'&': '&amp;' , '<': '&lt;' , '>': '&gt;' , '"': '&quot;' , "'": '&#039;'
} ;

// Only escape & < > so this is suited for content outside tags
exports.html = function escapeHtml( str ) {
	return str.replace( /[&<>]/g , ( match ) => { return escapeHtmlMap[ match ] ; } ) ;
} ;

// Escape & < > " so this is suited for content inside a double-quoted attribute
exports.htmlAttr = function escapeHtmlAttr( str ) {
	return str.replace( /[&<>"]/g , ( match ) => { return escapeHtmlMap[ match ] ; } ) ;
} ;

// Escape all html special characters & < > " '
exports.htmlSpecialChars = function escapeHtmlSpecialChars( str ) {
	return str.replace( /[&<>"']/g , ( match ) => { return escapeHtmlMap[ match ] ; } ) ;
} ;



},{}],20:[function(require,module,exports){
(function (Buffer){
/*
	String Kit

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

/*
	String formater, inspired by C's sprintf().
*/



"use strict" ;



// Load modules
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
	%z		base64
	%Z		base64url
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

exports.formatMethod = function format( ... args ) {
	var str = args[ 0 ] ;

	if ( typeof str !== 'string' ) {
		if ( ! str ) { str = '' ; }
		else if ( typeof str.toString === 'function' ) { str = str.toString() ; }
		else { str = '' ; }
	}

	var arg , value ,
		autoIndex = 1 , length = args.length ,
		hasMarkup = false , shift = null , markupStack = [] ;

	if ( this.markupReset && this.startingMarkupReset ) {
		str = ( typeof this.markupReset === 'function' ? this.markupReset( markupStack ) : this.markupReset ) + str ;
	}

	//console.log( 'format args:' , arguments ) ;

	// /!\ each changes here should be reported on string.format.count() and string.format.hasFormatting() too /!\
	//str = str.replace( /\^(.?)|%(?:([+-]?)([0-9]*)(?:\/([^\/]*)\/)?([a-zA-Z%])|\[([a-zA-Z0-9_]+)(?::([^\]]*))?\])/g ,
	str = str.replace( /\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/g ,
		( match , markup , doublePercent , relative , index , modeArg , mode ) => {		// jshint ignore:line

			var replacement , i , n , depth , tmp , fn , fnArgString , argMatches , argList = [] ;

			//console.log( 'replaceArgs:' , arguments ) ;
			if ( doublePercent ) { return '%' ; }

			if ( markup ) {
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

			switch ( mode ) {
				case 's' :	// string
					if ( arg === null || arg === undefined ) { return '' ; }
					if ( typeof arg === 'string' ) { return arg ; }
					if ( typeof arg === 'number' ) { return '' + arg ; }
					if ( typeof arg.toString === 'function' ) { return arg.toString() ; }
					return '' ;
				case 'f' :	// float
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg !== 'number' ) { return '0' ; }
					if ( modeArg !== undefined ) {
						// Use jQuery number format?
						switch ( modeArg[ 0 ] ) {
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
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.floor( arg ) ; }
					return '0' ;
				case 'u' :	// unsigned decimal
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ) ; }
					return '0' ;
				case 'U' :	// unsigned positive decimal
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 1 ) ; }
					return '1' ;
				case 'x' :	// unsigned hexadecimal, force pair of symbole
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg !== 'number' ) { return '0' ; }
					value = '' + Math.max( Math.floor( arg ) , 0 ).toString( 16 ) ;
					if ( value.length % 2 ) { value = '0' + value ; }
					return value ;
				case 'h' :	// unsigned hexadecimal
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 16 ) ; }
					return '0' ;
				case 'o' :	// unsigned octal
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 8 ) ; }
					return '0' ;
				case 'b' :	// unsigned binary
					if ( typeof arg === 'string' ) { arg = parseFloat( arg ) ; }
					if ( typeof arg === 'number' ) { return '' + Math.max( Math.floor( arg ) , 0 ).toString( 2 ) ; }
					return '0' ;
				case 'z' :	// base64
					if ( typeof arg === 'string' ) { arg = Buffer.from( arg ) ; }
					else if ( ! Buffer.isBuffer( arg ) ) { return '' ; }
					return arg.toString( 'base64' ) ;
				case 'Z' :	// base64url
					if ( typeof arg === 'string' ) { arg = Buffer.from( arg ) ; }
					else if ( ! Buffer.isBuffer( arg ) ) { return '' ; }
					return arg.toString( 'base64' ).replace( /\+/g , '-' ).replace( /\//g , '_' ).replace( /[=]{1,2}$/g , '' ) ;
				case 'I' :
					depth = 3 ;
					if ( modeArg !== undefined ) { depth = parseInt( modeArg , 10 ) ; }
					return inspect( { depth: depth , style: ( this && this.color ? 'color' : 'none' ) } , arg ) ;
				case 'Y' :
					depth = 3 ;
					if ( modeArg !== undefined ) { depth = parseInt( modeArg , 10 ) ; }
					return inspect( {
						depth: depth ,
						style: ( this && this.color ? 'color' : 'none' ) ,
						noFunc: true ,
						enumOnly: true ,
						noDescriptor: true
					} ,
					arg ) ;
				case 'E' :
					return inspectError( { style: ( this && this.color ? 'color' : 'none' ) } , arg ) ;
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

				default :
					return '' ;
			}
		} ) ;

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



var defaultFormatter = {
	extraArguments: true ,
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

exports.format = exports.formatMethod.bind( defaultFormatter ) ;
exports.format.default = defaultFormatter ;



exports.markupMethod = function markup_( str ) {
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



exports.markup = exports.markupMethod.bind( defaultFormatter ) ;



// Count the number of parameters needed for this string
exports.format.count = function formatCount( str ) {
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
exports.format.hasFormatting = function hasFormatting( str ) {
	if ( str.search( /\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/ ) !== -1 ) { return true ; }
	return false ;
} ;



}).call(this,require("buffer").Buffer)
},{"./ansi.js":18,"./inspect.js":21,"buffer":6}],21:[function(require,module,exports){
(function (Buffer,process){
/*
	String Kit

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

/* global Map, Set */

/*
	Variable inspector.
*/



"use strict" ;



// Load modules
var escape = require( './escape.js' ) ;
var ansi = require( './ansi.js' ) ;



/*
	Inspect a variable, return a string ready to be displayed with console.log(), or even as an HTML output.

	Options:
		* style:
			* 'none': (default) normal output suitable for console.log() or writing in a file
			* 'color': colorful output suitable for terminal
			* 'html': html output
			* any object: full controle, inheriting from 'none'
		* depth: depth limit, default: 3
		* maxLength: length limit for strings, default: 200
		* noFunc: do not display functions
		* noDescriptor: do not display descriptor information
		* noType: do not display type and constructor
		* enumOnly: only display enumerable properties
		* funcDetails: display function's details
		* proto: display object's prototype
		* sort: sort the keys
		* minimal: imply noFunc: true, noDescriptor: true, noType: true, enumOnly: true, proto: false and funcDetails: false.
		  Display a minimal JSON-like output
		* protoBlackList: `Set` of blacklisted object prototype (will not recurse inside it)
		* propertyBlackList: `Set` of blacklisted property names (will not even display it)
		* useInspect? use .inspect() method when available on an object
*/

function inspect( options , variable ) {
	if ( arguments.length < 2 ) { variable = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var runtime = { depth: 0 , ancestors: [] } ;

	if ( ! options.style ) { options.style = inspectStyle.none ; }
	else if ( typeof options.style === 'string' ) { options.style = inspectStyle[ options.style ] ; }
	else { options.style = Object.assign( {} , inspectStyle.none , options.style ) ; }

	if ( options.depth === undefined ) { options.depth = 3 ; }
	if ( options.maxLength === undefined ) { options.maxLength = 200 ; }

	// /!\ nofunc is deprecated
	if ( options.nofunc ) { options.noFunc = true ; }

	if ( options.minimal ) {
		options.noFunc = true ;
		options.noDescriptor = true ;
		options.noType = true ;
		options.enumOnly = true ;
		options.funcDetails = false ;
		options.proto = false ;
	}

	return inspect_( runtime , options , variable ) ;
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
		else {
			key = '[' + options.style.index( runtime.key ) + '] ' ;
		}

		if ( descriptorStr ) { descriptorStr = ' ' + options.style.type( descriptorStr ) ; }
	}

	pre = runtime.noPre ? '' : indent + key ;


	// Describe the current variable

	if ( variable === undefined ) {
		str += pre + options.style.constant( 'undefined' ) + descriptorStr + options.style.nl ;
	}
	else if ( variable === null ) {
		str += pre + options.style.constant( 'null' ) + descriptorStr + options.style.nl ;
	}
	else if ( variable === false ) {
		str += pre + options.style.constant( 'false' ) + descriptorStr + options.style.nl ;
	}
	else if ( variable === true ) {
		str += pre + options.style.constant( 'true' ) + descriptorStr + options.style.nl ;
	}
	else if ( type === 'number' ) {
		str += pre + options.style.number( variable.toString() ) +
			( options.noType ? '' : ' ' + options.style.type( 'number' ) ) +
			descriptorStr + options.style.nl ;
	}
	else if ( type === 'string' ) {
		if ( variable.length > options.maxLength ) {
			str += pre + '"' + options.style.string( escape.control( variable.slice( 0 , options.maxLength - 1 ) ) ) + '…" ' +
				( options.noType ? '' : options.style.type( 'string' ) + options.style.length( '(' + variable.length + ' - TRUNCATED)' ) ) +
				descriptorStr + options.style.nl ;
		}
		else {
			str += pre + '"' + options.style.string( escape.control( variable ) ) + '" ' +
				( options.noType ? '' : options.style.type( 'string' ) + options.style.length( '(' + variable.length + ')' ) ) +
				descriptorStr + options.style.nl ;
		}
	}
	else if ( Buffer.isBuffer( variable ) ) {
		str += pre + options.style.inspect( variable.inspect() ) + ' ' +
			( options.noType ? '' : options.style.type( 'Buffer' ) + options.style.length( '(' + variable.length + ')' ) ) +
			descriptorStr + options.style.nl ;
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

		propertyList = Object.getOwnPropertyNames( variable ) ;

		if ( options.sort ) { propertyList.sort() ; }

		// Special Objects
		specialObject = specialObjectSubstitution( variable ) ;

		if ( options.protoBlackList && options.protoBlackList.has( proto ) ) {
			str += options.style.limit( '[skip]' ) + options.style.nl ;
		}
		else if ( specialObject !== undefined ) {
			str += '=> ' + inspect_( {
				depth: runtime.depth ,
				ancestors: runtime.ancestors ,
				noPre: true
			} ,
			options ,
			specialObject
			) ;
		}
		else if ( isFunc && ! options.funcDetails ) {
			str += options.style.nl ;
		}
		else if ( ! propertyList.length && ! options.proto ) {
			str += '{}' + options.style.nl ;
		}
		else if ( runtime.depth >= options.depth ) {
			str += options.style.limit( '[depth limit]' ) + options.style.nl ;
		}
		else if ( runtime.ancestors.indexOf( variable ) !== -1 ) {
			str += options.style.limit( '[circular]' ) + options.style.nl ;
		}
		else {
			str += ( isArray && options.noType ? '[' : '{' ) + options.style.nl ;

			// Do not use .concat() here, it doesn't works as expected with arrays...
			nextAncestors = runtime.ancestors.slice() ;
			nextAncestors.push( variable ) ;

			for ( i = 0 ; i < propertyList.length ; i ++ ) {
				if ( ! isArray && options.propertyBlackList && options.propertyBlackList.has( propertyList[ i ] ) ) {
					//str += options.style.limit( '[skip]' ) + options.style.nl ;
					continue ;
				}

				try {
					descriptor = Object.getOwnPropertyDescriptor( variable , propertyList[ i ] ) ;

					if ( ! descriptor.enumerable && options.enumOnly ) { continue ; }

					keyIsProperty = ! isArray || ! descriptor.enumerable || isNaN( propertyList[ i ] ) ;

					if ( ! options.noDescriptor && ( descriptor.get || descriptor.set ) ) {
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
					else {
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

			if ( options.proto ) {
				str += inspect_( {
					depth: runtime.depth + 1 ,
					ancestors: nextAncestors ,
					key: '__proto__' ,
					keyIsProperty: true
				} ,
				options ,
				proto
				) ;
			}

			str += indent + ( isArray && options.noType ? ']' : '}' ) + options.style.nl ;
		}
	}


	// Finalizing

	if ( runtime.depth === 0 ) {
		if ( options.style === 'html' ) { str = escape.html( str ) ; }
	}

	return str ;
}

exports.inspect = inspect ;



function keyNeedingQuotes( key ) {
	if ( ! key.length ) { return true ; }
	return false ;
}



// Some special object are better written down when substituted by something else
function specialObjectSubstitution( variable ) {
	switch ( variable.constructor.name ) {
		case 'String' :
			if ( variable instanceof String ) {
				return variable.toString() ;
			}
			break ;
		case 'Date' :
			if ( variable instanceof Date ) {
				return variable.toString() + ' [' + variable.getTime() + ']' ;
			}
			break ;
		case 'Set' :
			if ( typeof Set === 'function' && variable instanceof Set ) {
				// This is an ES6 'Set' Object
				return Array.from( variable ) ;
			}
			break ;
		case 'Map' :
			if ( typeof Map === 'function' && variable instanceof Map ) {
				// This is an ES6 'Map' Object
				return Array.from( variable ) ;
			}
			break ;
		case 'ObjectID' :
			if ( variable._bsontype ) {
				// This is a MongoDB ObjectID, rather boring to display in its original form
				// due to esoteric characters that confuse both the user and the terminal displaying it.
				// Substitute it to its string representation
				return variable.toString() ;
			}
			break ;
	}

	return ;
}



function inspectError( options , error ) {
	var str = '' , stack , type , code ;

	if ( arguments.length < 2 ) { error = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( ! ( error instanceof Error ) ) {
		return 'Not an error -- regular variable inspection: ' + inspect( options , error ) ;
	}

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
			( matches , method , file , line , column ) => {	// jshint ignore:line
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
			/^\s*(at)\s+(?:([^\s:()[\]\n]+(?:\([^)]+\))?)\s)?(?:\[as ([^\s:()[\]\n]+)\]\s)?(?:\(?([^:()[\]\n]+):([0-9]+):([0-9]+)\)?)?$/mg ,
			( matches , at , method , as , file , line , column ) => {	// jshint ignore:line
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



inspectStyle.color = Object.assign( {} , inspectStyle.none , {
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



inspectStyle.html = Object.assign( {} , inspectStyle.none , {
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
},{"../../is-buffer/index.js":8,"./ansi.js":18,"./escape.js":19,"_process":13}],22:[function(require,module,exports){
(function (process){
/*
	SVG Kit
	
	Copyright (c) 2017 Cédric Ronvel
	
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
var fs = require( 'fs' ) ;
var domKit = require( 'dom-kit' ) ;
var escape = require( 'string-kit/lib/escape.js' ) ;

function noop() {}



var svgKit = {} ;
module.exports = svgKit ;



// List of svg tags that actually display things
var drawingTags = [
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
svgKit.inject = function inject( $svg , options )
{
	svgKit.patch( $svg , options ) ;
	
	if ( options.into ) { options.into.appendChild( $svg ) ; }
	
	// Better to avoid to check the tag name:
	// it's too defensive and it prevents from loading inside a <g> tag
	if ( options.as ) //&& options.as.tagName.toLowerCase() === 'svg' )
	{
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
svgKit.patch = function patch( $svg , options )
{
	var viewBox , width , height ;
	
	svgKit.lightCleanup( $svg ) ;
	
	// Fix id, if necessary
	if ( options.id !== undefined )
	{
		if ( typeof options.id === 'string' ) { $svg.setAttribute( 'id' , options.id ) ; }
		else if ( ! options.id ) { $svg.removeAttribute( 'id' ) ; }
	}
	
	if ( options.class )
	{
		if ( typeof options.class === 'string' ) { $svg.classList.add( options.class ) ; }
		else if ( typeof options.class === 'object' ) { domKit.class( $svg , options.class ) ; }
	}
	
	if ( options.hidden ) { $svg.style.visibility = 'hidden' ; }
	
	if ( options.prefixIds ) { domKit.prefixIds( $svg , options.prefixIds ) ; }
	if ( options.removeIds ) { domKit.removeAllAttributes( $svg , 'id' ) ; }
	
	if ( options.removeSvgStyle ) { $svg.removeAttribute( 'style' ) ; }
	if ( options.removeDefaultStyles ) { svgKit.removeDefaultStyles( $svg ) ; }
	if ( options.removeComments ) { domKit.removeComments( $svg ) ; }
	
	if ( options.removeExoticNamespaces )
	{
		domKit.filterByNamespace( $svg , { primary: 'svg' , whitelist: [] } ) ;
	}
	
	if ( options.removeSize )
	{
		// Save and remove the width and height attribute
		width = $svg.getAttribute( 'width' ) || $svg.style.width ;
		height = $svg.getAttribute( 'height' ) || $svg.style.height ;
		
		$svg.removeAttribute( 'height' ) ;
		$svg.removeAttribute( 'width' ) ;
		$svg.style.width = null ;
		$svg.style.height = null ;
		
		// if the $svg don't have a viewBox attribute, set it now from the width and height (it works most of time)
		if ( ! $svg.getAttribute( 'viewBox' ) && width && height )
		{
			viewBox = '0 0 ' + width + ' ' + height ;
			//console.log( "viewBox:" , viewBox ) ;
			$svg.setAttribute( 'viewBox' , viewBox ) ;
		}
	}
	
	if ( options.css ) { domKit.css( $svg , options.css ) ; }
	
	if ( options.colorClass ) { svgKit.colorClass( $svg ) ; }
	
	if ( options.removeWhiteSpaces ) { domKit.removeWhiteSpaces( $svg ) ; }
	else if ( options.removeWhiteLines ) { domKit.removeWhiteSpaces( $svg , true ) ; }
} ;



svgKit.patchDocument = function patchDocument( $doc , options )
{
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



svgKit.lightCleanup = function lightCleanup( $svg )
{
	domKit.removeAllTags( $svg , 'metadata' ) ;
	domKit.removeAllTags( $svg , 'script' ) ;
	domKit.removeAllTags( $svg , 'defs' , true ) ;	// all empty defs
} ;



svgKit.colorClass = function colorClass( $svg )
{
	drawingTags.forEach( function( tagName ) {
		Array.from( $svg.getElementsByTagName( tagName ) ).forEach( function( $element ) {
			// Beware, $element.className does not work as expected for SVG
			if ( ! $element.getAttribute( 'class' ) )
			{
				$element.classList.add( 'primary' ) ;
			}
			
			// move style to attribute if they are not 'none'
			domKit.styleToAttribute( $element , 'fill' , [ 'none' ] ) ;
			domKit.styleToAttribute( $element , 'stroke' , [ 'none' ] ) ;
		} ) ;
	} ) ;
} ;



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
	[ 'paint-order' , 'fill stroke markers' ] ,
] ;

// Remove styles set to a default/unused value
svgKit.removeDefaultStyles = function removeDefaultStyles( $svg )
{
	drawingTags.forEach( function( tagName ) {
		Array.from( $svg.getElementsByTagName( tagName ) ).forEach( function( $element ) {
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
//svgKit.heavyCleanup = function heavyCleanup( svgElement ) {} ;



/*
	old (dom-kit 0.1.x) -> new (svg-kit 0.1.x)
	function load( $container , url , options , callback ) -> load( url , options , callback )
	$container -> options.into
	options.noWidthHeightAttr -> options.removeSize
*/
/*
	load( url , [options] , callback )
	
	* url: the URL of the .svg file
	* $container: null or the DOM element where the <svg> tag will be put
	* options: (optional) object of options, transmitted to .inject() and .patch()
	* callback: completion callback, where:
		* error: truthy if an error happened
		* svg: the svg dom document
*/
svgKit.load = function load( url , options , callback )
{
	if ( typeof options === 'function' ) { callback = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( typeof callback !== 'function' ) { callback = noop ; }
	
	if ( ! process.browser )
	{
		// Use Node.js 'fs' module
		
		if ( url.substring( 0 , 7 ) === 'file://' ) { url = url.slice( 7 ) ; }
		
		fs.readFile( url , 'utf8' , function( error , content ) {
			
			if ( error ) { callback( error ) ; return ; }
			
			
			//var parser = new DOMParser() ;
			//var $svg = parser.parseFromString( content , 'application/xml' ).documentElement ;
			var $doc = domKit.fromXml( content ) ;
			
			if ( options.removeComments )
			{
				domKit.removeComments( $doc ) ;
				delete options.removeComments ;
			}
			
			var $svg = $doc.documentElement ;
			
			try {
				svgKit.inject( $svg , options ) ;
			}
			catch ( error ) {
				callback( error ) ;
				return ;
			}
			
			callback( undefined , $svg ) ;
		} ) ;
	}
	else
	{
		// Use an AJAX HTTP Request
		
		svgKit.ajax( url , function( error , $doc ) {
			
			if ( error ) { callback( error ) ; return ; }
			
			if ( options.removeComments )
			{
				domKit.removeComments( $doc ) ;
				delete options.removeComments ;
			}
			
			var $svg = $doc.documentElement ;
			
			try {
				svgKit.inject( $svg , options ) ;
			}
			catch ( error ) {
				callback( error ) ;
				return ;
			}
			
			callback( undefined , $svg ) ;
		} ) ;
	}
} ;



svgKit.ajax = function ajax( url , callback )
{
	var xhr = new XMLHttpRequest() ;
	
	//console.warn( "ajax url:" , url ) ;
	
	xhr.responseType = 'document' ;
	xhr.onreadystatechange = svgKit.ajax.ajaxStatus.bind( xhr , callback ) ;
	xhr.open( 'GET', url ) ;
	xhr.send() ;
} ;



svgKit.ajax.ajaxStatus = function ajaxStatus( callback )
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
				else { callback( new Error( "[svg-kit] ajaxStatus(): Error with falsy status" ) ) ; }
			}
		}
	}
	catch ( error ) {
		callback( error ) ;
	}
} ;



svgKit.getViewBox = function getViewBox( $svg )
{
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



svgKit.setViewBox = function setViewBox( $svg , viewBox )
{
	$svg.setAttribute( 'viewBox' , viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height ) ;
} ;



// DEPRECATED?

svgKit.toAreaArray = function toAreaArray( object )
{
	if ( object.xmin !== undefined && object.xmax !== undefined && object.ymin !== undefined && object.ymax !== undefined )
	{
		return [
			object.xmin ,
			object.ymin ,
			object.xmax - object.xmin ,
			object.ymax - object.ymin
		] ;
	}
	else if ( object.x !== undefined && object.y !== undefined && object.width !== undefined && object.height !== undefined )
	{
		return [
			object.x ,
			object.y ,
			object.width ,
			object.height
		] ;
	}
	else
	{
		return [ 0 , 0 , 100 , 100 ] ;
	}
} ;



svgKit.standalone = function standalone( content , viewBox )
{
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



}).call(this,require('_process'))
},{"_process":13,"dom-kit":7,"fs":6,"string-kit/lib/escape.js":19}],23:[function(require,module,exports){
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

},{"./util":24,"punycode":14,"querystring":17}],24:[function(require,module,exports){
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