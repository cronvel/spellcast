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



//var Ngev = require( 'nextgen-events' ) ;
var kungFig = require( 'kung-fig' ) ;
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;


//var async = require( 'async-kit' ) ;
//var tree = require( 'tree-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ActionTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof ActionTag ) ? this : Object.create( ActionTag.prototype ) ;
	
	LabelTag.call( self , 'action' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'action' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'action' tag's id should be a non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = ActionTag ;
ActionTag.prototype = Object.create( LabelTag.prototype ) ;
ActionTag.prototype.constructor = ActionTag ;
//ActionTag.proxyMode = 'inherit+links' ;



ActionTag.prototype.init = function init( book )
{
	book.actions[ this.id ] = this ;
	return null ;
} ;



ActionTag.prototype.exec = function exec( book , options , ctx , callback )
{
	// /!\ TMP...
	if ( ! ctx.data.this || typeof ctx.data.this !== 'object' ) { ctx.data.this = {} ; }
	
	ctx.data.this.role = options.role ;
	ctx.data.this.subject = options.subject ;
	ctx.data.this.object = options.object ;
	ctx.data.this.target = options.target ;
	
	book.engine.runCb( this.content , book , ctx , function( error ) {
		if ( error ) { callback( error ) ; return ; }
		
		callback() ;
	} ) ;
} ;



ActionTag.parse = function parse( str )
{
	if ( ! str || typeof str !== 'string' || str[ 0 ] !== '/' ) { return ; }
	
	var parsed = {} , matches ;
	
	matches = str.match( /^\/([a-zA-Z0-9_-]+)/ ) ;
	parsed.action = matches[ 1 ] ;
	
	return parsed ;
} ;


