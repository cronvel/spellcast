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



const log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	Metrics are things that can track various things, like character's actions to determine good/evil alignment.

	An event is an object with those properties:
	* up: boolean, true: move the value up, false: move the value down
	* q: quantity, any real number greater than 0
	* level: any real number (usually between -1 and 1), or a string constant (full, half, neutral, halfInverse)
	* description: string, optional
*/



function Metric( data = {} ) {
	this.cachedValue = null ;
	this.cachedInstantValue = null ;
	this.minWeight = data.minWeight !== undefined ? data.minWeight : 20 ;
	this.instantMaxWeight = data.instantMaxWeight !== undefined ? data.instantMaxWeight : 50 ;
	this.maxEvent = data.maxEvent !== undefined ? data.maxEvent : 100 ;
	this.events = Array.isArray( data.events ) ? data.events : [] ;
}

module.exports = Metric ;

Metric.prototype.__prototypeUID__ = 'spellcast/Metric' ;
Metric.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



const TOWARD_CONSTANTS = {
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



Metric.prototype.addEvent = function( event ) {
	if ( ! event.w || event.w <= 0 ) { event.w = 1 ; }

	event.d = event.d || null ;

	if ( typeof event.toward !== 'number' ) {
		if ( event.d === 'up' ) {
			event.toward = TOWARD_CONSTANTS[ event.toward ] || 0 ;
		}
		else if ( event.d === 'down' ) {
			event.toward = -1 * ( TOWARD_CONSTANTS[ event.toward ] || 0 ) ;
		}
		else {
			event.toward = 0 ;
		}
	}

	this.events.push( event ) ;

	if ( this.events.length > this.maxEvent ) {
		this.events = this.events.splice( 0 , this.events.length - this.maxEvent ) ;
	}

	this.cachedValue = this.cachedInstantValue = null ;
} ;



Metric.prototype.getValue = function( wLimit = Infinity ) {
	var i , iMax , upArray = [] , downArray = [] , event , upEvent , downEvent ,
		wCount = 0 , v = 0 , w = 0 ;

	for ( i = this.events.length - 1 ; i >= 0 && w < wLimit ; i -- ) {
		event = this.events[ i ] ;
		wCount += event.w ;

		if ( wCount > wLimit ) {
			// Create an event that don't surpass the limit
			event = Object.create( event ) ;
			event.w -= wCount - wLimit ;
			wCount = wLimit ;
		}

		if ( event.d === 'up' ) {
			upArray.push( event ) ;
		}
		else if ( event.d === 'down' ) {
			downArray.push( event ) ;
		}
		else {
			v = ( v * w + event.toward * event.w ) / ( w + event.w ) ;
			w += event.w ;
		}
	}

	// w should at least be equal to instantMaxWeight
	if ( wCount < this.minWeight ) { w += this.minWeight - wCount ; }

	upArray.sort( ( a , b ) => a.toward - b.toward ) ;
	downArray.sort( ( a , b ) => a.toward - b.toward ) ;

	upEvent = upArray.pop() ;
	downEvent = downArray.pop() ;

	for ( ;; ) {

		if ( upEvent && ( ! downEvent || upEvent.toward - v >= v - downEvent.toward ) ) {
			if ( v > upEvent.toward ) { return v ; }
			v = ( v * w + upEvent.toward * upEvent.w ) / ( w + upEvent.w ) ;
			w += upEvent.w ;
			upEvent = upArray.pop() ;
		}
		else if ( downEvent && ( ! upEvent || upEvent.toward - v <= v - downEvent.toward ) ) {
			if ( downEvent.toward > v ) { return v ; }
			v = ( v * w + downEvent.toward * downEvent.w ) / ( w + downEvent.w ) ;
			w += downEvent.w ;
			downEvent = downArray.pop() ;
		}
		else {
			return v ;
		}
	}
} ;



Metric.prototype.getInstantValue = function() {
	return this.getValue( this.instantMaxWeight ) ;
} ;

