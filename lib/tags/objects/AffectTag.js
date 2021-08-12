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
const VarTag = kungFig.VarTag ;
const Gauge = kungFig.statsModifiers.Gauge ;
const Alignometer = kungFig.statsModifiers.Alignometer ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function AffectTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof AffectTag ) ? this : Object.create( AffectTag.prototype ) ;

	VarTag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		op: { value: tag , enumerable: true } ,
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = AffectTag ;
AffectTag.prototype = Object.create( VarTag.prototype ) ;
AffectTag.prototype.constructor = AffectTag ;



AffectTag.prototype.run = function( book , ctx ) {
	var object = this.ref.get( ctx.data ) ,
		params = this.getRecursiveFinalContent( ctx.data ) ;

	if ( object instanceof Gauge ) {
		if ( ! params || typeof params !== 'object' ) { params = { value: params } ; }

		switch ( this.op ) {
			case 'affect' :
			case 'affect-raise' :
				object[ params.merge ? 'addMerge' : 'add' ](
					params.value ?? params.v ,
					params.weight ?? params.w ,
					params.description
				) ;
				break ;
			case 'affect-lower' :
				object[ params.merge ? 'addMerge' : 'add' ](
					- ( params.value ?? params.v ) ,
					params.weight ?? params.w ,
					params.description
				) ;
				break ;
			case 'affect-merge' :
				object.addMerge(
					params.value ?? params.v ,
					params.weight ?? params.w ,
					params.description
				) ;
				break ;
			case 'affect-recover' :
				object.recover( + ( params.value ?? params.v ) || 0 ) ;
				break ;
			default :
				scriptLog.error( "[%s] tag is not compatible with Gauge objects (%s)" , this.op , this.location ) ;
				break ;
		}

		return null ;
	}

	if ( object instanceof Alignometer ) {
		if ( ! params || typeof params !== 'object' ) { params = { weight: params } ; }

		switch ( this.op ) {
			case 'affect' :
				object.add(
					params.direction ?? params.d ,
					params.to ?? params.value ?? params.v ,
					params.weight ?? params.w ,
					params.description
				) ;
				break ;
			case 'affect-toward' :
				object.toward(
					params.to ?? params.value ?? params.v ,
					params.weight ?? params.w ,
					params.description
				) ;
				break ;
			case 'affect-raise' :
				object.upward(
					params.to ?? params.value ?? params.v ?? object.max ,
					params.weight ?? params.w ,
					params.description
				) ;
				break ;
			case 'affect-lower' :
				object.downward(
					params.to ?? params.value ?? params.v ?? object.min ,
					params.weight ?? params.w ,
					params.description
				) ;
				break ;
			default :
				scriptLog.error( "[%s] tag is not compatible with Alignometer objects (%s)" , this.op , this.location ) ;
				break ;
		}

		return null ;
	}

	scriptLog.error( "[%s] tag performed on an object not supporting it (%s)" , this.op , this.location ) ;
	return null ;
} ;

