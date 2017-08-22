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
var svgKit = require( 'svg-kit' ) ;



function noop() {}



function Dom() { return Dom.create() ; }
module.exports = Dom ;



Dom.create = function create()
{
	var self = Object.create( Dom.prototype ) ;

	self.$body = document.querySelector( 'body' ) ;
	self.$theme = document.querySelector( '#theme' ) ;
	self.$gfx = document.querySelector( '#gfx' ) ;
	self.$sceneImage = document.querySelector( '.scene-image' ) ;
	self.$main = document.querySelector( 'main' ) ;
	self.$mainBuffer = document.querySelector( '#main-buffer' ) ;
	self.$altBuffer = document.querySelector( '#alt-buffer' ) ;
	self.$dialogWrapper = document.querySelector( '#dialog-wrapper' ) ;
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
	
	self.newSegmentNeeded = false ;
	self.onSelect = null ;
	self.toMainBuffer() ;

	self.nextSoundChannel = 0 ;

	self.sprites = {} ;
	self.animations = {} ;

	self.hideContentTimer = null ;
	self.onChatSubmit = null ;

	self.initEvents() ;

	return self ;
} ;



Dom.prototype.cleanUrl = function cleanUrl( url )
{
    if ( url[ 0 ] === '/' ) { return url ; }
    return '/script/' + url ;
} ;



Dom.prototype.setTheme = function setTheme( theme )
{
	this.$theme.setAttribute( 'href' , this.cleanUrl( theme.url ) ) ;
} ;



Dom.prototype.initEvents = function initEvents()
{
	var self = this ;
	
	this.$gfx.addEventListener( 'click' , this.toggleContent.bind( this ) , false ) ;
	this.$dialogWrapper.addEventListener( 'click' , this.clearDialog.bind( this ) , false ) ;
	
	// Things that can get the .toggled class when clicked
	this.$lobby.addEventListener( 'click' , function() { self.$lobby.classList.toggle( 'toggled' ) ; } ) ;
	this.$status.addEventListener( 'click' , function() { self.$status.classList.toggle( 'toggled' ) ; } ) ;
	this.$panel.addEventListener( 'click' , function() { self.$panel.classList.toggle( 'toggled' ) ; } ) ;
} ;



Dom.prototype.toggleContent = function toggleContent()
{
	if ( this.$main.classList.contains( 'hidden' ) ) { this.showContent() ; }
	else { this.hideContent() ; }
} ;



Dom.prototype.hideContent = function hideContent()
{
	if ( this.hideContentTimer !== null ) { clearTimeout( this.hideContentTimer ) ; this.hideContentTimer = null ; }

	this.$main.classList.add( 'hidden' ) ;
	this.hideContentTimer = setTimeout( this.showContent.bind( this ) , 8000 ) ;
} ;



Dom.prototype.showContent = function showContent()
{
	if ( this.hideContentTimer !== null ) { clearTimeout( this.hideContentTimer ) ; this.hideContentTimer = null ; }
	this.$main.classList.remove( 'hidden' ) ;
} ;



Dom.prototype.toMainBuffer = function toMainBuffer()
{
	if ( this.$activeBuffer === this.$mainBuffer ) { return ; }
	
	if ( this.$activeBuffer )
	{
		// This is not defined at startup
		this.clearChoices() ;
		this.clearMessages() ;
		this.clearHints() ;
		this.clearHistory() ;
	}
	
	this.$activeBuffer = this.$mainBuffer ;
	this.$importantMessages = null ;
	this.$mainBuffer.classList.remove( 'inactive' ) ;
	this.$altBuffer.classList.add( 'inactive' ) ;
	
	this.getSwitchedElements() ;
} ;



Dom.prototype.toAltBuffer = function toAltBuffer()
{
	if ( this.$activeBuffer === this.$altBuffer ) { return ; }
	
	this.$importantMessages = this.$activeSegment ;
	this.$activeBuffer = this.$altBuffer ;
	this.$mainBuffer.classList.add( 'inactive' ) ;
	this.$altBuffer.classList.remove( 'inactive' ) ;
	
	this.getSwitchedElements() ;
} ;



