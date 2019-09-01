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

const Action = require( '../../rpg/Action.js' ) ;
const copyData = require( '../../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ActionTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ActionTag ) ? this : Object.create( ActionTag.prototype ) ;

	LabelTag.call( self , 'action' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ActionTag ;
ActionTag.prototype = Object.create( LabelTag.prototype ) ;
ActionTag.prototype.constructor = ActionTag ;



ActionTag.prototype.init = function( book ) {
	var content = this.getRecursiveFinalContent() ;
	var action = ActionTag.create( book , content ) ;
	book.actions[ this.id ] = action ;
	return null ;
} ;



ActionTag.create = function( book ,  content ) {
	var action , data , model , error ;

	if ( content && typeof content === 'object' ) {
		model = content.model ;
	}
	else {
		error = new TypeError( "'action' tag content should be a string (model) or an object" ) ;
		log.error( '%E' , error ) ;
		//callback( error ) ;
		return ;
	}

	return new Action( book , this.id , data ) ;
} ;

