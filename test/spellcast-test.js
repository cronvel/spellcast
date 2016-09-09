/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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
/* global describe, it, before, after */


var Book = require( '../lib/Book.js' ) ;
var Client = require( '../lib/Client.js' ) ;
var UnitUI = require( '../lib/ui/unit.js' ) ;
var string = require( 'string-kit' ) ;
var doormen = require( 'doormen' ) ;



			/* Helpers */



function deb( something )
{
	console.log( string.inspect( { style: 'color' , depth: 10 } , something ) ) ;
}



function runBook( bookPath , action , uiCallback , doneCallback )
{
	var ui , uiId = 0 , book = Book.load( bookPath ) ;
	
	book.initBook( function( error ) {
		
		//console.log( 'init done' ) ;
		if ( error ) { callback( error ) ; return ; }
		
		book.assignRoles( function( error ) {
			
			//console.log( 'assignRoles done' ) ;
			if ( error ) { callback( error ) ; return ; }
			
			switch ( action.type )
			{
				case 'cast' :
					book.cast( action.target , doneCallback ) ;
					break ;
			}
			
		} ) ;
		
		book.addClient( Client.create( { name: 'default' } ) ) ;
		ui = UnitUI( book.clients[ 0 ] ) ;
		ui.id = uiId ++ ;
		
		if ( uiCallback ) { uiCallback( ui ) ; }
		
		// This must be done, or some events will be missing
		book.clients[ 0 ].authenticate( {} ) ;
	} ) ;
}



			/* Tests */



describe( "Basic spellcaster features" , function() {
	
	it( "scroll tag with the 'echo' command" , function( done ) {
		
		var extOutputs = [] ;
		
		runBook( __dirname + '/books/echo-scroll.kfg' , { type: 'cast' , target: 'echo' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				/*
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'coreMessage' , function() {
					coreMessages.push( Array.from( arguments ) ) ;
				} ) ;
				*/
			} ,
			function() {
				doormen.equals( extOutputs , [
					[ 'bob\n' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;


	
describe( "Core tags" , function() {
	
	it( "[foreach] tag" , function( done ) {
		
		var extOutputs = [] ;
		
		runBook( __dirname + '/books/foreach.kfg' , { type: 'cast' , target: 'foreach' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( extOutputs , [
					[ 'The value is: one\n' ] ,
					[ 'The value is: two\n' ] ,
					[ 'The value is: three\n' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[set] tag and dynamic resolution" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/set.kfg' , { type: 'cast' , target: 'set' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ 'Value of $a: something' ] ,
					[ 'Value of $b: bob something' ] ,
					[ 'Value of $c: bob' ] ,
					[ 'Value of $d: bob' ] ,
					[ 'Value of alert: bob' ] ,
					[ 'Value of ref: bob' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;


