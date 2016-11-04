/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ModuleTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof ModuleTag ) ? this : Object.create( ModuleTag.prototype ) ;
	Tag.call( self , 'module' , attributes , content , shouldParse ) ;
	return self ;
}

module.exports = ModuleTag ;
ModuleTag.prototype = Object.create( Tag.prototype ) ;
ModuleTag.prototype.constructor = ModuleTag ;
//ModuleTag.proxyMode = 'parent' ;



ModuleTag.prototype.init = function init( book , callback )
{
	var self = this ,
		tagContainer = this.parent ,
		indexOf = tagContainer.children.indexOf( this ) ,
		modules = this.content ,
		children = [] ;
	
	
	if ( ! Array.isArray( modules ) ) { modules = [ modules ] ; }
	
	
	async.foreach( modules , function( oneModule , foreachCallback ) {
		
		if ( ! ( oneModule instanceof TagContainer ) )
		{
			foreachCallback( new Error( 'The content of a [module] tag should be a TagContainer or an array of TagContainer' ) ) ;
			return ;
		}
		
		// First we should init the module content NOW!
		book.init( oneModule , function( error ) {
			if ( error ) { foreachCallback( error ) ; return ; }
			
			children = children.concat( oneModule.children ) ;
			foreachCallback() ;
		} ) ;
	} )
	.exec( function( error ) {
		if ( error ) { callback( error ) ; return ; }
		
		// Now we replace the module tag itself by its content
		var args = [ indexOf , 1 ].concat( children ) ;
		tagContainer.children.splice.apply( tagContainer.children , args ) ;
		callback() ;
	} ) ;
} ;


