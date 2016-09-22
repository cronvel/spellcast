/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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

var rng ;



function initRng()
{
	rng = new math.random.MersenneTwister() ;
	rng.betterInit() ;
}



exports.D = function dice( args )
{
	if ( ! rng ) { initRng() ; }
	
	var numberOfDice = args[ 0 ] ,
		numberOfFaces = args[ 1 ] ,
		sum = 0 ;
	
	for ( ; numberOfDice > 0 ; numberOfDice -- ) { sum += rng.random( 1 , numberOfFaces ) ; }
	
	return sum ;
} ;



exports.random = function random( args )
{
	if ( ! rng ) { initRng() ; }
	
	if ( args.length === 0 ) { return rng.random() ; }
	if ( args.length === 1 ) { return rng.random( 0 , Math.round( args[ 0 ] ) ) ; }
	else { return rng.random( Math.round( args[ 0 ] ) , Math.round( args[ 1 ] ) ) ; }
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


