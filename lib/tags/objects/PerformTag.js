/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const kungFig = require( 'kung-fig' ) ;
const LabelTag = kungFig.LabelTag ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function PerformTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof PerformTag ) ? this : Object.create( PerformTag.prototype ) ;

	LabelTag.call( self , 'action' , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		action: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = PerformTag ;
PerformTag.prototype = Object.create( LabelTag.prototype ) ;
PerformTag.prototype.constructor = PerformTag ;



/*
	commander: the entity asking/demanding/commanding the action
	performer: the entity performing the action
	target: something that is the target of the action
	using: something that is used for performing the action
*/
PerformTag.prototype.run = function( book , ctx , callback ) {
	var actionTag = book.actions[ this.action ] ;
	
	if ( ! actionTag ) {
		scriptLog.error( "Unknown action '%s'" , this.action ) ;
		return null ;
	}
	
	var performData = this.getRecursiveFinalContent( ctx.data ) ;
	
	// First, check if all requirements are met in the data
	for ( let k in actionTag.required ) {
		if ( ! performData[ k ] ) {
			scriptLog.error( "Performing '%s' requires a %s" , this.action , k ) ;
			callback() ;
			return ;
		}
	}
	
	return this.runPersuasion( book , actionTag , performData , ctx , callback ) ;
} ;



PerformTag.prototype.runPersuasion = function( book , actionTag , performData , ctx , callback ) {
	if ( ! performData.commander || ! performData.performer || performData.commander === performData.performer ) {
		return this.runCheck( book , actionTag , performData , ctx , callback ) ;
	}

	// So we need to do a persuasion test
	
	return this.runCheck( book , actionTag , performData , ctx , callback ) ;
} ;



PerformTag.prototype.runCheck = function( book , actionTag , performData , ctx , callback ) {
	var busEvents = [ [ ctx.events , 'action:' + this.action ] ] ;
	
	if ( performData.performer && performData.performer.events ) {
		busEvents.push( [ performData.performer.events , 'performer:' + this.action ] ) ;
	}
	
	if ( performData.using && performData.using.events ) {
		busEvents.push( [ performData.using.events , 'using:' + this.action ] ) ;
	}
	
	//log.hdebug( "performData.performer: %Y" , performData.performer ) ;
	//log.hdebug( "busEvents: %Y" , busEvents ) ;

	ctx.emitIntricatedEvents( busEvents , performData , ctx , ( cancelValue , $event ) => {
		if ( this.targetRef ) { this.targetRef.set( ctx.data , cancelValue ) ; }
		
		// For regular [emit], success is the default when not interrupted, failure is the default when interrupted
		if ( $event.success === null ) {
			$event.success = ! cancelValue ;
		}
		
		if ( $event.success ) {
			return this.runEffect( book , actionTag , performData , ctx , callback ) ;
		}

		callback() ;
	} ) ;
} ;



PerformTag.prototype.runCheck_ = function( book , actionTag , performData , ctx , callback ) {
	var eventName = 'action:' + this.action ;
	
	ctx.emitEvent( eventName , performData , ctx , ( cancelValue , $event ) => {
		if ( this.targetRef ) { this.targetRef.set( ctx.data , cancelValue ) ; }
		
		// For regular [emit], success is the default when not interrupted, failure is the default when interrupted
		if ( $event.success === null ) {
			$event.success = ! cancelValue ;
		}
		
		if ( $event.success ) {
			return this.runEffect( book , actionTag , performData , ctx , callback ) ;
		}

		callback() ;
	} ) ;
} ;



PerformTag.prototype.runEffect = function( book , actionTag , performData , ctx , callback ) {
	if ( ! actionTag.effectTag ) {
		callback() ;
		return ;
	}
	
	// FnTag#exec() is “maybe async”
	var returnVal = actionTag.effectTag.exec( book , performData , ctx , ( error ) => {

		if ( error ) {
			switch ( error.break ) {
				case 'return' :
					callback() ;
					return ;
				default :
					callback( error ) ;
					return ;
			}
		}

		callback() ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	// Truthy value: an error or an interruption had happened
	if ( returnVal ) {
		switch ( returnVal.break ) {
			case 'return' :
				return null ;
			default :
				return returnVal ;
		}
	}

	return null ;
} ;

