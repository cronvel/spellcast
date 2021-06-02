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
const VarTag = kungFig.VarTag ;

const Metric = require( '../../objects/Metric.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CreateMetricTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof CreateMetricTag ) ? this : Object.create( CreateMetricTag.prototype ) ;

	VarTag.call( self , 'create-metric' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = CreateMetricTag ;
CreateMetricTag.prototype = Object.create( VarTag.prototype ) ;
CreateMetricTag.prototype.constructor = CreateMetricTag ;



CreateMetricTag.prototype.run = function( book , ctx ) {
	var data = new Metric( this.getRecursiveFinalContent( ctx.data ) ) ;
	this.ref.set( ctx.data , data ) ;
	return null ;
} ;

