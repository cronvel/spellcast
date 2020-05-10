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



const kungFig = require( 'kung-fig' ) ;
const LabelTag = kungFig.LabelTag ;
const utils = require( '../../utils.js' ) ;
const tree = require( 'tree-kit' ) ;



function ZapTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ZapTag ) ? this : Object.create( ZapTag.prototype ) ;
	LabelTag.call( self , 'zap' , attributes , content , shouldParse ) ;

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'zap' tag wand's path should be non-empty string." ) ;
	}

	// so "fire staff's fireball" will be translated to "fire staff.fireball"
	var wandPath = self.attributes.replace( /'s +/g , '.' ).replace( /s' +/g , 's.' ) ;

	Object.defineProperties( self , {
		wandPath: { value: wandPath , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ZapTag ;
ZapTag.prototype = Object.create( LabelTag.prototype ) ;
ZapTag.prototype.constructor = ZapTag ;



ZapTag.prototype.run = function( book , ctx , callback ) {
	var fn = tree.path.get( book.wands , this.wandPath ) ;

	if ( typeof fn !== 'function' ) {
		throw new Error( "Don't have any '" + this.wandPath + "' wand's evocation (" + this.location + ")" ) ;
	}

	if ( fn.length <= 3 ) {
		// Sync version
		fn( book , this , ctx ) ;
		return null ;
	}

	// Async version
	fn( book , this , ctx , callback ) ;

} ;

