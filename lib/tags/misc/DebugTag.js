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



const LabelTag = require( 'kung-fig' ).LabelTag ;

const log = require( 'logfella' ).global.use( 'spellbook' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function DebugTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof DebugTag ) ? this : Object.create( DebugTag.prototype ) ;

	var format = false ;

	switch ( tag ) {
		case 'debug' :
			break ;
		case 'debugf' :
			format = true ;
			break ;
		default :
			throw new Error( "Unknown DebugTag '" + tag + "'" ) ;
	}

	LabelTag.call( self , tag , attributes , content , shouldParse ) ;

	switch ( self.attributes ) {
		case 'trace' :
		case 'debug' :
		case 'verbose' :
		case 'info' :
		case 'warning' :
		case 'error' :
		case 'fatal' :
		case 'hdebug' :
			break ;
		default :
			self.attributes = 'debug' ;
	}

	Object.defineProperties( self , {
		type: { value: self.attributes , enumerable: true } ,
		format: { value: format , enumerable: true }
	} ) ;

	return self ;
}

module.exports = DebugTag ;
DebugTag.prototype = Object.create( LabelTag.prototype ) ;
DebugTag.prototype.constructor = DebugTag ;



DebugTag.prototype.run = function( book , ctx ) {
	var value = this.getRecursiveFinalContent( ctx.data ) ;

	if ( this.format ) {
		scriptLog[ this.type ]( ... value ) ;
	}
	else if ( typeof value === 'string' ) {
		scriptLog[ this.type ]( value ) ;
	}
	else {
		scriptLog[ this.type ]( '%Y' , value ) ;
	}

	return null ;
} ;


