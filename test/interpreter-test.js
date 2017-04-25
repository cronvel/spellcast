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

/* jshint unused:false */
/* global describe, it, before, after, beforeEach */


var fs = require( 'fs' ) ;

var async = require( 'async-kit' ) ;
var fsKit = require( 'fs-kit' ) ;
var string = require( 'string-kit' ) ;
var doormen = require( 'doormen' ) ;

var Book = require( '../lib/Book.js' ) ;
var Client = require( '../lib/Client.js' ) ;
var UnitUI = require( '../lib/ui/unit.js' ) ;
var chatBot = require( '../lib/chatBot.js' ) ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'unit-tests' ) ;

Logfella.userland.setGlobalConfig( {
    minLevel: 'fatal' ,
    transports: [
        { "type": "console" , "timeFormatter": "time" , "color": true } ,
    ]
} ) ;



// Create the 'build' directory into the current 'test' directory
fsKit.ensurePathSync( __dirname + '/build' ) ;



			/* Helpers */



function deb( something )
{
	console.log( string.inspect( { style: 'color' , depth: 10 } , something ) ) ;
}



function runBook( bookPath , action , uiCallback , doneCallback )
{
	var ui , uiId = 0 , triggered = false , book , options = {} ;
	
	if ( action.maxTicks ) { options.maxTicks = action.maxTicks ; }
	if ( action.allowJsTag !== undefined ) { options.allowJsTag = action.allowJsTag ; }
	
	book = Book.load( bookPath , options ) ;
	
	var triggerCallback = function() {
		if ( triggered ) { return ; }
		triggered = true ;
		book.destroy() ;
		doneCallback.apply( undefined , arguments ) ;
	} ;
	
	book.initBook( function( error ) {
		
		//console.log( 'init done' ) ;
		if ( error ) { triggerCallback( error ) ; return ; }
		
		book.assignRoles( function( error ) {
			
			//console.log( 'assignRoles done' ) ;
			if ( error ) { triggerCallback( error ) ; return ; }
			
			switch ( action.type )
			{
				case 'cast' :
					book.cast( action.target , triggerCallback ) ;
					break ;
				case 'summon' :
					book.summon( action.target , triggerCallback ) ;
					break ;
				case 'adventure' :
					if ( action.path ) { followPath( book , ui , action.path , triggerCallback ) ; }
					book.startAdventure( triggerCallback ) ;
					break ;
			}
		} ) ;
		
		book.addClient( Client.create( { name: 'default' } ) ) ;
		ui = UnitUI( book.clients[ 0 ] ) ;	// jshint ignore:line
		ui.id = uiId ++ ;
		
		if ( uiCallback ) { uiCallback( ui ) ; }
		
		// This must be done, or some events will be missing
		book.clients[ 0 ].authenticate( {} ) ;
	} ) ;
	
	return book ;
}



function followPath( book , ui , path , callback )
{
	var pathIndex = 0 ;
	
	ui.bus.on( 'nextList' , function( nexts , grantedRoleIds , undecidedRoleIds , timeout , isUpdate ) {
		if ( isUpdate ) { return ; }
		//log.info( 'nextList: %I' , Array.from( arguments ) ) ;
		
		// Avoid concurrency issues:
		setTimeout( () => ui.bus.emit( 'selectNext' , path[ pathIndex ++ ] ) , 0 ) ;
	} ) ;
}



			/* Tests */



describe( "Interpreter" , function() {
	
	describe( "Preprocessing" , function() {
		
		it( "Splitting basic sentence into words" , function() {
			doormen.equals( chatBot.splitIntoWords( 'One two three' ) , ['One','two','three'] ) ;
			doormen.equals( chatBot.splitIntoWords( 'One 2 thr33' ) , ['One','2','thr33'] ) ;
			doormen.equals( chatBot.splitIntoWords( 'Éâï ôùæÆ ÆØ' ) , ['Éâï','ôùæÆ','ÆØ'] ) ;
		} ) ;
		
		it( "Splitting sentence with punctuation into words" , function() {
			doormen.equals( chatBot.splitIntoWords( 'One, two,three' ) , ['One','two','three'] ) ;
		} ) ;
	} ) ;
} ) ;


