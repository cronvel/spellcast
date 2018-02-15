/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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
	KFG expression custom operators
*/



var math = require( 'math-kit' ) ;
var rpgLib = require( './rpg/rpgLib.js' ) ;
var Item = require( './rpg/Item.js' ) ;



exports.random = function random( args ) {
	return rpgLib.random( ... args ) ;
} ;



exports['random-element'] = function randomElement( args ) {
	if ( ! Array.isArray( args[ 0 ] ) ) { return args[ 0 ] ; }
	return rpgLib.randomElement( args[ 0 ] ) ;
} ;



exports.D =
exports.dice =
exports['dice-roll'] = function diceRoll( args ) {
	return rpgLib.diceRoll( args[ 0 ] , args[ 1 ] ) ;
} ;



exports['success-chance'] = function successChance( args ) {
	return rpgLib.successChance(
		args[ 0 ] || 1 ,
		args[ 1 ] || 1 ,
		args[ 2 ] && typeof args[ 2 ] === 'object' ? args[ 2 ] : {}
	) ;
} ;



exports['success-roll'] = function successRoll( args ) {
	return rpgLib.successRoll(
		args[ 0 ] || 1 ,
		args[ 1 ] || 1 ,
		args[ 2 ] && typeof args[ 2 ] === 'object' ? args[ 2 ] : {}
	) ;
} ;



exports['n-success-rolls'] = function nSuccessRolls( args ) {
	return rpgLib.nSuccessRolls(
		args[ 0 ] || 1 ,
		args[ 1 ] || 1 ,
		args[ 2 ] || 1 ,
		args[ 3 ] && typeof args[ 3 ] === 'object' ? args[ 3 ] : {}
	) ;
} ;



exports['correlated-success-rolls'] = function correlatedSuccessRolls( args ) {
	return rpgLib.correlatedSuccessRolls(
		args[ 0 ] || 1 ,
		Array.isArray( args[ 1 ] ) ? args[ 1 ] : [ args[ 1 ] ] ,
		args[ 2 ] && typeof args[ 2 ] === 'object' ? args[ 2 ] : {}
	) ;
} ;



// Not sure about the function name
exports['mean-quantity'] = function meanQuantity( args ) {
	return rpgLib.meanQuantity(
		args[ 0 ] || 1 ,
		args[ 1 ] || 1 ,
		args[ 2 ] && typeof args[ 2 ] === 'object' ? args[ 2 ] : {}
	) ;
} ;



exports['quantity-roll'] = function quantityRoll( args ) {
	return rpgLib.quantityRoll(
		args[ 0 ] || 1 ,
		args[ 1 ] || 1 ,
		args[ 2 ] && typeof args[ 2 ] === 'object' ? args[ 2 ] : {}
	) ;
} ;



exports['score-roll'] = function scoreRoll( args ) {
	return rpgLib.scoreRoll(
		args[ 0 ] ,
		args[ 1 ] && typeof args[ 1 ] === 'object' ? args[ 1 ] : {}
	) ;
} ;



/*
	random-trial-successes n p
	* n: the number of trial
	* p: the probability of success for each independent trial
	* return: the random number of success
*/
exports['random-trial-successes'] = function randomTrialSuccesses( args ) {
	return rpgLib.randomTrialSuccesses( args[ 0 ] , args[ 1 ] ) ;
} ;



/*
	Return the probability at x for the Gaussian distribution or Normal Ditribution Function.

	* x: the x coordinate
	* u => µ: expected value (fr: esperance) or average value
	* s => sigma: standard deviation (fr: écart-type)

	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-df'] = function normalDf( args ) {
	return math.stat.normalDf( args[ 0 ] , args[ 1 ] , args[ 2 ] ) ;
} ;



/*
	Return the inverse of the Gaussian distribution's function or Normal Inverse Cumulative Distribution Function.

	* p: the probability value
	* u => µ: expected value (fr: esperance) or average value, this control the offset (Y-axis)
	* s => sigma: standard deviation (fr: écart-type), this control the scale (Y-axis)

	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-inv-cdf'] = function normalInvCdf( args ) {
	return math.stat.normalInvCdf( args[ 0 ] , args[ 1 ] , args[ 2 ] ) ;
} ;



/*
	Return the inverse of the Gaussian distribution's function or Normal Inverse Cumulative Distribution Function.

	* x: the value
	* u => µ: expected value (fr: esperance) or average value, this control the offset (Y-axis)
	* s => sigma: standard deviation (fr: écart-type), this control the scale (Y-axis)

	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-cdf'] = function normalCdf( args ) {
	return math.stat.normalCdf( args[ 0 ] , args[ 1 ] , args[ 2 ] ) ;
} ;



exports['is-role?'] = function isRole( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Role' ;
} ;



exports['is-entity?'] = function isEntity( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Entity' ;
} ;



exports['is-item?'] = function isItem( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Item' ;
} ;



exports['has-item'] = function hasItem( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && (
		Array.isArray( args[ 0 ] ) ?
			args[ 0 ].indexOf( args[ 1 ] ) !== -1 :
			args[ 0 ].__prototypeUID__ === 'spellcast/Entity' && args[ 0 ].hasItem( args[ 1 ] )
	) ;
} ;



exports['can-equip-item'] = function canEquipItem( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Entity' &&
		args[ 0 ].canEquipItem( args[ 1 ] ) ;
} ;



exports['has-equipped-item'] = function hasEquippedItem( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Entity' &&
		args[ 0 ].hasEquippedItem( args[ 1 ] ) ;
} ;



exports['get-item-matching'] = function getItemMatching( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && (
		Array.isArray( args[ 0 ] ) ?
			Item.getStackedItemMatching( args[ 0 ] , args[ 1 ] , args[ 2 ] ) :
			args[ 0 ].__prototypeUID__ === 'spellcast/Entity' && args[ 0 ].getItemMatching( args[ 1 ] , args[ 2 ] )
	) ;
} ;



exports['get-equipped-item-matching'] = function getEquippedItemMatching( args ) {
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Entity' &&
		args[ 0 ].getEquippedItemMatching( args[ 1 ] , args[ 2 ] ) ;
} ;



// For consistency and backward compatibility's sake
exports['has-item-matching'] = function hasItemMatching( args ) { return !! exports['get-item-matching']( args ) ; } ;
exports['has-equipped-item-matching'] = function hasEquippedItemMatching( args ) { return !! exports['get-equipped-item-matching']( args ) ; } ;



/*
	Rebased power

	syntax: base ^° exp [rebase]
	formula: rebase * ( base / rebase ) ^ exp
	rebase default value: 10
*/
exports['^°'] = function( args ) {
	var rebase = args[ 2 ] || 10 ;
	return rebase * Math.pow( args[ 0 ] / rebase , args[ 1 ] ) ;
} ;


