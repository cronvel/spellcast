/*
	Spellcast

	Copyright (c) 2014 - 2021 Cédric Ronvel

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



const copyData = require( './copyData.js' ) ;

const defaultControls = {
	keys: {
		'KB_SPACE': ['confirm'] ,
		'KB_ENTER': ['confirm'] ,
		'KB_KP_ENTER': ['confirm'] ,
		'GP1_BOTTOM_BUTTON': ['confirm'] ,
		'GP1_RIGHT_SPECIAL_BUTTON': ['confirm'] ,

		'KB_BACKSPACE': ['cancel'] ,
		'KB_DELETE': ['cancel'] ,
		'GP1_RIGHT_BUTTON': ['cancel'] ,

		'GP1_DPAD_UP': ['up'] ,
		'KB_UP': ['up'] ,
		'KB_Z': ['up'] ,

		'GP1_DPAD_DOWN': ['down'] ,
		'KB_DOWN': ['down'] ,
		'KB_S': ['down'] ,

		'GP1_DPAD_LEFT': ['left'] ,
		'KB_LEFT': ['left'] ,
		'KB_Q': ['left'] ,

		'GP1_DPAD_RIGHT': ['right'] ,
		'KB_RIGHT': ['right'] ,
		'KB_D': ['right']
	} ,
	gauges: {} ,
	gauges2d: {}
} ;

module.exports = () => copyData.deep( defaultControls ) ;
module.exports.source = defaultControls ;

