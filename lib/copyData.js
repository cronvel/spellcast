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



// This is a specialized clone function dedicated to Spellcast Scripting structures



//const Expression = require( 'kung-fig-expression' ) ; const Ref = require( 'kung-fig-ref' ) ;
const kungFig = require( 'kung-fig' ) ;
const sm = kungFig.statsModifiers ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// We will use instance.clone() on those objects
const useClone = new Set( [
	//Expression.prototype , Ref.prototype ,
	sm.StatsTable.prototype , sm.NestedStats.prototype , sm.WildNestedStats.prototype ,
	sm.Stat.prototype , sm.CompoundStat.prototype ,
	sm.Traits.prototype , sm.Pool.prototype , sm.HistoryGauge.prototype , sm.HistoryAlignometer.prototype ,
	sm.ModifiersTable.prototype // , Modifier.prototype
] ) ;

// Anything else is considered as opaque/immutable value
const protoWhiteList = new Set( [
	Object.prototype ,
	Array.prototype ,
	null ,
	... useClone
] ) ;



const useSetWhenExtending = new Set( [
	//sm.Stat.prototype ,
	sm.NumberStat.prototype ,
	sm.StringStat.prototype ,
	sm.Pool.prototype ,
	sm.Traits.prototype ,
	sm.HistoryAlignometer.prototype ,
	sm.HistoryGauge.prototype
] ) ;

const plainProto = new Set( [ Object.prototype , null ] ) ;

// If compatible: the later deep-extend the former, if not compatible: the later replace the former.
const protoExtendCompatibility = new Map( [
	[ Object.prototype , plainProto ] ,
	[ null , plainProto ] ,
	[ sm.NestedStats.prototype , new Set( [ sm.NestedStats.prototype , ... plainProto ] ) ] ,
	[ sm.WildNestedStats.prototype , new Set( [ sm.WildNestedStats.prototype , sm.NestedStats.prototype , ... plainProto ] ) ] ,
	[ sm.Pool.prototype , new Set( [ sm.Pool.prototype , ... plainProto ] ) ] ,
	[ sm.HistoryAlignometer.prototype , new Set( [ sm.HistoryAlignometer.prototype , ... plainProto ] ) ] ,
	[ sm.HistoryGauge.prototype , new Set( [ sm.HistoryGauge.prototype , ... plainProto ] ) ] ,
] ) ;



function areCompatibleForExtension( base , extender ) {
	if ( ! base || ! extender || typeof base !== 'object' || typeof extender !== 'object' ) { return false ; }

	var whiteList = protoExtendCompatibility.get( Object.getPrototypeOf( base ) ) ;
	if ( ! whiteList ) { return false ; }
	return whiteList.has( Object.getPrototypeOf( extender ) ) ;
}



function copyData( data ) {
	if ( ! data || typeof data !== 'object' ) { return data ; }
	
	var proto = Object.getPrototypeOf( data ) ;
	if ( ! protoWhiteList.has( proto ) ) { return data ; }
	
	if ( useClone.has( proto ) ) { return data.clone() ; }
	if ( Array.isArray( data ) ) { return Array.from( data ) ; }
	return Object.assign( {} , data ) ;
}



function deepCopyData( data , cloneReferences = new Map() ) {
	var copy , olderCopy , proto ;

	if ( ! data || typeof data !== 'object' ) { return data ; }
	
	proto = Object.getPrototypeOf( data ) ;
	if ( ! protoWhiteList.has( proto ) ) { return data ; }

	// For circular reference...
	olderCopy = cloneReferences.get( data ) ;

	if ( olderCopy ) {
		return olderCopy ;
	}

	if ( useClone.has( proto ) ) {
		return data.clone() ;
	}
	else if ( Array.isArray( data ) ) {
		copy = [] ;
		cloneReferences.set( data , copy ) ;	// immediately adds it, before recursion can happen
		data.forEach( ( element , index ) => copy[ index ] = deepCopyData( element , cloneReferences ) ) ;
	}
	else {
		copy = {} ;
		cloneReferences.set( data , copy ) ;	// immediately adds it, before recursion can happen
		Object.keys( data ).forEach( key => copy[ key ] = deepCopyData( data[ key ] , cloneReferences ) ) ;
	}

	return copy ;
}



