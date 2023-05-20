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
const kungFig = require( 'kung-fig' ) ;
const StatsTable = kungFig.statsModifiers.StatsTable ;
//const NestedStats = kungFig.statsModifiers.NestedStats ;
const WildNestedStats = kungFig.statsModifiers.WildNestedStats ;
const Stat = kungFig.statsModifiers.Stat ;
const CompoundStat = kungFig.statsModifiers.CompoundStat ;
const Traits = kungFig.statsModifiers.Traits ;
const Pool = kungFig.statsModifiers.Pool ;
const HistoryGauge = kungFig.statsModifiers.HistoryGauge ;
const HistoryAlignometer = kungFig.statsModifiers.HistoryAlignometer ;
const ModifiersTable = kungFig.statsModifiers.ModifiersTable ;
//const Modifier = kungFig.statsModifiers.Modifier ;



// We will use instance.clone() on those objects
const useClone = new Set( [
	//Expression.prototype , Ref.prototype ,
	StatsTable.prototype , WildNestedStats.prototype , Stat.prototype , CompoundStat.prototype , Traits.prototype , Pool.prototype , HistoryGauge.prototype , HistoryAlignometer.prototype , ModifiersTable.prototype // , Modifier.prototype
] ) ;

// Anything else is considered as opaque/immutable value
const protoWhiteList = new Set( [
	Object.prototype ,
	Array.prototype ,
	... useClone ,
	null
] ) ;

const extendProtoWhiteList = new Set( [
	Object.prototype ,
	null
] ) ;



function copyData( data ) {
	if ( ! data || typeof data !== 'object' ) { return data ; }
	
	var proto = Object.getPrototypeOf( data ) ;
	if ( ! protoWhiteList.has( proto ) ) { return data ; }
	
	if ( useClone.has( proto ) ) { return data.clone() ; }
	if ( Array.isArray( data ) ) { return Array.from( data ) ; }
	return Object.assign( {} , data ) ;
}



function deepCopyData( data , alreadyCopied = new Map() ) {
	var copy , olderCopy , proto ;

	if ( ! data || typeof data !== 'object' ) { return data ; }
	
	proto = Object.getPrototypeOf( data ) ;
	if ( ! protoWhiteList.has( proto ) ) { return data ; }

	// For circular reference...
	olderCopy = alreadyCopied.get( data ) ;

	if ( olderCopy ) {
		return olderCopy ;
	}

	if ( useClone.has( proto ) ) {
		return data.clone() ;
	}
	else if ( Array.isArray( data ) ) {
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

