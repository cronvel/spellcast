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



/*
	duration: transition duration in seconds
	easing: the easing function used
*/
// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GTransition! E.g.: spellcast-ext-web-client/lib/GTransition.js
function GTransition( data ) {
	this.duration = 0.2 ;
	this.easing = 'linear' ;
	
	if ( data ) { this.update( data ) ; }
}

module.exports = GTransition ;

GTransition.prototype.__prototypeUID__ = 'spellcast/GTransition' ;
GTransition.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GTransition! E.g.: spellcast-ext-web-client/lib/GTransition.js
GTransition.prototype.update = function( data ) {
	if ( typeof data !== 'object' ) {
		data = { duration: + data || 0 } ;
	}

	if ( data.duration !== undefined ) { this.duration = + data.duration || 0 ; }
	if ( data.easing !== undefined ) { this.easing = data.easing || 'linear' ; }

	return this ;
} ;

