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
var Dynamic = kungFig.Dynamic ;

var tree = require( 'tree-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ApplyToTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof ApplyToTag ) ? this : Object.create( ApplyToTag.prototype ) ;
	
	Tag.call( self , 'apply-to' , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) *=> *(\$[^ ]+)$/ ) ) )
	{
		throw new SyntaxError( "The 'apply-to' tag's attribute should validate the foreach syntax." ) ;
	}
	
	Object.defineProperties( self , {
		sourceRef: { value: Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		targetRef: { value: Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = ApplyToTag ;
ApplyToTag.prototype = Object.create( VarTag.prototype ) ;
ApplyToTag.prototype.constructor = ApplyToTag ;
//ApplyToTag.proxyMode = 'parent' ;



ApplyToTag.prototype.run = function run( book , ctx )
{
	var applyCtx = this.getRecursiveFinalContent( ctx.data ) ;
	
	var value = this.sourceRef.getValue( ctx.data ) ;
	value = Dynamic.apply( value , applyCtx ) ;
	value = Dynamic.getRecursiveFinalValue( value , ctx.data ) ;
	//value = Dynamic.getRecursiveFinalValue( value , applyCtx ) ;
	
	this.targetRef.set( ctx.data , value ) ;
	
	return null ;
} ;


