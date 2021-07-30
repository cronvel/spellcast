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



// This is a specialized clone function dedicated to spellcast scripting structure



//const Expression = require( 'kung-fig-expression' ) ; const Ref = require( 'kung-fig-ref' ) ;

// Anything else is considered as opaque/immutable value
const protoWhiteList = new Set( [
	Object.prototype ,
	Array.prototype ,
	//Expression.prototype , Ref.prototype ,
	null
] ) ;

const extendProtoWhiteList = new Set( [
	Object.prototype ,
	null
] ) ;



function copyData( data ) {
	if ( ! data || typeof data !== 'object' || ! protoWhiteList.has( Object.getPrototypeOf( data ) ) ) {
		return data ;
	}

	if ( Array.isArray( data ) ) { return Array.from( data ) ; }
	//if ( ( data instanceof Expression ) || ( data instanceof Ref ) ) { return data.clone() ; }

	return Object.assign( {} , data ) ;
}



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
	//else if ( ( data instanceof Expression ) || ( data instanceof Ref ) ) { copy = data.clone() ; }
	else {
		copy = {} ;
		alreadyCopied.set( data , copy ) ;	// immediately adds it, before recursion can happen
		Object.keys( data ).forEach( key => copy[ key ] = deepCopyData( data[ key ] , alreadyCopied ) ) ;
	}

	return copy ;
}



function deepExtend( base , ... sources ) {
	var alreadyCopied = new Map() ;
	sources.forEach( source => deepExtendOne( base , source , new Set() , alreadyCopied ) ) ;
	return base ;
}



function deepExtendOne( base , source , alreadyExtended , alreadyCopied ) {
	var copy , olderCopy ;

	if (
		! base || ! source ||
		typeof base !== 'object' || typeof source !== 'object' ||
		! extendProtoWhiteList.has( Object.getPrototypeOf( base ) ) ||
		! extendProtoWhiteList.has( Object.getPrototypeOf( source ) )
	) {
		return ;
	}

	// /!\ Don't know what to do here... /!\
	if ( alreadyExtended.has( source ) ) { return ; }

	alreadyExtended.add( source ) ;	// immediately adds it, before recursion can happen

	Object.keys( source ).forEach( key => {
		var sourceValue = source[ key ] ;
		var baseValue = base[ key ] ;

		if (
			! sourceValue ||
			typeof sourceValue !== 'object' ||
			! extendProtoWhiteList.has( Object.getPrototypeOf( sourceValue ) )
		) {
			base[ key ] = sourceValue ;
		}
		else if (
			! baseValue ||
			typeof baseValue !== 'object' ||
			! extendProtoWhiteList.has( Object.getPrototypeOf( baseValue ) )
		) {
			base[ key ] = deepCopyData( sourceValue , alreadyCopied ) ;
		}
		else {
			deepExtendOne( baseValue , sourceValue , alreadyExtended , alreadyCopied ) ;
		}
	} ) ;
}



module.exports = copyData ;
module.exports.extend = Object.assign ;
module.exports.deep = deepCopyData ;
module.exports.deep.extend = deepExtend ;

