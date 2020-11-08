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



/*
	KFG Expression custom operators
*/



const math = require( 'math-kit' ) ;
const rpgLib = require( './stdLib/rpgLib.js' ) ;
const BaseObject = require( './objects/BaseObject.js' ) ;
const getNamedParameters = require( 'kung-fig-expression/lib/getNamedParameters.js' ) ;



exports.random = rpgLib.random ;



exports['random-element'] = arg => {
	if ( ! Array.isArray( arg ) ) { return arg ; }
	return rpgLib.randomElement( arg ) ;
} ;



exports.D =
exports.dice =
exports['dice-roll'] = ( dices , faces ) => {
	return rpgLib.diceRoll( dices , faces ) ;
} ;



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
const MEAN_QUANTITY_MAPPING = [ 'active' , 'passive' ] ;
exports['mean-quantity'] = ( ... args ) => {
	var params = getNamedParameters( args , MEAN_QUANTITY_MAPPING , { active: 1 , passive: 1 } ) ;
	return rpgLib.meanQuantity( params.active , params.passive , params ) ;
} ;



const QUANTITY_ROLL_MAPPING = [ 'active' , 'passive' ] ;
exports['quantity-roll'] = ( ... args ) => {
	var params = getNamedParameters( args , QUANTITY_ROLL_MAPPING , { active: 1 , passive: 1 } ) ;
	return rpgLib.quantityRoll( params.active , params.passive , params ) ;
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



exports['is-role?'] = arg => arg && typeof arg === 'object' && arg.__prototypeUID__ === 'spellcast/Role' ;
exports['is-entity?'] = arg => arg && typeof arg === 'object' && arg.__prototypeUID__ === 'spellcast/Entity' ;
exports['is-item?'] = arg => arg && typeof arg === 'object' && arg.__prototypeUID__ === 'spellcast/Item' ;
exports['is-place?'] = arg => arg && typeof arg === 'object' && arg.__prototypeUID__ === 'spellcast/Place' ;



exports['has-item'] = ( stack , item ) => stack && typeof stack === 'object' && (
	Array.isArray( stack ) ?
		stack.includes( item ) :
		stack.__prototypeUID__ === 'spellcast/Entity' && stack.hasItem( item )
) ;



exports['can-equip-item'] = ( entity , item ) =>
	entity && typeof entity === 'object' && entity.__prototypeUID__ === 'spellcast/Entity' && entity.canEquipItem( item ) ;



exports['has-equipped-item'] = ( entity , item ) =>
	entity && typeof entity === 'object' && entity.__prototypeUID__ === 'spellcast/Entity' && entity.hasEquippedItem( item ) ;



exports['get-item-matching'] = ( stack , key , value ) => stack && typeof stack === 'object' && (
	Array.isArray( stack ) ?
		BaseObject.getStackedObjectMatching( stack , key , value ) :
		stack.__prototypeUID__ === 'spellcast/Entity' && stack.getItemMatching( key , value )
) ;



exports['get-equipped-item-matching'] = ( entity , key , value ) =>
	entity && typeof entity === 'object' && entity.__prototypeUID__ === 'spellcast/Entity' && entity.getEquippedItemMatching( key , value ) ;



// For consistency and backward compatibility's sake
exports['has-item-matching'] = ( ... args ) => !! exports['get-item-matching']( ... args ) ;
exports['has-equipped-item-matching'] = ( ... args ) => !! exports['get-equipped-item-matching']( args ) ;



// The function itself should know its identifier
for ( let key in exports ) {
	if ( ! exports[ key ].id ) { exports[ key ].id = key ; }
}

// Finally, inherit from shared operators
Object.assign( module.exports , require( 'spellcast-shared/lib/operators.js' ) ) ;

