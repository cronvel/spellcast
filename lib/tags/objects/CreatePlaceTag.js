/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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
const LabelTag = kungFig.LabelTag ;

const tree = require( 'tree-kit' ) ;

const Place = require( '../../objects/Place.js' ) ;
const CreateItemTag = require( './CreateItemTag.js' ) ;
const CreateEntityTag = require( './CreateEntityTag.js' ) ;
const copyData = require( '../../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CreatePlaceTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof CreatePlaceTag ) ? this : Object.create( CreatePlaceTag.prototype ) ;

	LabelTag.call( self , 'place' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = CreatePlaceTag ;
CreatePlaceTag.prototype = Object.create( LabelTag.prototype ) ;
CreatePlaceTag.prototype.constructor = CreatePlaceTag ;



CreatePlaceTag.prototype.run = function( book , ctx ) {
	var content = this.getRecursiveFinalContent( ctx.data ) ;
	var place = CreatePlaceTag.create( book , ctx , content ) ;
	book.places[ this.id ] = place ;
	return null ;
} ;



// Used by other tags
CreatePlaceTag.create = function( book , ctx , content ) {
	var place , data , model , error ;

	if ( content && typeof content === 'object' ) {
		model = content.model ;
	}
	else {
		error = new TypeError( "'place' tag content should be an object" ) ;
		log.error( '%E' , error ) ;
		//callback( error ) ;
		return ;
	}
	
	// Always deep-extend, since new Entity() only performs shallow copy of its arguments
	//data = copyData.deep.extend( {} , class_ , model , content ) ;
	data = copyData.deep.extend( {} , content ) ;
	
	if ( data.items ) {
		if ( ! Array.isArray( data.items ) ) {
			data.items = data.items && typeof data.items === 'object' ? [ data.items ] : [] ;
		}

		data.items.forEach( ( item , index ) => {
			if ( item.__prototypeUID__ !== 'spellcast/Item' ) {
				data.items[ index ] = CreateItemTag.create( book , ctx , item ) ;
			}
		} ) ;
	}

	if ( data.entities ) {
		if ( ! Array.isArray( data.entities ) ) {
			data.entities = data.entities && typeof data.entities === 'object' ? [ data.entities ] : [] ;
		}

		data.entities.forEach( ( entity , index ) => {
			if ( entity.__prototypeUID__ !== 'spellcast/Entity' ) {
				data.entities[ index ] = CreateEntityTag.create( book , ctx , entity ) ;
			}
		} ) ;
	}

	place = new Place( book , this.id , data ) ;
	
	// Now make all sub-objects have this place as its parent
	place.getAllSubObjects().forEach( o => o.parent = place ) ;
	
	return place ;
} ;

