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



var Ngev = require( 'nextgen-events' ) ;
var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function PanelTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof PanelTag ) ? this : Object.create( PanelTag.prototype ) ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		reset: { value: tag !== 'add-to-panel' , enumerable: true }
	} ) ;

	return self ;
}

module.exports = PanelTag ;
PanelTag.prototype = Object.create( Tag.prototype ) ;
PanelTag.prototype.constructor = PanelTag ;



PanelTag.prototype.run = function run( book , ctx , callback ) {
	if ( ctx.type === null ) {
		// No ctx type? probably top-level execution:
		// make it the global [status] tag
		book.nextPanel = this ;
	}
	else {
		// If we got a regular context, exec now!
		ctx.nextPanel = this ;
		this.exec( book , null , ctx ) ;
	}

	return null ;
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
PanelTag.prototype.exec = function exec( book , options , ctx ) {
	var panel = this.getRecursiveFinalContent( ctx.data ) ;

	if ( ! Array.isArray( panel ) ) { panel = [ panel ] ; }

	// Sanitize
	panel = panel
	.filter( e =>
		e && typeof e === 'object' &&
			e.id && typeof e.id === 'string' &&
			( ! e.label || typeof e.label === 'string' ) &&
			( ! e.image || typeof e.image === 'string' )
	)
	.map( e => ( {
		id: e.id ,
		label: e.label || '' ,
		image: e.image || undefined
	} ) ) ;

	Ngev.groupEmit( ctx.roles , 'panel' , panel , this.reset ) ;

	return null ;
} ;


