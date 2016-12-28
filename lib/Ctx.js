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



//var Ngev = require( 'nextgen-events' ) ;
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Ctx() { throw new Error( 'Use Ctx.create() instead.' ) ; }
//Ctx.prototype = Object.create( Ngev.prototype ) ;
//Ctx.prototype.constructor = Ctx ;

module.exports = Ctx ;



Ctx.create = function create( book , options , self )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( ! ( self instanceof Ctx ) ) { self = Object.create( Ctx.prototype ) ; }
	
	Object.defineProperties( self , {
		type: { value: options.type || null , writable: true , enumerable: true } ,
		book: { value: book , enumerable: true } ,
		parent: { value: options.parent || null , writable: true , enumerable: true } ,
		global: { value: ( options.parent && options.parent.global ) || self , enumerable: true } ,
		data: { value: options.data || Object.create( ( options.parent && options.parent.data ) || book.data ) , enumerable: true } ,
		ticks: { value: 0 , writable: true , enumerable: true } ,
		roles: { value: options.roles || book.roles , writable: true , enumerable: true } ,
		active: { value: options.active !== undefined ? options.active : true , writable: true , enumerable: true } ,
		destroyed: { value: false , writable: true , enumerable: true } ,
	} ) ;
	
	// Bind global var
	self.data.global = self.global.data ;
	
	return self ;
} ;



Ctx.prototype.destroy = function destroy()
{
	this.active = false ;
} ;



Ctx.prototype.createScope = function createScope()
{
	return Object.create( this , {
		data: { value: Object.create( this.data ) , enumerable: true }
	} ) ;
} ;

