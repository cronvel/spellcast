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
var Ref = kungFig.Ref ;
var Expression = kungFig.Expression ;
var Dynamic = kungFig.Dynamic ;

//var tree = require( 'tree-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function ArrayOpTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof ArrayOpTag ) ? this : Object.create( ArrayOpTag.prototype ) ;
	
	var matches , inPlace = false , hasInit = false , useCallback = 0 , argList = false , op = tag ;
	
	switch ( tag )
	{
		case 'concat' :
			break ;
		case 'slice' :
			argList = true ;
			break ;
		case 'copy-within' :
			op = 'copyWithin' ;
			inPlace = true ;
			argList = true ;
			break ;
		case 'fill' :
		case 'splice' :
			inPlace = true ;
			argList = true ;
			break ;
		case 'reverse' :
			inPlace = true ;
			break ;
		case 'filter' :
		case 'map' :
			useCallback = 1 ;
			break ;
		case 'reduce' :
			useCallback = 2 ;
			hasInit = true ;
			break ;
		case 'sort' :
			useCallback = 2 ;
			inPlace = true ;
			break ;
		default :
			throw new Error( "Unknown ArrayOpTag '" + tag + "'" ) ;
	}
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)(?: *, *((?:(?!=>)[^ ]* *)+))?(?: *=> *(\$[^ ]+))?$/ ) ) )
	{
		throw new SyntaxError( "ArrayOp-type tag's attribute should validate the ArrayOp syntax." ) ;
	}
	
	if ( matches[ 2 ] ) { matches[ 2 ] = matches[ 2 ].trim() ; }
	
	Object.defineProperties( self , {
		sourceRef: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		hasInit: { value: hasInit , enumerable: true } ,
		initExpression: { value: matches[ 2 ] ? Expression.parse( matches[ 2 ] ) : null , writable: true , enumerable: true } ,
		op: { value: op , enumerable: true } ,
		inPlace: { value: inPlace , enumerable: true } ,
		argList: { value: argList , enumerable: true } ,
		useCallback: { value: useCallback , enumerable: true } ,
	} ) ;
	
	Object.defineProperties( self , {
		targetRef: { value: matches[ 3 ] ? Ref.parse( matches[ 3 ] ) : self.sourceRef , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = ArrayOpTag ;
ArrayOpTag.prototype = Object.create( Tag.prototype ) ;
ArrayOpTag.prototype.constructor = ArrayOpTag ;



ArrayOpTag.prototype.run = function run( book , ctx )
{
	var i , iMax , result , args ,
		ctxThis = ctx.data.this , // backup the this context
		source = this.sourceRef.get( ctx.data ) ;
	
	if ( ! Array.isArray( source ) )
	{
		scriptLog.warning( '[%s] tag used on a non-array value (%s): %I' , this.op , this.location , source ) ;
		return null ;
	}
	
	// The JS method works in-place, the userland script tag doesn't
	if ( this.inPlace && this.sourceRef !== this.targetRef )
	{
		source = source.slice() ;
	}
	
	// Does the JS method require a callback?
	if ( this.useCallback )
	{
		args = [] ;
		
		// How many args for the callback?
		if ( this.useCallback === 1 )
		{
			// So "this" is the unique callback arg
			args = [ e => {
				ctx.data.this = e ;
				return this.getRecursiveFinalContent( ctx.data ) ;
			} ] ;
		}
		else if ( this.useCallback === 2 )
		{
			// There are 2 args, so "this" will be an object with those args
			args = [ ( a , b ) => {
				ctx.data.this = {
					left: a ,
					right: b ,
					previous: a ,
					current: b
				} ;
				
				return this.getRecursiveFinalContent( ctx.data ) ;
			} ] ;
		}
	}
	else if ( this.argList )
	{
		args = this.getRecursiveFinalContent( ctx.data ) ;
		if ( ! Array.isArray( args ) ) { args = [ args ] ; }
	}
	else
	{
		args = [ this.getRecursiveFinalContent( ctx.data ) ] ;
	}
	
	// There is an init expression or ref, add it to the args
	if ( this.hasInit )
	{
		args.push( Dynamic.getFinalValue( this.initExpression , ctx.data ) ) ;
	}
	
	// Call the JS method on the source array with the args
	result = source[ this.op ].apply( source , args ) ;
	
	// Restore the this context
	ctx.data.this = ctxThis ;
	
	/*
		4 cases:
			a) both ops are in-place: nothing to do
			b) both ops are not in-place: just targetRef.set() the result
			c) JS op is in-place but not the tag: just targetRef.set() the already cloned source
			d) tag op is in-place but not the JS: assign the result's content to the source's content
	*/
	
	if ( this.sourceRef !== this.targetRef )
	{
		// b) and c)
		this.targetRef.set( ctx.data , this.inPlace ? source : result ) ;
	}
	else if ( this.sourceRef === this.targetRef && ! this.inPlace )
	{
		// d) we have to copy each element of the result into the source
		source.length = 0 ;
		for ( i = 0 , iMax = result.length ; i < iMax ; i ++ ) { source[ i ] = result[ i ] ; }
	}
	
	return null ;
} ;


