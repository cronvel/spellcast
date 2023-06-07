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



/*
	KFG Expression custom operators
*/



const math = require( 'math-kit' ) ;
const rpgLib = require( './stdLib/rpgLib.js' ) ;
const BaseObject = require( './objects/BaseObject.js' ) ;
const getNamedParameters = require( 'kung-fig-expression/lib/getNamedParameters.js' ) ;


// Type-checkers

exports['is-role?'] = ( value , trueExpr = true , falseExpr = false ) =>
	value && typeof value === 'object' && value.__prototypeUID__ === 'spellcast/Role' ? trueExpr : falseExpr ;
exports['is-entity?'] = ( value , trueExpr = true , falseExpr = false ) =>
	value && typeof value === 'object' && value.__prototypeUID__ === 'spellcast/Entity' ? trueExpr : falseExpr ;
exports['is-item?'] = ( value , trueExpr = true , falseExpr = false ) =>
	value && typeof value === 'object' && value.__prototypeUID__ === 'spellcast/Item' ? trueExpr : falseExpr ;
exports['is-place?'] = ( value , trueExpr = true , falseExpr = false ) =>
	value && typeof value === 'object' && value.__prototypeUID__ === 'spellcast/Place' ? trueExpr : falseExpr ;



// Spellcast objects

exports['has-item'] = ( stack , item ) =>
	stack && typeof stack === 'object' && (
		Array.isArray( stack ) ? stack.includes( item ) :
		stack instanceof Set ? stack.has( item ) :
		//( stack.__prototypeUID__ === 'spellcast/Entity' || stack.__prototypeUID__ === 'spellcast/Place' ) ? stack.hasItem( item ) :
		typeof stack.hasItem === 'function' ? stack.hasItem( item ) :
		false
	) ;



// get-item-matching stack key value
// get-item-matching stack slot-type
// get-item-matching stack slot-type key value
exports['get-item-matching'] = ( stack , ... args ) =>
	stack && typeof stack === 'object' && (
		Array.isArray( stack ) || ( stack instanceof Set ) ?
			( args.length === 2 ? BaseObject.getStackedObjectMatching( stack , ... args ) : null ) :
			//stack.__prototypeUID__ === 'spellcast/Entity' && stack.getItemMatching( ... args )
			( typeof stack.getItemMatching === 'function' ? stack.getItemMatching( ... args ) : null )
	) ;



// get-item-list-matching stack key value
// get-item-list-matching stack slot-type
// get-item-list-matching stack slot-type key value
exports['get-item-list-matching'] = ( stack , ... args ) =>
	stack && typeof stack === 'object' && (
		Array.isArray( stack ) || ( stack instanceof Set ) ?
			( args.length === 2 ? BaseObject.getStackedObjectListMatching( stack , ... args ) : null ) :
			//stack.__prototypeUID__ === 'spellcast/Entity' && stack.getItemListMatching( ... args )
			( typeof stack.getItemListMatching === 'function' ? stack.getItemListMatching( ... args ) : null )
	) ;



exports['can-equip-item'] = ( entity , item ) =>
	entity && typeof entity === 'object' && entity.__prototypeUID__ === 'spellcast/Entity' && entity.canEquipItem( item ) ;



exports['has-equipped-item'] = ( entity , item ) =>
	entity && typeof entity === 'object' && entity.__prototypeUID__ === 'spellcast/Entity' && entity.hasEquippedItem( item ) ;



// get-equipped-item-matching entity key value
// get-equipped-item-matching entity slot-type
// get-equipped-item-matching entity slot-type key value
exports['get-equipped-item-matching'] = ( entity , ... args ) =>
	entity && typeof entity === 'object' && entity.__prototypeUID__ === 'spellcast/Entity' && entity.getEquippedItemMatching( ... args ) ;

// get-equipped-item-list-matching entity key value
// get-equipped-item-list-matching entity slot-type
// get-equipped-item-list-matching entity slot-type key value
exports['get-equipped-item-list-matching'] = ( entity , ... args ) =>
	entity && typeof entity === 'object' && entity.__prototypeUID__ === 'spellcast/Entity' && entity.getEquippedItemListMatching( ... args ) ;



// For consistency and backward compatibility's sake
exports['has-item-matching'] = ( ... args ) => !! exports['get-item-matching']( ... args ) ;
exports['has-equipped-item-matching'] = ( ... args ) => !! exports['get-equipped-item-matching']( ... args ) ;



// Randomness and RPG

exports.random = rpgLib.random ;
exports['random-element'] = rpgLib.randomElement ;

exports.D =
exports.dice =
exports['dice-roll'] = rpgLib.diceRoll ;



const SUCCESS_CHANCE_MAPPING = [ 'active' , 'passive' ] ;
exports['success-chance'] = ( ... args ) => {
	var params = getNamedParameters( args , SUCCESS_CHANCE_MAPPING , { active: 1 , passive: 1 } ) ;
	return rpgLib.successChance( params.active , params.passive , params ) ;
} ;



