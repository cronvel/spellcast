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
const VarTag = kungFig.VarTag ;

const tree = require( 'tree-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CloneTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof CloneTag ) ? this : Object.create( CloneTag.prototype ) ;

	VarTag.call( self , 'clone' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		ref: {
			value: self.attributes , writable: true , enumerable: true
		}
	} ) ;

	//log.debug( "Set tag: %I" , self ) ;

	return self ;
}

module.exports = CloneTag ;
CloneTag.prototype = Object.create( VarTag.prototype ) ;
CloneTag.prototype.constructor = CloneTag ;



CloneTag.prototype.run = function( book , ctx ) {
	this.ref.set( ctx.data , tree.clone( this.extractContent( ctx.data ) ) ) ;
	//tree.path.set( ctx.data , this.targetPath , tree.clone( this.extractContent( ctx.data ) ) ) ;
	return null ;
} ;


