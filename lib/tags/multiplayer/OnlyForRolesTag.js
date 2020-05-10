/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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
const ExpressionTag = kungFig.ExpressionTag ;
const TagContainer = kungFig.TagContainer ;
const Dynamic = kungFig.Dynamic ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function OnlyForRolesTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof OnlyForRolesTag ) ? this : Object.create( OnlyForRolesTag.prototype ) ;

	if ( ! content ) { content = new TagContainer( undefined , self ) ; }

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'only-for-roles' tag's content should be a TagContainer." ) ;
	}

	ExpressionTag.call( self , 'only-for-roles' , attributes , content , shouldParse , options ) ;

	Object.defineProperties( self , {
		roles: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = OnlyForRolesTag ;
OnlyForRolesTag.prototype = Object.create( ExpressionTag.prototype ) ;
OnlyForRolesTag.prototype.constructor = OnlyForRolesTag ;



OnlyForRolesTag.prototype.run = function( book , ctx , callback ) {
	var lvar , subRoles , returnVal ;

	if ( ctx.resume ) {
		lvar = ctx.syncCodeStack[ ctx.syncCodeDepth ].lvar ;
	}
	else {
		subRoles = Dynamic.getFinalValue( this.roles , ctx.data ) ;
		if ( ! Array.isArray( subRoles ) ) { subRoles = [ subRoles ] ; }
		subRoles = ctx.roles.filter( e => subRoles.indexOf( e.id ) !== -1 ) ;

		// /!\ Not sure if both needs to be saved
		lvar = { subRoles , roles: ctx.roles } ;
	}

	ctx.roles = lvar.subRoles ;

	returnVal = book.engine.run( this.content , book , ctx , lvar , error => {
		ctx.roles = lvar.roles ;
		callback( error ) ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	ctx.roles = lvar.roles ;

	return returnVal ;
} ;

