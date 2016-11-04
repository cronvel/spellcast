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



var engine = {} ;
module.exports = engine ;



// /!\ run() and init() has a lot of code in common, and since it should run FAST,
// we can't share code and use conditional statements.

// This implements the “maybe async” kinjutsu, however that's the very nature
// of the spellcast scripting to abstract those things.
// It should run as fast as possible.
engine.run = function run( tagContainer , book , context , callback )
{
	var tag , returnVal ,
		callCount = 0 ,
		i = 0 ,
		iMax = tagContainer.children.length ;
	
	var nextSyncChunk = function( error )
	{
		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check callCount here.
		if ( error ) { callback( error ) ; return ; }
		
		callCount ++ ;
		
		while ( i < iMax )
		{
			tag = tagContainer.children[ i ] ;
			i ++ ;
			
			if ( ! tag.run ) { continue ; }
			
			returnVal = tag.run( book , context , nextSyncChunk ) ;
			
			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }
			
			// Truthy value: an error or an interruption had happened
			if ( returnVal )
			{
				if ( callCount <= 1 ) { return returnVal ; }
				else { callback( returnVal ) ; return ; }
			}
		}
		
		if ( callCount <= 1 ) { return null ; }
		else { callback() ; return ; }
	} ;
	
	return nextSyncChunk() ;
} ;



engine.init = function init( tagContainer , book , callback )
{
	var tag , returnVal ,
		callCount = 0 ,
		// we have to copy the array now, because some tags (e.g. the [module] tag) modify the container on init
		tags = tagContainer.children.slice() ,
		i = 0 ,
		iMax = tags.length ;
	
	var nextSyncChunk = function( error )
	{
		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check callCount here.
		if ( error ) { callback( error ) ; return ; }
		
		callCount ++ ;
		
		while ( i < iMax )
		{
			tag = tags[ i ] ;
			i ++ ;
			
			if ( ! tag.init ) { continue ; }
			
			returnVal = tag.init( book , nextSyncChunk ) ;
			
			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }
			
			// Truthy value: an error or an interruption had happened
			if ( returnVal )
			{
				if ( callCount <= 1 ) { return returnVal ; }
				else { callback( returnVal ) ; return ; }
			}
		}
		
		if ( callCount <= 1 ) { return null ; }
		else { callback() ; return ; }
	} ;
	
	return nextSyncChunk() ;
} ;



