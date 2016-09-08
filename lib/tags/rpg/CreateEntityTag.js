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

var tree = require( 'tree-kit' ) ;

var Entity = require( '../../Entity.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CreateEntityTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof CreateEntityTag ) ? this : Object.create( CreateEntityTag.prototype ) ;
	
	VarTag.call( self , 'create-entity' , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		targetPath: { value: self.attributes , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = CreateEntityTag ;
CreateEntityTag.prototype = Object.create( VarTag.prototype ) ;
CreateEntityTag.prototype.constructor = CreateEntityTag ;
//CreateEntityTag.proxyMode = 'inherit+links' ;



CreateEntityTag.prototype.run = function run( book , ctx , callback )
{
	var entity , data , model , extendWith = this.getRecursiveFinalContent( ctx.data ) ,
		error ;
	
	if ( typeof extendWith === 'string' )
	{
		model = extendWith ;
		extendWith = {} ;
	}
	else if ( extendWith && typeof extendWith === 'object' )
	{
		model = extendWith.model ;
		delete extendWith.model ;
	}
	else
	{
		error = new TypeError( "'create-entity' tag content should be a string (model) or an object" ) ;
		log.error( '%E' , error ) ;
		callback( error ) ;
		return ;
	}
	
	log.info( model ) ;
	model = model && book.entityModels[ model ] && book.entityModels[ model ].getRecursiveFinalContent( ctx.data ) ;
	
	log.info( model ) ;
	if ( model )
	{
		data = tree.extend( { deep: true } , {} , model , extendWith ) ;
	}
	else
	{
		data = extendWith ;
	}
	
	entity = Entity.create( null , data ) ;
	
	tree.path.set( ctx.data , this.targetPath , entity ) ;
	
	callback() ;
} ;

