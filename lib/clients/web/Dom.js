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
	this.uis = {} ;
	this.markers = {} ;
	this.cards = {} ;
	this.gItemLocations = {} ;
	this.animations = {} ;

	this.hintTimer = null ;
	this.sceneImageOnTimer = null ;
	this.onChatSubmit = null ;

	// The number of UI loading in progress
	this.uiLoadingCount = 0 ;

	this.initEvents() ;
}

module.exports = Dom ;

Dom.prototype = Object.create( Ngev.prototype ) ;
Dom.prototype.constructor = Dom ;



Dom.prototype.cleanUrl = function cleanUrl( url ) {
	if ( url[ 0 ] === '/' ) { return window.location.pathname + url.slice( 1 ) ; }
	return window.location.pathname + 'script/' + url ;
} ;



Dom.prototype.setTheme = function setTheme( theme ) {
	this.$theme.setAttribute( 'href' , this.cleanUrl( theme.url ) ) ;
} ;



Dom.prototype.preload = function preload() {
	domKit.preload( [
		'icons/plugged.svg' ,
		'icons/plugging.svg' ,
		'icons/unplugged.svg' ,
		'icons/unreachable-plug.svg'
	] ) ;
} ;



Dom.prototype.initEvents = function initEvents() {
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

	this.clearGItem( this.sprites[ id ] ) ;

	delete this.sprites[ id ] ;
} ;



Dom.prototype.clearUi = function clearUi( id ) {
	if ( ! this.uis[ id ] ) {
		console.warn( 'Unknown UI id: ' , id ) ;
		return ;
	}

	this.clearGItem( this.uis[ id ] ) ;

	delete this.uis[ id ] ;
} ;



Dom.prototype.clearMarker = function clearMarker( id ) {
	if ( ! this.markers[ id ] ) {
		console.warn( 'Unknown Marker id: ' , id ) ;
		return ;
	}

	this.clearGItem( this.markers[ id ] ) ;

	delete this.markers[ id ] ;
} ;



Dom.prototype.clearCard = function clearCard( id ) {
	if ( ! this.cards[ id ] ) {
		console.warn( 'Unknown Card id: ' , id ) ;
		return ;
	}

	this.clearGItem( this.cards[ id ] ) ;

	delete this.cards[ id ] ;
} ;



Dom.prototype.showSprite = function showSprite( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

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

	this.updateGItem( sprite , data ) ;
} ;



Dom.prototype.showUi = function showUi( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	if ( this.uis[ id ] ) { this.clearGItem( this.uis[ id ] ) ; }

	var ui = this.uis[ id ] = this.createGItem( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'ui' ,
		class: data.class ,
		style: {} ,
		area: {} ,
		animation: null
	} ) ;

	this.updateGItem( ui , data ) ;
} ;



Dom.prototype.showMarker = function showMarker( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

	if ( this.markers[ id ] ) { this.clearGItem( this.markers[ id ] ) ; }

	var marker = this.markers[ id ] = this.createGItem( {
		actionCallback: data.actionCallback ,
		action: null ,
		type: 'marker' ,
		ui: null ,
		location: null ,
		class: data.class ,
		style: {} ,
		animation: null
	} ) ;

	this.updateGItem( marker , data ) ;
} ;



var cardAutoIncrement = 0 ;

Dom.prototype.showCard = function showCard( id , data ) {
	if ( ! data.url || typeof data.url !== 'string' ) { return ; }

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

	this.updateGItem( card , data ) ;
} ;



Dom.prototype.updateSprite = function updateSprite( id , data ) {
	if ( ! this.sprites[ id ] ) {
		console.warn( 'Unknown sprite id: ' , id ) ;
		return ;
	}

	this.updateGItem( this.sprites[ id ] , data ) ;
} ;



Dom.prototype.updateUi = function updateUi( id , data ) {
	if ( ! this.uis[ id ] ) {
		console.warn( 'Unknown UI id: ' , id ) ;
		return ;
	}

	this.updateGItem( this.uis[ id ] , data ) ;
} ;



Dom.prototype.updateMarker = function updateMarker( id , data ) {
	if ( ! this.markers[ id ] ) {
		console.warn( 'Unknown marker id: ' , id ) ;
		return ;
	}

	this.updateGItem( this.markers[ id ] , data ) ;
} ;



Dom.prototype.updateCard = function updateCard( id , data ) {
	if ( ! this.cards[ id ] ) {
		console.warn( 'Unknown card id: ' , id ) ;
		return ;
	}

	this.updateGItem( this.cards[ id ] , data ) ;
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

	this.animateGItem( this.sprites[ spriteId ] , this.animations[ animationId ] ) ;
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

	this.animateGItem( this.uis[ uiId ] , this.animations[ animationId ] ) ;
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

	this.animateGItem( this.markers[ markerId ] , this.animations[ animationId ] ) ;
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

	this.animateGItem( this.cards[ cardId ] , this.animations[ animationId ] ) ;
} ;



