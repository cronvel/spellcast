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

var tree = require( 'tree-kit' ) ;
var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SetTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SetTag ) ? this : Object.create( SetTag.prototype ) ;
	
	var matches ;
	
	Tag.call( self , 'set' , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^\$([^ ]+)$/ ) ) )
	{
		throw new SyntaxError( "The 'set' tag's attribute should validate the set syntax." ) ;
	}
	
	Object.defineProperties( self , {
		targetPath: { value: matches[ 1 ] , writable: true , enumerable: true }
	} ) ;
	
	//log.debug( "Set tag: %I" , self ) ;
	
	return self ;
}

module.exports = SetTag ;
SetTag.prototype = Object.create( Tag.prototype ) ;
SetTag.prototype.constructor = SetTag ;
//SetTag.proxyMode = 'parent' ;



SetTag.prototype.run = function run( book , execContext , callback )
{
	var value = this.content ;
	
	if ( value.__isDynamic__ ) { value = value.getValue() ; }
	//log.debug( "[set] run -- targetPath: %J , value: %J" , this.targetPath , value ) ;
	
	tree.path.set( this.proxy.data , this.targetPath , value ) ;
	//log.debug( "[set] run -- set value: %J" , tree.path.get( this.proxy.data , this.targetPath ) ) ;
	
	callback() ;
} ;


