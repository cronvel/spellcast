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



var fs = require( 'fs' ) ;

var async = require( 'async-kit' ) ;
var fsKit = require( 'fs-kit' ) ;
var string = require( 'string-kit' ) ;

//var Book = require( '../lib/Book.js' ) ;
var StoryBook = require( '../lib/StoryBook.js' ) ;
var CasterBook = require( '../lib/CasterBook.js' ) ;
var Client = require( '../lib/Client.js' ) ;
var UnitUI = require( '../lib/ui/unit.js' ) ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'unit-tests' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	//minLevel: 'debug' ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true } ,
	]
} ) ;

Logfella.defineOrConfig( 'userland' , {
	minLevel: 'fatal' ,
	//minLevel: 'debug' ,
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



async function runBook( bookPath , action , uiCallback , doneCallback )
{
	var ui , uiId = 0 , triggered = false , book , options = {} ;
	
	if ( action.maxTicks ) { options.maxTicks = action.maxTicks ; }
	if ( action.allowJsTag !== undefined ) { options.allowJsTag = action.allowJsTag ; }
	
	var BookModule = action.type === 'story' ? StoryBook : CasterBook ;
	
	
	book = await BookModule.load( bookPath , options ) ;
	
	var triggerCallback = ( ... args ) => {
		log.error( 'triggerCallback' ) ;
		if ( triggered ) { return ; }
		triggered = true ;
		log.error( 'triggered' ) ;
		book.destroy() ;
		doneCallback( ... args ) ;
	} ;
	
	try {
		await book.initBook() ;
	}
	catch ( error ) {
		log.error( 'initBook(): %E' , error ) ;
		triggerCallback( error ) ;
		return ;
	}
	
	log.error( 'yoooosh!' ) ;
	book.assignRoles().then( async () => {
		log.error( 'yoooosh then!' ) ;
		switch ( action.type )
		{
			case 'cast' :
				await book.cast( action.target ) ;
				break ;
			case 'summon' :
				await book.summon( action.target ) ;
				break ;
			case 'story' :
				await book.startStory() ;
				break ;
		}
		
		log.error( 'yoooosh then after!' ) ;
		triggerCallback() ;
	} ).catch( error => {
		log.error( 'run: %E' , error ) ;
		triggerCallback( error ) ;
	} ) ;
	log.error( 'yoooosh 2!' ) ;
	
	book.addClient( Client.create( { name: 'default' } ) ) ;
	ui = UnitUI( book.clients[ 0 ] ) ;
	ui.id = uiId ++ ;
	
	if ( action.path ) { followPath( book , ui , action.path , triggerCallback ) ; }
	
	if ( uiCallback ) { uiCallback( ui ) ; }
	
	// This must be done, or some events will be missing
	book.clients[ 0 ].authenticate( {} ) ;
	
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
				expect( messages ).to.equal(  [
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
		
		// TMP
		// Unit test should be rewritten with async/await everywhere
		( async function() {
			var book , messages = [] ;
			
			book = await runBook( __dirname + '/books/input.kfg' , { type: 'cast' , target: 'input' } ,
				function( ui ) {
					ui.bus.on( 'message' , function() {
						messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
					} ) ;
					ui.bus.on( 'textInput' , function( label ) {
						expect( label ).to.equal(  'Enter your name: ' ) ;
						book.roles[ 0 ].emit( 'textSubmit' , 'Jack Wallace' ) ;
					} ) ;
				} ,
				function() {
					expect( messages ).to.equal(  [
						[ 'Hello Jack Wallace!' ]
					] ) ;
					
					done() ;
				}
			) ;
		} )() ;
	} ) ;
	
	it( "[fortune] tag" ) ;
	it( "[sound] tag" ) ;
} ) ;



describe( "Control flow tags" , function() {
	
	it( "[if], [elsif]/[elseif] and [else] tags" , function( done ) {
		
		var book , messages ;
				
		async.series( [
			async function( seriesCallback ) {
				
				messages = [] ;
				
				book = await runBook( __dirname + '/books/if-elseif-else.kfg' , { type: 'cast' , target: 'if-elseif-else' } ,
					function( ui ) {
						ui.bus.on( 'message' , function() {
							messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
						} ) ;
					} ,
					function() {
						expect( messages ).to.equal(  [
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
					expect( messages ).to.equal(  [
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
					expect( messages ).to.equal(  [
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
					expect( messages ).to.equal(  [
						[ 'Condition #0 if' ] ,
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
				expect( messages ).to.equal(  [
					[ 'The value is: one' ] ,
					[ 'The value is: two' ] ,
					[ 'The value is: three' ] ,
					[ 'The key/value is: 0/one' ] ,
					[ 'The key/value is: 1/two' ] ,
					[ 'The key/value is: 2/three' ] ,
					[ 'The value is: 1' ] ,
					[ 'The value is: 2' ] ,
					[ 'The value is: 3' ] ,
					[ 'The key/value is: one/1' ] ,
					[ 'The key/value is: two/2' ] ,
					[ 'The key/value is: three/3' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[while] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/while.kfg' , { type: 'cast' , target: 'while' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Count: 5' ] ,
					[ 'Count: 4' ] ,
					[ 'Count: 3' ] ,
					[ 'Count: 2' ] ,
					[ 'Count: 1' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[break] tag into [foreach]" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/foreach-break.kfg' , { type: 'cast' , target: 'foreach-break' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'The value is: zero' ] ,
					[ 'The value is: one' ] ,
					[ 'The value is: two' ] ,
					[ 'The value is: three' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[break] tag into [while]" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/while-break.kfg' , { type: 'cast' , target: 'while-break' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Count: 5' ] ,
					[ 'Count: 4' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[continue] tag into [foreach]" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/foreach-continue.kfg' , { type: 'cast' , target: 'foreach-continue' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'The value is: zero' ] ,
					[ 'The value is: one' ] ,
					[ 'The value is: two' ] ,
					[ 'The value is: four' ] ,
					[ 'The value is: five' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[continue] tag into [while]" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/while-continue.kfg' , { type: 'cast' , target: 'while-continue' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Count: 5' ] ,
					[ 'End.' ] ,
					[ 'Count: 4' ] ,
					[ 'End.' ] ,
					[ 'Count: 3' ] ,
					[ 'Count: 2' ] ,
					[ 'Count: 1' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[fn], [call] and [return] tags" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/fn.kfg' , { type: 'cast' , target: 'fn' } ,
			function( ui ) {
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Global myfn' ] ,
					[ 'value arg1 arg2' ] ,
					[ 'Global myfn' ] ,
					[ 'value one two three' ] ,
					[ 'Local fn' ] ,
					[ 'Global myfn' ] ,
					[ 'other value one 2 (undefined)' ] ,
					[ 'Local fn' ] ,
					[ 'Global myfn' ] ,
					[ 'other value 1 2' ] ,
					[ 'nsfn' ] ,
					[ 'myfn2' ] ,
					[ 'nsfn2' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[call] tag on real function (not on [fn] tag)" ) ;
	it( "[return] tag" ) ;
	
	it( "explicit [return] from [gosub]" , function( done ) {
		
		var messages = [] , ends = [] , leaveSceneCount = 0 ;
		
		runBook( __dirname + '/books/explicit-return.kfg' , { type: 'story' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
				ui.bus.on( 'leaveScene' , function() {
					leaveSceneCount ++ ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'before' ] ,
					[ 'subscene' ] ,
					[ 'after' ]
				] ) ;
				
				expect( leaveSceneCount ).to.equal(  1 ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "implicit [return] from [gosub]" , function( done ) {
		
		var messages = [] , ends = [] , leaveSceneCount = 0 ;
		
		runBook( __dirname + '/books/implicit-return.kfg' , { type: 'story' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
				ui.bus.on( 'leaveScene' , function() {
					leaveSceneCount ++ ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'before' ] ,
					[ 'subscene' ] ,
					[ 'after' ]
				] ) ;
				
				expect( leaveSceneCount ).to.equal(  1 ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
} ) ;



describe( "Operations tags" , function() {
	
	it( "[set] tag and dynamic resolution" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/set.kfg' , { type: 'cast' , target: 'set' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
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
	
	it( "[set] tag and complex references" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/complex-set.kfg' , { type: 'cast' , target: 'complex-set' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Strength: 18' ],
					[ 'Strength: 20' ],
					[ 'Intelligence: 7' ],
					[ 'Intelligence: 6' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[define] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/define.kfg' , { type: 'cast' , target: 'define' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'value: 5' ] ,
					[ 'value: 5' ] ,
					[ 'value: 8' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[unset] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/unset.kfg' , { type: 'cast' , target: 'unset' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'value: 5' ] ,
					[ 'value: (undefined)' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[swap] tag should swap the values of two Ref" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/swap.kfg' , { type: 'cast' , target: 'swap' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'one two' ] ,
					[ 'two one' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[add] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/add.kfg' , { type: 'cast' , target: 'add' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Value: 3' ] ,
					[ 'Value: 5' ] ,
					[ 'Value: 4' ] ,
					[ 'Value: 9' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[sub] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/sub.kfg' , { type: 'cast' , target: 'sub' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Value: 3' ] ,
					[ 'Value: 1' ] ,
					[ 'Value: 2' ] ,
					[ 'Value: -3' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[mul] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/mul.kfg' , { type: 'cast' , target: 'mul' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Value: 3' ] ,
					[ 'Value: 6' ] ,
					[ 'Value: -6' ] ,
					[ 'Value: -30' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[div] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/div.kfg' , { type: 'cast' , target: 'div' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Value: 42' ] ,
					[ 'Value: 14' ] ,
					[ 'Value: -14' ] ,
					[ 'Value: -2' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[inc] and [dec] tags" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/inc-dec.kfg' , { type: 'cast' , target: 'inc-dec' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Value: 3' ] ,
					[ 'Value: 4' ] ,
					[ 'Value: 5' ] ,
					[ 'Value: 4' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[apply] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/apply.kfg' , { type: 'cast' , target: 'apply' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'This is a template! Here some characters.' ] ,
					[ 'This is a template! Here some texts.' ] ,
					[ 'This is a template! Here some words.' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[merge] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/merge.kfg' , { type: 'cast' , target: 'merge' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'tree.a: 1 tree.b: 2 out.a: 4 out.b: 2' ] ,
					[ 'tree.a: 1 tree.b: 2 out.a: 11 out.b: 2' ] ,
					[ 'tree.a: 1 tree.b: 2 out.a: 11 out.b: 10' ] ,
					[ 'tree.a: 4 tree.b: 2' ] ,
					[ 'tree.a: 11 tree.b: 2' ] ,
					[ 'tree.a: 11 tree.b: 10' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[clone] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/clone.kfg' , { type: 'cast' , target: 'clone' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Value of clone.c.d: 4' ],
					[ 'Value of clone.c.d: Dee!' ],
					[ 'Value of original.c.d: 4' ],
					[ 'Value of clone.c.d: (undefined)' ],
					[ 'Value of clone.c.one: ONE!' ],
					[ 'Value of original.c.d: 4' ],
					[ 'Value of original.c.one: (undefined)' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[append] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/append.kfg' , { type: 'cast' , target: 'append' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: one two three four' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[prepend] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/prepend.kfg' , { type: 'cast' , target: 'prepend' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: zero one two three' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[concat] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/concat.kfg' , { type: 'cast' , target: 'concat' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: one two three four five six' ] ,
					[ 'Array: one two three' ] ,
					[ 'Target: one two three four five six' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[slice] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/slice.kfg' , { type: 'cast' , target: 'slice' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: three four five six' ] ,
					[ 'Array: three four' ] ,
					[ 'Array: zero one two three four five six' ] ,
					[ 'Target: three four' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[splice] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/splice.kfg' , { type: 'cast' , target: 'splice' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: zero one two' ] ,
					[ 'Array: zero one two five six' ] ,
					[ 'Array: zero one two 3 4 five six' ] ,
					[ 'Array: zero one two three four five six' ] ,
					[ 'Target: zero one two five six' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[copy-within] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/copy-within.kfg' , { type: 'cast' , target: 'copy-within' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: zero one two three four zero one' ] ,
					[ 'Array: zero one two three one two three' ] ,
					[ 'Array: zero one two three four five six' ] ,
					[ 'Target: zero one two three one two three' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[fill] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/fill.kfg' , { type: 'cast' , target: 'fill' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: three three three three three three three' ] ,
					[ 'Array: zero three three three four five six' ] ,
					[ 'Array: zero one two three four five six' ] ,
					[ 'Target: zero three three three four five six' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[filter] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/filter.kfg' , { type: 'cast' , target: 'filter' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Filtered length: 3' ],
					[ 'Filtered: orange apple ananas' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[map] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/map.kfg' , { type: 'cast' , target: 'map' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Map: orange apple cabbage ananas' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[reduce] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/reduce.kfg' , { type: 'cast' , target: 'reduce' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Reduce: 15' ],
					[ 'Reduce: 15' ],
					[ 'Reduce: 19' ],
					[ 'Reduce: 22' ],
					[ 'Reduce: 8' ],
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[reverse] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/reverse.kfg' , { type: 'cast' , target: 'reverse' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: six five four three two one zero' ] ,
					[ 'Array: zero one two three four five six' ] ,
					[ 'Target: six five four three two one zero' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[sort] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/sort.kfg' , { type: 'cast' , target: 'sort' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Original: 13 15 8' ],
					[ 'Result: 8 13 15' ],
					[ 'Original: 13 15 8' ],
					[ 'Result: 15 13 8' ],
					[ 'Original: 8 13 15' ],
					[ 'Result: 16 19 23' ],
					[ 'Result: 23 19 16' ],
					[ 'Result: 16 23 19' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;



describe( "Basic caster tags and features" , function() {
	
	beforeEach( function( done ) {
		fsKit.deltree( __dirname + '/build/*' , done ) ;
	} ) ;
	
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
				expect( extOutputs ).to.equal(  [
					[ 'bob\n' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[scroll] tag failure" , function( done ) {
		
		var extOutputs = [] , casts = [] ;
		
		runBook( __dirname + '/books/scroll-of-failing.kfg' , { type: 'cast' , target: 'scroll-of-failing' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'cast' , function() {
					casts.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				expect( extOutputs ).to.equal( [
					[ 'before fail\n' ]
				] ) ;
				
				expect( casts ).to.be.like( [
					[ 'scroll-of-failing' , 'error' , { code: 'nonZeroExit' } ]
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
				expect( extOutputs ).to.equal(  [
					[ 'one\nthree\ntwo\n' ]
				] ) ;
				
				expect( messages ).to.equal(  [
					[ 'Command second line output: three' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[spell] tag" ) ;
	
	it( "[summoning] tag: regular summoning" , function( done ) {
		
		var extOutputs = [] , summons = [] ;
		
		runBook( __dirname + '/books/summoning.kfg' , { type: 'summon' , target: '../build/summoning.txt' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'summon' , function() {
					summons.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				expect( extOutputs ).to.equal(  [] ) ;
				
				expect( summons ).to.equal(  [
					[ '../build/summoning.txt' , 'ok' ]
				] ) ;
				
				expect( fs.readFileSync( __dirname + '/build/summoning.txt' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[summoning] tag: glob summoning" , function( done ) {
		
		var extOutputs = [] , summons = [] ;
		
		runBook( __dirname + '/books/glob-summoning.kfg' , { type: 'summon' , target: '../build/file.ext' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'summon' , function() {
					summons.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				expect( extOutputs ).to.equal(  [] ) ;
				
				expect( summons ).to.equal(  [
					[ '../build/file.ext' , 'ok' ]
				] ) ;
				
				expect( fs.readFileSync( __dirname + '/build/file.ext' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[summoning] tag: regex summoning" , function( done ) {
		
		var book , extOutputs = [] , summons = [] ;
		
		async.series( [
			async function( seriesCallback ) {
			
				book = await runBook( __dirname + '/books/regex-summoning.kfg' , { type: 'summon' , target: '../build/file.ext' } ,
					function( ui ) {
						//console.log( 'UI ready' ) ;
						ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
						
						ui.bus.on( 'extOutput' , function() {
							extOutputs.push( Array.from( arguments ) ) ;
						} ) ;
						
						ui.bus.on( 'summon' , function() {
							summons.push( Array.from( arguments ) ) ;
						} ) ;
					} ,
					function() {
						expect( extOutputs ).to.equal(  [] ) ;
						
						expect( summons ).to.equal(  [
							[ '../build/file.ext' , 'ok' ]
						] ) ;
						
						expect( fs.readFileSync( __dirname + '/build/file.ext' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
			function( seriesCallback ) {
				
				// Reset
				extOutputs = [] ;
				summons = [] ;
				
				book.summon( '../build/FiLe2.ExT' , function() {
					expect( extOutputs ).to.equal(  [] ) ;
					
					expect( summons ).to.equal(  [
						[ '../build/FiLe2.ExT' , 'ok' ]
					] ) ;
					
					expect( fs.readFileSync( __dirname + '/build/FiLe2.ExT' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
		] )
		.exec( done ) ;
	} ) ;
	
	it( "[summoning] tag: fake summoning" , function( done ) {
		
		var extOutputs = [] , summons = [] ;
		
		runBook( __dirname + '/books/fake-summoning.kfg' , { type: 'summon' , target: 'fake.txt' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'summon' , function() {
					summons.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				expect( extOutputs ).to.equal(  [
					[ 'this produces nothing\n' ]
				] ) ;
				
				expect( summons ).to.equal(  [
					[ 'fake.txt' , 'noop' ]
				] ) ;
				
				expect( fs.accessSync ).with.args( __dirname + '/build/fake.txt' ).to.throw() ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[summoning] tag: failed summoning" , function( done ) {
		
		var extOutputs = [] , summons = [] ;
		
		runBook( __dirname + '/books/failed-summoning.kfg' , { type: 'summon' , target: 'failed.txt' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'summon' , function() {
					summons.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				expect( extOutputs ).to.equal( [] ) ;
				
				expect( fs.accessSync ).with.args( __dirname + '/build/failed.txt' ).to.throw() ;
				
				expect( summons ).to.be.like( [
					[ 'failed.txt' , 'error' , { code: 'nonZeroExit' } ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[reverse-summoning] tag: summon everything" , function( done ) {
		
		var extOutputs = [] , casts = [] , summons = [] ;
		
		runBook( __dirname + '/books/reverse-summoning.kfg' , { type: 'cast' , target: 'reverse' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				/*
				ui.bus.on( 'cast' , function() {
					casts.push( Array.from( arguments ) ) ;
				} ) ;
				*/
				
				ui.bus.on( 'summon' , function() {
					summons.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				expect( extOutputs ).to.equal(  [] ) ;
				
				/*
				expect( casts ).to.equal(  [
					[ 'gzip' , 'ok' ]
				] ) ;
				*/
				
				expect( summons ).to.equal(  [
					[ '../build/file1.rev' , 'ok' ] ,
					[ '../build/file2.rev' , 'ok' ] ,
					[ '../build/file3.rev' , 'ok' ]
				] ) ;
				
				expect( fs.readFileSync( __dirname + '/build/file1.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
				expect( fs.readFileSync( __dirname + '/build/file2.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
				expect( fs.readFileSync( __dirname + '/build/file3.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[reverse-summoning] tag: summon one" , function( done ) {
		
		var extOutputs = [] , summons = [] ;
		
		runBook( __dirname + '/books/reverse-summoning.kfg' , { type: 'summon' , target: '../build/file1.rev' } ,
			function( ui ) {
				//console.log( 'UI ready' ) ;
				ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
				
				ui.bus.on( 'extOutput' , function() {
					extOutputs.push( Array.from( arguments ) ) ;
				} ) ;
				
				ui.bus.on( 'summon' , function() {
					summons.push( Array.from( arguments ) ) ;
				} ) ;
			} ,
			function() {
				expect( extOutputs ).to.equal(  [] ) ;
				
				expect( summons ).to.equal(  [
					[ '../build/file1.rev' , 'ok' ]
				] ) ;
				
				expect( fs.readFileSync( __dirname + '/build/file1.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[summon] tag: direct static dependencies" , function( done ) {
		
		var book , extOutputs = [] , summons = [] ;
		
		// Touch files, because some of them may have time set in the future by other tests
		fsKit.touchSync( __dirname + '/src/file1.txt' ) ;
		fsKit.touchSync( __dirname + '/src/file2.txt' ) ;
		fsKit.touchSync( __dirname + '/src/file3.txt' ) ;
		
		async.series( [
			async function( seriesCallback ) {
			
				book = await runBook( __dirname + '/books/summoning-static-dependencies.kfg' , { type: 'summon' , target: '../build/concat.txt' } ,
					function( ui ) {
						//console.log( 'UI ready' ) ;
						ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
						
						ui.bus.on( 'extOutput' , function() {
							extOutputs.push( Array.from( arguments ) ) ;
						} ) ;
						
						ui.bus.on( 'summon' , function() {
							summons.push( Array.from( arguments ) ) ;
						} ) ;
					} ,
					function() {
						expect( extOutputs ).to.equal(  [] ) ;
						
						expect( summons ).to.equal(  [
							[ '../build/concat.txt' , 'ok' ]
						] ) ;
						
						expect( fs.readFileSync( __dirname + '/build/concat.txt' , 'utf8' ) )
							.to.be( "Some random text...\nSome random text...\nSome random text...\n" ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
			function( seriesCallback ) {
				
				// Reset
				extOutputs = [] ;
				summons = [] ;
				
				book.summon( '../build/concat.txt' , function() {
					expect( extOutputs ).to.equal(  [] ) ;
					
					expect( summons ).to.equal(  [
						[ '../build/concat.txt' , 'upToDate' ]
					] ) ;
					
					expect( fs.readFileSync( __dirname + '/build/concat.txt' , 'utf8' ) )
						.to.be( "Some random text...\nSome random text...\nSome random text...\n" ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
			function( seriesCallback ) {
				
				// Force a rebuild by 'touching' the dependency, but set the date one second in the future
				// (if not, the test would not works consistently)
				fsKit.touchSync( __dirname + '/src/file1.txt' , { time: Date.now() + 1000 } ) ;
				
				// Reset
				extOutputs = [] ;
				summons = [] ;
				
				book.summon( '../build/concat.txt' , function() {
					expect( extOutputs ).to.equal(  [] ) ;
					
					expect( summons ).to.equal(  [
						[ '../build/concat.txt' , 'ok' ]
					] ) ;
					
					expect( fs.readFileSync( __dirname + '/build/concat.txt' , 'utf8' ) )
						.to.be( "Some random text...\nSome random text...\nSome random text...\n" ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
		] )
		.exec( done ) ;
	} ) ;
	
	it( "[summon] tag: cascading dependencies" , function( done ) {
		
		var book , extOutputs = [] , summons = [] ;
		
		// Touch files, because some of them may have time set in the future by other tests
		fsKit.touchSync( __dirname + '/src/file1.txt' ) ;
		fsKit.touchSync( __dirname + '/src/file2.txt' ) ;
		fsKit.touchSync( __dirname + '/src/file3.txt' ) ;
		fsKit.touchSync( __dirname + '/src/something' ) ;
		
		async.series( [
			async function( seriesCallback ) {
				
				book = await runBook( __dirname + '/books/summoning-cascading-dependencies.kfg' , { type: 'summon' , target: '../build/cascade.txt' } ,
					function( ui ) {
						//console.log( 'UI ready' ) ;
						ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
						
						ui.bus.on( 'extOutput' , function() {
							extOutputs.push( Array.from( arguments ) ) ;
						} ) ;
						
						ui.bus.on( 'summon' , function() {
							summons.push( Array.from( arguments ) ) ;
						} ) ;
					} ,
					function() {
						expect( extOutputs ).to.equal(  [] ) ;
						
						expect( summons ).to.equal(  [
							[ '../build/concat.txt' , 'ok' ] ,
							[ '../build/cascade.txt' , 'ok' ]
						] ) ;
						
						expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
							.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
			function( seriesCallback ) {
				
				// Reset
				extOutputs = [] ;
				summons = [] ;
				
				book.summon( '../build/cascade.txt' , function() {
					expect( extOutputs ).to.equal(  [] ) ;
					
					expect( summons ).to.equal(  [
						[ '../build/concat.txt' , 'upToDate' ] ,
						[ '../build/cascade.txt' , 'upToDate' ]
					] ) ;
					
					expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
						.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
			function( seriesCallback ) {
				
				// Force a rebuild by 'touching' the dependency, but set the date one second in the future
				// (if not, the test would not works consistently)
				fsKit.touchSync( __dirname + '/src/something' , { time: Date.now() + 1000 } ) ;
				
				// Reset
				extOutputs = [] ;
				summons = [] ;
				
				book.summon( '../build/cascade.txt' , function() {
					expect( extOutputs ).to.equal(  [] ) ;
					
					expect( summons ).to.equal(  [
						[ '../build/concat.txt' , 'upToDate' ] ,
						[ '../build/cascade.txt' , 'ok' ]
					] ) ;
					
					expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
						.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
			function( seriesCallback ) {
				
				// Force a rebuild by 'touching' the dependency, but set the date one second in the future
				// (if not, the test would not works consistently)
				fsKit.touchSync( __dirname + '/src/file1.txt' , { time: Date.now() + 1000 } ) ;
				
				// Reset
				extOutputs = [] ;
				summons = [] ;
				
				book.summon( '../build/cascade.txt' , function() {
					expect( extOutputs ).to.equal(  [] ) ;
					
					expect( summons ).to.equal(  [
						[ '../build/concat.txt' , 'ok' ] ,
						[ '../build/cascade.txt' , 'ok' ]
					] ) ;
					
					expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
						.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;
					
					seriesCallback() ;
				} ) ;
			} ,
		] )
		.exec( done ) ;
	} ) ;
	
	it( "[summon] tag: cascading failing dependencies should abort current cast/summon" , function( done ) {
		
		var book , extOutputs = [] , summons = [] ;
		
		// Touch files, because some of them may have time set in the future by other tests
		/*
		fsKit.touchSync( __dirname + '/src/file1.txt' ) ;
		fsKit.touchSync( __dirname + '/src/file2.txt' ) ;
		fsKit.touchSync( __dirname + '/src/file3.txt' ) ;
		fsKit.touchSync( __dirname + '/src/something' ) ;
		*/
		
		async.series( [
			async function( seriesCallback ) {
				
				book = await runBook( __dirname + '/books/summoning-failing-dependencies.kfg' , { type: 'summon' , target: '../build/cascade.txt' } ,
					function( ui ) {
						//console.log( 'UI ready' ) ;
						ui.bus.on( 'extError' , function() { throw arguments ; } ) ;
						
						ui.bus.on( 'extOutput' , function() {
							extOutputs.push( Array.from( arguments ) ) ;
						} ) ;
						
						ui.bus.on( 'summon' , function() {
							summons.push( Array.from( arguments ) ) ;
						} ) ;
					} ,
					function() {
						expect( extOutputs ).to.equal( [] ) ;
						
						expect( summons ).to.be.like( [
							[ '../build/concat.txt' , 'error' , { code: 'nonZeroExit' } ] ,
							[ '../build/cascade.txt' , 'error' , { code: 'dependencyFailed' } ]
						] ) ;
						
						expect( fs.accessSync ).with.args( __dirname + '/build/cascade.txt' ).to.throw() ;
						
						seriesCallback() ;
					}
				) ;
			} ,
		] )
		.exec( done ) ;
	} ) ;
	
	it( "[cast] tag" ) ;
	it( "[formula] tag" ) ;
	it( "[prologue] tag" ) ;
	it( "[epilogue] tag" ) ;
	it( "[glob] tag" ) ;
} ) ;



describe( "Basic story tags and features" , function() {
	
	it( "Basic story book, with [chapter], [scene] and [next] tags" , function( done ) {
		
		var messages , ends ;
		
		async.series( [
			function( seriesCallback ) {
				messages = [] ;
				ends = [] ;
						
				runBook( __dirname + '/books/scene-and-next.kfg' , { type: 'story' , path: [ 2 , 0 , 2 ] } ,
					function( ui ) {
						
						ui.bus.on( 'message' , function() {
							messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
						} ) ;
						
						ui.bus.on( 'end' , function() {
							ends.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
						} ) ;
					} ,
					function() {
						expect( messages ).to.equal(  [
							[ 'Once upon a time...' ],
							[ 'There was a child...' ],
							[ 'Who was constantly...' ],
							[ 'Crying...' ]
						] ) ;
						
						expect( ends ).to.equal(  [
							[ 'lost' ]
						] ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
			function( seriesCallback ) {
				messages = [] ;
				ends = [] ;
						
				runBook( __dirname + '/books/scene-and-next.kfg' , { type: 'story' , path: [ 1 , 0 , 0 ] } ,
					function( ui ) {
						
						ui.bus.on( 'message' , function() {
							messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
						} ) ;
						
						ui.bus.on( 'end' , function() {
							ends.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
						} ) ;
					} ,
					function() {
						expect( messages ).to.equal(  [
							[ 'Once upon a time...' ],
							[ 'There was a woman...' ],
							[ 'Who was constantly...' ],
							[ 'Fencing...' ]
						] ) ;
						
						expect( ends ).to.equal(  [
							[ 'win' ]
						] ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
		] )
		.exec( done ) ;
	} ) ;
	
	it( "[starting-scene] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/starting-scene.kfg' , { type: 'story' , path: [ 0 ] } ,
			function( ui ) {
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'First!' ],
					[ 'Last!' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[module] tag" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/module-loader.kfg' , { type: 'story' , path: [ 0 ] } ,
			function( ui ) {
				
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Once upon a time...' ],
					[ 'Cool story bro!' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[next] tag instances ([next] into loop)" ) ;
	it( "[next]'s [on-trigger] tag" ) ;
	it( "[fake-next] tag" ) ;
	
	it( "[end]/[win]/[lost]/[draw] tags" ) ;
	it( "[goto] tag" ) ;
	it( "[gosub] tag" ) ;
	it( "[gosub] tag with return Ref" ) ;
	
	it( "[include] tag" ) ;
	it( "[action] tag" ) ;
	it( "[here] tag" ) ;
	it( "[here-actions] tag" ) ;
	
	it( "Special var $local" , function( done ) {
		var messages = [] , ends = [] ;
		
		runBook( __dirname + '/books/local-var.kfg' , { type: 'story' , path: [ 0 ] } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'bob: 15 -- local.bob: 1' ] ,
					[ 'bob: 15 -- local.bob: 1' ] ,
					[ 'bob: 15 -- local.bob: 1' ] ,
					[ 'bob: 15 -- local.bob: 1' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Special var $global" , function( done ) {
		var messages = [] , ends = [] ;
		
		runBook( __dirname + '/books/global-var.kfg' , { type: 'story' , path: [ 0 ] } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'bob: 15 -- global.bob: 6' ] ,
					[ 'bob: 16 -- global.bob: 7' ] ,
					[ 'bob: 17 -- global.bob: 8' ] ,
					[ 'bob: 19 -- global.bob: 19' ]	// because we return on the global scope
					//[ 'bob: 18 -- global.bob: 9' ] // behavior changed: only the top-level/init-time run is global
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Special var $static into [fn] tags" , function( done ) {
		var messages = [] , ends = [] ;
		
		runBook( __dirname + '/books/static-var.kfg' , { type: 'cast' , target: 'static-var' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'static.bob: 6 -- local.bob: 6' ] ,
					[ 'static.bob: 7 -- local.bob: 6' ] ,
					[ 'static.bob: 8 -- local.bob: 6' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Special var $static into [scene] tags" , function( done ) {
		var messages = [] , ends = [] ;
		
		runBook( __dirname + '/books/scene-static-var.kfg' , { type: 'story' , path: [ 0 ] } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'static.bob: 6 -- local.bob: 6' ] ,
					[ 'static.bob: 7 -- local.bob: 6' ] ,
					[ 'static.bob: 8 -- local.bob: 6' ] ,
					[ 'static.bob: 9 -- local.bob: 6' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Special var $args" , function( done ) {
		
		var messages = [] , ends = [] ;
		
		runBook( __dirname + '/books/args-stack.kfg' , { type: 'story' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'sub args before: 1 2' ] ,
					[ 'subsub args.a: 5 7' ] ,
					[ 'sub args after: 1 2' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Special var $here" ) ;
	
	// Deprecated?
	it( "Special var $this" ) ;
} ) ;



describe( "Multiplayer story tags and features" , function() {
	it( "[role] tag" ) ;
	it( "[split] tag" ) ;
} ) ;



describe( "RPG tags and features" , function() {
	it( "[entity-model] and [create-entity] tags" ) ;
	it( "[item-model] and [create-item] tags" ) ;
} ) ;



describe( "API" , function() {
	
	it( "Event [on]/[off]/[emit] tags" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/event.kfg' , { type: 'cast' , target: 'event' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Blasted Troll!' ] ,
					[ 'Roasted Troll!' ] ,
					[ 'Blasted Gnoll!' ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Global listeners [on]+[global] tags" ) ;
	it( "[emit] tag" ) ;
} ) ;



describe( "Wands/extensions" , function() {
	
	it( "[wand] and [zap] tags" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/wand.kfg' , { type: 'cast' , target: 'wand' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
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



describe( "Misc tags" , function() {
	it( "[pause] tag should pause the execution" , function( done ) {
		
		var messages = [] , time ;
		
		runBook( __dirname + '/books/pause.kfg' , { type: 'cast' , target: 'pause' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
				time = Date.now() ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Before pause' ] ,
					[ 'After pause' ]
				] ) ;
				
				//log.error( "Time: %s" , Date.now() - time ) ;
 				expect( Date.now() - time ).to.be.at.least( 500 ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "[debug] tag" ) ;
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
				expect( messages ).to.equal(  [
					[ "Hello Zang'dar!" ] ,
					[ "Hello Oz!" ] ,
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "when [js] tags are disabled but present in the user script, it should be interrupted by an error" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/js.kfg' , { type: 'cast' , target: 'js' , allowJsTag: false } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ "Hello Zang'dar!" ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
	
	it( "Security tests" ) ;
} ) ;



describe( "Spellcast exe features" , function() {
	it( "summon a makefile (--summon-makefile option)" ) ;
	it( "watch mode (--undead option)" ) ;
	it( "force building even if up to date (--again option)" ) ;
} ) ;



describe( "Prevent from infinite loop in user-script, using the 'maxTicks' option" , function() {
	
	it( "[while] infinity" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/infinite-loop-protection.kfg' , { type: 'cast' , target: 'test1' , maxTicks: 1000 } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function( error ) {
				// It should produce a RangeError
				expect( error ).to.be.a( RangeError ) ;
				done() ;
			}
		) ;
	} ) ;
} ) ;



describe( "Spellcast operators" , function() {
	it( "operators" ) ;
} ) ;



describe( "Historical bugs" , function() {
	
	it( "should be able to load the same book twice" , function( done ) {
		
		async.series( [
			function( seriesCallback ) {
				var messages = [] ;
				
				runBook( __dirname + '/books/message.kfg' , { type: 'cast' , target: 'message' } ,
					function( ui ) {
						ui.bus.on( 'message' , function() {
							messages.push( Array.from( arguments ) ) ;
						} ) ;
					} ,
					function() {
						expect( messages ).to.equal(  [
							[ 'Some text.' , null ] ,
							[ 'Some other text.' , null ] ,
							[ 'Welcome to The Shadow Terminal.' , {
								next: true ,
								slowTyping: true
							} ]
						] ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
			function( seriesCallback ) {
				var messages = [] ;
				
				runBook( __dirname + '/books/message.kfg' , { type: 'cast' , target: 'message' } ,
					function( ui ) {
						ui.bus.on( 'message' , function() {
							messages.push( Array.from( arguments ) ) ;
						} ) ;
					} ,
					function() {
						expect( messages ).to.equal(  [
							[ 'Some text.' , null ] ,
							[ 'Some other text.' , null ] ,
							[ 'Welcome to The Shadow Terminal.' , {
								next: true ,
								slowTyping: true
							} ]
						] ) ;
						
						seriesCallback() ;
					}
				) ;
			} ,
		] )
		.exec( done ) ;
	} ) ;
	
	it( "array ops in-place operations using non in-place JS method should modify the original hosted array" , function( done ) {
		
		var messages = [] ;
		
		runBook( __dirname + '/books/array-op-historical-bug.kfg' , { type: 'cast' , target: 'bug' } ,
			function( ui ) {
				ui.bus.on( 'message' , function() {
					messages.push( Array.from( arguments ).slice( 0 , 1 ) ) ;
				} ) ;
			} ,
			function() {
				expect( messages ).to.equal(  [
					[ 'Array: one two three four five six' ],
					[ 'Ref: one two three four five six' ]
				] ) ;
				
				done() ;
			}
		) ;
	} ) ;
} ) ;