Dom.prototype.createGItem = function createGItem( data ) {
	var gItem = new Ngev() ;

	if ( data.type !== 'marker' ) {
		gItem.$wrapper = document.createElement( 'div' ) ;
		gItem.$wrapper.classList.add( 'g-item-wrapper' , data.type + '-wrapper' ) ;
		this.$gfx.append( gItem.$wrapper ) ;
	}

	Object.assign( gItem , data ) ;
	gItem.defineStates( 'loaded' , 'loading' ) ;

	return gItem ;
} ;



Dom.prototype.clearGItem = function clearGItem( gItem ) {
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
Dom.prototype.updateGItem = function updateGItem( gItem , data ) {
	// The order matters
	if ( data.url ) { this.updateGItemImage( gItem , data ) ; }
	if ( data.backUrl ) { this.updateGItemBackImage( gItem , data ) ; }
	if ( data.maskUrl ) { this.updateGItemMask( gItem , data ) ; }
	if ( data.content ) { this.updateGItemContent( gItem , data ) ; }

	if ( data.button !== undefined ) { this.updateGItemButton( gItem , data ) ; }
	//if ( data.action !== undefined ) { this.updateGItemAction( gItem , data ) ; }

	if ( data.area ) {
		this.updateUiArea( gItem , data.area ) ;
	}

	if ( gItem.type === 'marker' && ( data.ui || data.location ) ) {
		this.updateMarkerLocation( gItem , data.ui , data.location ) ;
	}

	// For some unknown reasons, that timeout removes animation glitch
	setTimeout( () => this.updateGItemCosmetics( gItem , data ) , 10 ) ;
	//this.updateGItemCosmetics( gItem , data ) ;
} ;



/*
	Execute less important things, like things triggering animations
*/
Dom.prototype.updateGItemCosmetics = function updateGItemCosmetics( gItem , data ) {
	// The order matters
	if ( data.location !== undefined && gItem.type !== 'marker' ) {
		// Should be triggered first, or pose/style would conflict with it

		// It needs a callback to ensure that transition effects have correctly happened
		// /!\ Once async/await will be supported in most browser, we would rewrite this
		// This would avoid all delete data.thing in previous methods
		this.moveGItemToLocation( gItem , data , () => this.updateGItemCosmetics( gItem , data ) ) ;
		return ;
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

	if ( data.class ) {
		data.class = commonUtils.toClassObject( data.class ) ;
		Object.assign( gItem.class , data.class ) ;
		domKit.class( gItem.$wrapper || gItem.$image , data.class , 's-' ) ;
	}
} ;



// Load/replace the gItem image (data.url)
Dom.prototype.updateGItemImage = function updateGItemImage( gItem , data ) {
	var imageUrl = data.url ;
	delete data.url ;

	if ( gItem.type === 'card' ) {
		gItem.$image.style.backgroundImage = 'url("' + this.cleanUrl( imageUrl ) + '")' ;
		return ;
	}

	if ( imageUrl.endsWith( '.svg' ) ) {
		// Always wipe any existing $image element and pre-create the <svg> tag
		if ( gItem.$image ) { gItem.$image.remove() ; }

		if ( gItem.type === 'marker' ) {
			// If it's a marker, load it inside a <g> tag, that will be part of the main UI's <svg>
			// <svg> inside <svg> are great, but Chrome sucks at it (it does not support CSS transform, etc)
			gItem.$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' ) ;
		}
		else {
			gItem.$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'svg' ) ;
			gItem.$image.classList.add( 'svg' ) ;
		}

		switch ( gItem.type ) {
			case 'ui' :
				// Stop event propagation
				gItem.onClick = ( event ) => {
					//gItem.actionCallback( gItem.action ) ;
					event.stopPropagation() ;
				} ;

				gItem.$image.addEventListener( 'click' , gItem.onClick ) ;
				gItem.$image.classList.add( 'ui' ) ;
				this.uiLoadingCount ++ ;
				break ;
			case 'sprite' :
				gItem.$image.classList.add( 'sprite' ) ;
				break ;
			case 'marker' :
				gItem.$image.classList.add( 'marker' ) ;
				break ;
		}

		svgKit.load( this.cleanUrl( imageUrl ) , {
			removeSvgStyle: true ,
			//removeSize: true ,
			//removeIds: true ,
			removeComments: true ,
			removeExoticNamespaces: true ,
			//removeDefaultStyles: true ,
			as: gItem.$image
		} , () => {

			if ( gItem.type === 'ui' ) {
				this.setUiButtons( gItem.$image ) ;
				this.setUiPassiveHints( gItem.$image ) ;
				gItem.emit( 'loaded' ) ;
				if ( -- this.uiLoadingCount <= 0 ) { this.emit( 'uiLoaded' ) ; }
			}
			else {
				gItem.emit( 'loaded' ) ;
			}
		} ) ;

		gItem.emit( 'loading' ) ;
	}
	else {
		if ( ! gItem.$image || gItem.$image.tagName.toLowerCase() !== 'img' ) {
			if ( gItem.$image ) { gItem.$image.remove() ; }

			gItem.$image = document.createElement( 'img' ) ;

			// /!\ support UI that are not SVG??? /!\
			gItem.$image.classList.add( gItem.type ) ;
		}

		gItem.$image.setAttribute( 'src' , this.cleanUrl( imageUrl ) ) ;
	}

	if ( gItem.type !== 'marker' ) {
		gItem.$wrapper.append( gItem.$image ) ;
	}
} ;



// Load/replace the gItem backImage (data.backUrl)
Dom.prototype.updateGItemBackImage = function updateGItemBackImage( gItem , data ) {
	var imageUrl = data.backUrl ;
	delete data.backUrl ;

	if ( gItem.type === 'card' ) {
		gItem.$backImage.style.backgroundImage = 'url("' + this.cleanUrl( imageUrl ) + '")' ;
	}
} ;



// Load/replace the gItem mask (data.maskUrl)
Dom.prototype.updateGItemMask = function updateGItemMask( gItem , data ) {
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
		} ) ;

		gItem.$wrapper.append( gItem.$mask ) ;
		gItem.$wrapper.classList.add( 'has-mask' ) ;
	}
	else if ( gItem.$mask ) {
		gItem.$mask.remove() ;
		gItem.$wrapper.classList.remove( 'has-mask' ) ;
	}

	delete data.maskUrl ;
} ;



