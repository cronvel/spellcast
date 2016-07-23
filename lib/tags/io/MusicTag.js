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



var async = require( 'async-kit' ) ;
var ClassicTag = require( 'kung-fig' ).ClassicTag ;



function MusicTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof MusicTag ) ? this : Object.create( MusicTag.prototype ) ;
	ClassicTag.call( self , 'music' , attributes , content , proxy , shouldParse , ':' ) ;
	return self ;
}

module.exports = MusicTag ;
MusicTag.prototype = Object.create( ClassicTag.prototype ) ;
MusicTag.prototype.constructor = MusicTag ;
MusicTag.proxyMode = 'parent' ;



MusicTag.prototype.run = function run( book , execContext , callback )
{
	var self = this , music , options ;
	
	music = this.getFinalContent() ;
	
	if ( music && typeof music === 'object' )
	{
		options = music ;
		music = music.music ;
	}
	
	if ( music && typeof music === 'object' && music.__isDynamic__ ) { music = music.getFinalValue() ; }
	
	if ( typeof music !== 'string' ) { callback( new TypeError( '[music] tag music should be an URL (string)' ) ) ; return ; }
	
	book.emit( 'music' , music , options ) ;
	callback() ;
} ;


