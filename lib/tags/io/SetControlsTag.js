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



const Ngev = require( 'nextgen-events' ) ;
const Tag = require( 'kung-fig' ).Tag ;
const defaultControls = require( '../../defaultControls.js' ) ;



function SetControlsTag( tag , attributes , content , shouldParse , options = {} ) {
	var self = ( this instanceof SetControlsTag ) ? this : Object.create( SetControlsTag.prototype ) ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	var mode =
		tag === 'reset-controls' ? 'reset' :
		tag === 'set-controls' ? 'set' :
		'add' ;

	if ( mode !== 'reset' && ( ! content || typeof content !== 'object' ) ) {
        throw new SyntaxError( "The set-controls/add-controls tag's content should be an object." ) ;
    }

	Object.defineProperties( self , {
		mode: { value: mode , enumerable: true } ,
	} ) ;

	return self ;
}

module.exports = SetControlsTag ;
SetControlsTag.prototype = Object.create( Tag.prototype ) ;
SetControlsTag.prototype.constructor = SetControlsTag ;



SetControlsTag.prototype.run = function( book , ctx ) {
	var data = this.extractContent( ctx.data ) ;


	// Reset controls? Or inherit?
	if ( this.mode === 'reset' ) {
		book.controls = defaultControls() ;
	}
	else {
		if ( ! data || typeof data !== 'object' ) { return null ; }

		if ( this.mode === 'set' ) {
			book.controls = {
				keys: {} ,
				gauges: {} ,
				gauges2d: {}
			} ;
		}

		// Filter controls
		if ( data.keys ) {
			for ( let key in data.keys ) {
				let value = data.keys[ key ] ;
				if ( ! key || ! value ) { continue ; }
				
				if ( ! book.controls.keys[ key ] ) {
					book.controls.keys[ key ] = [] ;
				}
				
				if ( typeof value === 'string' ) {
					book.controls.keys[ key ].push( value ) ;
				}
				else if ( Array.isArray( value ) ) {
					for ( let innerValue of data.keys[ key ] ) {
						if ( innerValue && typeof innerValue === 'string' ) {
							book.controls.keys[ key ].push( innerValue ) ;
						}
					}
				}
			}
		}
	}

	// Controls are shared, we use book.roles instead of ctx.roles
	Ngev.groupEmit( book.roles , 'controls' , book.controls ) ;

	return null ;
} ;

