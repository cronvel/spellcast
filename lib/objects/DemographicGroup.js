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



const DemographicUnit = require( './DemographicUnit.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	API: 2 classes -- DemographicGroup, DemographicUnit

	At creation time, a master instance contains 1 unit.

	* group.split( categoryName , categoryShare )
		Split each unit in as many categories specified in categoryShare.
		E.g.: master.split( 'gender' , { male: 0.5 , female: 0.5 } )
	* group.select( categories )
		Return a new group with all units matching the query.
		E.g.: master.query( { gender: 'male' , age: 'young' } )
	* group.getUnit( categories )
		Same than .query() but return a single unit, so all category values must be defined.
	* group.getAverage()
		Return average data along all units of the group.
	* ...
*/

// /!\ There is no tag using that yet



function DemographicGroup( units , count = null ) {
	if ( typeof units === 'number' ) {
		count = units ;
		this.count = count ;
		this.units = [ new DemographicUnit( count ) ] ;
	}
	else {
		this.count = count ;
		this.units = units ;
		
		if ( this.count === null ) { this.recount() ; }
	}
}

module.exports = DemographicGroup ;

DemographicGroup.prototype.__prototypeUID__ = 'spellcast/DemographicGroup' ;
DemographicGroup.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;


// Internal
DemographicGroup.prototype.addUnit = function( unit ) {
	this.units.push( unit ) ;
	this.count += unit.count ;
} ;



/*
	* key: string, the partition key
	* valueWeights: object or function( unit ) returning an object, where the property is a value for the key,
		and the value is the weight for that value
*/
DemographicGroup.prototype.partition =	// deprecated
DemographicGroup.prototype.split = function( key , valueWeights ) {
	var newUnits = [] ;

	this.units.forEach( unit => {
		var weightSum = 0 , currentValueWeights = {} , initialValueWeight , newUnit , value , weight ;

		currentValueWeights = typeof valueWeights === 'function' ? valueWeights( unit ) : Object.assign( {} , valueWeights ) ;

		// First compute the um of al weight
		for ( value in currentValueWeights ) {
			weight = currentValueWeights[ value ] ;
			//log.debug( "w: %Y" , weight ) ;

			if ( typeof weight === 'number' && weight >= 0 ) {
				weightSum += weight ;
			}
			else {
				delete currentValueWeights[ value ] ;
			}
		}

		//log.hdebug( "ws: %Y" , weightSum ) ;
		
		// Some error occurs...
		if ( ! weightSum ) {
			log.error( "DemographicGroup#partition(): bad weight sum: %f (%s, %Y)" , weightSum , key , currentValueWeights ) ;
			return ;
		}

		// Create as many unit as it is needed
		for ( value in currentValueWeights ) {
			newUnit = new DemographicUnit(
				unit.count * currentValueWeights[ value ] / weightSum ,
				Object.assign( {} , unit.data )
			) ;
			newUnit.data[ key ] = value ;
			newUnits.push( newUnit ) ;
		}
	} ) ;

	return new DemographicGroup( newUnits , this.count ) ;
} ;



DemographicGroup.prototype.select = function( data ) {
	var count = 0 ;
	
	var units = this.units.filter( unit => {
		for ( let key in data ) {
			if ( data[ key ] !== undefined && unit.data[ key ] !== data[ key ] ) { return false ; }
		}

		count += unit.count ;
		return true ;
	} ) ;

	return new DemographicGroup( units , count ) ;
} ;



DemographicGroup.prototype.groupBy = function( key ) {
	var object = {} ;

	this.units.forEach( unit => {
		if ( ! object[ unit.data[ key ] ] ) {
			object[ unit.data[ key ] ] = new DemographicGroup( [ unit ] , unit.count ) ;
		}
		else {
			object[ unit.data[ key ] ].addUnit( unit ) ;
		}
	} ) ;

	return object ;
} ;



// Like .groupBy() but generate count instead of group
DemographicGroup.prototype.countBy = function( key ) {
	var object = {} ;

	this.units.forEach( unit => {
		if ( object[ unit.data[ key ] ] === undefined ) {
			object[ unit.data[ key ] ] = unit.count ;
		}
		else {
			object[ unit.data[ key ] ] += unit.count ;
		}
	} ) ;

	return object ;
} ;




// Count again from units
DemographicGroup.prototype.recount = function() {
	this.count = this.units.reduce( ( count , unit ) => count += unit.count , 0 ) ;
} ;



// Adaptated from the 'math-kit' module
function randomFloatRange( a , b ) { return a + Math.random() * ( b - a ) ; } ;



// Adaptated from the 'math-kit' module
// Round count values for unit, randomly, but keeping the sum
DemographicGroup.prototype.sharedRandomRound = function() {
	var error = 0 ;

	this.units.forEach( unit => {
		var oldCount = unit.count ,
			r = error < 0 ? randomFloatRange( -error , 1 ) : randomFloatRange( 0 , 1 - error ) ;
		
		unit.count = Math.floor( unit.count + r ) ;
		error += unit.count - oldCount ;
	} ) ;
} ;

