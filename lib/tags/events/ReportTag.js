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
const FnTag = require( '../flow/FnTag.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ReportTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ReportTag ) ? this : Object.create( ReportTag.prototype ) ;
	
	var matches , type , priority , mode , isDefault ;
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( self.attributes && ! ( matches = self.attributes.match( /^(?:<([a-zA-Z0-9.+-]+)> *)?([^ ]+)?$/ ) ) ) {
		throw new SyntaxError( "The '*-report' tag's attribute should validate the Report syntax." ) ;
	}
	
	switch ( tag ) {
		case 'precondition-success-report' :
			type = 'preconditionSuccessReport' ;
			break ;
		case 'precondition-failure-report' :
			type = 'preconditionFailureReport' ;
			break ;
		case 'persuasion-success-report' :
			type = 'persuasionSuccessReport' ;
			break ;
		case 'persuasion-failure-report' :
			type = 'persuasionFailureReport' ;
			break ;
		case 'success-report' :
			type = 'successReport' ;
			break ;
		case 'failure-report' :
			type = 'failureReport' ;
			break ;
		default :
			type = 'successReport' ;
	}
	
	isDefault = false ;
	priority = matches && matches[ 1 ] ;
	mode = matches && matches[ 2 ] ;
	
	switch ( mode ) {
		case 'add' :
		case 'reset' :
		case 'prevent-default' :
			break ;
		case 'reset-default' :
			isDefault = true ;
			break ;
		default :
			mode = 'add' ;
	}
	
	Object.defineProperties( self , {
		type: { value: type , enumerable: true } ,
		isDefault: { value: isDefault , writable: true , enumerable: true } ,
		priority: { value: priority , writable: true , enumerable: true } ,
		mode: { value: mode , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = ReportTag ;
ReportTag.prototype = Object.create( Tag.prototype ) ;
ReportTag.prototype.constructor = ReportTag ;



ReportTag.prototype.init = function( book ) {
	var tag = this.getParentTag() ;
	
	var p = this.priority ;
	
	if ( tag.name === 'action' ) {
		this.isDefault = true ;
		this.priority = book.elementPriority( this.priority , 'action:' + tag.id , true ) ;
		log.hdebug( "[%s] default priority for %s (%s,%s): %s" , this.name , 'action:' + tag.id , p , true , this.priority ) ;
	}
	else {
		let onTag = this.findAncestor( 'check' ) || this.findAncestor( 'on' ) ;
		
		if ( ! onTag ) {
			throw new SyntaxError( "The [*-report] tag must be inside of an [action], [check] or [on] tag" ) ;
		}
		
		this.priority = book.elementPriority( this.priority , onTag.event , onTag.isCheck ) ;
		log.hdebug( "[%s] priority for %s (%s,%s): %s" , this.name , onTag.event , p , onTag.isCheck , this.priority ) ;
	}
	
	return null ;
} ;



ReportTag.prototype.run = function( book , ctx ) {
	if ( ! ( ctx.data.event instanceof Event ) ) { return null ; }
	
	var key = this.type + 'Tags' ;
	if ( ! ctx.data.event[ key ] ) { ctx.data.event[ key ] = [] ; }
	
	var reports = ctx.data.event[ key ] ;
	
	switch ( this.mode ) {
		case 'add' :
			reports.push( this ) ;
			break ;
		case 'reset' :
			reports.length = 0 ;
			reports[ 0 ] = this ;
			break ;
		case 'prevent-default' :
			reports = ctx.data.event[ key ] = reports.filter( e => ! e.isDefault ) ;
			reports.push( this ) ;
			break ;
		case 'reset-default' :
			reports = ctx.data.event[ key ] = reports.filter( e => ! e.isDefault ) ;
			reports.unshift( this ) ;
			break ;
	}
	
	return null ;
} ;



ReportTag.prototype.exec = FnTag.prototype.exec ;

