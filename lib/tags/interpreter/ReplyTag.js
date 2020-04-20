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



const kungFig = require( 'kung-fig' ) ;
const Tag = kungFig.Tag ;

const RequestTag = require( './RequestTag.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ReplyTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ReplyTag ) ? this : Object.create( ReplyTag.prototype ) ;
	Tag.call( self , 'reply' , attributes , content , shouldParse ) ;
	return self ;
}

module.exports = ReplyTag ;
ReplyTag.prototype = Object.create( Tag.prototype ) ;
ReplyTag.prototype.constructor = ReplyTag ;



const SRAI_REGEX = /<([^<>]+)>/g ;



ReplyTag.prototype.run = function( book , ctx , callback ) {
	var match , matches = [] , replacements , sraiState , sraiIndex , returnVal ,
		reply = this.getRecursiveFinalContent( ctx.data ) ;

	if ( Array.isArray( reply ) ) {
		reply = reply[ Math.floor( reply.length * Math.random() ) ] ;
	}

	// Automatic string Symbolic Reduction (SRAI)
	if ( typeof reply === 'string' ) {
		while ( ( match = SRAI_REGEX.exec( reply ) ) ) {
			matches.push( match[ 1 ] ) ;
		}

		if ( matches.length ) {
			//log.error( "SRAI! %I" , matches ) ;
			replacements = [] ;
			sraiIndex = 0 ;

			var fn = ( cb ) => {
				var returnVal_ ;

				sraiState = Object.assign( {} , ctx.data.args ) ;
				sraiState.stars = null ;
				sraiState.input = matches[ sraiIndex ] ;

				returnVal_ = RequestTag.exec( book , sraiState , ctx , ( error ) => {
					if ( error ) { cb( error ) ; return ; }

					replacements[ sraiIndex ] = sraiState.reply ;
					sraiIndex ++ ;
					//log.error( "async srai reply: %s" , sraiState.reply ) ;

					cb() ;
				} ) ;

				// When the return value is undefined, it means this is an async tag execution
				if ( returnVal_ === undefined ) { return ; }

				// Sync variant...

				if ( returnVal_ ) { return returnVal_ ; }

				replacements[ sraiIndex ] = sraiState.reply ;
				sraiIndex ++ ;
				//log.error( "sync srai reply: %s" , sraiState.reply ) ;

				return null ;
			} ;

			// /!\ Should probably use book.engine.iteratorSeries() instead
			returnVal = book.engine.series( ( new Array( matches.length ) ).fill( fn ) , ( error ) => {
				//log.warning( "srai series callback" ) ;
				if ( error ) { callback( error ) ; return ; }
				sraiIndex = 0 ;
				reply = reply.replace( /<([^<>]+)>/g , ( match_ , content ) => replacements[ sraiIndex ++ ] ) ;
				callback( {
					break: 'reply' ,
					reply: reply
				} ) ;
			} ) ;

			// When the return value is undefined, it means this is an async tag execution
			if ( returnVal === undefined ) { return ; }

			// Sync variant...

			if ( returnVal ) { return returnVal ; }

			sraiIndex = 0 ;
			reply = reply.replace( /<([^<>]+)>/g , ( match_ , content ) => replacements[ sraiIndex ++ ] ) ;
		}
	}

	return {
		break: 'reply' ,
		reply: reply
	} ;
} ;