// Get elements after a buffer switch
Dom.prototype.getSwitchedElements = function getSwitchedElements()
{
	this.$history = this.$activeBuffer.querySelector( '.messages.history' ) ;
	this.$activeMessages = this.$activeBuffer.querySelector( '.messages.active' ) ;
	this.$choices = this.$activeBuffer.querySelector( '.choices' ) ;
	this.$hint = this.$activeBuffer.querySelector( '.hint' ) ;
	this.$chat = this.$activeBuffer.querySelector( '.chat' ) ;
	this.$chatForm = this.$chat.querySelector( '.chat-form' ) ;
	this.$chatInput = this.$chatForm.querySelector( '.chat-input' ) ;
	
	this.$activeSegment = this.$activeMessages.querySelector( 'segment:last-child' ) ;
	if ( ! this.$activeSegment ) { this.newSegment() ; }
	else { this.newSegmentOnContent() ; }
} ;



Dom.prototype.clientStatus = function clientStatus( status )
{
	this.$clientStatus.setAttribute( 'data-status' , status ) ;
	//this.$clientStatus.setAttribute( 'alt' , status ) ;
	this.$clientStatus.setAttribute( 'title' , status ) ;
} ;



Dom.prototype.setMultiplayer = function setMultiplayer( value , callback )
{
	callback = callback || noop ;
	
	if ( value || value === undefined )
	{
		this.$body.classList.add( 'multiplayer' ) ;
	}
	else
	{
		this.$body.classList.remove( 'multiplayer' ) ;
	}
	
	callback() ;
} ;



Dom.prototype.clear = function clear( callback )
{
	callback = callback || noop ;
	domKit.empty( this.$hint ) ;
	domKit.empty( this.$dialogWrapper ) ;
	domKit.empty( this.$activeMessages ) ;
	domKit.empty( this.$choices ) ;
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
	domKit.empty( this.$activeMessages ) ;
	callback() ;
} ;



Dom.prototype.clearHistory = function clearHistory( callback )
{
	callback = callback || noop ;
	domKit.empty( this.$history ) ;
	callback() ;
} ;



Dom.prototype.newSegment = function newSegment( callback )
{
	callback = callback || noop ;
	
	this.newSegmentNeeded = false ;
	
	if ( this.$activeSegment && ! this.$activeSegment.textContent )
	{
		callback() ;
		return ;
	}
	
	var $lastSegment = this.$activeSegment ;
	
	var $segment = document.createElement( 'segment' ) ;
	this.$activeSegment = $segment ;
	this.$activeMessages.appendChild( $segment ) ;
	
	if ( $lastSegment )
	{
		//$lastSegment.classList.add( 'inactive' ) ;
		this.$history.appendChild( $lastSegment ) ;
		$lastSegment.scrollIntoView( false ) ;
	}
	
	callback() ;
} ;



// Postpone new segment creation until new content
Dom.prototype.newSegmentOnContent = function newSegmentOnContent()
{
	this.newSegmentNeeded = true ;
} ;



Dom.prototype.addMessage = function addMessage( text , options , callback )
{
	callback = callback || noop ;
	
	var $text = document.createElement( 'p' ) ;
	$text.classList.add( 'text' ) ;
	
	//$text.textContent = text ;
	// Because the text contains <span> tags
	$text.innerHTML = text ;
	
	if ( this.newSegmentNeeded ) { this.newSegment() ; }
	
	this.$activeSegment.appendChild( $text ) ;
	
	if ( options.important && this.$importantMessages )
	{
		// The message should be added to the main buffer too
		this.$importantMessages.appendChild( $text.cloneNode( true ) ) ;
	}
	
	callback() ;
} ;



// TODO
Dom.prototype.messageNext = function messageNext( callback )
{
	callback() ;
} ;



