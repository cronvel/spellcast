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



// This is a specialized clone function dedicated to spellcast scripting structure



// Anything else is considered as opaque value
var protoWhiteList = new Set( [
	Array.prototype ,
	Object.prototype ,
	null
] ) ;



function copyData( data ) {
	if ( ! data || typeof data !== 'object' || ! protoWhiteList.has( Object.getPrototypeOf( data ) ) ) {
		return data ;
	}
	
	if ( Array.isArray( data ) ) {
		return Array.from( data ) ;
	}
	else {
		return Object.assign( {} , data ) ;
	}
} ;

function deepCopyData( data , alreadyCopied = new Map() ) {
	var copy , olderCopy ;
	
	if ( ! data || typeof data !== 'object' || ! protoWhiteList.has( Object.getPrototypeOf( data ) ) ) {
		return data ;
	}
	
	// For circular reference...
	olderCopy = alreadyCopied.get( data ) ;
	
	if ( olderCopy ) {
		return olderCopy ;
	}
	
	if ( Array.isArray( data ) ) {
		copy = [] ;
		alreadyCopied.set( data , copy ) ;	// immediately adds it, before recursion can happen
		data.forEach( ( element , index ) => copy[ index ] = deepCopyData( element , alreadyCopied ) ) ;
	}
	else {
		copy = {} ;
		alreadyCopied.set( data , copy ) ;	// immediately adds it, before recursion can happen
		Object.keys( data ).forEach( key => copy[ key ] = deepCopyData( data[ key ] , alreadyCopied ) ) ;
	}
	
	return copy ;
} ;



module.exports = copyData ;
module.exports.deep = deepCopyData ;

