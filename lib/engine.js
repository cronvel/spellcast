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



var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var engine = {} ;
module.exports = engine ;



// /!\ run() and init() has a lot of code in common, and since it should run FAST,
// we can't share code and use conditional statements.

// .run( tagContainer , book , ctx , [startAt] , callback )
// This implements the “maybe async” forbidden art, however that's the very nature
// of spellcast scripting to abstract syncness/asyncness.
// It should run as fast as possible.
engine.run = function run( tagContainer , book , ctx , startAt , callback )
{
	var tag , returnVal ,
		callCount = 0 ,
		stackData = { tagUid: tagContainer.tag && tagContainer.tag.uid , index: ( typeof startAt === 'number' && startAt ) || 0 } ,
		children = tagContainer.children ,
		//children = Array.isArray( tagContainer ) ? tagContainer : tagContainer.children ,
		indexMax = tagContainer.children.length ;
	
	callback = callback || startAt ;
	
	ctx.syncCodeStack.push( stackData ) ;
	
	var nextSyncChunk = function( error )
	{
		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check callCount here.
		if ( error )
		{
			ctx.syncCodeStack.pop() ;
			callback( error ) ;
			return ;
		}
		
		callCount ++ ;
		
		while ( stackData.index < indexMax )
		{
			tag = children[ stackData.index ] ;
			stackData.index ++ ;
			
			if ( ! tag.run ) { continue ; }
			
			// Infinite loop in user script prevention
			if ( ++ ctx.ticks > book.maxTicks )
			{
				error = new RangeError( "Too much ticks without any user interaction" ) ;
				ctx.syncCodeStack.pop() ;
				
				if ( callCount <= 1 ) { return error ; }
				else { callback( error ) ; return ; }
			}
			
			returnVal = tag.run( book , ctx , nextSyncChunk ) ;
			
			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }
			
			// Truthy value: an error or an interruption had happened
			if ( returnVal )
			{
				ctx.syncCodeStack.pop() ;
				
				if ( callCount <= 1 ) { return returnVal ; }
				else { callback( returnVal ) ; return ; }
			}
		}
		
		ctx.syncCodeStack.pop() ;
		
		if ( callCount <= 1 ) { return null ; }
		else { callback() ; return ; }
	} ;
	
	return nextSyncChunk() ;
} ;



// .runCb( tagContainer , book , ctx , [startAt] , callback )
// This is an engine.run() variant that force using the callback instead of the “maybe async” design.
// Use when stack overflow is not an issue to simplify the code.
engine.runCb = function runCb( tagContainer , book , ctx , startAt , callback )
{
	var returnVal = engine.run( tagContainer , book , ctx , startAt , callback ) ;
	
	if ( returnVal !== undefined )
	{
		callback = callback || startAt ;
		callback( returnVal ) ;
	}
} ;



// This code is close to run() except that it always use the callback, and it init all tags recursively,
// not just the current tag container
engine.init = function init( object , book , callback )
{
	var tag , returnVal , callCount = 0 , tags , index = 0 , indexMax ;
	
	// we have to copy the array now, because some tags (e.g. the [module] tag) modify the container on init
	//tags = tagContainer.children.slice() ;
	tags = [] ;
	engine.searchTags( object , tags ) ;
	
	indexMax = tags.length ;
	//log.warning( "Tags: %I" , tags ) ;
	
	var nextSyncChunk = function( error )
	{
		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check callCount here.
		if ( error ) { callback( error ) ; return ; }
		
		callCount ++ ;
		
		while ( index < indexMax )
		{
			tag = tags[ index ] ;
			book.tags[ tag.uid ] = tag ;
			index ++ ;
			
			if ( ! tag.init ) { continue ; }
			
			returnVal = tag.init( book , nextSyncChunk ) ;
			
			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }
			
			// Truthy value: an error or an interruption had happened
			if ( returnVal )
			{
				callback( returnVal ) ;
				return ;
			}
		}
		
		callback() ;
	} ;
	
	return nextSyncChunk() ;
} ;



// Search all tags contained in an object
engine.searchTags = function searchTags( value , tags )
{
	if ( ! value || typeof value !== 'object' ) { return ; }
	
	if ( Array.isArray( value ) )
	{
		value.forEach( e => engine.searchTags( e , tags ) ) ;
	}
	else if ( value instanceof TagContainer )
	{
		value.children.forEach( e => engine.searchTags( e , tags ) ) ;
	}
	else if ( value instanceof Tag )
	{
		tags.push( value ) ;
		engine.searchTags( value.content , tags ) ;
	}
	else
	{
		Object.keys( value ).forEach( k => engine.searchTags( value[ k ] , tags ) ) ;
	}
} ;


