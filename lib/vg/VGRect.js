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



const VGItem = require( './VGItem.js' ) ;
const log = require( 'logfella' ).global.use( 'vg' ) ;



function VGRect( options = {} ) {
	VGItem.call( this , options ) ;

	this.x = options.x || 0 ;
	this.y = options.y || 0 ;
	this.width = options.width || 0 ;
	this.height = options.height || 0 ;

	// Round corner radius
	this.rx = options.rx || options.r || 0 ;
	this.ry = options.ry || options.r || 0 ;
}

module.exports = VGRect ;

VGRect.prototype = Object.create( VGItem.prototype ) ;
VGRect.prototype.constructor = VGRect ;
VGRect.prototype.__prototypeUID__ = 'spellcast/VGRect' ;
VGRect.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

