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



const Ctx = require( './Ctx.js' ) ;
//const Ngev = require( 'nextgen-events' ) ;
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CasterCtx() { throw new Error( 'Use CasterCtx.create() instead.' ) ; }
CasterCtx.prototype = Object.create( Ctx.prototype ) ;
CasterCtx.prototype.constructor = CasterCtx ;

module.exports = CasterCtx ;



CasterCtx.create = function( book , options , self ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	if ( ! ( self instanceof CasterCtx ) ) { self = Object.create( CasterCtx.prototype ) ; }

	Ctx.create( book , options , self ) ;

	Object.defineProperties( self , {

		// Common
		lastCastedTime: { value: -Infinity , writable: true , enumerable: true } ,
		dependenciesTime: { value: -Infinity , writable: true , enumerable: true } ,
		again: { value: !! options.again , writable: true , enumerable: true } ,
		outputFile: { value: null , writable: true , enumerable: true } ,
		outputFilename: { value: null , writable: true , enumerable: true } ,

		// Spell mode
		spell: { value: options.spell || null , writable: true , enumerable: true } ,

		// Summoning mode
		summoning: { value: options.summoning || null , writable: true , enumerable: true } ,
		summoningMatches: { value: null , writable: true , enumerable: true } ,
		summoned: { value: [] , writable: true , enumerable: true } ,

		name: {
			get: function() {
				if ( this.type === 'summoning' ) { return this.summoning ; }
				else if ( this.type === 'spell' ) { return this.spell ; }
				return null ;	// <- to please ESLint
			}
		}
	} ) ;

	return self ;
} ;


