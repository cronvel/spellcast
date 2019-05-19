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



var kungFig = require( 'kung-fig' ) ;
var Ref = kungFig.Ref ;
var Tag = kungFig.Tag ;
var Role = require( '../../Role.js' ) ;

var dataClone = require( 'tree-kit' ).extend.bind( null , { own: true , deep: true , immutables: [ Role.prototype ] } ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var tagOptions = {
	'get-sprite-info': 'sprite' ,
	'get-ui-info': 'ui' ,
	'get-marker-info': 'marker' ,
	'get-card-info': 'card'
} ;



function GetUiInfoTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof GetUiInfoTag ) ? this : Object.create( GetUiInfoTag.prototype ) ;
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



module.exports = GetUiInfoTag ;
GetUiInfoTag.prototype = Object.create( Tag.prototype ) ;
GetUiInfoTag.prototype.constructor = GetUiInfoTag ;



GetUiInfoTag.prototype.run = function run( book , ctx ) {
	var id , store , ui , data ;

	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	store = ctx[ this.type + 's' ] ;
	ui = store[ id ] ;

	data = dataClone( {} , ui ) ;
	data.roles = data.roles.map( r => r.id ) ;
	this.toRef.set( ctx.data , data ) ;

	return null ;
} ;


