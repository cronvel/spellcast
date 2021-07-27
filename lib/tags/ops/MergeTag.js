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
const Tag = kungFig.Tag ;
const Ref = kungFig.Ref ;
const Dynamic = kungFig.Dynamic ;

const tree = require( 'tree-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function MergeTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof MergeTag ) ? this : Object.create( MergeTag.prototype ) ;

	var matches , sourceRefs ;

	Tag.call( self , 'merge' , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^((?:\$[^ ]+)(?: +, +\$[^ ]+)*)(?: +=> +(\$[^ ]+))?$/ ) ) ) {
		throw new SyntaxError( "The 'merge' tag's attribute should validate the foreach syntax." ) ;
	}

	sourceRefs = matches[ 1 ].split( / +, +/ ).map( e => Ref.parse( e ) ) ;

	Object.defineProperties( self , {
		sourceRefs: {
			value: sourceRefs , writable: true , enumerable: true
		} ,
		targetRef: {
			value: matches[ 2 ] ? Ref.parse( matches[ 2 ] ) : null , writable: true , enumerable: true
		}
	} ) ;

	return self ;
}

module.exports = MergeTag ;
MergeTag.prototype = Object.create( Tag.prototype ) ;
MergeTag.prototype.constructor = MergeTag ;



const EXTEND_OPTIONS = { deep: true } ;

MergeTag.prototype.run = function( book , ctx ) {
	var sources = this.sourceRefs.map( e => e.getValue( ctx.data ) ) ;

	if ( this.targetRef ) {
		//this.targetRef.set( ctx.data , kungFig.reduce( ... sources ) ) ;
		this.targetRef.set( ctx.data , tree.extend( EXTEND_OPTIONS , {} , ... sources ) ) ;
	}
	else {
		//kungFig.autoReduce( ... sources ) ;
		tree.extend( EXTEND_OPTIONS , ... sources ) ;
	}

	return null ;
} ;