Dom.prototype.addIndicators = function addIndicators( indicators , isStatus , callback )
{
	var self = this ;
	
	callback = callback || noop ;
	
	if ( isStatus )
	{
		domKit.empty( this.$status ) ;
		
		if ( indicators.length )
		{
			this.$status.classList.remove( 'empty' ) ;
		}
		else
		{
			this.$status.classList.add( 'empty' ) ;
			callback() ;
			return ;
		}
	}
	
	var $indicatorList = document.createElement( 'indicator-list' ) ;
	
	indicators.forEach( function( data ) {
		
		var $indicator , $label , $image , $widget , $innerBar , $outerBar ;
		$indicator = document.createElement( 'indicator' ) ;
		//$indicator.classList.add( data.type ) ;
		
		$label = document.createElement( 'label' ) ;
		$label.classList.add( 'label' ) ;
		
		if ( data.image )
		{
			$indicator.classList.add( 'has-image' ) ;
			$image = document.createElement( 'img' ) ;
			$image.classList.add( 'image' ) ;
			$image.setAttribute( 'src' , self.cleanUrl( data.image ) ) ;
			
			if ( data.label )
			{
				$image.setAttribute( 'alt' , data.label ) ;
				$image.setAttribute( 'title' , data.label ) ;
			}
			
			$label.appendChild( $image ) ;
		}
		else
		{
			$label.textContent = data.label ;
		}
		
		$indicator.appendChild( $label ) ;
		
		$widget = document.createElement( 'widget' ) ;
		$widget.classList.add( 'widget' ) ;
		$widget.classList.add( data.type ) ;
		$widget.setAttribute( 'data-value' , data.value ) ;
		
		switch ( data.type )
		{
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
	
	if ( isStatus )
	{
		this.$status.appendChild( $indicatorList ) ;
	}
	else
	{
		if ( this.newSegmentNeeded ) { this.newSegment() ; }
		this.$activeSegment.appendChild( $indicatorList ) ;
	}
	
	callback() ;
} ;



Dom.prototype.createOnSelect = function createOnSelect( onSelect )
{
	var self = this ;
	
	this.onSelect = function( event ) {
		var element = event.currentTarget ;
		var index = element.getAttribute( 'data-select-index' ) ;
		if ( ! index ) { return ; }
		index = parseInt( index , 10 ) ;
		onSelect( index ) ;
	} ;
} ;



Dom.prototype.addPanel = function addPanel( panel , clear , callback )
{
	var self = this ;
	
	callback = callback || noop ;
	
	
	// Clear part
	if ( clear )
	{
		domKit.empty( this.$panel ) ;
		
		if ( panel.length )
		{
			this.$panel.classList.remove( 'empty' ) ;
		}
		else
		{
			this.$panel.classList.add( 'empty' ) ;
			callback() ;
			return ;
		}
	}
	else if ( panel.length )
	{
		this.$panel.classList.remove( 'empty' ) ;
	}
	
	
	panel.forEach( function( data ) {
		
		var $item , $image , buttonId = 'button-' + data.id ;
		
		// Do not create it if there is already a button with this ID
		if ( document.getElementById( buttonId ) ) { return ; }
		
		$item = document.createElement( 'item' ) ;
		$item.classList.add( 'item' ) ;
		$item.setAttribute( 'id' , buttonId ) ;
		
		if ( data.image )
		{
			$item.classList.add( 'has-image' ) ;
			
			if ( data.image.endsWith( '.svg' ) )
			{
				// Pre-create the <svg> tag
				//$image = document.createElement( 'svg' ) ;	// <-- it doesn't works, it should be created with a NS
				$image = document.createElementNS( 'http://www.w3.org/2000/svg' , 'svg' ) ;
				$image.setAttribute( 'xmlns' , 'http://www.w3.org/2000/svg' ) ;
				$image.classList.add( 'svg' ) ;
				
				svgKit.load( self.cleanUrl( data.image ) , {
					removeSize: true ,
					removeIds: true ,
					as: $image
				} ) ;
			}
			else
			{
				$image = document.createElement( 'img' ) ;
				$image.setAttribute( 'src' , self.cleanUrl( data.image ) ) ;
			}
			
			$image.classList.add( 'image' ) ;
			
			if ( data.label )
			{
				$image.setAttribute( 'alt' , data.label ) ;
				$image.setAttribute( 'title' , data.label ) ;
			}
			
			$item.appendChild( $image ) ;
		}
		else
		{
			$item.textContent = data.label ;
		}
		
		$item.addEventListener( 'click' , self.onSelect , false ) ;
		
		self.$panel.appendChild( $item ) ;
	} ) ;
	
	callback() ;
} ;



Dom.prototype.clearChoices = function clearChoices( callback )
{
	var self = this , i , len , $item , $uiButton ;
	
	callback = callback || noop ;
	
	// First, unassign all UI buttons
	this.choices.forEach( function( choice ) {
		if ( ! choice.button ) { return ; }
		
		var buttonId = 'button-' + choice.button ;
		
		if (
			( $uiButton = document.getElementById( buttonId ) ) &&
			$uiButton.getAttribute( 'data-select-index' )
		)
		{
			//console.warn( 'remove' , 'button-' + choice.button ) ;
			$uiButton.removeAttribute( 'data-select-index' ) ;
			$uiButton.removeEventListener( 'click' , self.onSelect ) ;
		}
	} ) ;
	
	domKit.empty( this.$choices ) ;
	
	// Reset
	this.choices.length = 0 ;
	this.onSelect = null ;
	
	callback() ;
} ;



Dom.prototype.addChoices = function addChoices( choices , onSelect , callback )
{
	var self = this , groupBreak = false ;
	var choicesFragment = document.createDocumentFragment() ;
	var $group = document.createElement( 'group' ) ;
	
	callback = callback || noop ;
	
	this.createOnSelect( onSelect ) ;

	choices.forEach( function( choice ) {
		
		var $uiButton ;
		
		// Add the choice to the list
		self.choices.push( choice ) ;
		
		if (
			choice.button &&
			( $uiButton = document.getElementById( 'button-' + choice.button ) ) &&
			! $uiButton.getAttribute( 'data-select-index' )
		)
		{
			// groupBreak remainder
			if ( choice.groupBreak ) { groupBreak = true ; }
			
			// Assign to it the select index
			$uiButton.setAttribute( 'data-select-index' , choice.index ) ;
			
			// Add the click event to the next-item
			$uiButton.addEventListener( 'click' , self.onSelect ) ;
			
			return ;
		}
		
		var $button = document.createElement( 'choice' ) ;
		$button.classList.add( 'choice' , choice.type ) ;
		$button.setAttribute( 'data-select-index' , choice.index ) ;
		//$button.setAttribute( 'data-is-ordered' , !! choice.orderedList ) ;
		
		if ( choice.image )
		{
			$button.classList.add( 'has-image' ) ;
			var $image = document.createElement( 'img' ) ;
			$image.classList.add( 'image' ) ;
			$image.setAttribute( 'src' , self.cleanUrl( choice.image ) ) ;
			$button.appendChild( $image ) ;
		}
		
		var $label = document.createElement( 'span' ) ;
		$label.classList.add( 'label' ) ;
		$label.textContent = choice.label ;
		$button.appendChild( $label ) ;
		//$button.textContent = choice.label ;
		
		if ( choice.selectedBy && choice.selectedBy.length )
		{
			var $selectedBy = document.createElement( 'span' ) ;
			$selectedBy.classList.add( 'italic' , 'brightBlack' ) ;

			// Add an extra space to separate from the label text
			$selectedBy.textContent = ' ' + choice.selectedBy.join( ', ' ) ;
			$button.appendChild( $selectedBy ) ;
		}
		
		// Add the click event to the next-item
		$button.addEventListener( 'click' , self.onSelect ) ;
		
		if ( choice.groupBreak || groupBreak )
		{
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



Dom.prototype.getChoiceColumnsCount = function getChoiceColumnsCount( choices )
{
	var count = 0 , maxCount = 0 ;
	
	choices.forEach( function( choice ) {
		if ( choice.groupBreak )
		{
			if ( count > maxCount ) { maxCount = count ; }
			count = 0 ;
		}
		
		count ++ ;
	} ) ;
	
	if ( count > maxCount ) { maxCount = count ; }
	return maxCount ;
} ;



// This is used when new choices replaces the previous scene choices
Dom.prototype.setChoices = function setChoices( choices , undecidedNames , onSelect , options , callback )
{
	var self = this ;

	options = options || {} ;
	callback = callback || noop ;

	this.clearChoices( function() {
		
		switch ( options.style )
		{
			case 'inline' :
			case 'smallInline' :
			case 'list' :
			case 'smallList' :
				self.$choices.setAttribute( 'data-choice-style' , options.style ) ;
				break ;
			case 'table' :
				self.$choices.setAttribute( 'data-choice-style' , options.style ) ;
				self.$choices.classList.add( 'columns-' + self.getChoiceColumnsCount( choices ) ) ;
				break ;
			default :
				// Default to list
				self.$choices.setAttribute( 'data-choice-style' , 'list' ) ;
		}
		
		self.addChoices( choices , onSelect , callback ) ;

		if ( undecidedNames && undecidedNames.length )
		{
			var $unassignedUsers = document.createElement( 'p' ) ;
			$unassignedUsers.classList.add( 'unassigned-users' ) ;
			$unassignedUsers.textContent = undecidedNames.join( ', ' ) ;
			self.$choices.appendChild( $unassignedUsers ) ;
		}

		if ( typeof options.timeout === 'number' ) { self.choiceTimeout( options.timeout ) ; }
	} ) ;
} ;



// This is used when the scene update its choices details (selectedBy, ...)
// /!\ For instance, it is the same than .setChoices
Dom.prototype.updateChoices = Dom.prototype.setChoices ;



Dom.prototype.choiceTimeout = function choiceTimeout( timeout )
{
	var startTime = Date.now() , $timer , timer ;

	$timer = document.createElement( 'p' ) ;
	$timer.classList.add( 'timer' ) ;
	$timer.textContent = Math.round( timeout / 1000 ) ;

	this.$choices.appendChild( $timer ) ;

	timer = setInterval( function() {
		// If no parentNode, the element has been removed...
		if ( ! $timer.parentNode ) { clearInterval( timer ) ; return ; }

		$timer.textContent = Math.round( ( timeout + startTime - Date.now() ) / 1000 ) ;
	} , 1000 ) ;
} ;



Dom.prototype.textInputDisabled = function textInputDisabled( options )
{
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
	
	if ( this.newSegmentNeeded ) { this.newSegment() ; }
	this.$activeSegment.appendChild( $form ) ;
} ;



Dom.prototype.textInput = function textInput( options , callback )
{
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
	
	if ( this.newSegmentNeeded ) { this.newSegment() ; }
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



Dom.prototype.clearDialog = function clearDialog()
{
	var self = this ;
	
	this.$dialogWrapper.classList.add( 'empty' ) ;
	this.$dialogWrapper.classList.remove( 'modal' ) ;
	
	/*
		Try to remove children of this.$dialogWrapper after an eventual transition.
		Start a race with a transition start and setTimeout, the first to win inhibit the other.
	*/
	var raceWon = false ;
	
	var onStart = function() {
		self.$dialogWrapper.removeEventListener( 'transitionstart' , onStart ) ;
		if ( raceWon ) { return ; }
		raceWon = true ;
		self.$dialogWrapper.addEventListener( 'transitionend' , onEnd ) ;
	} ;
	
	var onEnd = function() {
		self.$dialogWrapper.removeEventListener( 'transitionend' , onEnd ) ;
		domKit.empty( this.$dialogWrapper ) ;
	} ;
	
	this.$dialogWrapper.addEventListener( 'transitionstart' , onStart ) ;
	
	setTimeout( function() {
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
Dom.prototype.setDialog = function setDialog( text , options , callback )
{
	options = options || {} ;
	callback = callback || noop ;
	
	if ( options.contentDelay && ! this.newSegmentNeeded )
	{
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
	
	if ( options.title )
	{
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
	
	if ( options.modal )
	{
		$dialog.classList.add( 'modal' ) ;
		this.$dialogWrapper.classList.add( 'modal' ) ;
	}
	else
	{
		this.$dialogWrapper.classList.remove( 'modal' ) ;
	}
	
	domKit.empty( this.$dialogWrapper ) ;
	this.$dialogWrapper.appendChild( $dialog ) ;
	this.$dialogWrapper.classList.remove( 'empty' ) ;
	
	callback() ;
} ;



			/* GFX */



Dom.prototype.setSceneImage = function setSceneImage( data )
{
	var cleaned = false ;

	var $oldSceneImage = this.$sceneImage ;

	this.$sceneImage = document.createElement( 'div' ) ;
	this.$sceneImage.classList.add( 'scene-image' ) ;

	if ( data.url )
	{
		this.$sceneImage.style.backgroundImage = 'url("' + this.cleanUrl( data.url ) + '")' ;
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
			this.$body.setAttribute( 'data-image-position' , 'left' ) ;
			break ;
		case 'right' :	// jshint ignore:line
		default :
			this.$body.setAttribute( 'data-image-position' , 'right' ) ;
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

		domKit.svg.load( null , this.cleanUrl( data.maskUrl ) , {
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
		sprite.$img.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;
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
	Object.assign( sprite.style , data.style ) ;

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

	element.setAttribute( 'src' , this.cleanUrl( data.url ) ) ;

	element.play() ;
} ;



Dom.prototype.music = function music( data )
{
	var self = this ,
		oldSrc = this.$music.getAttribute( 'src' ) ;
	
	if ( data.url )
	{
		data.url = this.cleanUrl( data.url ) ;
		
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
