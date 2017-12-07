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



// Transform alphanum separated by underscore or minus to camel case
function dashToCamel( str )
{
	return str.replace( /-(.)?/g , ( match , letter ) => letter ? letter.toUpperCase() : '' ) ;
}



exports.dashToCamelProps = function dashToCamelProps( input , recursive )
{
	var output = Array.isArray( input ) ? [] : {} ;
	
	Object.keys( input ).forEach( prop => {
		var value = input[ prop ] ;
		
		if (
			recursive && value && typeof value === 'object' &&
			( Array.isArray( value ) || Object.getPrototypeOf( value ) === Object.prototype )
		)
		{
			value = dashToCamelProps( value , true ) ;
		}
		
		output[ dashToCamel( prop ) ] = value ;
	} ) ;
	
	return output ;
} ;



exports.inPlaceDashToCamelProps = function inPlaceDashToCamelProps( data , recursive )
{
	Object.keys( data ).forEach( prop => {
		
		var camelProp = dashToCamel( prop ) ;
		var value = data[ prop ] ;
		
		if (
			recursive && value && typeof value === 'object' &&
			( Array.isArray( value ) || Object.getPrototypeOf( value ) === Object.prototype )
		)
		{
			inPlaceDashToCamelProps( value , true ) ;
		}
		
		if ( prop !== camelProp )
		{
			data[ camelProp ] = value ;
			delete data[ prop ] ;
		}
	} ) ;
	
	return data ;
} ;