function deepExtend( base , ... sources ) {
	var cloneReferences = new Map() ;

	sources.forEach( source => {
		base = deepExtendOne( base , source , cloneReferences ) ;
	} ) ;

	return base ;
}

function deepExtendOne( base , source , cloneReferences , basesAlreadyExtended = new Set() , sourcesAlreadyApplied = new Set() ) {
	// Undefined's meaning is "there is nothing here", it never overwrites anything
	if ( source === undefined ) { return base ; }
	
	// If base is not an object, it's not extendable, so we return a deep clone of the source
	if ( ! base || typeof base !== 'object' ) { return deepCopyData( source , cloneReferences ) ; }

	// Check if base is already extended, we should not extend it twice
	if ( basesAlreadyExtended.has( base ) ) {
		// /!\ We just warn here, but maybe we should throw...
		log.warning( "Trying to extend a base structure having multiple (circular?) references: this does not make sense at all since extensions are applied on all references..." ) ;
		return base ;
	}
	basesAlreadyExtended.add( base ) ;	// immediately adds it, before any recursion can happen

	// Use base.set() if possible
	var baseProto = Object.getPrototypeOf( base ) ;
	if ( useSetWhenExtending.has( baseProto ) && base.set( source ) ) { return base ; }

	// If the source is not an object, it replaces the base
	if ( ! source || typeof source !== 'object' ) { return source ; }

	// Check compatibility, if not compatible return a deep clone of the source
	var sourceProto = Object.getPrototypeOf( source ) ;
	var whiteList = protoExtendCompatibility.get( baseProto ) ;
	if ( ! whiteList || ! whiteList.has( sourceProto ) ) { return deepCopyData( source , cloneReferences ) ; }

	// Check for circular reference that can lead to infinite recursions
	if ( sourcesAlreadyApplied.has( source ) ) {
		// /!\ We just warn here, but maybe we should throw...
		log.warning( "Trying to extend using a structure with circular/multiple references to the same object: this does not make sense at all for extensions, and can lead to infinite recursions..." ) ;
		return base ;
	}
	sourcesAlreadyApplied.add( source ) ;	// immediately adds it, before any recursion can happen

	// Object are compatible, recursively extend each property
	Object.keys( source ).forEach( key => {
		base[ key ] = deepExtendOne( base[ key ] , source[ key ] , cloneReferences , basesAlreadyExtended , sourcesAlreadyApplied ) ;
	} ) ;

	return base ;
}

// Only called with objects
function _deepExtendOne( base , source , cloneReferences , basesAlreadyExtended = new Set() , sourcesAlreadyApplied = new Set() ) {
	var copy , olderCopy ;

	if ( ! areCompatibleForExtension( base , source ) ) { return ; }

	if ( sourcesAlreadyApplied.has( source ) ) {
		// /!\ We just warn here, but maybe we should throw...
		log.warning( "Trying to extend using a structure with circular references: this does not make sense at all and lead to infinite recursions..." ) ;
		return ;
	}

	sourcesAlreadyApplied.add( source ) ;	// immediately adds it, before any recursion can happen

	if ( basesAlreadyExtended.has( base ) ) {
		// /!\ We just warn here, but maybe we should throw...
		log.warning( "Trying to extend a base structure having multiple (circular?) references: this does not make sense at all since extensions are applied on all references..." ) ;
		return ;
	}
	
	basesAlreadyExtended.add( base ) ;	// immediately adds it, before any recursion can happen

	Object.keys( source ).forEach( key => {
		var sourceValue = source[ key ] ;
		var baseValue = base[ key ] ;

		// undefined is never written, its meaning is "there is nothing here"
		if ( sourceValue === undefined ) { return ; }

		if ( areCompatibleForExtension( baseValue , sourceValue ) ) {
			deepExtendOne( baseValue , sourceValue , cloneReferences , basesAlreadyExtended , sourcesAlreadyApplied ) ;
		}
		else {
			base[ key ] = deepCopyData( sourceValue , cloneReferences ) ;
		}
	} ) ;
}

function _deepExtend( base , ... sources ) {
	var cloneReferences = new Map() ;
	sources.forEach( source => deepExtendOne( base , source , cloneReferences ) ) ;
	return base ;
}




module.exports = copyData ;
module.exports.extend = Object.assign ;
module.exports.deep = deepCopyData ;
module.exports.deep.extend = deepExtend ;

