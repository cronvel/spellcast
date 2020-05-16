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



const CasterCtx = require( '../../CasterCtx.js' ) ;
const Ngev = require( 'nextgen-events' ) ;
const ClassicTag = require( 'kung-fig' ).ClassicTag ;
const Promise = require( 'seventh' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CastTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof CastTag ) ? this : Object.create( CastTag.prototype ) ;

	if ( ! options ) { options = {} ; }
	options.keyValueSeparator = ':' ;

	ClassicTag.call( self , 'cast' , attributes , content , shouldParse , options ) ;

	return self ;
}

module.exports = CastTag ;
CastTag.prototype = Object.create( ClassicTag.prototype ) ;
CastTag.prototype.constructor = CastTag ;



CastTag.prototype.run = function( book , ctx , callback ) {
	log.debug( "Run [cast] for '%s'" , ctx.summoning || ctx.spell ) ;

	var content = this.getRecursiveFinalContent( ctx.data ) ;

	if ( ! Array.isArray( content ) ) {
		callback( new SyntaxError( "The 'cast' tag's content must be an array." ) ) ;
		return ;
	}

	Promise.forEach( content , spellName => {
		log.debug( "Cast '%s'" , spellName ) ;
		return CastTag.exec( book , spellName , null , ctx ) ;
	} ).callback( callback ) ;
} ;



/* Everything below return a Promise */

CastTag.exec = function( book , spellName , options , parentCtx ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	var error , ctx ;

	if ( options.useParentContext ) {
		ctx = parentCtx ;
	}
	else {
		ctx = new CasterCtx( book , {
			parent: parentCtx ,
			type: 'spell' ,
			spell: spellName ,
			again: !! options.again ,
			events: parentCtx && parentCtx.events || book.initEvents
		} ) ;
	}

	if ( Array.isArray( spellName ) ) {
		return CastTag.execMulti( book , spellName , null , ctx ) ;
	}

	if ( ! book.spells[ spellName ] ) {
		log.debug( "Spell %s not found." , spellName ) ;
		Ngev.groupEmit( ctx.roles , 'coreMessage' , "^rNo such spell “^R^+^/%s^:^r” in this spellbook.^:\n" , spellName ) ;

		error = new Error( "Spell '" + spellName + "' not found." ) ;
		error.type = 'notFound' ;
		throw error ;
	}

	return book.spells[ spellName ].execAsync( book , null , ctx ) ;
} ;



CastTag.execMulti = function( book , spells , options , ctx ) {
	return Promise.forEach( spells , spell =>
		CastTag.exec( book , spell , { useParentContext: true } , ctx )
			.catch( error => { if ( ! error.continue ) { throw error ; } } )
	) ;
} ;

