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



const TIERS = [
	{
		action: 1 ,
		persuasion: 1
	} ,
	null ,
	{
		target: 7 ,
		using: 6 ,
		performer: 5 ,
		commander: 4 ,
		object: 3
	}
] ;

const LEVELS = {
	low: 30 ,
	medium: 50 ,
	high: 70
} ;

module.exports = ( input , event , isInternal ) => {
	var toInt ,
		priority =
			typeof input === 'string' && LEVELS[ input ] !== undefined ? LEVELS[ input ] :
			( toInt = Math.floor( + input ) ) && Number.isFinite( toInt ) ? toInt :
			LEVELS.medium ;

	if ( isInternal ) {
		// Internal have always higher priority
		priority += 0.5 ;
	}

	if ( ! event ) { return priority ; }

	var parts = event.split( ':' ) ;

	parts.forEach( ( part , index ) => {
		// Wildcard does not give any bonus, since it's unspecified
		if ( ! part || part === '*' ) { return ; }

		// Give a 0.01 bonus per part-level for tier 0, 0.0001 for tier 1, 0.000001 for tier 2, etc...
		var tierLevel = 1 + ( ( TIERS[ index ] && TIERS[ index ][ part ] ) || 0 ) ;
		priority += tierLevel * ( 0.01 ** ( index + 1 ) ) ;
	} ) ;

	return priority ;
} ;

