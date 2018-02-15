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



var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var VarTag = kungFig.VarTag ;

var Scheduler = require( '../../Scheduler.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



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



SchedulerOpTag.prototype.run = function run( book , ctx , callback ) {
	var scheduler = this.ref.get( ctx.data ) ;

	if ( ! scheduler || typeof scheduler !== 'object' || scheduler.__prototypeUID__ !== 'spellcast/Scheduler' ) {
		log.error( "Not a scheduler..." ) ;
		return null ;
	}

	var content = this.getRecursiveFinalContent( ctx.data ) ;

	return this.fn( ctx , scheduler , content , callback ) ;
} ;



SchedulerOpTag.prototype['add-to-scheduler'] = function( ctx , scheduler , content ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[add-to-scheduler]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.subject || typeof content.subject !== 'object' ) {
		log.error( "[add-to-scheduler]'s argument should be an object with a 'subject' property" ) ;
		return null ;
	}

	scheduler.addSubject( content.subject , content['readying-duration'] ) ;

	return null ;
} ;



SchedulerOpTag.prototype['remove-from-scheduler'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[remove-from-scheduler]'s argument should be an object" ) ;
		return null ;
	}

	return scheduler.removeSubject( content , ctx , callback ) ;
} ;



SchedulerOpTag.prototype['set-scheduler-subject'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[set-scheduler-subject]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.subject || typeof content.subject !== 'object' ) {
		log.error( "[set-scheduler-subject]'s argument should be an object with a 'subject' property" ) ;
		return null ;
	}

	scheduler.setSubject( content.subject , content ) ;

	return null ;
} ;



SchedulerOpTag.prototype['schedule-action'] = function( ctx , scheduler , content , callback ) {
	if ( ! content || typeof content !== 'object' ) {
		log.error( "[schedule-action]'s argument should be an object" ) ;
		return null ;
	}

	if ( ! content.subject || typeof content.subject !== 'object' ) {
		log.error( "[schedule-action]'s argument should be an object with a 'subject' property" ) ;
		return null ;
	}

	return scheduler.setSubjectAction( content.subject , content , ctx , callback ) ;
} ;



SchedulerOpTag.prototype['advance-scheduler'] = function( ctx , scheduler , content , callback ) {
	if ( content && ( typeof content !== 'number' || isNaN( content ) ) ) {
		log.error( "[advance-scheduler]'s argument (if present) should be a number" ) ;
		return null ;
	}

	return scheduler.advance( content , ctx , callback ) ;
} ;

