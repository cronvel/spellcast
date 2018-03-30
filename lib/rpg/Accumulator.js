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



var log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	Accumulators are things that can track various things, like character's actions to determine good/evil alignment.
	
	An event is an object with those properties:
	* up: boolean, true: move the value up, false: move the value down
	* q: quantity, any real number greater than 0
	* level: any real number (usually between -1 and 1), or a string constant (full, half, neutral, halfInverse)
	* description: string, optional
*/



function Accumulator() {
	this.maxEvent = 50 ;
	this.instantMaxEvent = 20 ;
	this.events = [] ;
}

module.exports = Accumulator ;

Accumulator.prototype.__prototypeUID__ = 'spellcast/Accumulator' ;
Accumulator.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



const UP_LEVELS = {
	full: 1 ,
	half: 0.5 ,
	neutral: 0 ,
	halfInverse: -0.5	// <- should find a better name here
} ;



const DOWN_LEVELS = {
	full: -1 ,
	half: -0.5 ,
	neutral: 0 ,
	halfInverse: 0.5	// <- should find a better name here
} ;



Accumulator.prototype.addEvent = function addEvent( event ) {
	if ( ! event.quantity || event.quantity <= 0 ) { return ; }
	
	if ( event.up || event.up === undefined ) {
		event.up = true ;
		
		if ( typeof event.level !== 'number' ) {
			event.level = UP_LEVELS[ event.level ] || 0 ;
		}
	}
	else {
		event.up = false ;
		
		if ( typeof event.level !== 'number' ) {
			event.level = DOWN_LEVELS[ event.level ] || 0 ;
		}
	}
} ;



Accumulator.prototype.getValue = function getValue() {
	
} ;


