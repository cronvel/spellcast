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



const kungFig = require( 'kung-fig' ) ;
const Tag = kungFig.Tag ;
const TemplateAtom = kungFig.TemplateAtom ;
const Event = require( '../../Event.js' ) ;

const string = require( 'string-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function PerformTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof PerformTag ) ? this : Object.create( PerformTag.prototype ) ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		staticAction: { value: self.attributes , enumerable: true } ,
		isCommand: { value: tag === 'perform-command' , enumerable: true }
	} ) ;

	return self ;
}

module.exports = PerformTag ;
PerformTag.prototype = Object.create( Tag.prototype ) ;
PerformTag.prototype.constructor = PerformTag ;



const STD_ENT = [ 'commander' , 'performer' , 'target' , 'object' , 'using' , 'place' ] ;
const CHECK_ENT = [ 'performer' , 'target' , 'object' , 'using' , 'place' ] ;



/*
	commander: the entity asking/demanding/commanding the action
	performer: the entity performing the action
	target: something that is the target of the action
	object: something that is the object of the action, e.g. "the necklace" in the action "give the necklace to Sofia"
	using: something that is used for performing the action
*/
PerformTag.prototype.run = function( book , ctx , callback ) {
	var performData = this.getRecursiveFinalContent( ctx.data ) ;

	if ( ! performData || typeof performData !== 'object' ) {
		scriptLog.error( "The [perform] tag requires an object as its content" ) ;
		return null ;
	}

	if ( this.staticAction ) {
		performData.action = this.staticAction ;
	}
	else if ( ! performData.action ) {
		scriptLog.error( "The [perform] tag requires an action label or an object with an 'action' property as its content" ) ;
		return null ;
	}

	var actionTag = book.actions[ performData.action ] ;

	if ( ! actionTag ) {
		scriptLog.error( "Unknown action '%s'" , performData.action ) ;
		return null ;
	}

	// First, replace string by actual object (when performData is created by an interpreter)
	if ( this.isCommand && ctx.data.place && typeof ctx.data.place === 'object' ) {
		let notFound = PerformTag.objectMatch( performData , ctx.data.place , ctx ) ;

		if ( notFound ) {
			return ctx.emitEvent( 'command:id-not-found' , notFound , ctx , callback ) ;
		}
	}

	// Then, check if all requirements are met in the data
	for ( let k in actionTag.required ) {
		if ( ! performData[ k ] ) {
			scriptLog.error( "Performing '%s' requires a %s" , performData.action , k ) ;
			return null ;
		}
	}

	//log.fatal( "Perform data: %Y" , performData ) ;

	// Create an event object that will be carried over all the [perform] process
	var $event = new Event() ;
	$event.preconditionSuccessReportTags = [ ... actionTag.preconditionSuccessReportTags ] ;
	$event.preconditionFailureReportTags = [ ... actionTag.preconditionFailureReportTags ] ;
	$event.persuasionSuccessReportTags = [ ... actionTag.persuasionSuccessReportTags ] ;
	$event.persuasionFailureReportTags = [ ... actionTag.persuasionFailureReportTags ] ;
	$event.successReportTags = [ ... actionTag.successReportTags ] ;
	$event.failureReportTags = [ ... actionTag.failureReportTags ] ;

	this.runPrecondition( book , actionTag , performData , $event , ctx , callback ) ;
} ;



PerformTag.prototype.runPrecondition = function( book , actionTag , performData , $event , ctx , callback ) {
	$event.resetSuccess() ;

	var busEvents = [
		[ ctx.events , 'precondition:*' ] ,
		[ ctx.events , 'precondition:' + performData.action ]
	] ;

	CHECK_ENT.forEach( type => {
		if ( performData[ type ] && performData[ type ].events ) {
			busEvents.push( [ performData[ type ].events , 'precondition:*:' + type ] ) ;
			busEvents.push( [ performData[ type ].events , 'precondition:' + performData.action + ':' + type ] ) ;
		}
	} ) ;

	//log.hdebug( "performData.performer: %Y" , performData.performer ) ;
	//log.hdebug( "busEvents: %Y" , busEvents ) ;

	ctx.emitIntricatedEvents( busEvents , performData , $event , ctx , ( cancelValue /*, $event*/ ) => {
		if ( this.targetRef ) { this.targetRef.set( ctx.data , cancelValue ) ; }

		// For regular precondition check, success is the default when not interrupted, failure is the default when interrupted
		if ( $event.success === null ) { $event.success = ! cancelValue ; }

		if ( $event.success ) {
			return this.runReport( 'preconditionSuccess' , book , actionTag , performData , $event , ctx , () => {
				return this.runPersuasion( book , actionTag , performData , $event , ctx , callback ) ;
			} ) ;
		}

		return this.runReport( 'preconditionFailure' , book , actionTag , performData , $event , ctx , callback ) ;
	} ) ;
} ;



