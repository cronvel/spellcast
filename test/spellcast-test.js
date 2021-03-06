/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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

/* global describe, it, expect, beforeEach */

"use strict" ;



const fs = require( 'fs' ) ;

const fsKit = require( 'fs-kit' ) ;
const string = require( 'string-kit' ) ;

//const Book = require( '../lib/Book.js' ) ;
const StoryBook = require( '../lib/StoryBook.js' ) ;
const CasterBook = require( '../lib/CasterBook.js' ) ;
const kungFig = require( 'kung-fig' ) ;
const Client = require( '../lib/Client.js' ) ;
const UnitUI = require( '../lib/ui/unit.js' ) ;

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'unit-tests' ) ;

Logfella.global.setGlobalConfig( {
	minLevel: 'info' ,
	//minLevel: 'debug' ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true }
	]
} ) ;

Logfella.defineOrConfig( 'userland' , {
	minLevel: 'fatal' ,
	//minLevel: 'debug' ,
	transports: [
		{ "type": "console" , "timeFormatter": "time" , "color": true }
	]
} ) ;



before( async () => {
	// Create the 'build' directory into the current 'test' directory
	await fsKit.ensurePath( __dirname + '/build' ) ;
} ) ;



/* Helpers */



function deb( something ) {
	console.log( string.inspect( { style: 'color' , depth: 10 } , something ) ) ;
}



async function runBook( bookPath , action , uiCallback ) {
	var ui , uiId = 0 , cleaned = false , book , options = {} ;

	if ( action.maxTicks ) { options.maxTicks = action.maxTicks ; }
	if ( action.allowJsTag !== undefined ) { options.allowJsTag = action.allowJsTag ; }

	var BookModule = action.type === 'story' ? StoryBook : CasterBook ;

	book = await BookModule.load( bookPath , options ) ;

	var cleanUp = () => {
		if ( cleaned ) { return ; }
		cleaned = true ;
		book.destroy() ;
	} ;

	try {
		await book.initBook() ;

		var assignRolesPromise = book.assignRoles() ;

		book.addClient( Client.create( { name: 'default' } ) ) ;
		ui = UnitUI( book.clients[ 0 ] ) ;
		ui.id = uiId ++ ;

		if ( action.path ) { followPath( book , ui , action.path , cleanUp ) ; }

		if ( uiCallback ) { uiCallback( ui , book ) ; }

		// This must be done, or some events will be missing
		book.clients[ 0 ].authenticate( {} ) ;

		await assignRolesPromise ;

		switch ( action.type ) {
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

	}
	catch ( error ) {
		cleanUp() ;
		throw error ;
	}

	cleanUp() ;

	return book ;
}



function followPath( book , ui , path , callback ) {
	var pathIndex = 0 ;

	ui.bus.on( 'nextList' , ( nexts , undecidedRoleIds , timeout , isUpdate ) => {
		if ( isUpdate ) { return ; }
		//log.info( 'nextList: %I' , Array.from( arguments ) ) ;

		// Avoid concurrency issues:
		setTimeout( () => ui.bus.emit( 'selectNext' , nexts[ path[ pathIndex ++ ] ].id ) , 0 ) ;
	} ) ;
}



/* Tests */



describe( "I/O tags" , () => {

	it( "[message]/[chant] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/message.kfg' , { type: 'cast' , target: 'message' } ,
			ui => ui.bus.on( 'message' , ( ... args ) => messages.push( args ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Some text.' , {} ] ,
			[ 'Some other text.' , {} ] ,
			[ 'Welcome to The Shadow Terminal.' , {
				next: true ,
				slowTyping: true
			} ]
		] ) ;
	} ) ;

	it( "[input] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/input.kfg' , { type: 'cast' , target: 'input' } ,
			( ui , book_ ) => {
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
				ui.bus.on( 'textInput' , label => {
					expect( label ).to.equal(  'Enter your name: ' ) ;
					book_.roles[ 0 ].emit( 'textSubmit' , 'Jack Wallace' ) ;
				} ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'Hello Jack Wallace!' ]
		] ) ;
	} ) ;

	it( "[fortune] tag" ) ;
	it( "[sound] tag" ) ;
} ) ;



