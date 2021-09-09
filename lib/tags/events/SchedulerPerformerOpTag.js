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



function SchedulerPerformerOpTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SchedulerPerformerOpTag ) ? this : Object.create( SchedulerPerformerOpTag.prototype ) ;

	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *(\$[^ ]+) *(?:=> *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the scheduler-performer-op syntax." ) ;
	}

	Object.defineProperties( self , {
		fn: { value: self[ tag ] , enumerable: true } ,
		schedulerRef: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		performerRef: { value: Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
		toRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = SchedulerPerformerOpTag ;
SchedulerPerformerOpTag.prototype = Object.create( Tag.prototype ) ;
SchedulerPerformerOpTag.prototype.constructor = SchedulerPerformerOpTag ;



SchedulerPerformerOpTag.prototype.run = function( book , ctx , callback ) {
	var scheduler = this.schedulerRef.get( ctx.data ) ,
		performer = this.performerRef.get( ctx.data ) ;

	if ( ! scheduler || typeof scheduler !== 'object' || scheduler.__prototypeUID__ !== 'spellcast/Scheduler' ) {
		log.error( "Not a scheduler..." ) ;
		return null ;
	}

	if ( ! performer || typeof performer !== 'object' ) {
		log.error( "scheduler-performer-op family tags' performer should be an object" ) ;
		return null ;
	}

	var content = this.extractContent( ctx.data ) ;

	return this.fn( ctx , scheduler , performer , content , callback ) ;
} ;



SchedulerPerformerOpTag.prototype['add-to-scheduler'] = function( ctx , scheduler , performer , readyTime ) {
	scheduler.addPerformer( performer , readyTime ) ;
	return null ;
} ;



SchedulerPerformerOpTag.prototype['remove-from-scheduler'] = function( ctx , scheduler , performer , content , callback ) {
	scheduler.removePerformer( performer , ctx ).then( () => callback() ) ;
} ;



SchedulerPerformerOpTag.prototype['get-performer-schedule'] = function( ctx , scheduler , performer ) {
	if ( ! this.toRef ) {
		log.error( "[get-performer-schedule] should store inside a Ref" ) ;
		return null ;
	}
	
	this.toRef.set( ctx.data , scheduler.getPerformerData( performer ) ) ;
	return null ;
} ;



SchedulerPerformerOpTag.prototype['set-performer-schedule'] = function( ctx , scheduler , performer , content ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[set-scheduler-performer]'s argument should be an object" ) ;
		return null ;
	}

	scheduler.setPerformerData( performer , content ) ;
	return null ;
} ;



SchedulerPerformerOpTag.prototype['schedule-action'] = function( ctx , scheduler , performer , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-action]'s argument should be an object" ) ;
		return null ;
	}

	scheduler.setPerformerAction( performer , content , ctx ).then( () => callback() ) ;
} ;



SchedulerPerformerOpTag.prototype['await-schedule'] =
SchedulerPerformerOpTag.prototype['schedule-await'] = function( ctx , scheduler , performer , readyTime , callback ) {
	scheduler.performerAwait( performer , readyTime , ctx ).then( () => callback() ) ;
} ;



SchedulerPerformerOpTag.prototype['break-schedule'] =
SchedulerPerformerOpTag.prototype['schedule-break'] = function( ctx , scheduler , performer , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-break]'s argument should be an object" ) ;
		return null ;
	}

	scheduler.performerBreak( performer , content['recovery-time'] , content['cooldown-time'] , ctx ).then( () => callback() ) ;
} ;



SchedulerPerformerOpTag.prototype['cancel-schedule'] =
SchedulerPerformerOpTag.prototype['schedule-cancel'] = function( ctx , scheduler , performer , content , callback ) {
	scheduler.performerCancel( performer , ctx ).then( () => callback() ) ;
} ;

