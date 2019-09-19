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
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ModuleTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ModuleTag ) ? this : Object.create( ModuleTag.prototype ) ;
	Tag.call( self , 'module' , attributes , content , shouldParse ) ;
	return self ;
}

module.exports = ModuleTag ;
ModuleTag.prototype = Object.create( Tag.prototype ) ;
ModuleTag.prototype.constructor = ModuleTag ;



ModuleTag.prototype.init = function( book ) {
	var i ,
		tagContainer = this.parent ,
		modules = this.content ,
		args = [ tagContainer.children.indexOf( this ) , 1 ] ;	// Arguments for .splice()

	if ( ! Array.isArray( modules ) ) { modules = [ modules ] ; }

	// First, check that modules are tag containers
	for ( i = 0 ; i < modules.length ; i ++ ) {
		if ( ! ( modules[ i ] instanceof TagContainer ) ) {
			return new Error( 'The content of a [module] tag should be a TagContainer or an array of TagContainer' ) ;
		}

		modules[ i ].children.forEach( tag => {
			tag.parent = tagContainer ;
			args.push( tag ) ;
		} ) ;
	}

	// Then, we replace the module tag itself by its content
	tagContainer.children.splice( ... args ) ;

	return null ;
} ;

