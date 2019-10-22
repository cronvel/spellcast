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

/*
	VG: Vector Graphics

	Maybe it should have it own module, or should be moved to svg-kit?
*/

const log = require( 'logfella' ).global.use( 'vg' ) ;

var autoId = 0 ;



function VG( book , id , options = {} ) {
	if ( ! id ) { id = 'vg_' + ( autoId ++ ) ; }

	this.viewBox = {
		x: options.x || 0 ,
		y: options.y || 0 ,
		width: options.width || 100 ,
		height: options.height || 100
	} ;
	
	this.items = [] ;
}

module.exports = VG ;

VG.prototype.__prototypeUID__ = 'spellcast/VG' ;
VG.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;


