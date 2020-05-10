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

"use strict" ;



const Ngev = require( 'nextgen-events' ) ;
const ClassicTag = require( 'kung-fig' ).ClassicTag ;

const Promise = require( 'seventh' ) ;
const tree = require( 'tree-kit' ) ;
const exec = require( 'child_process' ).exec ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;

const noop = function() {} ;



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
function ScrollTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof ScrollTag ) ? this : Object.create( ScrollTag.prototype ) ;

	if ( ! options ) { options = {} ; }
	options.keyValueSeparator = ':' ;

	ClassicTag.call( self , 'scroll' , attributes , content , shouldParse , options ) ;

	Object.defineProperties( self , {
		storePath: { value: ( self.attributes.store && self.attributes.store.slice( 1 ) ) || null , writable: true , enumerable: true } ,
		split: { value: !! self.attributes.split , writable: true , enumerable: true } ,
		passStdin: { value: !! self.attributes.stdin , writable: true , enumerable: true } ,
		parallel: { value: self.attributes.parallel , writable: true , enumerable: true } ,
		ignoreError: { value: !! self.attributes['ignore-error'] , writable: true , enumerable: true } ,
		chant: { value: !! self.attributes.chant , writable: true , enumerable: true } ,
		silence: { value: !! self.attributes.silence , writable: true , enumerable: true } ,
		amnesia: { value: !! self.attributes.amnesia , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ScrollTag ;
ScrollTag.prototype = Object.create( ClassicTag.prototype ) ;
ScrollTag.prototype.constructor = ScrollTag ;



ScrollTag.prototype.run = function( book , ctx , callback ) {
	var commands , concurrency , lastError ;

	commands = this.getRecursiveFinalContent( ctx.data ) ;

	if ( ! Array.isArray( commands ) ) { commands = [ commands ] ; }

	if ( ! this.parallel ) { concurrency = 1 ; }
	else if ( this.parallel === true ) { concurrency = Infinity ; }
	else { concurrency = parseInt( this.parallel , 10 ) ; }

	Promise.concurrent( concurrency , commands , command => new Promise( ( resolve , reject ) => {
		this.execShellCommand( book , ctx , command , ( error , output ) => {
			if ( error ) {
				if ( ! this.ignoreError ) {
					reject( error ) ;
					return ;
				}
				lastError = error ;
			}
			resolve( output ) ;
		} ) ;
	} ) ).then(
		outputMap => {
			if ( lastError ) {
				callback( lastError ) ;
				return ;
			}

			if ( this.storePath ) {
				if ( Array.isArray( this.content ) ) {
					tree.path.set( ctx.data , this.storePath , outputMap ) ;
				}
				else {
					tree.path.set( ctx.data , this.storePath , outputMap[ 0 ] ) ;
				}
			}

			callback() ;
		} ,
		error => { callback( error ) ; }
	) ;
} ;



// /!\ Should probably use child_process.spawn() instead of child_process.execFile(),
// because the latest is limited to 200KB of output.
ScrollTag.prototype.execShellCommand = function( book , ctx , shellCommand , callback ) {
	var child , onStdout , onStderr , onStdin , onceExit , onIgnoredError , output = '' , triggered = false ;

	//log.debug( 'Shell: %s' , shellCommand ) ;

	if ( this.chant ) { Ngev.groupEmit( ctx.roles , 'coreMessage' , '> ^+%s^:\n' , shellCommand ) ; }

	var triggerCallback = ( status , output_ ) => {
		var error ;

		if ( triggered ) { return ; }
		triggered = true ;

		if ( this.split ) {
			if ( typeof this.split !== 'string' ) { this.split = '\n' ; }
			output_ = output_.split( new RegExp( this.split ) ) ;
		}

		if ( status ) {
			error = new Error( "Non-zero exit code: '" + status + "', returned by command: '" + shellCommand + "'" ) ;
			error.type = 'nonZeroExit' ;
		}

		callback( error , output_  ) ;
	} ;

	child = exec( shellCommand , {
		cwd: book.cwd
	} ) ;

	child.on( 'error' , triggerCallback ) ;

	// ignore some errors
	onIgnoredError = noop ;

	onceExit = ( status ) => {
		//console.log( 'EXIT:' , status ) ;

		if ( this.passStdin ) {
			process.stdin.removeListener( 'data' , onStdin ) ;
		}

		// For some reason, 'exit' can be triggered before some 'data' event, so we have to delay removeListener() a bit
		setTimeout( () => {

			child.stdout.removeListener( 'data' , onStdout ) ;
			child.stderr.removeListener( 'data' , onStderr ) ;

			// If there is a 'store' arguments, we must trigger the callback in this timeout event,
			// if not we take the risk that we will miss some output and we don't want that
			if ( this.storePath ) { triggerCallback( status , output ) ; }

		} , 0 ) ;

		// If there isn't an 'store' arguments, then we can trigger the callback now
		if ( ! this.storePath ) { triggerCallback( status ) ; }
	} ;

	onStdout = chunk => {
		// Send the command's stdout to the process stdout and the output file
		if ( ! this.silence ) { Ngev.groupEmit( ctx.roles , 'extOutput' , chunk ) ; }
		if ( ! this.amnesia ) { ctx.outputFile.write( chunk ) ; }
		if ( this.storePath ) { output += chunk ; }
	} ;

	onStderr = chunk => {
		// Send the command's stderr to the process stderr and the output file
		if ( ! this.silence ) { Ngev.groupEmit( ctx.roles , 'extErrorOutput' , chunk ) ; }
		if ( ! this.amnesia ) { ctx.outputFile.write( chunk ) ; }
	} ;

	onStdin = chunk => {
		// Send the process stdin to the command's stdin
		child.stdin.write( chunk ) ;
	} ;

	// Prevent message sent to command that ignore them, then emit ECONNRESET when finished
	// WE MUST USE IT if process.stdin is redirected to child.stdin
	child.stdin.on( 'error' , onIgnoredError ) ;

	if ( this.passStdin ) {
		// Or use pipe? But that's risky, the child process may close stdin?
		process.stdin.on( 'data' , onStdin ) ;
	}

	child.stdout.on( 'data' , onStdout ) ;
	child.stderr.on( 'data' , onStderr ) ;

	child.once( 'exit' , onceExit ) ;
} ;

