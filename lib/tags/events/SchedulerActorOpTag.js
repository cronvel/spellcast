/*
	Spellcast

	Copyright (c) 2014 - 2021 Cédric Ronvel

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
const Ref = kungFig.Ref ;

const Scheduler = require( '../../Scheduler.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SchedulerActorOpTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SchedulerActorOpTag ) ? this : Object.create( SchedulerActorOpTag.prototype ) ;

	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *(\$[^ ]+) *(?:=> *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the scheduler-actor-op syntax." ) ;
	}

	Object.defineProperties( self , {
		fn: { value: self[ tag ] , enumerable: true } ,
		schedulerRef: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		actorRef: { value: Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
		toRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = SchedulerActorOpTag ;
SchedulerActorOpTag.prototype = Object.create( Tag.prototype ) ;
SchedulerActorOpTag.prototype.constructor = SchedulerActorOpTag ;



SchedulerActorOpTag.prototype.run = function( book , ctx , callback ) {
	var scheduler = this.schedulerRef.get( ctx.data ) ,
		actor = this.actorRef.get( ctx.data ) ;

	if ( ! scheduler || typeof scheduler !== 'object' || scheduler.__prototypeUID__ !== 'spellcast/Scheduler' ) {
		log.error( "Not a scheduler provided to [%s]..." , this.name ) ;
		return null ;
	}

	if ( ! actor || typeof actor !== 'object' ) {
		log.error( "scheduler-actor-op family tags' actor should be an object" ) ;
		return null ;
	}

	var content = this.extractContent( ctx.data ) ;

	return this.fn( ctx , scheduler , actor , content , callback ) ;
} ;



SchedulerActorOpTag.prototype['add-to-scheduler'] = function( ctx , scheduler , actor , readyTime ) {
	scheduler.addActor( actor , readyTime ) ;
	return null ;
} ;



SchedulerActorOpTag.prototype['remove-from-scheduler'] = function( ctx , scheduler , actor , content , callback ) {
	scheduler.removeActor( actor , ctx ).then( () => callback() ) ;
} ;



SchedulerActorOpTag.prototype['get-actor-schedule'] = function( ctx , scheduler , actor ) {
	if ( ! this.toRef ) {
		log.error( "[get-actor-schedule] should store inside a Ref" ) ;
		return null ;
	}
	
	this.toRef.set( ctx.data , scheduler.getActorData( actor ) ) ;
	return null ;
} ;



SchedulerActorOpTag.prototype['set-actor-schedule'] = function( ctx , scheduler , actor , content ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[set-scheduler-actor]'s argument should be an object" ) ;
		return null ;
	}

	scheduler.setActorData( actor , content ) ;
	return null ;
} ;



SchedulerActorOpTag.prototype['schedule-action'] = function( ctx , scheduler , actor , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-action]'s argument should be an object" ) ;
		return null ;
	}

	scheduler.setActorAction( actor , content , ctx ).then( () => callback() ) ;
} ;



SchedulerActorOpTag.prototype['await-schedule'] =
SchedulerActorOpTag.prototype['schedule-await'] = function( ctx , scheduler , actor , readyTime , callback ) {
	scheduler.actorAwait( actor , readyTime , ctx ).then( () => callback() ) ;
} ;



SchedulerActorOpTag.prototype['break-schedule'] =
SchedulerActorOpTag.prototype['schedule-break'] = function( ctx , scheduler , actor , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-break]'s argument should be an object" ) ;
		return null ;
	}

	scheduler.actorBreak( actor , content['recovery-time'] , content['cooldown-time'] , ctx ).then( () => callback() ) ;
} ;



SchedulerActorOpTag.prototype['cancel-schedule'] =
SchedulerActorOpTag.prototype['schedule-cancel'] = function( ctx , scheduler , actor , content , callback ) {
	scheduler.actorCancel( actor , ctx ).then( () => callback() ) ;
} ;

