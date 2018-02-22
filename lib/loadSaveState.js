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

// This works only for the story mode

"use strict" ;



var jsbindat = require( 'jsbindat' ) ;
var tree = require( 'tree-kit' ) ;
//var fs = require( 'fs' ) ;

var StoryCtx = require( './StoryCtx.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var classMap = {
	Entity: require( './rpg/Entity.js' ) ,
	Item: require( './rpg/Item.js' ) ,
} ;

classMap = new jsbindat.ClassMap( classMap ) ;



exports.saveState = function saveState( filePath , callback ) {
	var element ;

	var state = {
		//data: tree.extend( { own: true } , {} , this.data ) ,
		data: this.data ,
		staticData: this.staticData ,
		ctx: this.ctx && this.ctx.serialize()
	} ;

	//log.error( "%Y" , this.ctx ) ;
	log.error( "Saved state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;

	var options = { classMap: classMap } ;

	jsbindat.writeFile( filePath , state , options ).then( callback , callback ) ;
} ;



exports.loadState = function loadState( filePath , callback ) {
	var options = { classMap: classMap } ;

	jsbindat.readFile( filePath , options ).then(
		state => {
			//log.error( "State: %Y" , state ) ;
			log.error( "Loaded state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;

			// Unpack global and static data
			tree.extend( null , this.data , state.data ) ;
			tree.extend( null , this.staticData , state.staticData ) ;

			// It registers itself to the book automatically
			StoryCtx.unserialize( state.ctx , this ) ;

			log.error( "Book ctx: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 3 } , this.ctx ) ) ;

			this.resumeState( this.ctx , callback ) ;
		} ,
		error => {
			callback( error ) ;
		}
	) ;
} ;



exports.resumeState = function resumeState( ctx , callback ) {
	this.busy( ( busyCallback ) => {

		ctx.activeScene.resume( this , ctx , ( error ) => {

			if ( error && ( error instanceof Error ) ) {
				log.fatal( "Error: %E" , error ) ;
			}

			this.end( null , null , busyCallback ) ;
		} ) ;

	} , callback ) ;
} ;


