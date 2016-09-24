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
var tree = require( 'tree-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



			/* Compound stats */



function CompoundStats() { throw new Error( 'Use CompoundStats.create() instead.' ) ; }
module.exports = CompoundStats ;

CompoundStats.prototype.__prototypeUID__ = 'spellcast/CompoundStats' ;
CompoundStats.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



CompoundStats.create = function create( id , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	else { options = tree.clone( options ) ; }  // Clone options to avoid parts to be shared
	
	if ( ! id ) { id = 'entity_' + ( autoId ++ ) ; }
	
	var self = Object.create( CompoundStats.prototype , {
		// Compound stats for this kind of entity class
		class: { value: options.class || 'entity' , writable: true , enumerable: true } ,
		
		// Compound stats for this action, null: global stat
		action: { value: options.class || null , writable: true , enumerable: true } ,
		
		// Compound statistics and attributes
		stats: { value: options.stats || {} , writable: true , enumerable: true } ,
		
		/*
		// Compound skills (rare)
		skills: { value: options.skills || {} , writable: true , enumerable: true } ,
		
		// Compound status (rare)
		status: { value: options.status || {} , writable: true , enumerable: true } ,
		
		// Compound stances (rare)
		stances: { value: options.stances || {} , writable: true , enumerable: true } ,
		*/
	} ) ;
	
	return self ;
} ;



//CompoundStats.prototype.updateActual = function updateActual() {} ;