describe( "Control flow tags" , () => {

	it( "[if], [elsif]/[elseif] and [else] tags" , async () => {
		var book , messages ;

		messages = [] ;

		book = await runBook( __dirname + '/books/if-elseif-else.kfg' , { type: 'cast' , target: 'if-elseif-else' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Condition #1 else' ] ,
			[ 'Condition #2 else' ]
		] ) ;

		// Reset messages and change the value to be tested
		messages = [] ;
		book.data.value = 2 ;

		await book.cast( 'if-elseif-else' ) ;

		expect( messages ).to.equal( [
			[ 'Condition #1 else' ] ,
			[ 'Condition #2 elseif' ]
		] ) ;

		// Reset messages and change the value to be tested
		messages = [] ;
		book.data.value = 3 ;

		await book.cast( 'if-elseif-else' ) ;
		expect( messages ).to.equal( [
			[ 'Condition #1 else' ] ,
			[ 'Condition #2 elsif' ]
		] ) ;

		// Reset messages and change the value to be tested
		messages = [] ;
		book.data.value = 5 ;

		await book.cast( 'if-elseif-else' ) ;
		expect( messages ).to.equal( [
			[ 'Condition #0 if' ] ,
			[ 'Condition #1 if' ] ,
			[ 'Condition #2 if' ]
		] ) ;
	} ) ;

	it( "[foreach] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/foreach.kfg' , { type: 'cast' , target: 'foreach' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
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
			[ 'The key/value is: three/3' ]
		] ) ;
	} ) ;

	it( "[while] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/while.kfg' , { type: 'cast' , target: 'while' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'Count: 5' ] ,
			[ 'Count: 4' ] ,
			[ 'Count: 3' ] ,
			[ 'Count: 2' ] ,
			[ 'Count: 1' ]
		] ) ;
	} ) ;

	it( "[break] tag into [foreach]" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/foreach-break.kfg' , { type: 'cast' , target: 'foreach-break' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'The value is: zero' ] ,
			[ 'The value is: one' ] ,
			[ 'The value is: two' ] ,
			[ 'The value is: three' ]
		] ) ;
	} ) ;

	it( "[break] tag into [while]" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/while-break.kfg' , { type: 'cast' , target: 'while-break' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'Count: 5' ] ,
			[ 'Count: 4' ]
		] ) ;
	} ) ;

	it( "[continue] tag into [foreach]" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/foreach-continue.kfg' , { type: 'cast' , target: 'foreach-continue' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'The value is: zero' ] ,
			[ 'The value is: one' ] ,
			[ 'The value is: two' ] ,
			[ 'The value is: four' ] ,
			[ 'The value is: five' ]
		] ) ;
	} ) ;

	it( "[continue] tag into [while]" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/while-continue.kfg' , { type: 'cast' , target: 'while-continue' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'Count: 5' ] ,
			[ 'End.' ] ,
			[ 'Count: 4' ] ,
			[ 'End.' ] ,
			[ 'Count: 3' ] ,
			[ 'Count: 2' ] ,
			[ 'Count: 1' ]
		] ) ;
	} ) ;

	it( "[fn], [call] and [return] tags" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/fn.kfg' , { type: 'cast' , target: 'fn' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
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
			[ 'nsfn2' ]
		] ) ;
	} ) ;

	it( "[call] tag on real function (not on [fn] tag)" ) ;
	it( "[return] tag" ) ;

	it( "explicit [return] from [gosub]" , async () => {
		var messages = [] , ends = [] , leaveSceneCount = 0 ;

		await runBook( __dirname + '/books/explicit-return.kfg' , { type: 'story' } ,
			ui => {
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
				ui.bus.on( 'leaveScene' , () => leaveSceneCount ++ ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'before' ] ,
			[ 'subscene' ] ,
			[ 'after' ]
		] ) ;

		expect( leaveSceneCount ).to.equal( 1 ) ;
	} ) ;

	it( "implicit [return] from [gosub]" , async () => {
		var messages = [] , ends = [] , leaveSceneCount = 0 ;

		await runBook( __dirname + '/books/implicit-return.kfg' , { type: 'story' } ,
			ui => {
				ui.bus.on( 'message' , msg => messages.push( [ msg ] ) ) ;
				ui.bus.on( 'leaveScene' , () => leaveSceneCount ++ ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'before' ] ,
			[ 'subscene' ] ,
			[ 'after' ]
		] ) ;

		expect( leaveSceneCount ).to.equal( 1 ) ;
	} ) ;
} ) ;



