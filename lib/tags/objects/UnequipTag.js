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

const Entity = require( '../../objects/Entity.js' ) ;
const Item = require( '../../objects/Item.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function UnequipTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof UnequipTag ) ? this : Object.create( UnequipTag.prototype ) ;

	VarTag.call( self , 'unequip' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		entityRef: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = UnequipTag ;
UnequipTag.prototype = Object.create( VarTag.prototype ) ;
UnequipTag.prototype.constructor = UnequipTag ;



UnequipTag.prototype.run = function( book , ctx ) {
	var slotType ,
		entity = this.entityRef.get( ctx.data ) ,
		params = this.extractContent( ctx.data ) ;

	if ( ! entity || ! ( entity instanceof Entity ) ) {
		scriptLog.error( "[unequip] tag performed on a non-entity (%s)" , this.location ) ;
		return null ;
	}

	if ( ! params || typeof params !== 'object' ) {
		entity.unequipAll() ;
	}
	else if ( params.item ) {
		if ( ! ( params.item instanceof Item ) ) {
			scriptLog.error( "[unequip] tag: trying to unequip a non-item (%s)" , this.location ) ;
			return null ;
		}

		entity.unequipItem( params.item ) ;
	}
	else if ( params.slot ) {
		entity.unequipSlot( params.slot ) ;
	}
	else {
		scriptLog.error( "[unequip] tag: missing both item and slot key (%s)" , this.location ) ;
	}

	return null ;
} ;

