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



function SchedulerLookupTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SchedulerLookupTag ) ? this : Object.create( SchedulerLookupTag.prototype ) ;

	var matches ;

	Tag.call( self , 'scheduler-lookup' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *=> *(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The 'scheduler-lookup' tag's attribute should validate the scheduler-lookup syntax." ) ;
	}

	Object.defineProperties( self , {
		schedulerRef: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		toRef: { value: Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = SchedulerLookupTag ;
SchedulerLookupTag.prototype = Object.create( Tag.prototype ) ;
SchedulerLookupTag.prototype.constructor = SchedulerLookupTag ;



SchedulerLookupTag.prototype.run = function( book , ctx , callback ) {
	var scheduler = this.schedulerRef.get( ctx.data ) ;

	if ( ! scheduler || typeof scheduler !== 'object' || scheduler.__prototypeUID__ !== 'spellcast/Scheduler' ) {
		log.error( "Not a scheduler..." ) ;
		return null ;
	}

	var content = this.extractContent( ctx.data ) ,
		excludePerformer = content?.exclude || content?.['exclude-performer'] || null ,
		events = content?.events || null ;

	if ( ! Array.isArray( events ) && ! ( events instanceof Set ) ) { events = null ; }

	this.toRef.set( ctx.data , scheduler.lookup( events , excludePerformer ) ) ;
	return null ;
} ;