describe( "Operations tags" , () => {

	it( "[set] tag and dynamic resolution" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/set.kfg' , { type: 'cast' , target: 'set' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Value of $a: something' ] ,
			[ 'Value of $b: bob something' ] ,
			[ 'Value of $c: bob' ] ,
			[ 'Value of $d: bob' ] ,
			[ 'Value of alert: bob' ] ,
			[ 'Value of ref: bob' ]
		] ) ;
	} ) ;

	it( "[set] tag and complex references" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/complex-set.kfg' , { type: 'cast' , target: 'complex-set' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Strength: 18' ] ,
			[ 'Strength: 20' ] ,
			[ 'Intelligence: 7' ] ,
			[ 'Intelligence: 6' ]
		] ) ;
	} ) ;

	it( "[define] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/define.kfg' , { type: 'cast' , target: 'define' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'value: 5' ] ,
			[ 'value: 5' ] ,
			[ 'value: 8' ]
		] ) ;
	} ) ;

	it( "[unset] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/unset.kfg' , { type: 'cast' , target: 'unset' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'value: 5' ] ,
			[ 'value: (undefined)' ]
		] ) ;
	} ) ;

	it( "[swap] tag should swap the values of two Ref" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/swap.kfg' , { type: 'cast' , target: 'swap' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'one two' ] ,
			[ 'two one' ]
		] ) ;
	} ) ;

	it( "[add] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/add.kfg' , { type: 'cast' , target: 'add' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Value: 3' ] ,
			[ 'Value: 5' ] ,
			[ 'Value: 4' ] ,
			[ 'Value: 9' ]
		] ) ;
	} ) ;

	it( "[sub] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/sub.kfg' , { type: 'cast' , target: 'sub' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Value: 3' ] ,
			[ 'Value: 1' ] ,
			[ 'Value: 2' ] ,
			[ 'Value: -3' ]
		] ) ;
	} ) ;

	it( "[mul] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/mul.kfg' , { type: 'cast' , target: 'mul' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Value: 3' ] ,
			[ 'Value: 6' ] ,
			[ 'Value: -6' ] ,
			[ 'Value: -30' ]
		] ) ;
	} ) ;

	it( "[div] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/div.kfg' , { type: 'cast' , target: 'div' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Value: 42' ] ,
			[ 'Value: 14' ] ,
			[ 'Value: -14' ] ,
			[ 'Value: -2' ]
		] ) ;
	} ) ;

	it( "[inc] and [dec] tags" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/inc-dec.kfg' , { type: 'cast' , target: 'inc-dec' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Value: 3' ] ,
			[ 'Value: 4' ] ,
			[ 'Value: 5' ] ,
			[ 'Value: 4' ]
		] ) ;
	} ) ;

	it( "[apply] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/apply.kfg' , { type: 'cast' , target: 'apply' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'This is a template! Here some characters.' ] ,
			[ 'This is a template! Here some texts.' ] ,
			[ 'This is a template! Here some words.' ]
		] ) ;
	} ) ;

	it( "[merge] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/merge.kfg' , { type: 'cast' , target: 'merge' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'tree.a: 1 tree.b: 2 out.a: 4 out.b: 2' ] ,
			[ 'tree.a: 1 tree.b: 2 out.a: 11 out.b: 2' ] ,
			[ 'tree.a: 1 tree.b: 2 out.a: 11 out.b: 10' ] ,
			[ 'tree.a: 4 tree.b: 2' ] ,
			[ 'tree.a: 11 tree.b: 2' ] ,
			[ 'tree.a: 11 tree.b: 10' ]
		] ) ;
	} ) ;

	it( "[clone] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/clone.kfg' , { type: 'cast' , target: 'clone' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Value of clone.c.d: 4' ] ,
			[ 'Value of clone.c.d: Dee!' ] ,
			[ 'Value of original.c.d: 4' ] ,
			[ 'Value of clone.c.d: (undefined)' ] ,
			[ 'Value of clone.c.one: ONE!' ] ,
			[ 'Value of original.c.d: 4' ] ,
			[ 'Value of original.c.one: (undefined)' ]
		] ) ;
	} ) ;

	it( "[append] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/append.kfg' , { type: 'cast' , target: 'append' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: one two three four' ]
		] ) ;
	} ) ;

	it( "[prepend] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/prepend.kfg' , { type: 'cast' , target: 'prepend' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: zero one two three' ]
		] ) ;
	} ) ;

	it( "[concat] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/concat.kfg' , { type: 'cast' , target: 'concat' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: one two three four five six' ] ,
			[ 'Array: one two three' ] ,
			[ 'Target: one two three four five six' ]
		] ) ;
	} ) ;

	it( "[slice] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/slice.kfg' , { type: 'cast' , target: 'slice' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: three four five six' ] ,
			[ 'Array: three four' ] ,
			[ 'Array: zero one two three four five six' ] ,
			[ 'Target: three four' ]
		] ) ;
	} ) ;

	it( "[splice] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/splice.kfg' , { type: 'cast' , target: 'splice' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: zero one two' ] ,
			[ 'Array: zero one two five six' ] ,
			[ 'Array: zero one two 3 4 five six' ] ,
			[ 'Array: zero one two three four five six' ] ,
			[ 'Target: zero one two five six' ]
		] ) ;
	} ) ;

	it( "[copy-within] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/copy-within.kfg' , { type: 'cast' , target: 'copy-within' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: zero one two three four zero one' ] ,
			[ 'Array: zero one two three one two three' ] ,
			[ 'Array: zero one two three four five six' ] ,
			[ 'Target: zero one two three one two three' ]
		] ) ;
	} ) ;

	it( "[fill] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/fill.kfg' , { type: 'cast' , target: 'fill' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: three three three three three three three' ] ,
			[ 'Array: zero three three three four five six' ] ,
			[ 'Array: zero one two three four five six' ] ,
			[ 'Target: zero three three three four five six' ]
		] ) ;
	} ) ;

	it( "[filter] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/filter.kfg' , { type: 'cast' , target: 'filter' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Filtered length: 3' ] ,
			[ 'Filtered: orange apple ananas' ]
		] ) ;
	} ) ;

	it( "[map] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/map.kfg' , { type: 'cast' , target: 'map' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Map: orange apple cabbage ananas' ]
		] ) ;
	} ) ;

	it( "[reduce] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/reduce.kfg' , { type: 'cast' , target: 'reduce' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Reduce: 15' ] ,
			[ 'Reduce: 15' ] ,
			[ 'Reduce: 19' ] ,
			[ 'Reduce: 22' ] ,
			[ 'Reduce: 8' ]
		] ) ;
	} ) ;

	it( "[reverse] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/reverse.kfg' , { type: 'cast' , target: 'reverse' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: six five four three two one zero' ] ,
			[ 'Array: zero one two three four five six' ] ,
			[ 'Target: six five four three two one zero' ]
		] ) ;
	} ) ;

	it( "[sort] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/sort.kfg' , { type: 'cast' , target: 'sort' } ,
			ui => ui.bus.on( 'message' , msg => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Original: 13 15 8' ] ,
			[ 'Result: 8 13 15' ] ,
			[ 'Original: 13 15 8' ] ,
			[ 'Result: 15 13 8' ] ,
			[ 'Original: 8 13 15' ] ,
			[ 'Result: 16 19 23' ] ,
			[ 'Result: 23 19 16' ] ,
			[ 'Result: 16 23 19' ]
		] ) ;
	} ) ;
} ) ;



