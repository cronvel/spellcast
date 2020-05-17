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



const path = require( 'path' ) ;
const Exm = require( 'exm' ) ;

module.exports = Exm.registerNs( {
	require ,
	ns: 'spellcast' ,
	rootDir: path.dirname( __dirname ) ,
	exports: {
		string: 'string-kit' ,
		kungFig: 'kung-fig' ,
		Ngev: 'nextgen-events' ,
		Babel: 'babel-tower' ,
		Promise: 'seventh' ,
		doormen: 'doormen' ,

		glob: 'glob' ,
		minimatch: '@cronvel/minimatch' ,

		Book: './Book.js' ,
		Ctx: './Ctx.js' ,
		Role: './Role.js' ,
		Client: './Client.js' ,
		Event: './Event.js' ,
		Listener: './Listener.js' ,
		InputInterpreter: './InputInterpreter.js' ,
		Scheduler: 'Scheduler.js' ,

		copyData: './copyData.js' ,
		engine: './engine.js' ,
		utils: 'utils.js'
	} ,
	api: {
		log: require( 'logfella' ).global.use( 'spellcast-extension' ) ,
		term: require( 'terminal-kit' ).terminal
	}
} ) ;

