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

const Board = require( '../../objects/Board.js' ) ;
const copyData = require( '../../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CreateBoardTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof CreateBoardTag ) ? this : Object.create( CreateBoardTag.prototype ) ;

	VarTag.call( self , 'create-board' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = CreateBoardTag ;
CreateBoardTag.prototype = Object.create( VarTag.prototype ) ;
CreateBoardTag.prototype.constructor = CreateBoardTag ;



CreateBoardTag.prototype.run = function( book , ctx ) {
	var value = this.ref.get( ctx.data ) ;
	var content = this.extractContent( ctx.data ) ;
	var board = CreateBoardTag.create( book , ctx , content ) ;

	if ( Array.isArray( value ) ) {
		value.push( board ) ;
	}
	else {
		this.ref.set( ctx.data , board ) ;
	}

	return null ;
} ;



// Used by other tags
CreateBoardTag.create = function( book , ctx , content ) {
	var board , data , model , error ;

	if ( typeof content === 'string' ) {
		model = content ;
		content = { model: model } ;
	}
	else if ( content && typeof content === 'object' ) {
		model = content.model ;
	}
	else {
		error = new TypeError( "'create-board' tag content should be a string (model) or an object" ) ;
		log.error( '%E' , error ) ;
		//callback( error ) ;
		return ;
	}

	//log.info( model ) ;
	model = model && book.boardModels[ model ] && book.boardModels[ model ].extractContent( ctx && ctx.data ) ;

	//log.info( model ) ;
	if ( model ) {
		data = copyData.deep.extend( {} , model , content ) ;
	}

	return new Board( book , null , data ) ;
} ;