describe( "Basic caster tags and features" , () => {

	beforeEach( async () => {
		await fsKit.deltree( __dirname + '/build/*' ) ;
	} ) ;

	it( "[scroll] tag" , async () => {
		var extOutputs = [] ;

		await runBook( __dirname + '/books/scroll.kfg' , { type: 'cast' , target: 'echo' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [
			[ 'bob\n' ]
		] ) ;
	} ) ;

	it( "[scroll] tag failure" , async () => {
		var extOutputs = [] , casts = [] ;

		try {
			await runBook( __dirname + '/books/scroll-of-failing.kfg' , { type: 'cast' , target: 'scroll-of-failing' } ,
				ui => {
					ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
					ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
					ui.bus.on( 'cast' , ( ... args ) => casts.push( args ) ) ;
				}
			) ;
		}
		catch ( error ) {
		}

		expect( extOutputs ).to.equal( [
			[ 'before fail\n' ]
		] ) ;

		expect( casts ).to.be.like( [
			[ 'scroll-of-failing' , 'error' , { type: 'nonZeroExit' } ]
		] ) ;
	} ) ;

	it( "[scroll] tag: store and split attribute" , async () => {
		var extOutputs = [] , messages = [] ;

		await runBook( __dirname + '/books/scroll-store-split.kfg' , { type: 'cast' , target: 'ls' } ,
			ui => {
				ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) ) ;
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [
			[ 'one\nthree\ntwo\n' ]
		] ) ;

		expect( messages ).to.equal( [
			[ 'Command second line output: three' ]
		] ) ;
	} ) ;

	it( "[spell] tag" ) ;

	it( "[summoning] tag: regular summoning" , async () => {
		var extOutputs = [] , summons = [] ;

		await runBook( __dirname + '/books/summoning.kfg' , { type: 'summon' , target: '../build/summoning.txt' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
				ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/summoning.txt' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/summoning.txt' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;
	} ) ;

	it( "[summoning] tag: glob summoning" , async () => {
		var extOutputs = [] , summons = [] ;

		await runBook( __dirname + '/books/glob-summoning.kfg' , { type: 'summon' , target: '../build/file.ext' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
				ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/file.ext' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/file.ext' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;
	} ) ;

	it( "[summoning] tag: regex summoning" , async () => {
		var book , extOutputs = [] , summons = [] ;

		book = await runBook( __dirname + '/books/regex-summoning.kfg' , { type: 'summon' , target: '../build/file.ext' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
				ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/file.ext' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/file.ext' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;

		// Reset
		extOutputs = [] ;
		summons = [] ;

		await book.summon( '../build/FiLe2.ExT' ) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/FiLe2.ExT' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/FiLe2.ExT' , 'utf8' ) ).to.be( "This is a dummy static dependency file.\n" ) ;
	} ) ;

	it( "[summoning] tag: fake summoning" , async () => {
		var extOutputs = [] , summons = [] ;

		try {
			await runBook( __dirname + '/books/fake-summoning.kfg' , { type: 'summon' , target: 'fake.txt' } ,
				ui => {
					ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
					ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
					ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
				}
			) ;
			expect().fail( "expected to throw" ) ;
		}
		catch ( error ) {
			expect( error ).to.be.partially.like( { type: 'noop' } ) ;
		}

		expect( extOutputs ).to.equal( [
			[ 'this produces nothing\n' ]
		] ) ;

		expect( summons ).to.equal( [
			[ 'fake.txt' , 'noop' ]
		] ) ;

		expect( fs.accessSync ).with.args( __dirname + '/build/fake.txt' ).to.throw() ;
	} ) ;

	it( "[summoning] tag: failed summoning" , async () => {
		var extOutputs = [] , summons = [] ;

		try {
			await runBook( __dirname + '/books/failed-summoning.kfg' , { type: 'summon' , target: 'failed.txt' } ,
				ui => {
					ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
					ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
					ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
				}
			) ;
			expect().fail( "expected to throw an Error" ) ;
		}
		catch ( error ) {
			expect( error ).to.be.partially.like( { type: 'nonZeroExit' } ) ;
		}

		expect( extOutputs ).to.equal( [] ) ;

		expect( fs.accessSync ).with.args( __dirname + '/build/failed.txt' ).to.throw() ;

		expect( summons ).to.be.like( [
			[ 'failed.txt' , 'error' , { type: 'nonZeroExit' } ]
		] ) ;
	} ) ;

	it( "[reverse-summoning] tag: summon everything" , async () => {
		var extOutputs = [] , casts = [] , summons = [] ;

		await runBook( __dirname + '/books/reverse-summoning.kfg' , { type: 'cast' , target: 'reverse' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
				ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/file1.rev' , 'ok' ] ,
			[ '../build/file2.rev' , 'ok' ] ,
			[ '../build/file3.rev' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/file1.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
		expect( fs.readFileSync( __dirname + '/build/file2.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
		expect( fs.readFileSync( __dirname + '/build/file3.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
	} ) ;

	it( "[reverse-summoning] tag: summon one" , async () => {
		var extOutputs = [] , summons = [] ;

		await runBook( __dirname + '/books/reverse-summoning.kfg' , { type: 'summon' , target: '../build/file1.rev' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
				ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/file1.rev' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/file1.rev' , 'utf8' ) ).to.be( "...txet modnar emoS\n" ) ;
	} ) ;

	it( "[summon] tag: direct static dependencies" , async () => {
		var book , extOutputs = [] , summons = [] ;

		// Touch files, because some of them may have time set in the future by other tests
		await fsKit.touch( __dirname + '/src/file1.txt' ) ;
		await fsKit.touch( __dirname + '/src/file2.txt' ) ;
		await fsKit.touch( __dirname + '/src/file3.txt' ) ;

		book = await runBook( __dirname + '/books/summoning-static-dependencies.kfg' , { type: 'summon' , target: '../build/concat.txt' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
				ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/concat.txt' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/concat.txt' , 'utf8' ) )
			.to.be( "Some random text...\nSome random text...\nSome random text...\n" ) ;

		// Reset
		extOutputs = [] ;
		summons = [] ;

		await book.summon( '../build/concat.txt' ) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/concat.txt' , 'upToDate' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/concat.txt' , 'utf8' ) )
			.to.be( "Some random text...\nSome random text...\nSome random text...\n" ) ;

		// Force a rebuild by 'touching' the dependency, but set the date one second in the future
		// (if not, the test would not works consistently)
		await fsKit.touch( __dirname + '/src/file1.txt' , { time: Date.now() + 1000 } ) ;

		// Reset
		extOutputs = [] ;
		summons = [] ;

		await book.summon( '../build/concat.txt' ) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/concat.txt' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/concat.txt' , 'utf8' ) )
			.to.be( "Some random text...\nSome random text...\nSome random text...\n" ) ;
	} ) ;

	it( "[summon] tag: cascading dependencies" , async () => {
		var book , extOutputs = [] , summons = [] ;

		// Touch files, because some of them may have time set in the future by other tests
		await fsKit.touch( __dirname + '/src/file1.txt' ) ;
		await fsKit.touch( __dirname + '/src/file2.txt' ) ;
		await fsKit.touch( __dirname + '/src/file3.txt' ) ;
		await fsKit.touch( __dirname + '/src/something' ) ;

		book = await runBook( __dirname + '/books/summoning-cascading-dependencies.kfg' , { type: 'summon' , target: '../build/cascade.txt' } ,
			ui => {
				ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
				ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
				ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
			}
		) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/concat.txt' , 'ok' ] ,
			[ '../build/cascade.txt' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
			.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;

		// Reset
		extOutputs = [] ;
		summons = [] ;

		await book.summon( '../build/cascade.txt' ) ;

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/concat.txt' , 'upToDate' ] ,
			[ '../build/cascade.txt' , 'upToDate' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
			.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;

		// Force a rebuild by 'touching' the dependency, but set the date one second in the future
		// (if not, the test would not works consistently)
		await fsKit.touch( __dirname + '/src/something' , { time: Date.now() + 1000 } ) ;

		// Reset
		extOutputs = [] ;
		summons = [] ;

		await book.summon( '../build/cascade.txt' ) ;
		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/concat.txt' , 'upToDate' ] ,
			[ '../build/cascade.txt' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
			.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;

		// Force a rebuild by 'touching' the dependency, but set the date one second in the future
		// (if not, the test would not works consistently)
		await fsKit.touch( __dirname + '/src/file1.txt' , { time: Date.now() + 1000 } ) ;

		// Reset
		extOutputs = [] ;
		summons = [] ;

		await book.summon( '../build/cascade.txt' ) ;
		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.equal( [
			[ '../build/concat.txt' , 'ok' ] ,
			[ '../build/cascade.txt' , 'ok' ]
		] ) ;

		expect( fs.readFileSync( __dirname + '/build/cascade.txt' , 'utf8' ) )
			.to.be( "Cascade:\nSome random text...\nSome random text...\nSome random text...\nsomething" ) ;
	} ) ;

	it( "[summon] tag: cascading failing dependencies should abort current cast/summon" , async () => {
		var book , extOutputs = [] , summons = [] ;

		// Touch files, because some of them may have time set in the future by other tests
		/*
		await fsKit.touch( __dirname + '/src/file1.txt' ) ;
		await fsKit.touch( __dirname + '/src/file2.txt' ) ;
		await fsKit.touch( __dirname + '/src/file3.txt' ) ;
		await fsKit.touch( __dirname + '/src/something' ) ;
		*/

		try {
			book = await runBook( __dirname + '/books/summoning-failing-dependencies.kfg' , { type: 'summon' , target: '../build/cascade.txt' } ,
				ui => {
					ui.bus.on( 'extError' , ( ... args ) => { throw args ; } ) ;
					ui.bus.on( 'extOutput' , ( ... args ) => extOutputs.push( args ) ) ;
					ui.bus.on( 'summon' , ( ... args ) => summons.push( args ) ) ;
				}
			) ;
		}
		catch ( error ) {
			expect( error ).to.be.partially.like( { type: 'dependencyFailed' } ) ;
		}

		expect( extOutputs ).to.equal( [] ) ;

		expect( summons ).to.be.like( [
			[ '../build/concat.txt' , 'error' , { type: 'nonZeroExit' } ] ,
			[ '../build/cascade.txt' , 'error' , { type: 'dependencyFailed' } ]
		] ) ;

		expect( fs.accessSync ).with.args( __dirname + '/build/cascade.txt' ).to.throw() ;
	} ) ;

	it( "[cast] tag" ) ;
	it( "[formula] tag" ) ;
	it( "[prologue] tag" ) ;
	it( "[epilogue] tag" ) ;
	it( "[glob] tag" ) ;
} ) ;



describe( "Basic story tags and features" , () => {

	it( "Basic story book, with [chapter], [scene] and [next] tags" , async () => {
		var messages = [] , ends = [] ;

		await runBook( __dirname + '/books/scene-and-next.kfg' , { type: 'story' , path: [ 2 , 0 , 2 ] } ,
			ui => {
				ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) ) ;
				ui.bus.on( 'end' , ( type ) => ends.push( [ type ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'Once upon a time...' ] ,
			[ 'There was a child...' ] ,
			[ 'Who was constantly...' ] ,
			[ 'Crying...' ]
		] ) ;

		expect( ends ).to.equal( [
			[ 'lost' ]
		] ) ;

		messages = [] ;
		ends = [] ;

		await runBook( __dirname + '/books/scene-and-next.kfg' , { type: 'story' , path: [ 1 , 0 , 0 ] } ,
			ui => {
				ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) ) ;
				ui.bus.on( 'end' , ( type ) => ends.push( [ type ] ) ) ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'Once upon a time...' ] ,
			[ 'There was a woman...' ] ,
			[ 'Who was constantly...' ] ,
			[ 'Fencing...' ]
		] ) ;

		expect( ends ).to.equal( [
			[ 'win' ]
		] ) ;
	} ) ;

	it( "[starting-scene] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/starting-scene.kfg' , { type: 'story' , path: [ 0 ] } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'First!' ] ,
			[ 'Last!' ]
		] ) ;
	} ) ;

	it( "[module] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/module-loader.kfg' , { type: 'story' , path: [ 0 ] } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Once upon a time...' ] ,
			[ 'Cool story bro!' ]
		] ) ;
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

	it( "Special var $local" , async () => {
		var messages = [] , ends = [] ;

		await runBook( __dirname + '/books/local-var.kfg' , { type: 'story' , path: [ 0 ] } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'bob: 15 -- local.bob: 1' ] ,
			[ 'bob: 15 -- local.bob: 1' ] ,
			[ 'bob: 15 -- local.bob: 1' ] ,
			[ 'bob: 15 -- local.bob: 1' ]
		] ) ;
	} ) ;

	it( "Special var $global" , async () => {
		var messages = [] , ends = [] ;

		await runBook( __dirname + '/books/global-var.kfg' , { type: 'story' , path: [ 0 ] } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'bob: 15 -- global.bob: 6' ] ,
			[ 'bob: 16 -- global.bob: 7' ] ,
			[ 'bob: 17 -- global.bob: 8' ] ,
			[ 'bob: 19 -- global.bob: 19' ]	// because we return on the global scope
			//[ 'bob: 18 -- global.bob: 9' ] // behavior changed: only the top-level/init-time run is global
		] ) ;
	} ) ;

	it( "Special var $static into [fn] tags" , async () => {
		var messages = [] , ends = [] ;

		await runBook( __dirname + '/books/static-var.kfg' , { type: 'cast' , target: 'static-var' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'static.bob: 6 -- local.bob: 6' ] ,
			[ 'static.bob: 7 -- local.bob: 6' ] ,
			[ 'static.bob: 8 -- local.bob: 6' ]
		] ) ;
	} ) ;

	it( "Special var $static into [scene] tags" , async () => {
		var messages = [] , ends = [] ;

		await runBook( __dirname + '/books/scene-static-var.kfg' , { type: 'story' , path: [ 0 ] } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'static.bob: 6 -- local.bob: 6' ] ,
			[ 'static.bob: 7 -- local.bob: 6' ] ,
			[ 'static.bob: 8 -- local.bob: 6' ] ,
			[ 'static.bob: 9 -- local.bob: 6' ]
		] ) ;
	} ) ;

	it( "Special var $args" , async () => {
		var messages = [] , ends = [] ;

		await runBook( __dirname + '/books/args-stack.kfg' , { type: 'story' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'sub args before: 1 2' ] ,
			[ 'subsub args.a: 5 7' ] ,
			[ 'sub args after: 1 2' ]
		] ) ;
	} ) ;

	it( "Special var $here" ) ;

	// Deprecated?
	it( "Special var $this" ) ;
} ) ;



