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



var Ngev = require( 'nextgen-events' ) ;
var ClassicTag = require( 'kung-fig' ).ClassicTag ;



function SoundTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof SoundTag ) ? this : Object.create( SoundTag.prototype ) ;

	if ( ! options ) { options = {} ; }
	options.keyValueSeparator = ':' ;

	ClassicTag.call( self , 'sound' , attributes , content , shouldParse , options ) ;

	return self ;
}

module.exports = SoundTag ;
SoundTag.prototype = Object.create( ClassicTag.prototype ) ;
SoundTag.prototype.constructor = SoundTag ;



SoundTag.prototype.run = function run( book , ctx ) {
	var sound , options ;

	sound = this.getRecursiveFinalContent( ctx.data ) ;

	if ( sound && typeof sound === 'string' ) { sound = { url: sound } ; }

	if ( typeof sound.url !== 'string' ) { return new TypeError( '[sound] tag: bad URL.' ) ; }

	Ngev.groupEmit( ctx.roles , 'sound' , sound ) ;
	return null ;
} ;


