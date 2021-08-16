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



const kungFig = require( 'kung-fig' ) ;
const Tag = kungFig.Tag ;

const RequestTag = require( './RequestTag.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// Used for explicit Symbolic Reduction.
// It's useless when the reply is a string, except for complex things.

function SrTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SrTag ) ? this : Object.create( SrTag.prototype ) ;
	Tag.call( self , 'sr' , attributes , content , shouldParse ) ;
	return self ;
}

module.exports = SrTag ;
SrTag.prototype = Object.create( Tag.prototype ) ;
SrTag.prototype.constructor = SrTag ;



SrTag.prototype.run = function( book , ctx , callback ) {
	var sraiState , returnVal ;

	//log.hdebug( "SR!" ) ;

	// Prepare the SR array
	if ( ! ctx.data.args.sr ) { ctx.data.args.sr = [] ; }

	sraiState = Object.assign( {} , ctx.data.args ) ;
	sraiState.sr = null ;
	sraiState.stars = null ;
	sraiState.input = this.extractContent( ctx.data ) ;

	returnVal = RequestTag.exec( book , sraiState , ctx , ( error ) => {
		if ( error ) { callback( error ) ; return ; }

		ctx.data.args.sr.push( sraiState.reply ) ;
		//log.hdebug( "async sr reply: %J" , sraiState.reply ) ;

		callback() ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	if ( returnVal ) { return returnVal ; }

	ctx.data.args.sr.push( sraiState.reply ) ;
	//log.hdebug( "sync sr reply: %J" , sraiState.reply ) ;

	return null ;
} ;

