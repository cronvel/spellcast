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
var VarTag = kungFig.VarTag ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function GenerateTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof GenerateTag ) ? this : Object.create( GenerateTag.prototype ) ;
	
	VarTag.call( self , 'generate' , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = GenerateTag ;
GenerateTag.prototype = Object.create( VarTag.prototype ) ;
GenerateTag.prototype.constructor = GenerateTag ;



GenerateTag.prototype.run = function run( book , ctx )
{
	var generatorName = this.getRecursiveFinalContent( ctx.data ) ;
	var generator = book.generators[ generatorName ] ;
	
	if ( ! generator )
	{
		var error = new Error( "[generate] unknown genrator'" + generatorName + "'" ) ;
		scriptLog.error( error ) ;
		
		// Error propagation? or just log and unset the var?
		//this.ref.set( ctx.data , null ) ; return null ;
		return error ;
	}
	
	this.ref.set( ctx.data , generator.generate() ) ;
	return null ;
} ;


