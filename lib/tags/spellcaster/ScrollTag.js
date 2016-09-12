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

"use strict" ;



var Ngev = require( 'nextgen-events' ) ;
var ClassicTag = require( 'kung-fig' ).ClassicTag ;

var async = require( 'async-kit' ) ;
var tree = require( 'tree-kit' ) ;
var exec = require( 'child_process' ).exec ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	Attributes:
		* store <variable>: a variable where to store the output of commands
		* split [<string>]: split output, if true: line by line
		* stdin: the command receive stdin
		* parallel [<count>]: commands run in parallel mode
		* ignore-error: ignore errors (non-zero exit code), continue run the next command anyway
		* chant: chant the spell (display the command line)
		* silence: do not output (do not emit 'extOutput' and 'extOutputError' events)
		* amnesia: do save output to a file
*/
function ScrollTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof ScrollTag ) ? this : Object.create( ScrollTag.prototype ) ;
	ClassicTag.call( self , 'scroll' , attributes , content , shouldParse , ':' ) ;
	
	Object.defineProperties( self , {
		storePath: { value: ( self.attributes.store && self.attributes.store.slice( 1 ) ) || null , writable: true , enumerable: true } ,
		split: { value: !! self.attributes.split , writable: true , enumerable: true } ,
		passStdin: { value: !! self.attributes.stdin , writable: true , enumerable: true } ,
		parallel: { value: self.attributes.parallel , writable: true , enumerable: true } ,
		ignoreError: { value: !! self.attributes['ignore-error'] , writable: true , enumerable: true } ,
		chant: { value: !! self.attributes.chant , writable: true , enumerable: true } ,
		silence: { value: !! self.attributes.silence , writable: true , enumerable: true } ,
		amnesia: { value: !! self.attributes.amnesia , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = ScrollTag ;
ScrollTag.prototype = Object.create( ClassicTag.prototype ) ;
ScrollTag.prototype.constructor = ScrollTag ;
//ScrollTag.proxyMode = 'parent' ;



ScrollTag.prototype.run = function run( book , ctx , callback )
{
	var self = this , plan , commands ;
	
	commands = this.getRecursiveFinalContent( ctx.data ) ;
	
	if ( ! Array.isArray( commands ) ) { commands = [ commands ] ; }
	
	plan = async
		.map( commands , self.execShellCommand.bind( self , book , ctx ) )
		.nice( 0 ) ;
	
	//console.log( scroll ) ;
	
	if ( ! self.parallel ) { plan.parallel( false ) ; }
	else if ( self.parallel === true ) { plan.parallel() ; }
	else { plan.parallel( parseInt( self.parallel , 10 ) ) ; }
	
	if ( ! self.ignoreError ) { plan.fatal( true ) ; }
	
	
	// Let's exec the plan and process the final outcome!
	
	plan.exec( function( error , outputMap ) {
		
		var splitter , splitted , formula , index , thirdParty ;
		
		if ( error ) { callback( error ) ; return ; }
		
		if ( self.storePath )
		{
			if ( Array.isArray( self.content ) )
			{
				tree.path.set( ctx.data , self.storePath , outputMap ) ;
			}
			else
			{
				tree.path.set( ctx.data , self.storePath , outputMap[ 0 ] ) ;
			}
		}
		
		callback() ;
	} ) ;
	//plan.exec( function() { console.log( 'castScroll: Done!' ) ; callback() ; } ) ;
} ;



ScrollTag.prototype.execShellCommand = function execShellCommand( book , ctx , shellCommand , callback )
{
	var self = this , child , onStdout , onStderr , onStdin , onceExit , onIgnoredError , output = '' , triggered = false ;
	
	//log.debug( 'Shell: %s' , shellCommand ) ;
	
	if ( self.chant ) { Ngev.groupEmit( ctx.roles , 'coreMessage' , '> ^+%s^:\n' , shellCommand ) ; }
	
	var triggerCallback = function triggerCallback( status , output ) {
		if ( triggered ) { return ; }
		triggered = true ;
		
		if ( self.split )
		{
			if ( typeof self.split !== 'string' ) { self.split = '\n' ; }
			output = output.split( new RegExp( self.split ) ) ;
		}
		
		callback(  status ? new Error( 'Non-zero command exit code: ' + status ) : null  ,  output  ) ;
	} ;
	
	child = exec( shellCommand , {
		cwd: book.cwd
	} ) ;
	
	child.on( 'error' , triggerCallback ) ;
	
	// ignore some errors
	onIgnoredError = function() {} ;
	
	onceExit = function( status ) {
		//console.log( 'EXIT:' , status ) ;
		
		if ( self.passStdin )
		{
			process.stdin.removeListener( 'data' , onStdin ) ;
		}
		
		// For some reason, 'exit' can be triggered before some 'data' event, so we have to delay removeListener() a bit
		setTimeout( function() {
			
			child.stdout.removeListener( 'data' , onStdout ) ;
			child.stderr.removeListener( 'data' , onStderr ) ;
			
			// If there is a 'store' arguments, we must trigger the callback in this timeout event,
			// if not we take the risk that we will miss some output and we don't want that
			if ( self.storePath ) { triggerCallback( status , output ) ; }
			
		} , 0 ) ;
		
		// If there isn't an 'store' arguments, then we can trigger the callback now
		if ( ! self.storePath ) { triggerCallback( status ) ; }
	} ;
	
	onStdout = function( chunk ) {
		// Send the command's stdout to the process stdout and the output file
		if ( ! self.silence ) { Ngev.groupEmit( ctx.roles , 'extOutput' , chunk ) ; }
		if ( ! self.amnesia ) { ctx.outputFile.write( chunk ) ; }
		if ( self.storePath ) { output += chunk ; }
	} ;
	
	onStderr = function( chunk ) {
		// Send the command's stderr to the process stderr and the output file
		if ( ! self.silence ) { Ngev.groupEmit( ctx.roles , 'extErrorOutput' , chunk ) ; }
		if ( ! self.amnesia ) { ctx.outputFile.write( chunk ) ; }
	} ;
	
	onStdin = function( chunk ) {
		// Send the process stdin to the command's stdin
		child.stdin.write( chunk ) ;
	} ;
	
	// Prevent message sent to command that ignore them, then emit ECONNRESET when finished
	// WE MUST USE IT if process.stdin is redirected to child.stdin
	child.stdin.on( 'error' , onIgnoredError ) ;
	
	if ( self.passStdin )
	{
		// Or use pipe? But that's risky, the child process may close stdin?
		process.stdin.on( 'data' , onStdin ) ;
	}
	
	child.stdout.on( 'data' , onStdout ) ;
	child.stderr.on( 'data' , onStderr ) ;
	
	child.once( 'exit' , onceExit ) ;
} ;


