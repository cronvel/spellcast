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



const math = require( 'math-kit' ) ;
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



const rpgLib = {} ;
module.exports = rpgLib ;



var rng ;



function initRng() {
	rng = new math.random.MersenneTwister() ;
	rng.betterInit() ;
}



rpgLib.random = ( n1 , n2 ) => {
	if ( ! rng ) { initRng() ; }

	if ( n1 === undefined ) { return rng.random() ; }
	if ( n2 === undefined ) { return rng.random( 0 , Math.round( n1 ) ) ; }
	return rng.random( Math.round( n1 ) , Math.round( n2 ) ) ;
} ;



rpgLib.randomTrialSuccesses = ( n , chance ) => {
	if ( ! rng ) { initRng() ; }

	// BE CAREFUL: arguments are not in the same order than those of math-kit
	return rng.randomTrialSuccesses( chance , n ) ;
} ;



rpgLib.randomElement = array => {
	if ( ! Array.isArray( array ) ) { return array ; }

	if ( ! rng ) { initRng() ; }

	return rng.randomElement( array ) ;
} ;



rpgLib.diceRoll = ( numberOfDice , numberOfFaces ) => {
	if ( ! rng ) { initRng() ; }
	return rng.dice( numberOfDice , numberOfFaces ) ;
} ;



/*
	Compute success chance.

	* active is the active stat value performing the action
	* passive is the passive stat against whom the active is performing
	* base (default: 0.5, 50%) is the chance of the action succeeding when the active and passive stats are equal
	* overpower (default: 1, no overpower) affect how bigger stats overpower lower stats, default to 1.
	  It effectively works with a power formula.
	  Good values are floats between 1 and 3, eventually up to 4.
	  Example with the chance of success/failure of an active stat that is twice the passive stat:
		* overpower=1 : 2/3 67%/33%
		* overpower=1.5 : 74%/26%
		* overpower=2 : 4/5 80%/20%
		* overpower=2.5 : 85%/15%
		* overpower=3 : 8/9 89%/11%
		* overpower=3.5 : 92%/8%
		* overpower=4 : 16/17 94%/6%
*/
rpgLib.successChance = ( active , passive = 1 , options = {} ) => {
	if ( ! passive ) { return true ; }
	if ( ! active ) { return false ; }


	// Manage arguments: it should support both Spellcast Scripting convention and JS convention
	var base = typeof options.base === 'number' ? options.base : 0.5 ,
		overpower = + options.overpower || 1 ;

	// Reduce active stat to its rate against a passive of 1
	var activeRate = active / passive ;

	// Must come BEFORE the neutral point computing
	if ( overpower !== 1 ) { activeRate = Math.pow( activeRate , overpower ) ; }

	// Must come AFTER overpowering computing
	if ( base !== 0.5 ) { activeRate *= base / ( 1 - base ) ; }

	var chance = activeRate / ( activeRate + 1 ) ;

	return chance ;
} ;



/*
	Perform a test and return true/false if the test succeed/failed.

	* active, passive, base and overpower: same than .successChance()
*/
rpgLib.successRoll = ( active , passive = 1 , options = {} ) => {
	if ( ! rng ) { initRng() ; }

	var chance = rpgLib.successChance( active , passive , options ) ;

	return rng.random() < chance ;
} ;



/*
	Correlated success tests: they all use the same random value.

	* active, base and overpower: same than .successChance()
	* passiveList: array of passive stats.
*/
rpgLib.correlatedSuccessRolls = ( active , passiveList , options = {} ) => {
	if ( ! rng ) { initRng() ; }

	var random = rng.random() ;

	return passiveList.map( passive => random < rpgLib.successChance( active , passive , options ) ) ;
} ;



/*
	Like .successRoll() but perform n-tests.
	Return the number of successes.

	* active, passive, base and overpower: same than .successChance()
	* n: the number of tests
*/
rpgLib.nSuccessRolls = ( n , active , passive = 1 , options = {} ) => {
	if ( ! rng ) { initRng() ; }

	var chance = rpgLib.successChance( active , passive , options ) ;

	return rng.randomTrialSuccesses( chance , n ) ;
} ;



// Not sure about the function name
/*
	Compute the mean quantity.

	* active is the active stat value performing the action
	* passive is the passive stat against whom the active is performing
	* base (default: 10) is the quantity when the active and passive stats are equal
	* overpower (default: 1, no overpower) affect how bigger stats overpower lower stats, default to 1.
*/
rpgLib.meanQuantity = ( active , passive = 1 , base = 1 , options = {} ) => {
	if ( ! passive ) { return Infinity ; }
	if ( ! active ) { return 0 ; }

	// Manage arguments: it should support both Spellcast Scripting convention and JS convention
	var overpower = + options.overpower || 1 ;

	// Reduce active stat to its rate against a passive of 1
	var activeRate = active / passive ;

	// Overpowering
	if ( overpower !== 1 ) { activeRate = Math.pow( activeRate , overpower ) ; }

	return base * activeRate ;
} ;



