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
const VarTag = kungFig.VarTag ;

const Entity = require( '../../rpg/Entity.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function DropTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof DropTag ) ? this : Object.create( DropTag.prototype ) ;

	VarTag.call( self , 'drop' , attributes , content , shouldParse ) ;

	if ( ! content || typeof content !== 'object' ) {
		throw new SyntaxError( "The 'drop' tag's content should be an object." ) ;
	}

	Object.defineProperties( self , {
		entityRef: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = DropTag ;
DropTag.prototype = Object.create( VarTag.prototype ) ;
DropTag.prototype.constructor = DropTag ;



DropTag.prototype.run = function( book , ctx ) {
	var entity = this.entityRef.get( ctx.data ) ,
		params = this.getRecursiveFinalContent( ctx.data ) ;

	if ( ! entity || ! ( entity instanceof Entity ) ) {
		scriptLog.error( "[drop] tag performed on a non-entity (%s)" , this.location ) ;
		return null ;
	}

	if ( params.all ) {
		entity.dropAll( params.stack , { unequip: !! params.unequip } ) ;
		return null ;
	}

	if ( ! params.item || typeof params.item !== 'object' || params.item.__prototypeUID__ !== 'spellcast/Item' ) {
		scriptLog.error( "[drop] tag: trying to drop a non-item (%s)" , this.location ) ;
		return null ;
	}

	entity.dropItem( params.item , params.stack ) ;

	return null ;
} ;


