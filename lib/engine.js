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



var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var engine = {} ;
module.exports = engine ;



// /!\ run() and init() has a lot of code in common, and since it should run FAST,
// we can't share code and use too much conditional statements.

// .run( tagContainer , book , ctx , callback )
// This implements the “maybe async” forbidden art!
// However that's the very nature of Spellcast Scripting to abstract syncness/asyncness.
// This is the critical part of Spellcast's performance, thus should run as fast as possible.
engine.run = function run( tagContainer , book , ctx , lvar , callback ) {
	var tag , returnVal , stackData ,
		chunkCount = 0 ,
		children = tagContainer.children ,
		//children = Array.isArray( tagContainer ) ? tagContainer : tagContainer.children ,
		indexMax = children.length ;


	//log.error( ">>> Open" ) ;
	if ( ctx.resume ) {
		log.error( "\n\nCtx: %I" , {
			stack: ctx.syncCodeStack , depth: ctx.syncCodeDepth , resume: ctx.resume
		} ) ;

		if ( ctx.syncCodeDepth >= ctx.syncCodeStack.length ) {
			// There is nothing to resume!
			ctx.syncCodeStack.length = ctx.syncCodeDepth && -- ctx.syncCodeDepth ;	// Faster than Math.max()
			ctx.resume = false ;
			return null ;
		}

		stackData = ctx.syncCodeStack[ ctx.syncCodeDepth ] ;

		if ( stackData.tagUid !== tagContainer.tag.uid ) {
			// There is nothing to resume in this container!
			log.error( "Resume: tag UID mismatch (expected:%s, got: %s)" , stackData.tagUid , tagContainer.tag.uid ) ;
			return null ;
		}

		ctx.syncCodeDepth ++ ;
		stackData.index -- ;
	}
	else {
		stackData = {
			tagUid: tagContainer.tag && tagContainer.tag.uid ,
			// Currently executed tag index, start at -1 because nothing is in progress at the beginning
			index: -1 ,
			// If the stack has some volatil data, like a proper $local, $args, or some index
			lvar: lvar || null
		} ;

		ctx.syncCodeStack[ ctx.syncCodeDepth ++ ] = stackData ;
	}


	var nextSyncChunk = ( error ) => {
		// Once the first tag has run (here once the first callback is called), we are not resuming anymore
		ctx.resume = ctx.resume && ! chunkCount ;

		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check chunkCount here.
		if ( error ) {
			ctx.syncCodeStack.length = -- ctx.syncCodeDepth ;
			callback( error ) ;
			return ;
		}

		chunkCount ++ ;

		while ( ++ stackData.index < indexMax ) {
			//log.warning( "Tag index: %i" , stackData.index ) ;
			tag = children[ stackData.index ] ;

			// Non-runnable tag, continue to the next tag...
			if ( ! tag.run ) { continue ; }

			// Infinite loop in user script prevention
			if ( ++ ctx.ticks > book.maxTicks ) {
				error = new RangeError( "Too much ticks without any user interaction" ) ;
				ctx.syncCodeStack.length = -- ctx.syncCodeDepth ; ctx.resume = false ;

				if ( chunkCount <= 1 ) { return error ; }
				callback( error ) ; return ;
			}

			returnVal = tag.run( book , ctx , nextSyncChunk ) ;

			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }

			// Once the first tag has run, we are not resuming anymore
			ctx.resume = false ;

			// Truthy value: an error or an interruption had happened
			if ( returnVal ) {
				ctx.syncCodeStack.length = -- ctx.syncCodeDepth ;

				if ( chunkCount <= 1 ) { return returnVal ; }
				callback( returnVal ) ; return ;
			}
		}

		ctx.syncCodeStack.length = -- ctx.syncCodeDepth ;

		//log.error( "<<< Close" ) ;
		if ( chunkCount <= 1 ) { return null ; }
		callback() ; return ;
	} ;

	return nextSyncChunk() ;
} ;



// .runCb( tagContainer , book , ctx , callback )
// This is an engine.run() variant that force using the callback instead of the “maybe async” design.
// Use it when stack overflow is not an issue, to simplify the code.
engine.runCb = function runCb( tagContainer , book , ctx , lvar , callback ) {
	var returnVal = engine.run( tagContainer , book , ctx , lvar , callback ) ;
	if ( returnVal !== undefined ) { callback( returnVal ) ; }
} ;



// This code is close to run() except that it always use the callback, and it init all tags recursively,
// not just the current tag container
engine.init = function init( object , book , callback ) {
	var tag , returnVal , chunkCount = 0 , tags , index = 0 , indexMax ;

	// we have to copy the array now, because some tags (e.g. the [module] tag) modify the container on init
	//tags = tagContainer.children.slice() ;
	tags = [] ;
	engine.searchTags( object , tags ) ;

	indexMax = tags.length ;
	//log.warning( "Tags: %I" , tags ) ;

	var nextSyncChunk = ( error ) => {
		// First argument *error* can be truthy for code flow interruption.
		// Since it is only set when nextSyncChunk() is used as a callback, we don't have to check chunkCount here.
		if ( error ) { callback( error ) ; return ; }

		chunkCount ++ ;

		while ( index < indexMax ) {
			tag = tags[ index ] ;

			// Should we index all tags or just runnable/resumable tags?
			book.tags[ tag.uid ] = tag ;

			index ++ ;

			if ( ! tag.init ) { continue ; }

			returnVal = tag.init( book , nextSyncChunk ) ;

			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }

			// Truthy value: an error or an interruption had happened
			if ( returnVal ) {
				callback( returnVal ) ;
				return ;
			}
		}

		callback() ;
	} ;

	return nextSyncChunk() ;
} ;



// Search all tags contained in an object
engine.searchTags = function searchTags( value , tags ) {
	if ( ! value || typeof value !== 'object' ) { return ; }

	if ( Array.isArray( value ) ) {
		value.forEach( e => engine.searchTags( e , tags ) ) ;
	}
	else if ( value instanceof TagContainer ) {
		value.children.forEach( e => engine.searchTags( e , tags ) ) ;
	}
	else if ( value instanceof Tag ) {
		tags.push( value ) ;
		engine.searchTags( value.content , tags ) ;
	}
	else {
		Object.keys( value ).forEach( k => engine.searchTags( value[ k ] , tags ) ) ;
	}
} ;



// Run any “maybe async” code in series
engine.series = function series( fnArray , callback , index = 0 , chunkCount = 0 ) {
	var returnVal , fn ;

	for ( ; index < fnArray.length ; index ++ ) {
		fn = fnArray[ index ] ;

		returnVal = fn( ( error ) => {
			if ( error ) { callback( error ) ; return ; }
			engine.series( fnArray , callback , index + 1 , chunkCount + 1 ) ;
		} ) ;

		// When the return value is undefined, it means this is an async tag execution
		if ( returnVal === undefined ) { return ; }

		// Sync variant...

		if ( returnVal ) {
			if ( chunkCount <= 1 ) { return returnVal ; }
			callback( returnVal ) ; return ;
		}

		// Let it continue, return is after the loop
	}

	if ( ! chunkCount ) { return null ; }
	callback() ; return ;
} ;


