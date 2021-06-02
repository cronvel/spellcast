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

const DemographicGroup = require( '../../lib/objects/DemographicGroup.js' ) ;

/*
	Reproduce the demographic data necessary for a game-system similar to King of the Dragon pass.
*/

const demo = new DemographicGroup( 1000 )
	.split( 'caste' , {
		farmer: 6 ,
		herdsman: 3 ,
		miner: 2 ,		// also lumberjacks, anything resource collectors
		craftman: 2 ,	// artisans, black-smiths
		merchant: 1 ,
		//banker: 0 ,
		guard: 1 ,
		warrior: 1 ,
		eliteWarrior: 0.1 ,	// the strongest warriors with the best equipment
		hunter: 3 ,
		noble: 1 ,		// leaders
		artist: 1 ,		// bards, poets, musicians
		sacerdotal: 1	// priests, monks, healers, medicine men, doctors, judges
	} )
	.split( 'gender' , {
		male: 1 ,
		female: 1
	} )
	.split( 'age' , {
		child: 2 ,		// 0-14
		young: 1.5 ,	// 14-35
		middle: 1 ,		// 35-56
		old: 0.5		// 56+
	} )
	.split( 'family' , unit => {
		return {
			child: {
				single: 1 ,
				married: 0 ,
				widow: 0
			} ,
			young: {
				single: 5 ,
				married: 5 ,
				widow: 1
			} ,
			middle: {
				single: 1 ,
				married: 7 ,
				widow: 2
			} ,
			old: {
				single: 0.2 ,
				married: 6.5 ,
				widow: 3.5
			}
		}[ unit.data.age ] ;
	} )
	.split( 'role' , unit => {
		if ( unit.data.gender === 'male' ) {
			if ( unit.data.age === 'child' ) {
				return {
					active: 0 ,
					house: 1 ,
					pregnant: 0
				} ;
			}
			
			if ( unit.data.age === 'old' ) {
				return {
					active: 1 ,
					house: 1 ,
					pregnant: 0
				} ;
			}

			// young and middle-aged
			return {
				active: 1 ,
				house: 0 ,
				pregnant: 0
			} ;
		}
		
		// Women
		
		if ( unit.data.age === 'child' ) {
			return {
				active: 0 ,
				house: 1 ,
				pregnant: 0
			} ;
		}
		
		if ( unit.data.family === 'married' ) {
			if ( unit.data.age === 'young' ) {
				return {
					active: 1 ,
					house: 3 ,
					pregnant: 1
				} ;
			}

			if ( unit.data.age === 'middle' ) {
				return {
					active: 0.5 ,
					house: 4 ,
					pregnant: 0.2
				} ;
			}

			// old
			return {
				active: 0.2 ,
				house: 4 ,
				pregnant: 0
			} ;
		}
		
		// Single/widow
		
		if ( unit.data.age === 'old' ) {
			return {
				active: 1 ,
				house: 2 ,
				pregnant: 0
			} ;
		}

		// yound and middle-aged
		return {
			active: 2 ,
			house: 1 ,
			pregnant: 0
		} ;
	} )
	.split( 'health' , {
		healthy: 10 ,
		wounded: 0.3 ,
		sick: 0.2 ,
		critical: 0.01		// Either badly wounded, badly sick, or a mix of the two, it can be lethal, restore
	} )
	// Clan mood, attitude toward the clan, clan-mate and especially cland leaders
	.split( 'mood' , {
		happy: 2 ,			// really happy, actively support/promote the clan and the leaders
		satisfied: 10 ,		// it's ok
		unsatisfied: 3 ,	// it's not ok, but it is still not a big deal
		unhappy: 1			// really unhappy and angry, could take action against the leaders or the clan anytime
	} ) ;

demo.sharedRandomRound() ;
console.log( 'Unit count:' , demo.units.length ) ;
//console.log( JSON.stringify( demo , null , '\t' ) ) ;
//console.log( JSON.stringify( demo.select( { caste: 'farmer' , role: 'active' } ) , null , '\t' ) ) ;
//console.log( JSON.stringify( demo.select( { caste: 'farmer' , role: 'active' } ).groupBy( 'age' ) , null , '\t' ) ) ;
//console.log( JSON.stringify( demo.select( { caste: 'farmer' , role: 'active' } ).countBy( 'age' ) , null , '\t' ) ) ;
console.log( JSON.stringify( demo.select( { caste: 'warrior' , role: 'active' } ).countBy( 'age' ) , null , '\t' ) ) ;

