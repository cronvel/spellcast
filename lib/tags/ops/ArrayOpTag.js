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
const Ref = kungFig.Ref ;
const Expression = kungFig.Expression ;
const Dynamic = kungFig.Dynamic ;
const operators = require( '../../operators.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



const JS_OPS = {
	concat: { op: 'concat' } ,
	slice: { op: 'slice' , argList: true } ,
	'copy-within': { op: 'copyWithin' , inPlace: true , argList: true } ,
	fill: { op: 'fill' , inPlace: true , argList: true } ,
	splice: { op: 'splice' , inPlace: true , argList: true } ,
	reverse: { op: 'reverse' , inPlace: true } ,
	filter: { op: 'filter' , useCallback: 1 , supportInputSet: true } ,
	map: { op: 'map' , useCallback: 1 , supportInputSet: true } ,
	reduce: { op: 'reduce' , targetRequired: true , hasInit: true , useCallback: 2 , supportInputSet: true } ,
	sort: { op: 'sort' , inPlace: true , useCallback: 2 , supportInputSet: true , forceOutputArray: true }
} ;



function ArrayOpTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ArrayOpTag ) ? this : Object.create( ArrayOpTag.prototype ) ;

	var matches , jsOp = JS_OPS[ tag ] ;

	if ( ! jsOp ) {
		throw new Error( "Unknown ArrayOpTag '" + tag + "'" ) ;
	}

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)(?: *, *((?:(?!=>)[^ ]* *)+))?(?: *=> *(<[Aa]rray>)? *(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "ArrayOp-type tag's attribute should validate the ArrayOp syntax." ) ;
	}

	if ( matches[ 2 ] ) { matches[ 2 ] = matches[ 2 ].trim() ; }

	Object.defineProperties( self , {
		sourceRef: {
			value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true
		} ,
		initExpression: {
			value: matches[ 2 ] ? Expression.parse( matches[ 2 ] , operators ) : null , writable: true , enumerable: true
		} ,
		targetRef: {
			value: matches[ 4 ] ? Ref.parse( matches[ 4 ] ) : null , writable: true , enumerable: true
		} ,
		castToArray: {
			value: !! matches[ 3 ] , writable: true , enumerable: true
		}
	} ) ;
	
	if ( jsOp.targetRequired && ! self.targetRef ) {
		throw new SyntaxError( "Tag [" + tag + "] requires a target reference." ) ;
	}

	return self ;
}

module.exports = ArrayOpTag ;
ArrayOpTag.prototype = Object.create( Tag.prototype ) ;
ArrayOpTag.prototype.constructor = ArrayOpTag ;



ArrayOpTag.prototype.run = function( book , ctx ) {
	var i , iMax , result , args ,
		isSet = false ,
		jsOp = JS_OPS[ this.name ] ,
		ctxThis = ctx.data.this , // backup the this context
		source = this.sourceRef.get( ctx.data ) ,
		input = source ;


	// Manage source / input

	if ( Array.isArray( input ) ) {
		if ( jsOp.inPlace && this.targetRef ) {
			// Since the JS op is in-place, we need a fresh copy first...
			//input = Array.from( input ) ;
			input = input.slice() ;
		}
	}
	else if ( input instanceof Set ) {
		if ( jsOp.supportInputSet && ( ! jsOp.forceOutputArray || this.targetRef ) ) {
			isSet = true ;
			input = Array.from( input ) ;
		}
		else {
			scriptLog.warning( '[%s] tag does not support Set value (%s): %I' , this.name , this.location , source ) ;
			return null ;
		}
	}
	else {
		scriptLog.warning( '[%s] tag used on a non-Array and non-Set value (%s): %I' , this.name , this.location , source ) ;
		return null ;
	}


	// Manage JS method callback?

	if ( jsOp.useCallback ) {
		args = [] ;

		// How many args for the callback?
		if ( jsOp.useCallback === 1 ) {
			// So "this" is the unique callback arg
			args = [ e => {
				ctx.data.this = e ;
				return this.extractContent( ctx.data ) ;
			} ] ;
		}
		else if ( jsOp.useCallback === 2 ) {
			// There are 2 args, so "this" will be an object with those args
			args = [ ( a , b ) => {
				ctx.data.this = {
					left: a ,
					right: b ,
					previous: a ,
					current: b
				} ;

				return this.extractContent( ctx.data ) ;
			} ] ;
		}
	}
	else if ( jsOp.argList ) {
		args = this.extractContent( ctx.data ) ;
		if ( ! Array.isArray( args ) ) { args = [ args ] ; }
	}
	else {
		args = [ this.extractContent( ctx.data ) ] ;
	}


	// There is an init expression or ref, add it to the args
	if ( jsOp.hasInit ) {
		args.push( Dynamic.getFinalValue( this.initExpression , ctx.data ) ) ;
	}

	// Call the JS method on the input array with the args
	result = input[ jsOp.op ]( ... args ) ;

	// Restore the this context
	ctx.data.this = ctxThis ;

	
	// Manage in-place / output

	if ( this.targetRef ) {
		if ( isSet && ! jsOp.forceOutputArray && ! this.castToArray ) {
			if ( jsOp.inPlace ) {
				this.targetRef.set( ctx.data , new Set( input ) ) ;
			}
			else {
				this.targetRef.set( ctx.data , new Set( result ) ) ;
			}
		}
		else {
			if ( jsOp.inPlace ) {
				this.targetRef.set( ctx.data , input ) ;
			}
			else {
				this.targetRef.set( ctx.data , result ) ;
			}
		}
	}
	else {
		if ( isSet ) {
			// isSet + in-place + jsOp.forceOutputArray has already throw at the begining of the function

			source.clear()
			if ( jsOp.inPlace ) {
				input.forEach( e => source.add( e ) ) ;
			}
			else {
				result.forEach( e => source.add( e ) ) ;
			}
		}
		else {
			// Nothing to to if both JS and script are in-place

			if ( ! jsOp.inPlace ) {
				source.length = 0 ;
				for ( let i = 0 , iMax = result.length ; i < iMax ; i ++ ) { source[ i ] = result[ i ] ; }
			}
		}
	}

	return null ;
} ;

