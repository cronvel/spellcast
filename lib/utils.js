/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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



var minimatch = require( '@cronvel/minimatch' ) ;



exports.isPlainObject = function isPlainObject( value )
{
	var proto ;
	
	return value &&
		typeof value === 'object' &&
		( ( proto = Object.getPrototypeOf( value ) ) === Object.prototype || proto === null ) ;
} ;



exports.debugDate = function debugDate( d )
{
	if ( d === Infinity || d === -Infinity ) { return d ; }
	else { return new Date( d ).toISOString() ; }
} ;



exports.glob = {} ;

exports.glob.hasMagic = function hasMagic( pattern , options )
{
	var m , i , iMax ;
	
	m = new minimatch.Minimatch( pattern , options ) ;
	
	if ( m.set.length > 1 ) { return true ; }
	
	for ( i = 0 , iMax = m.set[ 0 ].length ; i < iMax ; i ++ )
	{
		if ( typeof m.set[ 0 ][ i ] !== 'string' ) { return true ; }
	}
	
	return false ;
} ;



// Directories to watch based on a glob
exports.glob.watchDirectories = function glob.watchDirectories( pattern )
{
	
} ;