describe( "Multiplayer story tags and features" , () => {
	it( "[role] tag" ) ;
	it( "[split] tag" ) ;
} ) ;



describe( "RPG tags and features" , () => {
	it( "[entity-model] and [create-entity] tags" ) ;
	it( "[item-model] and [create-item] tags" ) ;
} ) ;



describe( "API" , () => {

	it( "Event [on]/[off]/[emit] tags" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/event.kfg' , { type: 'cast' , target: 'event' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Blasted Troll!' ] ,
			[ 'Roasted Troll!' ] ,
			[ 'Blasted Gnoll!' ]
		] ) ;
	} ) ;

	it( "Event [on] tag priorities" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/event-priorities.kfg' , { type: 'cast' , target: 'event' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Fried Troll!' ] ,
			[ 'Roasted Troll!' ] ,
			[ 'Blasted Troll!' ]
		] ) ;
	} ) ;

	it( "Event [cancel] tags" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/event-cancel.kfg' , { type: 'cast' , target: 'event' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Blasted Troll!' ] ,
			[ '$cancel: cancel-value' ] ,
			[ 'Blasted Gnoll!' ] ,
			[ '$cancel: cancel-value2' ]
		] ) ;
	} ) ;

	it( "Event [success] and [failure] tags" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/event-success-failure.kfg' , { type: 'cast' , target: 'event' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Blasted Troll!' ] ,
			[ '$cancel: true' ] ,
			[ 'Blasted Gnoll!' ] ,
			[ '$cancel: true' ]
		] ) ;
	} ) ;

	it( "Event [success]/[failure]/[maybe-success]/[maybe-failure]/[cancel] in conjunction with [on-success] and [on-failure] tags" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/event-on-success-failure.kfg' , { type: 'cast' , target: 'event' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Blasted Troll!' ] ,
			[ '1: Success!' ] ,
			[ 'Blasted Gnoll!' ] ,
			[ '2: Failure!' ] ,
			[ 'Blasted Giant Rat!' ] ,
			[ '3: Failure!' ] ,
			[ 'Blasted Giant Midge!' ] ,
			[ 'Roasted Giant Midge!' ] ,
			[ '4: Success!' ] ,
			[ '5: Success!' ] ,
			[ 'Blasted Manticore!' ] ,
			[ 'Roasted Manticore!' ] ,
			[ '6: Failure!' ] ,
			[ 'Blasted Killer Bee!' ] ,
			[ 'Roasted Killer Bee!' ] ,
			[ '7: Success!' ] ,
			[ 'Blasted Orc!' ] ,
			[ '8: Success!' ] ,
			[ 'Blasted Goblin!' ] ,
			[ 'Roasted Goblin!' ] ,
			[ '9: Success!' ] ,
			[ 'Blasted Ogre!' ] ,
			[ 'Roasted Ogre!' ] ,
			[ '10: Failure!' ]
		] ) ;
	} ) ;

	it( "Global listeners [on]+[global] tags" ) ;
	it( "[emit] tag" ) ;
} ) ;