// Update content (data.content), card-only
Dom.prototype.updateGItemContent = function updateGItemContent( gItem , data ) {
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

	delete data.content ;
} ;



// Update pose (data.pose)
Dom.prototype.updateGItemPose = function updateGItemPose( gItem , data ) {
	if ( typeof data.pose === 'string' ) {
		gItem.$wrapper.setAttribute( 'pose' , data.pose ) ;
		gItem.pose = data.pose ;
	}
	else {
		gItem.$wrapper.removeAttribute( 'pose' ) ;
		gItem.pose = null ;
	}

	delete data.pose ;
} ;



// Update status (data.status)
Dom.prototype.updateGItemStatus = function updateGItemStatus( gItem , data ) {
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

	delete data.status ;
} ;



// Button ID (data.button)
Dom.prototype.updateGItemButton = function updateGItemButton( gItem , data ) {
	var $element = gItem.$mask || gItem.$wrapper ;

	var buttonId = data.button ;

	$element.setAttribute( 'id' , 'button-' + buttonId ) ;
	$element.classList.add( 'button' ) ;
	$element.classList.add( 'disabled' ) ;

	delete data.button ;
} ;



// /!\ DEPRECATED /!\
// Click action (data.action)
Dom.prototype.updateGItemAction = function updateGItemAction( gItem , data ) {
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

	delete data.action ;
} ;



// Move to a location and perform a FLIP (First Last Invert Play)
Dom.prototype.moveGItemToLocation = function moveGItemToLocation( gItem , data , callback ) {
	var locationName = data.location ;
	delete data.location ;

	if ( gItem.location === locationName ) { callback() ; return ; }

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
	siblingGItems = [ ... Object.values( this.cards ) , ... Object.values( this.sprites ) , ... Object.values( this.uis ) ]
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

	gItem.$wrapper.style.transform = domKit.stringifyTransform( sourceTransform ) ;
	$slot.append( gItem.$wrapper ) ;

	// Do not initiate the new transform value in the same synchronous flow,
	// it would not animate anything
	setTimeout( () => {
		gItem.$wrapper.style.transform = domKit.stringifyTransform( targetTransform ) ;
		callback() ;
	} , flipTimeout ) ;
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

		Array.from( ui.$image.querySelectorAll( '[area=' + area + ']' ) ).forEach( ( $element ) => {
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



Dom.prototype.createGItemLocation = function createGItemLocation( locationName ) {
	var $location ;

	if ( this.gItemLocations[ locationName ] ) { return ; }

	$location = this.gItemLocations[ locationName ] = document.createElement( 'div' ) ;
	$location.classList.add( 'g-item-location' ) ;
	$location.classList.add( 'g-item-location-' + locationName ) ;
	this.$gfx.append( $location ) ;
} ;



Dom.prototype.createCardMarkup = function createCardMarkup( card ) {
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



Dom.prototype.animateGItem = function animateGItem( gItem , animation ) {
	var frame , frameIndex = 0 ;

	gItem.animation = animation.id ;

	// What should be done if an animation is already running???

	//console.warn( "Animation: " , animation ) ;

	// If there is no frames, quit now
	if ( ! Array.isArray( animation.frames ) || ! animation.frames.length ) { return ; }

	var nextFrame = () => {
		frame = animation.frames[ frameIndex ] ;

		// Update the gItem
		this.updateGItem( gItem , frame ) ;

		if ( ++ frameIndex < animation.frames.length ) {
			setTimeout( nextFrame , frame.duration * 1000 ) ;
		}
		else {
			// This is the end of the animation...
			// Restore something here?
			gItem.animation = null ;
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

