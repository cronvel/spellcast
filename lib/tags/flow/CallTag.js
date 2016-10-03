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
var Ref = kungFig.Ref ;

var FnTag = require( './FnTag.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function CallTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof CallTag ) ? this : Object.create( CallTag.prototype ) ;
	
	var matches ;
	
	Tag.call( self , 'call' , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))(?: *=> *(\$[^ ]+))?$/ ) ) )
	{
		throw new SyntaxError( "The 'call' tag's attribute should validate the call syntax." ) ;
	}
	
	Object.defineProperties( self , {
		fnRef: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		fnId: { value: matches[ 2 ] , writable: true , enumerable: true } ,
		returnRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = CallTag ;
CallTag.prototype = Object.create( Tag.prototype ) ;
CallTag.prototype.constructor = CallTag ;
//CallTag.proxyMode = 'parent' ;



CallTag.prototype.run = function run( book , ctx , callback )
{
	var self = this , fn , returnValue , ctxArgs , ctxLocal ;
	
	if ( this.fnRef )
	{
		fn = this.fnRef.get( ctx.data , true ) ;
	}
	else
	{
		fn = book.functions[ this.fnId ] ;
	}
	
	if ( typeof fn === 'function' )
	{
		returnValue = fn( this.getRecursiveFinalContent( ctx.data ) ) ;
		
		if ( this.returnRef )
		{
			this.returnRef.set( ctx.data , returnValue ) ;
		}
		
		callback() ;
	}
	else if ( fn instanceof FnTag )
	{
		// backup context
		ctxArgs = ctx.data.args ;
		ctxLocal = ctx.data.local ;
		
		// Solve args BEFORE replacing $local! Since $args may use $local!
		ctx.data.args = this.getRecursiveFinalContent( ctx.data ) ;
		
		ctx.data.local = {} ;
		
		fn.exec( book , null , ctx , function( error ) {
			
			// restore context
			ctx.data.args = ctxArgs ;
			ctx.data.local = ctxLocal ;
			
			if ( error )
			{
				switch ( error.break )
				{
					case 'return' :
						returnValue = error.return ;
						break ;
					default :
						callback( error ) ;
						return ;
				}
			}
			
			if ( self.returnRef )
			{
				self.returnRef.set( ctx.data , returnValue ) ;
			}
			
			callback() ;
		} ) ;
	}
	else
	{
		scriptLog.warning( "[call] tag: not a function" ) ;
		callback() ;
		return ;
	}
} ;