describe( "Wands/extensions" , () => {

	it( "[wand] and [zap] tags" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/wand.kfg' , { type: 'cast' , target: 'wand' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ "ZASH... ROOOOARRRR-CRASHHHHH!" ] ,
			[ "Zang'dar killed the gnoll..." ] ,
			[ "ssssshhhhh... SSSSSHHHHH..." ] ,
			[ "ROOOOARRRR-CRASHHHHH!" ] ,
			[ "Zang'dar killed the troll berserker, with a delay..." ] ,
			[ "ZASH... ROOOOARRRR-CRASHHHHH!" ] ,
			[ "Zang'dar killed the orc..." ]
		] ) ;
	} ) ;
} ) ;



describe( "Misc tags" , () => {
	it( "[pause] tag should pause the execution" , async () => {
		var messages = [] , time ;

		await runBook( __dirname + '/books/pause.kfg' , { type: 'cast' , target: 'pause' } ,
			ui => {
				ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) ) ;
				time = Date.now() ;
			}
		) ;

		expect( messages ).to.equal( [
			[ 'Before pause' ] ,
			[ 'After pause' ]
		] ) ;

		//log.error( "Time: %s" , Date.now() - time ) ;
		expect( Date.now() - time ).to.be.at.least( 500 ) ;
	} ) ;

	it( "[debug] tag" ) ;
} ) ;



