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

/* global window, WebSocket */



var Ngev = require( 'nextgen-events/lib/browser.js' ) ;
var dom = require( 'dom-kit' ) ;
var url = require( 'url' ) ;



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



var uiList = {
	classic: require( './ui/classic.js' )
} ;



SpellcastClient.autoCreate = function autoCreate() {
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



SpellcastClient.prototype.run = function run( callback ) {
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


