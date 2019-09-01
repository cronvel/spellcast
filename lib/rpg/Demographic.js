/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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
	Should be refactored.

	API: 2 classes -- DemographicGroup, DemographicUnit

	At creation time, a master instance contains 1 unit.

	* group.split( categoryName , categoryShare )
		Split each unit in as many categories specified in categoryShare.
		E.g.: master.split( 'gender' , { male: 0.5 , female: 0.5 } )
	* group.find( categories )
		Return a new group with all units matching the query.
		E.g.: master.query( { gender: 'male' , age: 'young' } )
	* group.getUnit( categories )
		Same than .query() but return a single unit, so all category values must be defined.
	* group.getAverage()
		Return average data along all units of the group.
	* ...
*/

// /!\ There is no tag using that yet



function Demographic( arg1 , arg2 ) {
	if ( arg2 ) {
		this.count = arg1 ;
		this.groups = arg2 ;
	}
	else if ( Array.isArray( arg1 ) ) {
		this.count = arg1.reduce( ( count , group ) => count += group.count , 0 ) ;
		this.groups = arg1 ;
	}
	else if ( typeof arg1 === 'number' ) {
		this.count = arg1 ;
		this.groups = [ { count: arg1 } ] ;
	}
	else {
		this.count = 0 ;
		this.groups = [] ;
	}
}

module.exports = Demographic ;

Demographic.prototype.__prototypeUID__ = 'spellcast/Demographic' ;
Demographic.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// For backward compatibility
Demographic.create = function( ... args ) { return new Demographic( ... args ) ; } ;



Demographic.prototype.addGroup = function( group ) {
	this.groups.push( group ) ;
	this.count += group.count ;
} ;



/*
	* key: string, the partition key
	* valueWeights: object or function( group ) returning an object, where the property is a value for the key,
		and the value is the weight for that value
*/
Demographic.prototype.partition = function( key , valueWeights ) {
	var newGroups = [] ;

	this.groups.forEach( group => {
		var weightSum = 0 , currentValueWeights = {} , initialValueWeight , newGroup , value , weight ;

		currentValueWeights = typeof valueWeights === 'function' ? valueWeights( group ) : Object.assign( {} , valueWeights ) ;

		for ( value in currentValueWeights ) {
			weight = currentValueWeights[ value ] ;

			if ( typeof weight === 'number' && weight >= 0 ) {
				weightSum += weight ;
			}
			else {
				delete currentValueWeights[ value ] ;
			}
		}

		if ( ! weightSum ) {
			// Some error occurs...
			newGroups.push( group ) ;
			return ;
		}

		for ( value in currentValueWeights ) {
			newGroup = Object.assign( {} , group ) ;
			newGroup.count = group.count * currentValueWeights[ value ] / weightSum ;
			newGroup[ key ] = value ;
			newGroups.push( newGroup ) ;
		}
	} ) ;

	return new Demographic( this.count , newGroups ) ;
} ;



Demographic.prototype.filter = function( arg ) {
	var fn ;

	if ( typeof arg === 'function' ) {
		fn = arg ;
	}
	else if ( arg && typeof arg === 'object' ) {
		fn = ( group ) => {
			var key ;

			for ( key in arg ) {
				if ( group[ key ] !== arg[ key ] ) { return false ; }
			}

			return true ;
		} ;
	}
	else {
		throw new Error( 'Demographic#filter(): first argument should be a function or an object' ) ;
	}

	return new Demographic(
		this.groups.filter( fn )
			.map( ( group ) => Object.assign( {} , group ) )
	) ;
} ;



Demographic.prototype.groupBy = function( key ) {
	var object = {} ;

	this.groups.forEach( ( group ) => {
		group = Object.assign( {} , group ) ;

		if ( ! object[ group[ key ] ] ) {
			object[ group[ key ] ] = new Demographic( [ group ] ) ;
		}
		else {
			object[ group[ key ] ].addGroup( group ) ;
		}
	} ) ;

	return object ;
} ;

