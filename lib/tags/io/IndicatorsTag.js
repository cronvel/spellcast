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



function IndicatorsTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof IndicatorsTag ) ? this : Object.create( IndicatorsTag.prototype ) ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		isStatus: { value: tag === 'status' , enumerable: true }
	} ) ;

	return self ;
}

module.exports = IndicatorsTag ;
IndicatorsTag.prototype = Object.create( Tag.prototype ) ;
IndicatorsTag.prototype.constructor = IndicatorsTag ;



IndicatorsTag.prototype.run = function( book , ctx , callback ) {
	if ( this.isStatus ) {
		if ( ctx.type === null ) {
			// No ctx type? probably top-level execution:
			// make it the global [status] tag
			book.statusUpdater = this ;
		}
		else {
			this.ctx.statusUpdater = this ;
		}

		return null ;
	}

	return this.exec( book , null , ctx , callback ) ;

} ;



/*
	This is always synchronous.

	Each indicator has properties:
		* type: the type of indicator, i.e. its data representation and appearance (e.g.: text, bar, etc)
		* label: the label/title of the indicator
		* value: the value for that indicator
		* code: (optional) an internal codename for the indicator
		* color: (optional) the color of that indicator, when that makes sense
		* image: (optional) the url of an image that will be used instead of/in conjunction with the label,
			if supported by the client
*/
IndicatorsTag.prototype.exec = function( book , options , ctx ) {
	var thisBackup = ctx.data.this ;
	var eventName = this.isStatus ? 'status' : 'indicators' ;

	// Prepare a per-role indicators/status event, each one has its own 'this'
	book.roles.forEach( role => {
		ctx.data.this = role ;

		var indicators = this.getRecursiveFinalContent( ctx.data ) ;

		if ( ! Array.isArray( indicators ) ) { indicators = [ indicators ] ; }

		// Sanitize
		// /!\ Better filters by type needed /!\
		indicators = indicators
			.filter( e =>
				e && typeof e === 'object' &&
				( ! e.type || typeof e.type === 'string' ) &&
				( ! e.label || typeof e.label === 'string' ) &&
				( typeof e.value !== 'object' || e.value === null ) &&
				( ! e.code || typeof e.code === 'string' ) &&
				( ! e.color || typeof e.color === 'string' ) &&
				( ! e.image || typeof e.image === 'string' )
			)
			.map( e => ( {
				type: e.type || 'text' ,
				label: e.label || '' ,
				value: e.value ,
				code: e.code || undefined ,
				color: e.color || undefined ,
				image: e.image || undefined
			} ) ) ;

		if ( ! this.isStatus && ! indicators.length ) { return ; }

		role.emit( eventName , indicators ) ;
	} ) ;

	ctx.data.this = thisBackup ;

	return null ;
} ;

