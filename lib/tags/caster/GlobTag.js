/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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
const glob = require( 'glob' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function GlobTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof GlobTag ) ? this : Object.create( GlobTag.prototype ) ;

	VarTag.call( self , 'set' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		ref: {
			value: self.attributes , writable: true , enumerable: true
		}
	} ) ;

	//log.debug( "Set tag: %I" , self ) ;

	return self ;
}

module.exports = GlobTag ;
GlobTag.prototype = Object.create( VarTag.prototype ) ;
GlobTag.prototype.constructor = GlobTag ;



GlobTag.prototype.run = function( book , ctx , callback ) {
	var self = this ,
		globPattern = this.getRecursiveFinalContent( ctx.data ) ;

	if ( ! glob.hasMagic( globPattern ) ) {
		this.ref.set( ctx.data , [ globPattern ] ) ;
		//tree.path.set( ctx.data , self.targetPath , [ globPattern ] ) ;
		callback() ;
		return ;
	}

	glob( globPattern , ( error , paths ) => {

		if ( error ) { callback( error ) ; return ; }

		tree.path.set( ctx.data , self.targetPath , paths ) ;
		callback() ;
	} ) ;
} ;


