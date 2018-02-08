/*
	Spellcast
	
	Copyright (c) 2014 - 2018 Cédric Ronvel
	
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



var vm = require( 'vm' ) ;

var kungFig = require( 'kung-fig' ) ;
var ClassicTag = kungFig.ClassicTag ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function JsTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof JsTag ) ? this : Object.create( JsTag.prototype ) ;

	ClassicTag.call( self , 'js' , attributes , content , shouldParse , options ) ;

	if ( typeof content !== 'string' ) {
		throw new SyntaxError( "The 'js' tag's content should be a string." ) ;
	}

	Object.defineProperties( self , {
		script: { get: self.compileScript , configurable: true }
	} ) ;

	//log.debug( "Set tag: %I" , self ) ;

	return self ;
}

module.exports = JsTag ;
JsTag.prototype = Object.create( ClassicTag.prototype ) ;
JsTag.prototype.constructor = JsTag ;



var vmOptions = {
	filename: 'js-tag.vm' ,
	lineOffset: 0 ,
	columnOffset: 0 ,
	displayErrors: true ,
	timeout: 100
} ;



JsTag.prototype.run = function run( book , ctx ) {
	var error ;

	// First check if the book allow [js] tag or not...
	if ( ! book.allowJsTag ) {
		error = new Error( 'The [js] tag is disabled' ) ;
		scriptLog.error( "Run [js] tag error (%s): %E" , this.location , error ) ;
		return error ;
	}

	try {
		var result = this.script.runInContext( this.createContext( ctx ) , vmOptions ) ;
	}
	catch ( error_ ) {
		scriptLog.error( "Run [js] tag error (%s): %E" , this.location , error_ ) ;
		return error_ ;
	}

	//console.error( "Result: %I %s" , result , {}.toString() ) ;
	//log.error( "%I" , this.proxy.data.this.toString() ) ;

	return null ;
} ;



JsTag.prototype.compileScript = function compileScript() {
	var script = new vm.Script( this.content , vmOptions ) ;

	Object.defineProperty( this , 'script' , {
		value: script ,
		enumerable: true
	} ) ;

	return script ;
} ;



JsTag.prototype.createContext = function createContext( ctx ) {
	var context = vm.isContext( ctx.data ) ? ctx.data : new vm.createContext( ctx.data ) ;
	return context ;
} ;


