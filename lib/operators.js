/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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



var math = require( 'math-kit' ) ;
var Item = require( './rpg/Item.js' ) ;



var rng ;



function initRng()
{
	rng = new math.random.MersenneTwister() ;
	rng.betterInit() ;
}



exports.D =
exports.dice = function dice( args )
{
	if ( ! rng ) { initRng() ; }
	return rng.dice( args[ 0 ] , args[ 1 ] ) ;
} ;



exports.random = function random( args )
{
	if ( ! rng ) { initRng() ; }
	
	if ( args.length === 0 ) { return rng.random() ; }
	if ( args.length === 1 ) { return rng.random( 0 , Math.round( args[ 0 ] ) ) ; }
	else { return rng.random( Math.round( args[ 0 ] ) , Math.round( args[ 1 ] ) ) ; }
} ;



exports['random-element'] = function randomElement( args )
{
	if ( ! Array.isArray( args[ 0 ] ) ) { return args[ 0 ] ; }
	
	if ( ! rng ) { initRng() ; }
	
	return rng.randomElement( args[ 0 ] ) ;
} ;



exports['random-event-count'] = function randomEventCount( args )
{
	if ( ! rng ) { initRng() ; }
	return rng.randomEventCount( args[ 0 ] , args[ 1 ] ) ;
} ;



/*
	Return the probability at x for the Gaussian distribution or Normal Ditribution Function.
	
	* x: the x coordinate
	* u => µ: expected value (fr: esperance) or average value
	* s => sigma: standard deviation (fr: écart-type)
	
	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-df'] = function normalDf( args )
{
	return math.stat.normalDf( args[ 0 ] , args[ 1 ] , args[ 2 ] ) ;
} ;



/*
	Return the inverse of the Gaussian distribution's function or Normal Inverse Cumulative Distribution Function.
	This is the Holy Grail of role-player ;)
	
	* p: the probability value
	* u => µ: expected value (fr: esperance) or average value, this control the offset (Y-axis)
	* s => sigma: standard deviation (fr: écart-type), this control the scale (Y-axis)
	
	If µ=0 and sigma=1 (the default), this is the normal distribution reduced and centered.
*/
exports['normal-inv-cdf'] = function normalInvCdf( args )
{
	return math.stat.normalInvCdf( args[ 0 ] , args[ 1 ] , args[ 2 ] ) ;
} ;



exports['is-role?'] = function isRole( args )
{
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Role' ;
} ;



exports['is-entity?'] = function isEntity( args )
{
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Entity' ;
} ;



exports['is-item?'] = function isItem( args )
{
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Item' ;
} ;



exports['has-item'] = function hasItem( args )
{
	return args[ 0 ] && typeof args[ 0 ] === 'object' && (
		Array.isArray( args[ 0 ] ) ?
			args[ 0 ].indexOf( args[ 1 ] ) !== -1 :
			args[ 0 ].__prototypeUID__ === 'spellcast/Entity' && args[ 0 ].hasItem( args[ 1 ] )
	) ;
} ;



exports['has-equipped-item'] = function hasEquippedItem( args )
{
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Entity' &&
		args[ 0 ].hasEquippedItem( args[ 1 ] ) ;
} ;



exports['get-item-matching'] = function getItemMatching( args )
{
	return args[ 0 ] && typeof args[ 0 ] === 'object' && (
		Array.isArray( args[ 0 ] ) ?
			Item.getStackedItemMatching( args[ 0 ] , args[ 1 ] , args[ 2 ] ) :
			args[ 0 ].__prototypeUID__ === 'spellcast/Entity' && args[ 0 ].getItemMatching( args[ 1 ] , args[ 2 ] )
	) ;
} ;



exports['get-equipped-item-matching'] = function getEquippedItemMatching( args )
{
	return args[ 0 ] && typeof args[ 0 ] === 'object' && args[ 0 ].__prototypeUID__ === 'spellcast/Entity' &&
		args[ 0 ].getEquippedItemMatching( args[ 1 ] , args[ 2 ] ) ;
} ;



// For consistency and backward compatibility's sake
exports['has-item-matching'] = function hasItemMatching( args ) { return !! exports['get-item-matching']( args ) ; } ;
exports['has-equipped-item-matching'] = function hasEquippedItemMatching( args ) { return !! exports['get-equipped-item-matching']( args ) ; } ;


