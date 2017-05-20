/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function EmitTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof EmitTag ) ? this : Object.create( EmitTag.prototype ) ;
	
	var matches ;
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^([^ ]+)(?: *=> *(\$[^ ]+))?$/ ) ) )
	{
		throw new SyntaxError( "Emit tag's attribute should validate the Emit syntax." ) ;
	}
	
	Object.defineProperties( self , {
		event: { value: matches[ 1 ] , enumerable: true } ,
		targetRef: { value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = EmitTag ;
EmitTag.prototype = Object.create( Tag.prototype ) ;
EmitTag.prototype.constructor = EmitTag ;



EmitTag.prototype.run = function run( book , ctx , callback )
{
	//book.apiEmit( this.event , this.getRecursiveFinalContent( ctx.data ) , ( cancel ) => {
	ctx.eventBusEmit( this.event , this.getRecursiveFinalContent( ctx.data ) , ( cancel ) => {
		if ( this.targetRef ) { this.targetRef.set( ctx.data , cancel ) ; }
		callback() ;
	} ) ;
} ;


