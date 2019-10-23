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
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function FnTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof FnTag ) ? this : Object.create( FnTag.prototype ) ;

	var matches ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'fn' tag's content should be a TagContainer." ) ;
	}

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( tag === 'fn' ) {
		if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)|([^$ ]+)$/ ) ) ) {
			throw new SyntaxError( "The 'fn' tag's attribute should validate the fn syntax." ) ;
		}

		Object.defineProperties( self , {
			namespace: { value: '' , writable: true , enumerable: true } ,
			id: { value: matches[ 2 ] , enumerable: true } ,
			ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true }
		} ) ;
	}
	else {
		// It's an anonymous function that is part of some other tag mechanism, like the [effect] tag
		Object.defineProperties( self , {
			namespace: { value: null , enumerable: true } ,
			id: { value: null , enumerable: true } ,
			ref: { value: null , enumerable: true }
		} ) ;
	}

	// A bit of optimization here: erase the run() method if there is no ref
	if ( ! self.ref ) { self.run = null ; }

	return self ;
}

module.exports = FnTag ;
FnTag.prototype = Object.create( Tag.prototype ) ;
FnTag.prototype.constructor = FnTag ;



FnTag.prototype.init = function( book ) {
	if ( ! this.id ) { return null ; }

	var groupTag = this.getParentTag() ;

	if ( groupTag && ( groupTag.name === 'chapter' || groupTag.name === 'system' ) ) {
		this.namespace = groupTag.id ;
	}

	if ( ! book.functions[ this.namespace ] ) { book.functions[ this.namespace ] = {} ; }
	book.functions[ this.namespace ][ this.id ] = this ;

	return null ;
} ;



FnTag.prototype.run = function( book , ctx ) {
	if ( this.ref ) { this.ref.set( ctx.data , this ) ; }
	return null ;
} ;



// “maybe async” exec()
FnTag.prototype.exec = function( book , args , ctx , callback ) {
	var lvar , returnVal ;

	// Lazily create the static data for the function
	// /!\ Note that some other tag copy the FnTag's exec(): no static data should be created for them
	if ( ( this instanceof FnTag ) && this.id && ! book.staticData[ this.uid ] ) {
		book.staticData[ this.uid ] = {} ;
	}

	if ( ctx.resume ) {
		lvar = ctx.syncCodeStack[ ctx.syncCodeDepth ].lvar ;
	}
	else {
		lvar = {
			// backup some context var
			parentArgs: ctx.data.args ,
			parentLocal: ctx.data.local ,
			parentStatic: ctx.data.static
		} ;

		// Solve args BEFORE replacing $local! Since $args may use $local!
		ctx.data.args = args ;
		ctx.data.local = {} ;

		// /!\ Note that some other tag copy the FnTag's exec(): no static data should be created for them
		ctx.data.static = ( this instanceof FnTag ) && this.id ? book.staticData[ this.uid ] : null ;
	}

	// “maybe async”
	returnVal = book.engine.run( this.content , book , ctx , lvar , ( error ) => {
		// Async variant...

		// restore context
		ctx.data.args = lvar.parentArgs ;
		ctx.data.local = lvar.parentLocal ;
		ctx.data.static = lvar.parentStatic ;

		callback( error ) ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	// restore context
	ctx.data.args = lvar.parentArgs ;
	ctx.data.local = lvar.parentLocal ;
	ctx.data.static = lvar.parentStatic ;

	return returnVal ;
} ;



// Force callback usage
FnTag.prototype.execCb = function( book , args , ctx , callback ) {
	var returnVal = this.exec( book , args , ctx , callback ) ;
	if ( returnVal !== undefined ) { callback( returnVal ) ; }
} ;

