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



var kungFig = require( 'kung-fig' ) ;
var VarTag = kungFig.VarTag ;

//var Equip = require( '../../Equip.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function EquipTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof EquipTag ) ? this : Object.create( EquipTag.prototype ) ;
	
	VarTag.call( self , 'equip' , attributes , content , shouldParse ) ;
	
	if ( ! content || typeof content !== 'object' )
	{
		throw new SyntaxError( "The 'equip' tag's content should be an object." ) ;
	}
	
	Object.defineProperties( self , {
		entityRef: { value: self.attributes , writable: true , enumerable: true }
	} ) ;
    
	return self ;
}

module.exports = EquipTag ;
EquipTag.prototype = Object.create( VarTag.prototype ) ;
EquipTag.prototype.constructor = EquipTag ;
//EquipTag.proxyMode = 'inherit+links' ;



EquipTag.prototype.run = function run( book , ctx )
{
	var slotType ,
		entity = this.entityRef.get( ctx.data ) ,
		params = this.getRecursiveFinalContent( ctx.data ) ;
	
	if ( ! entity )
	{
		scriptLog.error( "[equip] tag performed on a non-entity" ) ;
		return null ;
	}
	
	if ( ! params.item || typeof params.item !== 'object' || params.item.__prototypeUID__ !== 'spellcast/Item' )
	{
		scriptLog.error( "[equip] tag: trying to equip a non-item" ) ;
		return null ;
	}
	
	entity.equipItem( params.item , {
		owned: params.owned !== undefined ? !! params.owned : true ,
		primary: params.primary
	} ) ;
	
	return null ;
} ;