describe( "Embedded Javascript code" , () => {

	it( "[js] tag" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/js.kfg' , { type: 'cast' , target: 'js' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ "Hello Zang'dar!" ] ,
			[ "Hello Oz!" ]
		] ) ;
	} ) ;

	it( "when [js] tags are disabled but present in the user script, it should be interrupted by an error" , async () => {
		var messages = [] ;

		try {
			await runBook( __dirname + '/books/js.kfg' , { type: 'cast' , target: 'js' , allowJsTag: false } ,
				ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
			) ;
			expect().fail( 'expected to throw' ) ;
		}
		catch ( error ) {
			expect( error ).to.be.partially.like( { message: "The [js] tag is disabled" } ) ;
		}

		expect( messages ).to.equal( [
			[ "Hello Zang'dar!" ]
		] ) ;
	} ) ;

	it( "Security tests" ) ;
} ) ;



describe( "Spellcast exe features" , () => {
	it( "summon a makefile (--summon-makefile option)" ) ;
	it( "watch mode (--undead option)" ) ;
	it( "force building even if up to date (--again option)" ) ;
} ) ;



describe( "Prevent from infinite loop in user-script, using the 'maxTicks' option" , () => {

	it( "[while] infinity" , async () => {
		var messages = [] ;

		try {
			await runBook( __dirname + '/books/infinite-loop-protection.kfg' , { type: 'cast' , target: 'test1' , maxTicks: 1000 } ,
				ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
			) ;
			expect().fail( 'expected to throw' ) ;
		}
		catch ( error ) {
			// It should produce a RangeError
			expect( error ).to.be.a( RangeError ) ;
			expect( error ).to.be.partially.like( { message: "Too much ticks without any user interaction" } ) ;
		}
	} ) ;
} ) ;



