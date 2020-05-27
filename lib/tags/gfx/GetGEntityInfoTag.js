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
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;
const Role = require( '../../Role.js' ) ;

const dataClone = require( 'tree-kit' ).extend.bind( null , { own: true , deep: true , immutables: [ Role.prototype ] } ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



const tagOptions = {
	'get-sprite-info': 'sprite' ,
	'get-vg-info': 'vg' ,
	'get-marker-info': 'marker' ,
	'get-card-info': 'card'
} ;



function GetGEntityInfoTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof GetGEntityInfoTag ) ? this : Object.create( GetGEntityInfoTag.prototype ) ;
	var matches , type ;

	if ( ! tagOptions[ tag ] ) { throw new Error( 'Unknown tag: ' + tag ) ; }

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+)) *=> *(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The 'get-*-info' tag's attribute should validate the get-*-info syntax." ) ;
	}

	type = tagOptions[ tag ] ;

	Object.defineProperties( self , {
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		toRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , enumerable: true } ,
		type: { value: type , enumerable: true }
	} ) ;

	return self ;
}



module.exports = GetGEntityInfoTag ;
GetGEntityInfoTag.prototype = Object.create( Tag.prototype ) ;
GetGEntityInfoTag.prototype.constructor = GetGEntityInfoTag ;



GetGEntityInfoTag.prototype.run = function( book , ctx ) {
	var id , store , gItem , data ;

	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	store = ctx[ this.type + 's' ] ;
	gItem = store[ id ] ;

	data = dataClone( {} , gItem ) ;
	data.roles = data.roles.map( r => r.id ) ;
	this.toRef.set( ctx.data , data ) ;

	return null ;
} ;


