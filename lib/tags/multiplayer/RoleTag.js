/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var tree = require( 'tree-kit' ) ;
var Entity = require( '../../rpg/Entity.js' ) ;
var CreateEntityTag = require( '../rpg/CreateEntityTag.js' ) ;
var Role = require( '../../Role.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function RoleTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof RoleTag ) ? this : Object.create( RoleTag.prototype ) ;

	LabelTag.call( self , 'role' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'role' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'role' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
		roleName: { value: null , enumerable: true , writable: true }
	} ) ;

	return self ;
}

module.exports = RoleTag ;
RoleTag.prototype = Object.create( LabelTag.prototype ) ;
RoleTag.prototype.constructor = RoleTag ;



RoleTag.prototype.init = function init( book ) {
	var name = this.content.getFirstTag( 'name' ) ;

	// Do not use name.getRecursiveFinalContent()! it should not be resolved at init step!
	this.roleName = ( name && name.content ) || null ;

	var role = new Role( this.id , {
		name: this.roleName
	} ) ;

	try {
		this.content.getTags( 'entity' ).forEach( e =>
			role.addEntity( CreateEntityTag.create( book , null , e.getRecursiveFinalContent() ) )
		) ;
	}
	catch ( error ) {
		return error ;
	}

	book.addRole( role ) ;

	return null ;
} ;


