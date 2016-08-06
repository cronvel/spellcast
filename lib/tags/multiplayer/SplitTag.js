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



var Ngev = require( 'nextgen-events' ) ;
var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var NextTag = require( './NextTag.js' ) ;

var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SplitTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof SplitTag ) ? this : Object.create( SplitTag.prototype ) ;
	
	Tag.call( self , 'split' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'split' tag's content should be a TagContainer." ) ;
	}
	
	Object.defineProperties( self , {
		parts: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = SplitTag ;
SplitTag.prototype = Object.create( Tag.prototype ) ;
SplitTag.prototype.constructor = SplitTag ;
//SplitTag.proxyMode = 'parent' ; // inherit+links will be used in each divergence



SplitTag.prototype.init = function init( book , callback )
{
	this.parts = this.content.getTags( 'part' ) ;
	callback() ;
} ;



SplitTag.prototype.exec = function exec( book , options , execContext , callback )
{
	var self = this ;
	
	async.foreach( this.parts , function( partTag , foreachCallback ) {
		
		var roles = partTag.content.getFirstTag( 'roles' ) ;
		var subsceneTag = partTag.content.getFirstTag( 'subscene' ) ;
		
		if ( ! roles || ! subsceneTag ) { foreachCallback() ; return ; }
		
		roles = roles.getFinalContent() ;
		
		var partExecContext = {
			nexts: execContext.nexts.slice() ,
			roles: roles ,
			nextTriggeringRoles: null ,
			nextTriggeringSpecial: null ,
			sceneStack: execContext.sceneStack.slice()
		} ;
		
		console.log( "partExecContext:" , partExecContext ) ;
		
		Object.defineProperty( partExecContext , 'activeScene' , {
			get: function() {
				if ( ! this.sceneStack.length ) { return ; }
				return this.sceneStack[ this.sceneStack.length - 1 ] ;
			} ,
			set: function( split ) {
				if ( this.sceneStack.length )
				{
					if ( split ) { this.sceneStack[ this.sceneStack.length - 1 ] = split ; }
					//else { this.sceneStack.length -- ; }
				}
				else if ( split ) { this.sceneStack[ 0 ] = split ; }
			}
		} ) ;
		
		subscene.run( book , partExecContext , callback ) ;
	} )
	.parallel()
	.exec( callback ) ;
} ;