PerformTag.prototype.runPersuasion = function( book , actionTag , performData , $event , ctx , callback ) {
	$event.resetSuccess() ;

	if ( ! performData.commander || ! performData.performer || performData.commander === performData.performer ) {
		return this.runCheck( book , actionTag , performData , $event , ctx , callback ) ;
	}

	// So we need to do a persuasion test

	var busEvents = [
		[ ctx.events , 'persuasion:*' ] ,
		[ ctx.events , 'persuasion:' + performData.action ]
	] ;

	if ( performData.commander && performData.commander.events ) {
		busEvents.push( [ performData.commander.events , 'persuasion:*:commander' ] ) ;
		busEvents.push( [ performData.commander.events , 'persuasion:' + performData.action + ':commander' ] ) ;
	}

	if ( performData.performer && performData.performer.events ) {
		busEvents.push( [ performData.performer.events , 'persuasion:*:performer' ] ) ;
		busEvents.push( [ performData.performer.events , 'persuasion:' + performData.action + ':performer' ] ) ;
	}

	//log.hdebug( "performData.performer: %Y" , performData.performer ) ;
	//log.hdebug( "busEvents: %Y" , busEvents ) ;

	ctx.emitIntricatedEvents( busEvents , performData , $event , ctx , ( cancelValue /*, $event*/ ) => {
		if ( this.targetRef ) { this.targetRef.set( ctx.data , cancelValue ) ; }

		// For persuasion check, failure is the default
		if ( $event.success === null ) { $event.success = false ; }

		if ( $event.success ) {
			return this.runReport( 'persuasionSuccess' , book , actionTag , performData , $event , ctx , () => {
				return this.runCheck( book , actionTag , performData , $event , ctx , callback ) ;
			} ) ;
		}

		return this.runReport( 'persuasionFailure' , book , actionTag , performData , $event , ctx , callback ) ;
	} ) ;
} ;



PerformTag.prototype.runCheck = function( book , actionTag , performData , $event , ctx , callback ) {
	$event.resetSuccess() ;

	var busEvents = [
		[ ctx.events , 'action:*' ] ,
		[ ctx.events , 'action:' + performData.action ]
	] ;

	CHECK_ENT.forEach( type => {
		if ( performData[ type ] && performData[ type ].events ) {
			busEvents.push( [ performData[ type ].events , 'action:*:' + type ] ) ;
			busEvents.push( [ performData[ type ].events , 'action:' + performData.action + ':' + type ] ) ;
		}
	} ) ;

	//log.hdebug( "performData.performer: %Y" , performData.performer ) ;
	//log.hdebug( "busEvents: %Y" , busEvents ) ;

	ctx.emitIntricatedEvents( busEvents , performData , $event , ctx , ( cancelValue /*, $event*/ ) => {
		if ( this.targetRef ) { this.targetRef.set( ctx.data , cancelValue ) ; }

		// For regular check, success is the default when not interrupted, failure is the default when interrupted
		if ( $event.success === null ) { $event.success = ! cancelValue ; }

		if ( $event.success ) {
			return this.runEffect( book , actionTag , performData , $event , ctx , callback ) ;
		}

		return this.runReport( 'failure' , book , actionTag , performData , $event , ctx , callback ) ;
	} ) ;
} ;



PerformTag.prototype.runEffect = function( book , actionTag , performData , $event , ctx , callback ) {
	if ( ! actionTag.effectTag ) {
		return this.runReport( 'success' , book , actionTag , performData , $event , ctx , callback ) ;
	}

	// FnTag#exec() is “maybe async”
	actionTag.effectTag.execCb( book , performData , ctx , ( error ) => {
		if ( error ) {
			switch ( error.break ) {
				case 'return' :
					return this.runReport( 'success' , book , actionTag , performData , $event , ctx , callback ) ;
				default :
					callback( error ) ;
					return ;
			}
		}

		return this.runReport( 'success' , book , actionTag , performData , $event , ctx , callback ) ;
	} ) ;
} ;



PerformTag.prototype.runReport = function( type , book , actionTag , performData , $event , ctx , callback ) {
	var key = type + 'ReportTags' ;
	var reportTags = $event[ key ] ;
	reportTags.sort( ( a , b ) => b.priority - a.priority ) ;
	//log.hdebug( "runReport() reportTags %Y" , reportTags ) ;


	// Similar to the Call tag
	var fn = ( tag , cb ) => {
		//log.hdebug( "tag: %Y" , tag ) ;
		var returnVal_ = tag.exec( book , performData , ctx , ( error ) => {
			if ( error ) {
				switch ( error.break ) {
					case 'return' :
						cb() ;
						return ;
					default :
						cb( error ) ;
						return ;
				}
			}

			cb() ;
		} ) ;

		// When the return value is undefined, it means this is an async tag execution
		if ( returnVal_ === undefined ) { return ; }

		// Sync variant...

		if ( returnVal_ ) {
			switch ( returnVal_.break ) {
				case 'return' :
					return null ;
				default :
					return returnVal_ ;
			}
		}

		return null ;
	} ;


	var returnVal = book.engine.iteratorSeries( fn , reportTags , ( error ) => {
		if ( error ) { callback( error ) ; return ; }
		callback() ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	if ( returnVal ) { callback( returnVal ) ; return ; }

	callback() ;
} ;



// Replace all string in performData by the real object, searching into idHolder (e.g. the current place)
PerformTag.objectMatch = function( performData , idHolder , ctx ) {
	var key , indexOf , object , stack , nameStack ;

	for ( key of STD_ENT ) {
		if ( performData[ key ] && typeof performData[ key ] === 'string' ) {
			if ( ! stack ) {
				stack = idHolder.getAllSubObjects() ;
				nameStack = stack.map( o => {
					if ( o.name instanceof TemplateAtom ) {
						//log.debug( "Template Atom!!! %I\n%s" , o.name , o.name.toStringKFG( ctx ) ) ;
						return o.name.toStringKFG( ctx ) ;
					}

					return o.name ;
				} ) ;
			}

			indexOf = string.fuzzy.bestTokenMatch( performData[ key ] , nameStack , { scoreLimit: 0.7 , indexOf: true } ) ;
			if ( indexOf === -1 ) { return { key , id: performData[ key ] } ; }
			object = stack[ indexOf ] ;

			//log.hdebug( "%s is matching: %Y" , performData[ key ] , object ) ;
			performData[ key ] = object ;
		}
	}

	return ;
} ;

