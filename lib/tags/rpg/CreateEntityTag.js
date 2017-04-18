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
var Tag = kungFig.Tag ;
var VarTag = kungFig.VarTag ;

var tree = require( 'tree-kit' ) ;

var Entity = require( '../../rpg/Entity.js' ) ;
var CreateItemTag = require( './CreateItemTag.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CreateEntityTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof CreateEntityTag ) ? this : Object.create( CreateEntityTag.prototype ) ;
	
	if ( tag === 'create-main-entity' )
	{
		attributes = attributes || '$player' ;
		VarTag.call( self , 'create-main-entity' , attributes , content , shouldParse ) ;
		
		Object.defineProperties( self , {
			mainEntity: { value: true , enumerable: true } ,
			ref: { value: self.attributes , writable: true , enumerable: true }
		} ) ;
	}
	else
	{
		VarTag.call( self , 'create-entity' , attributes , content , shouldParse ) ;
		
		Object.defineProperties( self , {
			mainEntity: { value: false , enumerable: true } ,
			ref: { value: self.attributes , writable: true , enumerable: true }
		} ) ;
	}
	
	return self ;
}

module.exports = CreateEntityTag ;
CreateEntityTag.prototype = Object.create( VarTag.prototype ) ;
CreateEntityTag.prototype.constructor = CreateEntityTag ;



CreateEntityTag.prototype.run = function run( book , ctx )
{
	var content = this.getRecursiveFinalContent( ctx.data ) ;
	var entity = CreateEntityTag.create( book , ctx , content ) ;
	
	if ( this.mainEntity )
	{
		// This is a create-main-entity tag
		if ( ! book.roles[ 0 ].entity )
		{
			// Add it to the first role
			book.roles[ 0 ].addEntity( entity ) ;
			
			// Create it globaly using book.data instead of ctx.data
			this.ref.set( book.data , entity ) ;
		}
	}
	else
	{
		var value = this.ref.get( ctx.data ) ;
		
		if ( Array.isArray( value ) )
		{
			value.push( entity ) ;
		}
		else
		{
			this.ref.set( ctx.data , entity ) ;
		}
	}
	
	return null ;
} ;



CreateEntityTag.create = function create( book , ctx , content )
{
	var entity , data , class_ , model , slotType , error ;
	
	if ( typeof content === 'string' )
	{
		model = content ;
		content = { model: model } ;
	}
	else if ( content && typeof content === 'object' )
	{
		model = content.model ;
		content.model ;
	}
	else
	{
		error = new TypeError( "'create-entity' tag content should be a string (model) or an object" ) ;
		log.error( '%E' , error ) ;
		//callback( error ) ;
		return ;
	}
	
	//log.info( model ) ;
	model = ( model && book.entityModels[ model ] && book.entityModels[ model ].getRecursiveFinalContent( ctx && ctx.data ) ) || {} ;
	class_ = model.class ;
	class_ = ( class_ && book.entityClasses[ class_ ] && book.entityClasses[ class_ ].getRecursiveFinalContent( ctx && ctx.data ) ) || {} ;
	
	// Always deep-extend, since Entity.create() only performs shallow copy of its arguments
	data = tree.extend( { deep: true } , {} , class_ , model , content ) ;
	
	//log.info( "class: %I\nmodel: %I\ncontent: %I\nfinal: %I" , class_ , model , content , data ) ;
	
	if ( data.items )
	{
		if ( ! Array.isArray( data.items ) )
		{
			data.items = data.items && typeof data.items === 'object' ? [ data.items ] : [] ;
		}
		
		data.items.forEach( ( item , index ) => {
			if ( item.__prototypeUID__ !== 'spellcast/Item' )
			{
				data.items[ index ] = CreateItemTag.create( book , ctx , item ) ;
			}
		} ) ;
	}
	
	if ( data.equippedItems )
	{
		for ( slotType in data.equippedItems )
		{
			if ( ! Array.isArray( data.equippedItems[ slotType ] ) )
			{
				data.equippedItems[ slotType ] =
					data.equippedItems[ slotType ] && typeof data.equippedItems[ slotType ] === 'object' ?
						[ data.equippedItems[ slotType ] ] : [] ;
			}
			
			data.equippedItems[ slotType ].forEach( ( item , index ) => {
				if ( item.__prototypeUID__ !== 'spellcast/Item' )
				{
					data.equippedItems[ slotType ][ index ] = CreateItemTag.create( book , ctx , item ) ;
				}
			} ) ;
		}
	}
	
	if ( data.innateItems )
	{
		for ( slotType in data.innateItems )
		{
			if ( ! Array.isArray( data.innateItems[ slotType ] ) )
			{
				data.innateItems[ slotType ] =
					data.innateItems[ slotType ] && typeof data.innateItems[ slotType ] === 'object' ?
						[ data.innateItems[ slotType ] ] : [] ;
			}
			
			data.innateItems[ slotType ].forEach( ( item , index ) => {
				if ( item.__prototypeUID__ !== 'spellcast/Item' )
				{
					data.innateItems[ slotType ][ index ] = CreateItemTag.create( book , ctx , item ) ;
				}
			} ) ;
		}
	}
	
	return Entity.create( book , null , data ) ;
} ;


