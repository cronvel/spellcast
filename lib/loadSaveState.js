/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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

// This works only for the adventurer mode

"use strict" ;



var jsbindat = require( 'jsbindat' ) ;
var tree = require( 'tree-kit' ) ;
//var fs = require( 'fs' ) ;

var AdventurerCtx = require( './AdventurerCtx.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



exports.saveState = function saveState( filePath , callback )
{
	var element ;
	
	var state = {
		//data: tree.extend( { own: true } , {} , this.data ) ,
		data: this.data ,
		staticData: this.staticData ,
		ctx: this.ctx && this.ctx.serialize() ,
	} ;
	
	//log.error( "%Y" , this.ctx ) ;
	log.error( "Saved state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;
	
	var options = {
	} ;
	
	jsbindat.writeFile( filePath , state , options , callback ) ;
} ;



exports.loadState = function loadState( filePath , callback )
{
	var self = this ;
	
	var options = {
	} ;
	
	jsbindat.readFile( filePath , options , function( state ) {
		//log.error( "State: %Y" , state ) ;
		log.error( "Loaded state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;
		
		// Unpack global and static data
		tree.extend( null , self.data , state.data ) ;
		tree.extend( null , self.staticData , state.staticData ) ;
		
		// It registers itself to the book automatically
		AdventurerCtx.unserialize( state.ctx , self ) ;
		
		log.error( "Book ctx: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 3 } , self.ctx ) ) ;
		
		self.resumeState( self.ctx , callback ) ;
	} ) ;
} ;



exports.resumeState = function resumeState( ctx , callback )
{
	var self = this ;
	
	this.busy( function( busyCallback ) {
		
		ctx.activeScene.resume( self , ctx , function( error ) {
			
			if ( error && ( error instanceof Error ) )
			{
				log.fatal( "Error: %E" , error ) ;
			}
			
			self.end( null , null , busyCallback ) ;
		} ) ;
	
	} , callback ) ;
} ;


