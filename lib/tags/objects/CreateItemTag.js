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

const Item = require( '../../objects/Item.js' ) ;
const copyData = require( '../../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CreateItemTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof CreateItemTag ) ? this : Object.create( CreateItemTag.prototype ) ;

	VarTag.call( self , 'create-item' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = CreateItemTag ;
CreateItemTag.prototype = Object.create( VarTag.prototype ) ;
CreateItemTag.prototype.constructor = CreateItemTag ;



CreateItemTag.prototype.run = function( book , ctx ) {
	var value = this.ref.get( ctx.data ) ;
	var content = this.extractContent( ctx.data ) ;
	var item = CreateItemTag.create( book , ctx , content ) ;

	if ( Array.isArray( value ) ) {
		value.push( item ) ;
	}
	else {
		this.ref.set( ctx.data , item ) ;
	}

	return null ;
} ;



// Used by other tags
CreateItemTag.create = function( book , ctx , content ) {
	var item , data , model , error ;

	if ( typeof content === 'string' ) {
		model = content ;
		content = { model: model } ;
	}
	else if ( content && typeof content === 'object' ) {
		model = content.model ;
	}
	else {
		error = new TypeError( "'create-item' tag content should be a string (model) or an object" ) ;
		log.error( '%E' , error ) ;
		//callback( error ) ;
		return ;
	}

	//log.info( model ) ;
	model = model && book.itemModels[ model ] && book.itemModels[ model ].extractContent( ctx && ctx.data ) ;

	//log.info( model ) ;
	if ( model ) {
		//data = tree.extend( { deep: true } , {} , model , content ) ;
		data = copyData.deep.extend( {} , model , content ) ;
	}

	return new Item( book , null , data ) ;
} ;

