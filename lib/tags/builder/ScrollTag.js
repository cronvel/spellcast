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



var ClassicTag = require( 'kung-fig' ).ClassicTag ;

var async = require( 'async-kit' ) ;
var exec = require( 'child_process' ).exec ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ScrollTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof ScrollTag ) ? this : Object.create( ScrollTag.prototype ) ;
	ClassicTag.call( self , 'scroll' , attributes , content , proxy , shouldParse , ':' ) ;
	
	if ( ! Array.isArray( self.content ) ) { self.content = [ self.content ] ; }
	
	return self ;
}

module.exports = ScrollTag ;
ScrollTag.prototype = Object.create( ClassicTag.prototype ) ;
ScrollTag.prototype.constructor = ScrollTag ;
ScrollTag.proxyMode = 'parent' ;



ScrollTag.prototype.run = function run( book , execContext , callback )
{
	var plan , self = this ;
	
	//console.log( "scroll proxy:" , this.proxy ) ;
	//console.log( "\n\n>>>\nscroll proxy data:" , this.proxy.data ) ;
	
	plan = async
		.map( self.content , self.execShellCommand.bind( self , book , execContext ) )
		.nice( 0 ) ;
	
	//console.log( scroll ) ;
	
	if ( ! self.attributes.parallel ) { plan.parallel( false ) ; }
	else if ( self.attributes.parallel === true ) { plan.parallel() ; }
	else { plan.parallel( parseInt( self.attributes.parallel ) ) ; }
	
	if ( ! self.attributes.ignore ) { plan.fatal( true ) ; }
	
	// Remove bad write-formula argument
	//if ( self.attributes['write-formula'] && typeof self.attributes['write-formula'] !== 'string' ) { delete self.attributes['write-formula'] ; }
	
	// Let's exec the plan and process the final outcome!
	
	plan.exec( function( error , outputMap ) {
		
		var splitter , splitted , formula , index , thirdParty ;
		
		if ( error ) { callback( error ) ; return ; }
		
		if ( self.attributes['write-formula'] )
		{
			formula = self.attributes['write-formula'] ;
			splitter = self.attributes.splitter || '\n' ;
			splitted = outputMap.join( '' ).trim().split( splitter ) ;
			
			if ( self.attributes['only-index'] )
			{
				if ( ! self.formulas[ formula ] )
				{
					self.formulas[ formula ] = [] ;
					Object.defineProperty( self.formulas[ formula ] , 'index' , { value: 0 , writable: true } ) ;
				}
				
				if ( typeof self.attributes['only-index'] === 'string' )
				{
					if ( self.attributes['only-index'].match( /^[0-9]+$/ ) )
					{
						// This is a fixed numeric index
						index = parseInt( self.attributes['only-index'] ) ;
					}
					else
					{
						// Get the numeric index of a third party formula
						thirdParty = self.formulas[ self.attributes['only-index'] ] ;
						if ( thirdParty === undefined ) { index = 0 ; }
						else { index = thirdParty.index ; }
					}
				}
				else
				{
					index = self.formulas[ formula ].index ;
				}
				
				self.formulas[ formula ][ index ] = splitted[ 0 ] ;
			}
			else
			{
				self.formulas[ formula ] = splitted ;
				Object.defineProperty( self.formulas[ formula ] , 'index' , { value: 0 , writable: true } ) ;
			}
			
			/*
			console.log( "outputMap:" , outputMap[0] ) ;
			console.log( "full output:" , output ) ;
			*/
		}
		
		callback() ;
	} ) ;
	//plan.exec( function() { console.log( 'castScroll: Done!' ) ; callback() ; } ) ;
} ;



ScrollTag.prototype.execShellCommand = function execShellCommand( book , execContext , shellCommand , callback )
{
	var self = this , child , onStdout , onStderr , onStdin , onceExit , onIgnoredError , output = '' ;
	
	log.verbose( 'Shell: %s' , shellCommand ) ;
	
	child = exec( shellCommand ) ;
	
	child.on( 'error' , callback ) ;
	
	// ignore some errors
	onIgnoredError = function() {} ;
	
	onceExit = function( status ) {
		//console.log( 'EXIT:' , status ) ;
		
		if ( self.attributes.passStdin )
		{
			process.stdin.removeListener( 'data' , onStdin ) ;
		}
		
		// For some reason, 'exit' can be triggered before some 'data' event, so we have to delay removeListener() a bit
		setTimeout( function() {
			
			child.stdout.removeListener( 'data' , onStdout ) ;
			child.stderr.removeListener( 'data' , onStderr ) ;
			
			// If there is an 'write-formula' arguments, we must trigger the callback in this timeout event,
			// if not we take the risk that we will miss some output and we don't want that
			if ( self.attributes['write-formula'] ) { callback( status , output ) ; }
			
		} , 0 ) ;
		
		// If there isn't an 'write-formula' arguments, then we can trigger the callback now
		if ( ! self.attributes['write-formula'] ) { callback( status ) ; }
	} ;
	
	onStdout = function( chunk ) {
		// Send the command's stdout to the process stdout and the output file
		if ( ! self.attributes.silence ) { book.emit( 'extOutput' , chunk ) ; }
		if ( ! self.attributes.amnesia ) { execContext.outputFile.write( chunk ) ; }
		if ( self.attributes['write-formula'] ) { output += chunk ; }
	} ;
	
	onStderr = function( chunk ) {
		// Send the command's stderr to the process stderr and the output file
		if ( ! self.attributes.silence ) { book.emit( 'extErrorOutput' , chunk ) ; }
		if ( ! self.attributes.amnesia ) { execContext.outputFile.write( chunk ) ; }
	} ;
	
	onStdin = function( chunk ) {
		// Send the process stdin to the command's stdin
		child.stdin.write( chunk ) ;
	} ;
	
	// Prevent message sent to command that ignore them, then emit ECONNRESET when finished
	// WE MUST USE IT if process.stdin is redirected to child.stdin
	child.stdin.on( 'error' , onIgnoredError ) ;
	
	if ( self.attributes.passStdin )
	{
		// Or use pipe? But that's risky, the child process may close stdin?
		process.stdin.on( 'data' , onStdin ) ;
	}
	
	child.stdout.on( 'data' , onStdout ) ;
	child.stderr.on( 'data' , onStderr ) ;
	
	child.once( 'exit' , onceExit ) ;
} ;