const SUCCESS_ROLL_MAPPING = [ 'active' , 'passive' ] ;
exports['success-roll'] = ( ... args ) => {
	var params = getNamedParameters( args , SUCCESS_ROLL_MAPPING , { active: 1 , passive: 1 } ) ;
	return rpgLib.successRoll( params.active , params.passive , params ) ;
} ;



const N_SUCCESS_ROLLS_MAPPING = [ 'n' , 'active' , 'passive' ] ;
exports['n-success-rolls'] = ( ... args ) => {
	var params = getNamedParameters( args , N_SUCCESS_ROLLS_MAPPING , { n: 1 , active: 1 , passive: 1 } ) ;
	return rpgLib.nSuccessRolls( params.n , params.active , params.passive , params ) ;
} ;



const CORRELATED_SUCCESS_ROLLS_MAPPING = [ 'active' , 'passives' ] ;
exports['correlated-success-rolls'] = ( ... args ) => {
	var params = getNamedParameters( args , CORRELATED_SUCCESS_ROLLS_MAPPING , { active: 1 , passives: 1 } ) ;
	return rpgLib.correlatedSuccessRolls(
		params.active ,
		Array.isArray( params.passives ) ? params.passives : [ params.passives ] ,
		params
	) ;
} ;



// Not sure about the function name
const MEAN_QUANTITY_MAPPING = [ 'active' , 'passive' , 'base' ] ;
exports['mean-quantity'] = ( ... args ) => {
	var params = getNamedParameters( args , MEAN_QUANTITY_MAPPING , { active: 1 , passive: 1 , base: 1 } ) ;
	return rpgLib.meanQuantity( params.active , params.passive , params.base , params ) ;
} ;



const QUANTITY_ROLL_MAPPING = [ 'active' , 'passive' , 'base' ] ;
exports['quantity-roll'] = ( ... args ) => {
	var params = getNamedParameters( args , QUANTITY_ROLL_MAPPING , { active: 1 , passive: 1 , base: 1 } ) ;
	return rpgLib.quantityRoll( params.active , params.passive , params.base , params ) ;
} ;



const SCORE_ROLL_MAPPING = [ 'stat' ] ;
exports['score-roll'] = ( ... args ) => {
	var params = getNamedParameters( args , SCORE_ROLL_MAPPING , { stat: 1 } ) ;
	return rpgLib.scoreRoll( params.stat , params ) ;
} ;



/*
	random-trial-successes n p
	* n: the number of trial
	* p: the probability of success for each independent trial
	* return: the random number of success
*/
//const NP_MAPPING = [ 'n' , 'p' ] ;
exports['random-trial-successes'] = rpgLib.randomTrialSuccesses ;



/*
	Return the probability at x for the Gaussian distribution or Normal Ditribution Function.

	* x: the x coordinate
	* u => µ: expected value (fr: esperance) or average value
	* s => sigma: standard deviation (fr: écart-type)

	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-df'] = math.stat.normalDf ;



/*
	Return the inverse of the Gaussian distribution's function or Normal Inverse Cumulative Distribution Function.

	* p: the probability value
	* u => µ: expected value (fr: esperance) or average value, this control the offset (Y-axis)
	* s => sigma: standard deviation (fr: écart-type), this control the scale (Y-axis)

	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-inv-cdf'] = math.stat.normalInvCdf ;



/*
	Return the inverse of the Gaussian distribution's function or Normal Inverse Cumulative Distribution Function.

	* x: the value
	* u => µ: expected value (fr: esperance) or average value, this control the offset (Y-axis)
	* s => sigma: standard deviation (fr: écart-type), this control the scale (Y-axis)

	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-cdf'] = math.stat.normalCdf ;



// Compute the stat value that is based on a skill
exports['skill'] = ( stat , skill , perLevelFactor , noviceFactor = 1 / perLevelFactor , statusFactor = 1 ) =>
	stat * statusFactor * ( skill >= 1 ? perLevelFactor ** ( skill - 1 ) : noviceFactor + ( 1 - noviceFactor ) * skill ) ;



// 'status' is a stat like health, e.g. below the threshold, a penalty is applied,
// the default power value ensures that only slight changes are applied just below the threshold,
// and the changes are more important close to 0.
exports['status-factor'] = ( status , threshold , power = 0.25 , min = 0.1 ) =>
	status >= threshold ? 1 :
	status <= 0 ? min :
	Math.max( min , ( status / threshold ) ** power ) ;



// Mix two stats, instead of using the average, use the stronger stats with the strongWeight, the other use ( 1 - strongWeight ).
// It's also possible to specify a different strongWeight for A and B.
exports['best-mix'] = ( a , b , strongWeightA = 0.7 , strongWeightB = strongWeightA ) =>
	a >= b ? a * strongWeightA + b * ( 1 - strongWeightA ) :
	b * strongWeightB + a * ( 1 - strongWeightB ) ;



// The function itself should know its identifier
for ( let key in exports ) {
	if ( ! exports[ key ].id ) { exports[ key ].id = key ; }
}

// Finally, inherit from shared operators
Object.assign( module.exports , require( 'spellcast-shared/lib/operators.js' ) ) ;

