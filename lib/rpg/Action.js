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



const kungFig = require( 'kung-fig' ) ;
//const tree = require( 'tree-kit' ) ;
const copyData = require( '../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Action( book , id , options ) {
	var slotType ;

	if ( ! options || typeof options !== 'object' ) {
		options = {} ;
	}
	else {
		// Clone options to avoid parts to be shared
		options = copyData.deep( options ) ;
	}

	if ( ! id ) { id = 'action_' + ( autoId ++ ) ; }

	Object.defineProperties( this , {
		book: { value: book } ,
		id: { value: id , enumerable: true } ,

		// Action's name and description
		//name: { value: options.name || '(unknown)' , writable: true , enumerable: true } ,
		//description: { value: options.description || options.name || '(unknown)' , writable: true , enumerable: true } ,

		// Adhoc namespace where script and API may store temporary data related to the action
		//adhoc: { value: options.adhoc || {} , writable: true , enumerable: true } ,

		checkTags: { value: options.checkTags || [] , writable: true , enumerable: true } ,
		effectTag: { value: options.effectTag || null , writable: true , enumerable: true } ,
		reportTag: { value: options.reportTag || null , writable: true , enumerable: true } ,
	} ) ;
}

module.exports = Action ;

Action.prototype.__prototypeUID__ = 'spellcast/Action' ;
Action.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Action.serializer = function( action ) {
	return { override: action } ;
} ;



Action.unserializeContext = true ;

Action.unserializer = function( context ) {
	var action = Object.create( Action.prototype ) ;
	Object.defineProperty( action , 'book' , { value: context.book } ) ;
	//log.error( "Action.unserializer: %I" , context ) ;
	return action ;
} ;

