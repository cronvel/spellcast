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



/* UI for unit tests */



//var Ngev = require( 'nextgen-events' ) ;
var log = require( 'logfella' ).global.use( 'spellcast-unit-ui' ) ;


function UI( bus , self ) {
	if ( ! self ) {
		self = Object.create( UI.prototype , {
			bus: { value: bus , enumerable: true } ,
			id: { value: 0 , writable: true , enumerable: true } ,
			user: { value: null , writable: true , enumerable: true } ,
			users: { value: null , writable: true , enumerable: true } ,
			roles: { value: null , writable: true , enumerable: true } ,
			roleId: { value: null , writable: true , enumerable: true } ,
			inGame: { value: false , writable: true , enumerable: true } ,
			altBuffer: { value: false , writable: true , enumerable: true } ,
			nexts: { value: null , writable: true , enumerable: true }
		} ) ;
	}

	self.bus.on( 'user' , UI.user.bind( self ) ) ;
	self.bus.on( 'userList' , UI.userList.bind( self ) ) ;
	self.bus.on( 'roleList' , UI.roleList.bind( self ) ) ;

	self.bus.on( 'enterScene' , UI.enterScene.bind( self ) ) ;
	self.bus.on( 'leaveScene' , UI.leaveScene.bind( self ) ) ;
	self.bus.on( 'nextList' , UI.nextList.bind( self ) ) ;

	self.bus.on( 'textInput' , UI.textInput.bind( self ) ) ;

	self.bus.emit( 'ready' ) ;

	return self ;
}

//UI.prototype = Object.create( Ngev.prototype ) ;
//UI.prototype.constructor = UI ;

module.exports = UI ;



function arrayGetById( id ) { return this.find( e => e.id === id ) ; }



UI.user = function user( user_ ) {
	//console.log( 'User received: ' , user_ ) ;
	this.user = user_ ;
} ;



UI.userList = function userList( users ) {
	//console.log( 'User-list received: ' , users ) ;

	// Add the get method to the array
	users.get = arrayGetById ;
	this.users = users ;
} ;



UI.roleList = function roleList( roles , unassignedUsers , assigned ) {
	var self = this ;

	this.roles = roles ;

	// Add the get method to the array
	roles.get = arrayGetById ;

	// If already in-game, nothing more to do...
	if ( this.inGame ) {
		this.roles = roles ;
		return ;
	}

	if ( assigned ) {
		if ( roles.length <= 1 ) {
			// Nothing to do and nothing to display...
			this.roles = roles ;
			this.roleId = roles[ 0 ].id ;
			return ;
		}

		// Find our own role ID
		roles.find( ( e ) => {
			if ( e.clientId === self.user.id ) { self.roleId = e.id ; return true ; }
			return false ;
		} ) ;

	}

	// Nothing more to do...
	if ( assigned ) { return ; }

	this.bus.emit( 'selectRole' , roles[ this.id % roles.length ].id ) ;
} ;



// 'enterScene' event
UI.enterScene = function enterScene( isGosub , toAltBuffer ) {
	this.inGame = true ;
	if ( toAltBuffer ) { this.altBuffer = true ; }
} ;



// 'leaveScene' event
UI.leaveScene = function leaveScene( isReturn , backToMainBuffer ) {
	if ( backToMainBuffer ) { this.altBuffer = false ; }
} ;



UI.nextList = function nextList( nexts , undecidedRoleIds , options , isUpdate ) {
	this.nexts = nexts ;
	if ( nexts.length === 1 ) { this.nextListConfirm( nexts[ 0 ] , undecidedRoleIds , options.timeout , isUpdate ) ; }
	else { this.nextListMenu( nexts , undecidedRoleIds , options.timeout , isUpdate ) ; }
} ;



UI.prototype.nextListConfirm = function nextListConfirm( next , undecidedRoleIds , timeout , isUpdate ) {
	//this.bus.emit( 'selectNext' , 0 ) ;
} ;



UI.prototype.nextListMenu = function nextListMenu( nexts , undecidedRoleIds , timeout , isUpdate ) {
	//throw new Error( 'Should be coded... choice should be decided at creation or something like that...' ) ;
	//this.bus.emit( 'selectNext' , nextIndex ) ;
} ;



// Text input field
UI.textInput = function textInput( label , grantedRoleIds ) {
	//throw new Error( 'Should be coded... choice should be decided at creation or something like that...' ) ;
	//this.bus.emit( 'textSubmit' , input ) ;
} ;


