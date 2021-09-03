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
const VarTag = kungFig.VarTag ;

const Scheduler = require( '../../Scheduler.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SchedulerOpTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SchedulerOpTag ) ? this : Object.create( SchedulerOpTag.prototype ) ;

	VarTag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		fn: { value: self[ tag ] , enumerable: true } ,
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = SchedulerOpTag ;
SchedulerOpTag.prototype = Object.create( VarTag.prototype ) ;
SchedulerOpTag.prototype.constructor = SchedulerOpTag ;



SchedulerOpTag.prototype.run = function( book , ctx , callback ) {
	var scheduler = this.ref.get( ctx.data ) ;

	if ( ! scheduler || typeof scheduler !== 'object' || scheduler.__prototypeUID__ !== 'spellcast/Scheduler' ) {
		log.error( "Not a scheduler..." ) ;
		return null ;
	}

	var content = this.extractContent( ctx.data ) ;

	return this.fn( ctx , scheduler , content , callback ) ;
} ;



SchedulerOpTag.prototype['add-to-scheduler'] = function( ctx , scheduler , content ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[add-to-scheduler]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.performer || typeof content.performer !== 'object' ) {
		log.error( "[add-to-scheduler]'s argument should be an object with a 'performer' property" ) ;
		return null ;
	}

	scheduler.addPerformer( content.performer , content['ready-time'] ) ;

	return null ;
} ;



SchedulerOpTag.prototype['remove-from-scheduler'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[remove-from-scheduler]'s argument should be an object" ) ;
		return null ;
	}

	scheduler.removePerformer( content , ctx ).then( () => callback() ) ;
} ;



SchedulerOpTag.prototype['set-performer-schedule'] = function( ctx , scheduler , content ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[set-scheduler-performer]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.performer || typeof content.performer !== 'object' ) {
		log.error( "[set-scheduler-performer]'s argument should be an object with a 'performer' property" ) ;
		return null ;
	}

	scheduler.setPerformer( content.performer , content ) ;

	return null ;
} ;



SchedulerOpTag.prototype['schedule-action'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-action]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.performer || typeof content.performer !== 'object' ) {
		log.error( "[schedule-action]'s argument should be an object with a 'performer' property" ) ;
		return null ;
	}

	scheduler.setPerformerAction( content.performer , content , ctx ).then( () => callback() ) ;
} ;



SchedulerOpTag.prototype['await-schedule'] =
SchedulerOpTag.prototype['schedule-await'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-await]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.performer || typeof content.performer !== 'object' ) {
		log.error( "[schedule-await]'s argument should be an object with a 'performer' property" ) ;
		return null ;
	}

	var time = content['ready-time'] !== undefined ? content['ready-time'] : content.time ;
	scheduler.performerAwait( content.performer , time , ctx ).then( () => callback() ) ;
} ;



SchedulerOpTag.prototype['break-schedule'] =
SchedulerOpTag.prototype['schedule-break'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-break]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.performer || typeof content.performer !== 'object' ) {
		log.error( "[schedule-break]'s argument should be an object with a 'performer' property" ) ;
		return null ;
	}

	scheduler.performerBreak( content.performer , content['recovery-time'] , content['cooldown-time'] , ctx ).then( () => callback() ) ;
} ;



SchedulerOpTag.prototype['cancel-schedule'] =
SchedulerOpTag.prototype['schedule-cancel'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-cancel]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.performer || typeof content.performer !== 'object' ) {
		log.error( "[schedule-cancel]'s argument should be an object with a 'performer' property" ) ;
		return null ;
	}

	scheduler.performerCancel( content.performer , ctx ).then( () => callback() ) ;
} ;



SchedulerOpTag.prototype['advance-scheduler'] = function( ctx , scheduler , content , callback ) {
	if ( content && ( typeof content !== 'number' || isNaN( content ) ) ) {
		log.error( "[advance-scheduler]'s argument (if present) should be a number" ) ;
		return null ;
	}

	scheduler.advance( content , ctx ).then( () => callback() ) ;
} ;

