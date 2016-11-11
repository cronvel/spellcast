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

	return self ;
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

	var textElement = document.createElement('p') ;
	textElement.classList.add( 'text' ) ;
	textElement.textContent = text ;

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

			spanElement.textContent = choice.selectedBy.join( ', ' ) ;
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
Dom.prototype.setChoices = function setChoices( choices , undecidedNames , timeout , callback )
{
	var self = this ;

	callback = callback || noop ;

	this.clearChoices( function() {
		self.addChoices( choices , callback ) ;

		if ( undecidedNames && undecidedNames.length )
		{
			var $unassignedUsers = document.createElement('p') ;
			$unassignedUsers.classList.add( 'unassigned-users' ) ;
			$unassignedUsers.textContent = undecidedNames.join( ', ' ) ;
			self.$next.appendChild( $unassignedUsers ) ;
		}

		if ( typeof timeout === 'number' ) { self.choiceTimeout( timeout ) ; }
	} ) ;
} ;



// This is used when the scene update its choices details (selectedBy, ...)
Dom.prototype.updateChoices = function setChoices( choices , undecidedNames , timeout , callback )
{
	var self = this ;

	callback = callback || noop ;

	// TEMP! This does not update but just reset, just like .setChoices()
	this.clearChoices( function() {
		self.addChoices( choices , callback ) ;

		if ( undecidedNames && undecidedNames.length )
		{
			var $unassignedUsers = document.createElement('p') ;
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

	$timer = document.createElement('p') ;
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
