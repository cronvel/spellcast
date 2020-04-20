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



const math = require( 'math-kit' ) ;
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



const rpgLib = {} ;
module.exports = rpgLib ;



var rng ;



function initRng() {
	rng = new math.random.MersenneTwister() ;
	rng.betterInit() ;
}



rpgLib.random = function( n1 , n2 ) {
	if ( ! rng ) { initRng() ; }

	if ( n1 === undefined ) { return rng.random() ; }
	if ( n2 === undefined ) { return rng.random( 0 , Math.round( n1 ) ) ; }
	return rng.random( Math.round( n1 ) , Math.round( n2 ) ) ;
} ;



rpgLib.randomTrialSuccesses = function( n , chance ) {
	if ( ! rng ) { initRng() ; }

	// BE CAREFUL: arguments are not in the same order than those of math-kit
	return rng.randomTrialSuccesses( chance , n ) ;
} ;



rpgLib.randomElement = function( array ) {
	if ( ! Array.isArray( array ) ) { return array ; }

	if ( ! rng ) { initRng() ; }

	return rng.randomElement( array ) ;
} ;



rpgLib.diceRoll = function( numberOfDice , numberOfFaces ) {
	if ( ! rng ) { initRng() ; }
	return rng.dice( numberOfDice , numberOfFaces ) ;
} ;



/*
	Compute success chance.

	* active is the active stat value performing the action
	* passive is the passive stat against whom the active is performing
	* base (default: 0.5, 50%) is the chance of the action succeeding when the active and passive stats are equal
	* overPower (default: 1, no over-power) affect how bigger stats over-power lower stats, default to 1.
	  It effectively works with a power formula.
	  Good values are floats between 1 and 3, eventually up to 4.
	  Example with the chance of success/failure of an active stat that is twice the passive stat:
		* overPower=1 : 2/3 67%/33%
		* overPower=1.5 : 74%/26%
		* overPower=2 : 4/5 80%/20%
		* overPower=2.5 : 85%/15%
		* overPower=3 : 8/9 89%/11%
		* overPower=3.5 : 92%/8%
		* overPower=4 : 16/17 94%/6%
*/
rpgLib.successChance = function( active , passive = 1 , options = {} ) {
	if ( ! passive ) { return true ; }
	if ( ! active ) { return false ; }


	// Manage arguments: it should support both Spellcast Scripting convention and JS convention
	var base = typeof options.base === 'number' ? options.base : 0.5 ,
		overPower ;

	if ( typeof options['over-power'] === 'number' ) { overPower = options['over-power'] ; }
	else if ( typeof options.overPower === 'number' ) { overPower = options.overPower ; }
	else { overPower = 1 ; }


	// Reduce active stat to its rate against a passive of 1
	var activeRate = active / passive ;

	// Must come BEFORE the neutral point computing
	if ( overPower !== 1 ) { activeRate = Math.pow( activeRate , overPower ) ; }

	// Must come AFTER overPowering computing
	if ( base !== 0.5 ) { activeRate *= base / ( 1 - base ) ; }

	var chance = activeRate / ( activeRate + 1 ) ;

	return chance ;
} ;



/*
	Perform a test and return true/false if the test succeed/failed.

	* active, passive, base and overPower: same than .successChance()
*/
rpgLib.successRoll = function( active , passive = 1 , options = {} ) {
	if ( ! rng ) { initRng() ; }

	var chance = rpgLib.successChance( active , passive , options ) ;

	return rng.random() < chance ;
} ;



/*
	Correlated success tests: they all use the same random value.

	* active, base and overPower: same than .successChance()
	* passiveList: array of passive stats.
*/
rpgLib.correlatedSuccessRolls = function( active , passiveList , options = {} ) {
	if ( ! rng ) { initRng() ; }

	var random = rng.random() ;

	return passiveList.map( passive => random < rpgLib.successChance( active , passive , options ) ) ;
} ;



