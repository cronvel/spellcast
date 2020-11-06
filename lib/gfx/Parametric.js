/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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
const Expression = kungFig.Expression ;

//const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's Parametric! E.g.: spellcast-ext-web-client/lib/Parametric.js
function Parametric( data , eventData ) {
	this.var = {} ;
	this.formula = {} ;

	this.update( data , eventData ) ;
}

module.exports = Parametric ;

Parametric.prototype.__prototypeUID__ = 'spellcast/Parametric' ;
Parametric.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's Parametric! E.g.: spellcast-ext-web-client/lib/Parametric.js
Parametric.prototype.update = function( data , eventData ) {
	if ( data.reset ) {
		eventData.reset = true ;
	}
	else if ( data.resetT ) {
		eventData.resetT = true ;
	}

	if ( data.stopAt && typeof data.stopAt === 'number' ) {
		eventData.stopAt = data.stopAt ;
	}

	if ( data.var ) {
		eventData.var = {} ;
		this.recursiveUpdate( this.var , data.var , eventData.var , 1 ) ;
	}

	if ( data.formula ) {
		eventData.formula = {} ;
		this.recursiveUpdate( this.formula , data.formula , eventData.formula , 3 ) ;
	}
} ;



Parametric.prototype.recursiveUpdate = function( self , data , eventData , depth ) {
	var key , value ;

	for ( key in data ) {
		value = data[ key ] ;

		// Everything is ignored except number, boolean, Expression (turned into function string) and object (recursion).
		// BE CAREFUL: STRING SHOULD NEVER BE ALLOWED, since they stand for compiled JS from Expression.
		// If a string pass, it could be a security hole.
		if ( typeof value === 'boolean' || typeof value === 'number' ) {
			self[ key ] = eventData[ key ] = value ;
		}
		else if ( value && typeof value === 'object' ) {
			if ( value instanceof Expression ) {
				self[ key ] = value ;
				eventData[ key ] = value.toJs() ;	// Stringify the function
			}
			else if ( depth ) {
				self[ key ] = {} ;	// Don't share with eventData
				eventData[ key ] = {} ;
				this.recursiveUpdate( self[ key ] , value , eventData[ key ] , depth - 1 ) ;
			}
		}
	}
} ;