/*
	Perform a test that return a quantity, based on a neutral-point (average value when both stat are equals),
	and some randomness using the deviation.

	* active, passive, base and overpower: same than .meanQuantity()
	* criticalChance: the chance of generating a quantity inside the "critical" area.
	  This also means that the "fumble" area have the same chance.
	  Must be > 0 and < 0.5, default: 0.05.
	* criticalFactor: this define the limit between "normal" and "critical" area, as a rate of the base quantity.
	  Also affect the chance to nullify the quantity.
	  Must be > 1, default: 2.
	* round: (default: false) if true, the final quantity is rounded to the closest integer
*/
rpgLib.quantityRoll = ( active , passive = 1 , base = 1 , options = {} ) => {
	if ( ! rng ) { initRng() ; }

	var quantity , meanQuantity , sigma , criticalChance , criticalFactor , minLimit , maxLimit , rate ,
		round = !! options.round ;

	// Manage arguments: it should support both Spellcast Scripting convention and JS convention
	if ( typeof options['critical-chance'] === 'number' ) { criticalChance = options['critical-chance'] ; }
	else if ( typeof options.criticalChance === 'number' ) { criticalChance = options.criticalChance ; }
	else { criticalChance = 0.05 ; }

	if ( typeof options['critical-factor'] === 'number' ) { criticalFactor = options['critical-factor'] ; }
	else if ( typeof options.criticalFactor === 'number' ) { criticalFactor = options.criticalFactor ; }
	else { criticalFactor = 2 ; }

	meanQuantity = rpgLib.meanQuantity( active , passive , base , options ) ;
	sigma = ( criticalFactor - 1 ) / math.stat.normalInvCdf( 1 - criticalChance ) ;

	var random = rng.random() ;

	if ( random >= 0.5 ) {
		quantity = meanQuantity * math.stat.normalInvCdf( random , 1 , sigma ) ;
	}
	else {
		quantity = meanQuantity / math.stat.normalInvCdf( 1 - random , 1 , sigma ) ;
	}

	if ( options.absorption ) {
		// First, figure out the limit, below everything is fully absorbed
		maxLimit = rpgLib.successChance( passive , active , options ) * options.absorption ;
		minLimit = maxLimit / 2 ;
		//console.log( "limit:" , minLimit , '-' , maxLimit , "random:" , random ) ;
		
		if ( random <= minLimit ) {
			quantity = 0 ;
		}
		else if ( random < maxLimit ) {
			rate = ( random - minLimit ) / ( maxLimit - minLimit ) ;	// <-- LERP
			//console.log( "rate:" , rate ) ;
			quantity *= rate ;
		}
	}

	if ( quantity < 0 ) { quantity = 0 ; }	// Defensive, should not happen except if some bad float rounding occurs
	else if ( round ) { quantity = Math.round( quantity ) ; }

	return quantity ;
} ;



/*
	Perform a test that return a score based upon a stat, e.g. a randomization around the stat value.

	* stat: the stat value to randomize
	* criticalChance, criticalFactor, lowerDivide, round: same than .quantityRoll()
	* overpower-spread: spread around the stat in a way that would permit to emulate a success-roll
	  by comparing the 2 score-roll of 2 different stats (where overpower-spread is used as overpower).
	  This is NOT 100%  EXACT, it is an APPROXIMATION, it starts diverging below 9% of success-rate
	  and it falls very fast after that value.
*/
rpgLib.scoreRoll = ( stat , options = {} ) => {
	// Mostly like .quantityRoll()
	if ( ! rng ) { initRng() ; }

	var score , overpowerSpread , criticalChance , criticalFactor , lowerDivide , sigma ,
		round = !! options.round ,
		random = rng.random() ;


	if ( options['overpower-spread'] || options.overpowerSpread ) {
		overpowerSpread = + ( options['overpower-spread'] || options.overpowerSpread ) || 1 ;
		criticalFactor = 2 ;

		// It should be exactly 1/3, but it seems to works better with 0.35
		//criticalChance = 1 / 3 ;
		criticalChance = 0.35 ;

		sigma = ( criticalFactor - 1 ) / math.stat.normalInvCdf( 1 - criticalChance ) ;

		// Lower-divide is forced on this mode
		if ( random >= 0.5 ) {
			score = stat * ( math.stat.normalInvCdf( random , 1 , sigma ) ** ( 1 / overpowerSpread ) ) ;
		}
		else {
			score = stat / ( math.stat.normalInvCdf( 1 - random , 1 , sigma ) ** ( 1 / overpowerSpread ) ) ;
		}
	}
	else {
		// Manage arguments: it should support both Spellcast Scripting convention and JS convention
		if ( typeof options['critical-chance'] === 'number' ) { criticalChance = options['critical-chance'] ; }
		else if ( typeof options.criticalChance === 'number' ) { criticalChance = options.criticalChance ; }
		else { criticalChance = 0.05 ; }

		if ( typeof options['critical-factor'] === 'number' ) { criticalFactor = options['critical-factor'] ; }
		else if ( typeof options.criticalFactor === 'number' ) { criticalFactor = options.criticalFactor ; }
		else { criticalFactor = 2 ; }

		sigma = ( criticalFactor - 1 ) / math.stat.normalInvCdf( 1 - criticalChance ) ;

		if ( random >= 0.5 ) {
			score = stat * math.stat.normalInvCdf( random , 1 , sigma ) ;
		}
		else {
			score = stat / math.stat.normalInvCdf( 1 - random , 1 , sigma ) ;
		}
	}

	if ( score < 0 ) { score = 0 ; }	// Defensive, should not happen except if some bad float rounding occurs
	else if ( round ) { score = Math.round( score ) ; }

	return score ;
} ;



// This is just an utility function to test the overpower-spread feature
rpgLib.testScoreRollOverpowerSpread = ( active , passive , overpowerSpread = 1 , count = 100 ) => {
	var i , rate , sum = 0 ;
	for ( i = 0 ; i < count ; i ++ ) {
		if ( rpgLib.scoreRoll( active , { overpowerSpread } ) > rpgLib.scoreRoll( passive , { overpowerSpread } ) ) {
			sum ++ ;
		}
	}
	
	rate = sum / count ;
	console.log( "Expected:" , rpgLib.successChance( active , passive , { overpower: overpowerSpread } ) , "; got:" , rate ) ;
} ;

