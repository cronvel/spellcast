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



var NextGenEvents = require( 'nextgen-events' ) ;
var dom = require( 'dom-kit' ) ;
var url = require( 'url' ) ;



function SpellcastClient( options ) { return SpellcastClient.create( options ) ; }
module.exports = SpellcastClient ;
SpellcastClient.prototype = Object.create( NextGenEvents.prototype ) ;
SpellcastClient.prototype.constructor = SpellcastClient ;



SpellcastClient.create = function create( options )
{
	var self = Object.create( SpellcastClient.prototype , {
		input: { value: new NextGenEvents() , enumerable: true } ,
		token: { value: options.token || 'null' , writable: true , enumerable: true } ,
		ws: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	// Events to forward to the server
    [
        'ready' , 'next' , 'textInput' , 'exit'
    ].forEach( function( e ) { self.input.on( e , SpellcastClient.forward.bind( self , e ) ) ; } ) ;
    
	return self ;
} ;



SpellcastClient.autoCreate = function autoCreate()
{
	var options = url.parse( window.location.href , true ).query ;
	
	window.spellcastClient = SpellcastClient.create( options ) ;
	//window.spellcastClient.init() ;
	
	var uiList = {
		classic: require( './ui/classic.js' ) ,
	} ;
	
	if ( ! options.ui ) { options.ui = [ 'classic' ] ; }
	else if ( ! Array.isArray( options.ui ) ) { options.ui = [ options.ui ] ; }
	
	options.ui.forEach( function( ui ) {
		if ( uiList[ ui ] ) { uiList[ ui ]( window.spellcastClient ) ; }
	} ) ;
	
	return window.spellcastClient ;
} ;



SpellcastClient.prototype.run = function run( callback )
{
	var self = this ;
	
	//console.log( "Ready event received!" , this.spellcastClient.token ) ;
	this.ws = new WebSocket( 'ws://127.0.0.1:57311/' + this.token ) ;
	
	this.ws.onopen = function onOpen()
	{
		// Send 'ready' to client
		self.input.emit( 'ready' ) ;
		//SpellcastClient.forward.call( self , 'ready' ) ;
		console.log( "Websocket opened!" ) ;
		if ( typeof callback === 'function' ) { callback() ; }
	} ;
	
	this.ws.onclose = function onClose()
	{
		console.log( "Websocket closed!" ) ;
	} ;
	
	this.ws.onmessage = function onMessage( wsMessage )
	{
		var message ;
		
		try {
			message = JSON.parse( wsMessage.data ) ;
		}
		catch ( error ) {
			return ;
		}
		
		console.log( "Message received: " , message ) ;
		self.emit.apply( self , [ message.event ].concat( message.args ) ) ;
	} ;
} ;



SpellcastClient.forward = function forward( event )
{
	var self = this ;
	
	var args = Array.prototype.slice.call( arguments , 1 ) ;
	
	var data = JSON.stringify( {
		event: event ,
		args: args
	} ) ;
	
	console.log( 'Sending event: ' , event ) ;
	this.ws.send( data ) ;
} ;



SpellcastClient.autoCreate() ;

dom.ready( function() {
	window.spellcastClient.run() ;
} ) ;


