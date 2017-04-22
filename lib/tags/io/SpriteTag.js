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
var Ref = kungFig.Ref ;
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var Ngev = require( 'nextgen-events' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SpriteTag( tag , attributes , content , shouldParse , options )
{
	var self = ( this instanceof SpriteTag ) ? this : Object.create( SpriteTag.prototype ) ;
	
	var matches , action ;
	
	switch ( tag )
	{
		case 'show-sprite' :
			action = 'show' ;
			break ;
		case 'update-sprite' :
			action = 'update' ;
			break ;
		case 'animate-sprite' :
			action = 'animate' ;
			break ;
		case 'clear-sprite' :
			action = 'clear' ;
			break ;
		default :
			throw new Error( 'Unknown tag: ' + tag ) ;
	}
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)|([^$ ]+)$/ ) ) )
	{
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the *-sprite syntax." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		action: { value: action , enumerable: true } ,
	} ) ;
	
	return self ;
}



module.exports = SpriteTag ;
SpriteTag.prototype = Object.create( Tag.prototype ) ;
SpriteTag.prototype.constructor = SpriteTag ;



SpriteTag.prototype.run = function run( book , ctx )
{
	var self = this , id , data ;
	
	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	
	if ( this.action !== 'clear' )
	{
		data = this.getRecursiveFinalContent( ctx.data ) ;
		
		if ( this.action !== 'animate' )
		{
			if ( data && typeof data === 'string' ) { data = { url: data } ; }
				
			if ( typeof data.url !== 'string' && ( this.action === 'show' || data.url ) )
			{
				return new TypeError( '[show-sprite] tag: bad URL.' ) ;
			}
		}
	}
	
	Ngev.groupEmit( ctx.roles , this.action + 'Sprite' , id , data ) ;
	return null ;
} ;


