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
const Tag = kungFig.Tag ;
const Ref = kungFig.Ref ;

const BaseObject = require( '../../objects/BaseObject.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function MoveIntoTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof MoveIntoTag ) ? this : Object.create( MoveIntoTag.prototype ) ;

	Tag.call( self , 'move-into' , attributes , content , shouldParse ) ;

	var matches ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+) +=> +(?:(\$[^ ]+)|([^$ ]+))$/ ) ) ) {
		throw new SyntaxError( "The 'place' tag's attribute should validate the place syntax." ) ;
	}

	Object.defineProperties( self , {
		objectRef: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		intoRef: { value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
		intoId: { value: matches[ 3 ] , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = MoveIntoTag ;
MoveIntoTag.prototype = Object.create( Tag.prototype ) ;
MoveIntoTag.prototype.constructor = MoveIntoTag ;



MoveIntoTag.prototype.run = function( book , ctx ) {
	var into , params ,
		object = this.objectRef.get( ctx.data ) ;

	if ( ! object || ! ( object instanceof BaseObject ) ) {
		scriptLog.error( "[move-into] tag using a non spellcast object (BaseObject) (as 'object') (%s)" , this.location ) ;
		return null ;
	}

	if ( this.intoRef ) {
		into = this.intoRef.get( ctx.data ) ;
	}
	else if ( this.intoId ) {
		into = ctx.data.places[ this.intoId ] ;
	}

	if ( ! into || ! ( into instanceof BaseObject ) ) {
		scriptLog.error( "[move-into] tag using a non spellcast object (BaseObject) (as 'into') (%s)" , this.location ) ;
		return null ;
	}

	if ( params.into === undefined ) {
		// If undefined, use the current place, if null it is intentionally dropped into the void...
		params.into = ctx.data.place ;
	}

	if ( params.into ) {
		params.into.moveInto( object ) ;
	}
	else {
		object.removeFromParent() ;
	}

	return null ;
} ;

