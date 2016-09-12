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


var async = require( 'async-kit' ) ;
var string = require( 'string-kit' ) ;
var doormen = require( 'doormen' ) ;

var Book = require( '../lib/Book.js' ) ;
var Client = require( '../lib/Client.js' ) ;
var UnitUI = require( '../lib/ui/unit.js' ) ;



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
	
	return book ;
}



			/* Tests */



describe( "I/O tags" , function() {
	
	it( "[message]/[chant] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/message.kfg' , { type: 'cast' , target: 'message' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ 'Some text.' , null ] ,
					[ 'Some other text.' , null ] ,
					[ 'Welcome to The Shadow Terminal.' , {
						next: true ,
						slowTyping: true
					} ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[input] tag" , function( done ) {
		
		var book , messages = [] ;
		
		book = runBook( __dirname + '/books/input.kfg' , { type: 'cast' , target: 'input' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
				ui.bus.on( 'textInput' , function( label ) {
					doormen.equals( label , 'Enter your name: ' ) ;
					book.roles[ 0 ].emit( 'textSubmit' , 'Jack Wallace' )
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ 'Hello Jack Wallace!' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;



describe( "Core tags" , function() {
	
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
	
	it( "[if], [elsif]/[elseif] and [else] tags" , function( done ) {
		
		var book , messages = [] ;
				
		
		async.series( [
			function( seriesCallback ) {
				
				messages = [] ;
				
				book = runBook( __dirname + '/books/if-elseif-else.kfg' , { type: 'cast' , target: 'if-elseif-else' } ,
					function( ui ) {
						ui.bus.on( 'message' , function() {
							messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
						} ) ;
					} ,
					function() {
						doormen.equals( messages , [
							[ 'Condition #1 else' ] ,
							[ 'Condition #2 else' ] ,
						] ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
			function( seriesCallback ) {
				
				// Reset messages and change the value to be tested
				messages = [] ;
				book.data.value = 2 ;
				
				book.cast( 'if-elseif-else' , function() {
					doormen.equals( messages , [
						[ 'Condition #1 else' ] ,
						[ 'Condition #2 elseif' ] ,
					] ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
			function( seriesCallback ) {
				
				// Reset messages and change the value to be tested
				messages = [] ;
				book.data.value = 3 ;
				
				book.cast( 'if-elseif-else' , function() {
					doormen.equals( messages , [
						[ 'Condition #1 else' ] ,
						[ 'Condition #2 elsif' ] ,
					] ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
			function( seriesCallback ) {
				
				// Reset messages and change the value to be tested
				messages = [] ;
				book.data.value = 5 ;
				
				book.cast( 'if-elseif-else' , function() {
					doormen.equals( messages , [
						[ 'Condition #1 if' ] ,
						[ 'Condition #2 if' ] ,
					] ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
		] )
		.exec( done ) ;
	} ) ;
	
	it( "[foreach] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/foreach.kfg' , { type: 'cast' , target: 'foreach' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ 'The value is: one' ] ,
					[ 'The value is: two' ] ,
					[ 'The value is: three' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;



describe( "API" , function() {
	
	it( "Event [on]/[once]/[emit] tags" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/event.kfg' , { type: 'cast' , target: 'event' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ 'Blasted Troll!' ] ,
					[ 'Roasted Troll!' ] ,
					[ 'Blasted Gnoll!' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Global listeners [on-global]/[once-global] tags" ) ;
} ) ;



describe( "Wands/extensions" , function() {
	
	it( "[wand] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/wand.kfg' , { type: 'cast' , target: 'wand' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ "ZASH... ROOOOARRRR-CRASHHHHH!" ] ,
					[ "Zang'dar killed the gnoll..." ] ,
					[ "ssssshhhhh... SSSSSHHHHH..." ] ,
					[ "ROOOOARRRR-CRASHHHHH!" ] ,
					[ "Zang'dar killed the troll berserker, with a delay..." ] ,
					[ "ZASH... ROOOOARRRR-CRASHHHHH!" ] ,
					[ "Zang'dar killed the orc..." ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;



describe( "Embedded Javascript code" , function() {
	
	it( "[js] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/js.kfg' , { type: 'cast' , target: 'js' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ "Hello Zang'dar!" ] ,
					[ "Hello Oz!" ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Security tests" ) ;
} ) ;



describe( "Basic spellcaster tags and features" , function() {
	
	it( "[scroll] tag" , function( done ) {
		
		var extOutputs = [] ;
		
		runBook( __dirname + '/books/scroll.kfg' , { type: 'cast' , target: 'echo' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( extOutputs , [
					[ 'bob\n' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[scroll] tag: store and split attribute" , function( done ) {
		
		var extOutputs = [] , messages = [] ;
		
		runBook( __dirname + '/books/scroll-store-split.kfg' , { type: 'cast' , target: 'ls' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( extOutputs , [
					[ 'one\nthree\ntwo\n' ]
				] ) ;
				
				doormen.equals( messages , [
					[ 'Command second line output: three' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;



describe( "Historical bugs" , function() {
	
	it.next( "should be able to load the same book twice" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/message.kfg' , { type: 'cast' , target: 'message' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				doormen.equals( messages , [
					[ 'Some text.' , null ] ,
					[ 'Some other text.' , null ] ,
					[ 'Welcome to The Shadow Terminal.' , {
						next: true ,
						slowTyping: true
					} ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;