describe( "Spellcast operators" , () => {
	it( "operators" ) ;
} ) ;



describe( "Historical bugs" , () => {

	it( "should be able to load the same book twice" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/message.kfg' , { type: 'cast' , target: 'message' } ,
			ui => ui.bus.on( 'message' , ( ... args ) => messages.push( args ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Some text.' , {} ] ,
			[ 'Some other text.' , {} ] ,
			[ 'Welcome to The Shadow Terminal.' , {
				next: true ,
				slowTyping: true
			} ]
		] ) ;

		messages = [] ;

		await runBook( __dirname + '/books/message.kfg' , { type: 'cast' , target: 'message' } ,
			ui => ui.bus.on( 'message' , ( ... args ) => messages.push( args ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Some text.' , {} ] ,
			[ 'Some other text.' , {} ] ,
			[ 'Welcome to The Shadow Terminal.' , {
				next: true ,
				slowTyping: true
			} ]
		] ) ;
	} ) ;

	it( "array ops in-place operations using non in-place JS method should modify the original hosted array" , async () => {
		var messages = [] ;

		await runBook( __dirname + '/books/array-op-historical-bug.kfg' , { type: 'cast' , target: 'bug' } ,
			ui => ui.bus.on( 'message' , ( msg ) => messages.push( [ msg ] ) )
		) ;

		expect( messages ).to.equal( [
			[ 'Array: one two three four five six' ] ,
			[ 'Ref: one two three four five six' ]
		] ) ;
	} ) ;
} ) ;