/*
	Like .successRoll() but perform n-tests.
	Return the number of successes.

	* active, passive, base and overPower: same than .successChance()
	* n: the number of tests
*/
rpgLib.nSuccessRolls = function( n , active , passive = 1 , options = {} ) {
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
	* overPower (default: 1, no over-power) affect how bigger stats over-power lower stats, default to 1.
*/
rpgLib.meanQuantity = function( active , passive = 1 , options = {} ) {
	if ( ! passive ) { return Infinity ; }
	if ( ! active ) { return 0 ; }


	// Manage arguments: it should support both Spellcast Scripting convention and JS convention
	var base = typeof options.base === 'number' ? options.base : 10 ,
		overPower ;

	if ( typeof options['over-power'] === 'number' ) { overPower = options['over-power'] ; }
	else if ( typeof options.overPower === 'number' ) { overPower = options.overPower ; }
	else { overPower = 1 ; }


	// Reduce active stat to its rate against a passive of 1
	var activeRate = active / passive ;

	// Must come BEFORE the neutral point computing
	if ( overPower !== 1 ) { activeRate = Math.pow( activeRate , overPower ) ; }

	// Must come AFTER overPowering computing
	var baseQuantity = base * activeRate ;

	return baseQuantity ;
} ;



/*
	Perform a test that return a quantity, based on a neutral-point (average value when both stat are equals),
	and some randomness using the deviation.

	* active, passive, base and overPower: same than .meanQuantity()
	* criticalChance: the chance of generating a quantity inside the "critical" area.
	  Greater values also generate more nullified quantity if lowerDivide is false.
	  Must be > 0 and < 0.5, default: 0.05.
	* criticalFactor: this define the limit between "normal" and "critical" area, as a rate of the base quantity.
	  Also affect the chance to nullify the quantity.
	  Must be > 1, default: 2.
	* lowerDivide: (default: true) if true, lower probabilities (<0.5) are converted to the inverse of its upper counterpart.
	  E.g.: for sigma=1 and random=31 (=-1 sigma):
	  	* lowerDivide=true: output is 50%
	  	* lowerDivide=false: output is 0%
	  True is great for things like mana consumption, false is great for damage calculation, e.g. anything that
	  should go down easily to zero.
	* round: (default: false) if true, the final quantity is rounded to the closest integer
*/
rpgLib.quantityRoll = function( active , passive = 1 , options = {} , baseQuantity = null ) {
	if ( ! rng ) { initRng() ; }


	// Manage arguments: it should support both Spellcast Scripting convention and JS convention
	var round = !! options.round ,
		criticalChance , criticalFactor , lowerDivide ;

	if ( typeof options['critical-chance'] === 'number' ) { criticalChance = options['critical-chance'] ; }
	else if ( typeof options.criticalChance === 'number' ) { criticalChance = options.criticalChance ; }
	else { criticalChance = 0.05 ; }

	if ( typeof options['critical-factor'] === 'number' ) { criticalFactor = options['critical-factor'] ; }
	else if ( typeof options.criticalFactor === 'number' ) { criticalFactor = options.criticalFactor ; }
	else { criticalFactor = 2 ; }

	if ( options['lower-divide'] === undefined ) { lowerDivide = true ; }
	else { lowerDivide = !! options['lower-divide'] ; }


	if ( typeof baseQuantity !== 'number' ) {
		baseQuantity = rpgLib.meanQuantity( active , passive , options ) ;
	}

	var sigma = ( criticalFactor - 1 ) / math.stat.normalInvCdf( 1 - criticalChance ) ;

	var random = rng.random() ;
	var quantity ;

	if ( random > 0.5 || ! lowerDivide ) {
		quantity = baseQuantity * math.stat.normalInvCdf( random , 1 , sigma ) ;
	}
	else {
		quantity = baseQuantity / math.stat.normalInvCdf( 1 - random , 1 , sigma ) ;
	}

	if ( quantity < 0 ) { quantity = 0 ; }
	else if ( round ) { quantity = Math.round( quantity ) ; }

	return quantity ;
} ;



/*
	Perform a test that return a score based upon a stat, e.g. a randomization around the stat value.

	* stat: the stat value to randomize
	* criticalChance, criticalFactor, lowerDivide, round: same than .quantityRoll()
*/
rpgLib.scoreRoll = function( stat , options = {} ) {
	// Almost like .quantityRoll()
	return rpgLib.quantityRoll( undefined , undefined , options , stat ) ;
} ;

