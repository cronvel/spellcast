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
var Ref = kungFig.Ref ;

var FnTag = require( './FnTag.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function CallTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof CallTag ) ? this : Object.create( CallTag.prototype ) ;

	var matches ;

	Tag.call( self , 'call' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))(?: *=> *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The 'call' tag's attribute should validate the call syntax." ) ;
	}

	Object.defineProperties( self , {
		defaultNamespace: { value: '' , writable: true , enumerable: true } ,
		fnRef: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		fnNsId: { value: matches[ 2 ] , writable: true , enumerable: true } ,
		returnRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = CallTag ;
CallTag.prototype = Object.create( Tag.prototype ) ;
CallTag.prototype.constructor = CallTag ;



CallTag.prototype.init = function init( book ) {
	var tmp , parentTag = this ;

	while ( ( parentTag = parentTag.getParentTag() ) ) {
		if ( parentTag.name === 'chapter' || parentTag.name === 'system' ) {
			this.defaultNamespace = parentTag.id ;
		}
	}

	if ( ! this.fnNsId ) { return null ; }

	// /!\ There is gotcha with init and multiple book based on the same script:
	// init patch the cached script, but cached script are init again...
	// So it should be somewhat idem-potent, until a more reliable script caching is done...
	if ( ! Array.isArray( this.fnNsId ) ) { this.fnNsId = this.splitNsId( this.fnNsId ) ; }

	return null ;
} ;



CallTag.prototype.splitNsId = function splitNsId( str ) {
	var splitted = str.split( '/' ) ;

	if ( splitted.length >= 2 ) {
		splitted.length = 2 ;
		return splitted ;
	}

	return [ '' , str ] ;
} ;



CallTag.prototype.run = function run( book , ctx , callback ) {
	var fn , returnVal , args ;

	if ( this.fnRef ) {
		fn = this.fnRef.get( ctx.data , true ) ;
		if ( typeof fn === 'string' ) { fn = this.splitNsId( fn ) ; }
	}
	else {
		fn = this.fnNsId ;
	}

	if ( Array.isArray( fn ) ) {
		if ( fn[ 0 ] ) {
			fn = ( book.functions[ fn[ 0 ] ] && book.functions[ fn[ 0 ] ][ fn[ 1 ] ] ) || null ;
		}
		else {
			fn = ( book.functions[ this.defaultNamespace ] && book.functions[ this.defaultNamespace ][ fn[ 1 ] ] ) ||
				( book.functions[ '' ] && book.functions[ '' ][ fn[ 1 ] ] ) ||
				null ;
		}
	}

	// If we are resuming, we don't solve args, it has been done already
	args = ctx.resume ? undefined : this.getRecursiveFinalContent( ctx.data ) ;

	if ( typeof fn === 'function' ) {
		// /!\ For instance, native JS functions are always SYNC /!\
		// /!\ Also, async function would be a pain in the ass to resume /!\

		returnVal = fn( args ) ;
		if ( this.returnRef ) { this.returnRef.set( ctx.data , returnVal ) ; }

		return null ;
	}
	else if ( fn instanceof FnTag ) {
		// FnTag#exec() is “maybe async”
		returnVal = fn.exec( book , args , ctx , ( error ) => {

			if ( error ) {
				switch ( error.break ) {
					case 'return' :
						if ( this.returnRef ) { this.returnRef.set( ctx.data , error.return ) ; }
						callback() ;
						return ;
					default :
						callback( error ) ;
						return ;
				}
			}

			if ( this.returnRef ) { this.returnRef.set( ctx.data , undefined ) ; }
			callback() ;
		} ) ;

		// When the return value is undefined, it means this is an async tag execution
		if ( returnVal === undefined ) { return ; }

		// Sync variant...

		// Truthy value: an error or an interruption had happened
		if ( returnVal ) {
			switch ( returnVal.break ) {
				case 'return' :
					if ( this.returnRef ) { this.returnRef.set( ctx.data , returnVal.return ) ; }
					return null ;
				default :
					return returnVal ;
			}
		}

		if ( this.returnRef ) { this.returnRef.set( ctx.data , undefined ) ; }
		return null ;
	}

	scriptLog.warning( "[call] tag: not a function (%s)" , this.location ) ;
	return null ;

} ;


