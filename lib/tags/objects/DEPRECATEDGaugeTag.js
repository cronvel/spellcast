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



/*
	DEPRECATED: use [*] tag instead.
	Create foreign API for those objects.
	
	✅ Pool
	❌ HistoryGauge
	❌ HistoryAlignometer
*/



const kungFig = require( 'kung-fig' ) ;
//const VarTag = kungFig.VarTag ;
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;
const Pool = kungFig.statsModifiers.Pool ;
const HistoryGauge = kungFig.statsModifiers.HistoryGauge ;
const HistoryAlignometer = kungFig.statsModifiers.HistoryAlignometer ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function GaugeTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof GaugeTag ) ? this : Object.create( GaugeTag.prototype ) ;

	var matches ;
	
	//VarTag.call( self , tag , attributes , content , shouldParse ) ;
	Tag.call( self , tag , attributes , content , shouldParse ) ;

    if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *(?:=> *(\$[^ ]+))?$/ ) ) ) {
        throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the gauge syntax." ) ;
    }

	Object.defineProperties( self , {
		op: { value: tag , enumerable: true } ,
		ref: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
        toRef: { value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = GaugeTag ;
//GaugeTag.prototype = Object.create( VarTag.prototype ) ;
GaugeTag.prototype = Object.create( Tag.prototype ) ;
GaugeTag.prototype.constructor = GaugeTag ;



GaugeTag.prototype.run = function( book , ctx ) {
	var object = this.ref.get( ctx.data ) ,
		params = this.extractContent( ctx.data ) ;

	if ( object instanceof Pool ) { return this.runPool( object , params ) ; }
	if ( object instanceof HistoryGauge ) { return this.runHistoryGauge( object , params ) ; }
	if ( object instanceof HistoryAlignometer ) { return this.runHistoryAlignometer( object , params ) ; }

	scriptLog.error( "[%s] tag performed on an object not supporting it (%s)" , this.op , this.location ) ;
	return null ;
} ;



GaugeTag.prototype.runPool = function( object , value ) {
	if ( value && typeof value === 'object' ) {
		value = value.value !== undefined ? value.value :
			value.v !== undefined ? value.v :
			0 ;
	}

	var result ;

	switch ( this.op ) {
		case 'replenish-gauge' :
			result = object.replenish() ;
			break ;
		case 'empty-gauge' :
			result = object.empty() ;
			break ;
		case 'restore-gauge' :
			result = object.restore( value ) ;
			break ;
		case 'lose-gauge' :
			result = object.lose( value ) ;
			break ;
		case 'use-gauge' :
			result = object.use( value ) ;
			break ;
		case 'add-gauge' :
		case 'raise-gauge' :
			result = object.add( value ) ;
			break ;
		case 'lower-gauge' :
			result = object.add( - value ) ;
			break ;
		default :
			scriptLog.error( "[%s] tag is not compatible with HistoryGauge objects (%s)" , this.op , this.location ) ;
			break ;
	}

	if ( this.toRef ) { this.toRef.set( ctx.data , result ) ; }

	return null ;
} ;



GaugeTag.prototype.runHistoryGauge = function( object , params ) {
	if ( ! params || typeof params !== 'object' ) { params = { value: params } ; }

	switch ( this.op ) {
		case 'add-gauge' :
		case 'raise-gauge' :
			object[ params.merge ? 'addMerge' : 'add' ](
				params.value ?? params.v ,
				params.weight ?? params.w ,
				params.description
			) ;
			break ;
		case 'lower-gauge' :
			object[ params.merge ? 'addMerge' : 'add' ](
				- ( params.value ?? params.v ) ,
				params.weight ?? params.w ,
				params.description
			) ;
			break ;
		case 'merge-raise-gauge' :
			object.addMerge(
				params.value ?? params.v ,
				params.weight ?? params.w ,
				params.description
			) ;
			break ;
		case 'merge-lower-gauge' :
			object.addMerge(
				- ( params.value ?? params.v ) ,
				params.weight ?? params.w ,
				params.description
			) ;
			break ;
		case 'recover-gauge' :
			object.recover( + ( params.value ?? params.v ) || 0 ) ;
			break ;
		default :
			scriptLog.error( "[%s] tag is not compatible with HistoryGauge objects (%s)" , this.op , this.location ) ;
			break ;
	}

	if ( this.toRef ) { this.toRef.set( ctx.data , null ) ; }

	return null ;
} ;



GaugeTag.prototype.runHistoryAlignometer = function( object , params ) {
	if ( ! params || typeof params !== 'object' ) { params = { weight: params } ; }

	switch ( this.op ) {
		case 'attract-gauge' :
			object.toward(
				params.to ?? params.value ?? params.v ,
				params.weight ?? params.w ,
				params.description
			) ;
			break ;
		case 'raise-gauge' :
			object.upward(
				params.to ?? params.value ?? params.v ?? object.max ,
				params.weight ?? params.w ,
				params.description
			) ;
			break ;
		case 'lower-gauge' :
			object.downward(
				params.to ?? params.value ?? params.v ?? object.min ,
				params.weight ?? params.w ,
				params.description
			) ;
			break ;
		default :
			scriptLog.error( "[%s] tag is not compatible with HistoryAlignometer objects (%s)" , this.op , this.location ) ;
			break ;
	}

	if ( this.toRef ) { this.toRef.set( ctx.data , null ) ; }

	return null ;
} ;

