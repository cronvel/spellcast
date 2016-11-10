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
	this.$connection.innerHTML = '<span class="' + options.color + ' bold">' + text + '</span>' ;
	
	if ( options.alert ) { this.$connection.classList.add( 'alert' ) ; }
	else { this.$connection.classList.remove( 'alert' ) ; }
} ;



Dom.prototype.addMessage = function addMessage( text , options , callback )
{
	this.$text.insertAdjacentHTML( 'beforeend' ,
		'<p class="text">' + text + '</p>'
	) ;
	
	callback() ;
} ;



Dom.prototype.clearChoices = function clearChoices( callback )
{
	this.$next.innerHTML = '' ;
	callback() ;
} ;



Dom.prototype.addChoices = function addChoices( choices , callback )
{
	var self = this ;
	
	choices.forEach( function( choice ) {
		
		self.$next.insertAdjacentHTML( 'beforeend' ,
			'<button id="next_' + choice.index + '" class="' + choice.type +'">' +
			String.fromCharCode( 0x61 + choice.index ) + '. ' + choice.label +
			(
				choice.selectedBy && choice.selectedBy.length ?
				' <span class="italic brightBlack">' + choice.selectedBy.join( ', ' ) + '</span>' : ''
			) +
			'</button>'
		) ;
	} ) ;
	
} ;



// This is used when new choices replaces the previous scene choices
Dom.prototype.setChoices = function setChoices( choices , undecidedNames , timeout , callback )
{
	var self = this ;
	
	this.clearChoices( function() {
		self.addChoices( choices , callback ) ;
		
		if ( undecidedNames && undecidedNames.length )
		{
			self.$next.insertAdjacentHTML( 'beforeend' ,
				'<p class="unassigned-users">Idling: <span class="unassigned-users">' +
				undecidedNames.join( ', ' ) +
				'</span></p>'
			) ;
		}
		
		if ( typeof timeout === 'number' ) { self.choiceTimeout( timeout ) ; }
	} ) ;
} ;



// This is used when the scene update its choices details (selectedBy, ...)
Dom.prototype.updateChoices = function setChoices( choices , undecidedNames , timeout , callback )
{
	var self = this ;
	
	// TEMP!
	this.clearChoices( function() {
		self.addChoices( choices , callback ) ;
		
		if ( undecidedNames && undecidedNames.length )
		{
			self.$next.insertAdjacentHTML( 'beforeend' ,
				'<p class="unassigned-users">Idling: <span class="unassigned-users">' +
				undecidedNames.join( ', ' ) +
				'</span></p>'
			) ;
		}
		
		if ( typeof timeout === 'number' ) { self.choiceTimeout( timeout ) ; }
	} ) ;
} ;



Dom.prototype.choiceTimeout = function choiceTimeout( timeout )
{
	var startTime = Date.now() , $timer , timer ;

	this.$next.insertAdjacentHTML( 'beforeend' ,
		'<p class="timer">Time limit: <span class="time">' + Math.round( timeout / 1000 ) + 's' + '</span></p>'
	) ;

	$timer = document.querySelector( '.timer .time' ) ;

	timer = setInterval( function() {
		// If no parentNode, the element has been removed...
		if ( ! $timer.parentNode ) { clearInterval( timer ) ; return ; }

		$timer.textContent = Math.round( ( timeout + startTime - Date.now() ) / 1000 ) + 's' ;
	} , 1000 ) ;
} ;



