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
	Metrics are things that can track various things, like character's actions to determine good/evil alignment.

	An event is an object with those properties:
	* up: boolean, true: move the value up, false: move the value down
	* q: quantity, any real number greater than 0
	* level: any real number (usually between -1 and 1), or a string constant (full, half, neutral, halfInverse)
	* description: string, optional
*/



function Metric() {
	this.cachedValue = null ;
	this.cachedInstantValue = null ;
	this.maxEvent = 50 ;
	this.instantMaxEvent = 20 ;
	this.events = [] ;
}

module.exports = Metric ;

Metric.prototype.__prototypeUID__ = 'spellcast/Metric' ;
Metric.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



const LEVELS = {
	full: 1 ,
	half: 0.5 ,
	neutral: 0 ,
	halfInverse: -0.5	// <- should find a better name here
} ;



Object.defineProperties( Metric.prototype , {
	value: {
		get: function() {
			if ( this.cachedValue === null ) { this.cachedValue = this.getValue() ; }
			return this.cachedValue ;
		}
	} ,
	instantValue: {
		get: function() {
			if ( this.cachedInstantValue === null ) { this.cachedInstantValue = this.getInstantValue() ; }
			return this.cachedInstantValue ;
		}
	}
} ) ;



Metric.prototype.addEvent = function addEvent( event ) {
	if ( ! event.q || event.q <= 0 ) { event.q = 1 ; }

	event.up = !! ( event.up || event.up === undefined ) ;

	if ( typeof event.level !== 'number' ) {
		event.level = LEVELS[ event.level ] || 0 ;
		if ( ! event.up ) { event.level *= -1 ; }
	}

	this.events.push( event ) ;

	if ( this.events.length > this.maxEvent ) {
		this.events = this.events.splice( 0 , this.events.length - this.maxEvent ) ;
	}

	this.cachedValue = this.cachedInstantValue = null ;
} ;



Metric.prototype.getValue = function getValue( limit = this.maxEvent ) {
	var i , iMax , upArray = [] , downArray = [] , upEvent , downEvent ,
		v = 0 , w = 0 ;

	i = limit < this.maxEvent ? this.events.length - limit : 0 ;
	iMax = this.events.length ;
	
	
	/*
		/!\ BAAAAAAD /!\
		
		- the limit should be the weight
		- missing weight should be added to default weight on the zero value
	*/
	
	
	for ( ; i < iMax ; i ++ ) {
		if ( this.events[ i ].up ) { upArray.push( this.events[ i ] ) ; }
		else { downArray.push( this.events[ i ] ) ; }
	}

	upArray.sort( ( a , b ) => a.level - b.level ) ;
	downArray.sort( ( a , b ) => a.level - b.level ) ;

	upEvent = upArray.pop() ;
	downEvent = downArray.pop() ;

	for ( ;; ) {

		if ( upEvent && ( ! downEvent || upEvent.level - v >= v - downEvent.level ) ) {
			if ( v > upEvent.level ) { return v ; }
			v = ( v * w + upEvent.level * upEvent.q ) / ( w + upEvent.q ) ;
			w = w + upEvent.q ;
			upEvent = upArray.pop() ;
		}
		else if ( downEvent && ( ! upEvent || upEvent.level - v <= v - downEvent.level ) ) {
			if ( downEvent.level > v ) { return v ; }
			v = ( v * w + downEvent.level * downEvent.q ) / ( w + downEvent.q ) ;
			w = w + downEvent.q ;
			downEvent = downArray.pop() ;
		}
		else {
			return v ;
		}
	}
} ;



Metric.prototype.getInstantValue = function getInstantValue() {
	return this.getValue( this.instantMaxEvent ) ;
} ;


