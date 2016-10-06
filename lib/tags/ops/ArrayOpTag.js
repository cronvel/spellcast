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
	
	var matches , inPlace = false , dual = false , asInit = false ;
	
	switch ( tag )
	{
		case 'filter' :
		case 'map' :
			break ;
		case 'reduce' :
			dual = true ;
			asInit = true ;
			break ;
		case 'sort' :
			inPlace = true ;
			dual = true ;
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
		initExpression: { value: matches[ 2 ] ? Expression.parse( matches[ 2 ] ) : null , writable: true , enumerable: true } ,
		op: { value: tag , writable: true , enumerable: true } ,
		inPlace: { value: inPlace , writable: true , enumerable: true } ,
		asInit: { value: asInit , writable: true , enumerable: true } ,
		dual: { value: dual , writable: true , enumerable: true } ,
	} ) ;
	
	Object.defineProperties( self , {
		targetRef: { value: matches[ 3 ] ? Ref.parse( matches[ 3 ] ) : self.sourceRef , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = ArrayOpTag ;
ArrayOpTag.prototype = Object.create( Tag.prototype ) ;
ArrayOpTag.prototype.constructor = ArrayOpTag ;
//ArrayOpTag.proxyMode = 'parent' ;



ArrayOpTag.prototype.run = function run( book , ctx , callback )
{
	var result , initValue ,
		ctxThis = ctx.data.this , // backup the this context
		source = this.sourceRef.get( ctx.data ) ;
	
	if ( ! Array.isArray( source ) )
	{
		scriptLog.warning( '[%s] tag used on a non-array value: %I' , this.op , source ) ;
		callback() ;
		return ;
	}
	
	if ( this.inPlace && this.sourceRef !== this.targetRef )
	{
		source = source.slice() ;
	}
	
	if ( this.asInit )
	{
		initValue = Dynamic.getFinalValue( this.initExpression , ctx.data ) ;
	}
	
	if ( this.dual )
	{
		result = source[ this.op ]( ( a , b ) => {
			ctx.data.this = {
				left: a ,
				right: b ,
				previous: a ,
				current: b
			} ;
			
			return this.getRecursiveFinalContent( ctx.data ) ;
		} ,
			this.asInit ? initValue : undefined
		) ;
	}
	else
	{
		result = source[ this.op ]( e => {
			ctx.data.this = e ;
			return this.getRecursiveFinalContent( ctx.data ) ;
		} ,
			this.asInit ? initValue : undefined
		) ;
	}
	
	// Restore the this context
	ctx.data.this = ctxThis ;
	
	/*
		/!\ WARNING /!\
		This produce a bug when targetRef === sourceRef and inPlace === false.
		If there are other refs to the array, they will be referencing the old array.
		So the original array should be modified instead.
		
		Same warning for the [concat] tag.
	*/
	
	if ( ! this.inPlace || this.sourceRef !== this.targetRef )
	{
		this.targetRef.set( ctx.data , result ) ;
	}
	
	callback() ;
} ;


