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



var Dynamic = require( 'kung-fig' ).Dynamic ;



function Applicable() { throw new Error( 'Use Applicable.create() instead.' ) ; }
module.exports = Applicable ;

Applicable.prototype.__prototypeUID__ = 'spellcast/Applicable' ;
Applicable.prototype.__prototypeVersion__ = require( '../package.json' ).version ;
Applicable.prototype.__isApplicable__ = true ;



Applicable.create = function create( dynamic )
{
	var self = Object.create( Applicable.prototype , {
		dynamic: { value: dynamic }
	} ) ;
	
	return self ;
} ;



Applicable.prototype.apply = function apply( ctx )
{
	return Dynamic.getRecursiveFinalValue( this.dynamic , ctx ) ;
} ;



Applicable.apply = function apply( value , ctx )
{
	value = Dynamic.getRecursiveFinalValue( value , ctx ) ;
	if ( value && typeof value === 'object' && value.__isApplicable__ ) { value = value.apply( ctx ) ; }
	return value ;
} ;


