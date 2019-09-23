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
const Tag = kungFig.Tag ;
const Event = require( '../../Event.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ReportTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ReportTag ) ? this : Object.create( ReportTag.prototype ) ;
	
	var matches , isSuccess , priority , mode ;
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( self.attributes && ! ( matches = self.attributes.match( /^(?:<([a-zA-Z0-9.+-]+)> *)?([^ ]+)?$/ ) ) ) {
		throw new SyntaxError( "The '*-report' tag's attribute should validate the Report syntax." ) ;
	}
	
	isSuccess =
		tag === 'success-report' ? true :
		tag === 'failure-report' ? false :
		true ;
	
	priority = matches && matches[ 1 ] ;
	
	priority =
		! priority ? 0 :
		priority === 'low' ? -1 :
		priority === 'medium' ? 0 :
		priority === 'high' ? 1 :
		+ priority || 0 ;

	mode = matches && matches[ 2 ] ;
	
	switch ( mode ) {
		case 'add' :
		case 'reset' :
			break ;
		default :
			mode = 'add' ;
	}
	
	Object.defineProperties( self , {
		isSuccess: { value: isSuccess , enumerable: true } ,
		priority: { value: priority , enumerable: true } ,
		mode: { value: mode , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = ReportTag ;
ReportTag.prototype = Object.create( Tag.prototype ) ;
ReportTag.prototype.constructor = ReportTag ;



ReportTag.prototype.run = function( book , ctx ) {
	if ( ! ( ctx.data.event instanceof Event ) ) { return null ; }
	
	var reports = ctx.data.event[ this.isSuccess ? 'successReportTags' : 'failureReportTags' ] ;
	
	switch ( this.mode ) {
		case 'add' :
			reports.push( this ) ;
			break ;
		case 'reset' :
			reports.length = 0 ;
			reports[ 0 ] = this ;
			break ;
	}
	
	return null ;
} ;

