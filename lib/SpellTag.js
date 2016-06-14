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
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var async = require( 'async-kit' ) ;
var fs = require( 'fs' ) ;
var term = require( 'terminal-kit' ).terminal ;



function SpellTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SpellTag ) ? this : Object.create( SpellTag.prototype ) ;
	
	LabelTag.call( self , 'spell' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'spell' tag's content should be a TagContainer." ) ;
	}
	
	var id = self.attributes ;
	
	if ( ! id )
	{
		throw new SyntaxError( "The 'spell' tag's id should be non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: id , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = SpellTag ;
SpellTag.prototype = Object.create( LabelTag.prototype ) ;
SpellTag.prototype.constructor = SpellTag ;



SpellTag.prototype.init = function init( book )
{
	book.spells[ this.id ] = this ;
} ;



SpellTag.prototype.run = function run( book , inheritedExecution , callback )
{
	var self = this ;
	
	var castExecution = {
		type: 'spell' ,
		genericSpell: this.name ,	// Useful?
		lastCastedTime: 0 ,
		outputFile: null ,
		outputFilename: null ,
		somethingHasBeenCasted: false
	} ;
	
	if ( inheritedExecution && typeof inheritedExecution === 'object' ) { castExecution.root = inheritedExecution.root ; }
	else { castExecution.root = castExecution ; }
	
	this.prepare( castExecution , function( error ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		book.run( self.content , castExecution , function( error ) {
			if ( castExecution.root === castExecution )
			{
				// This is the top-level spell
				
				if ( ! castExecution.root.somethingHasBeenCasted )
				{
					term.green( 'This spell is not ready yet.\n' ) ;
				}
				
				if ( error ) { self.fizzled( castExecution , error , callback ) ; }
				else { self.casted( castExecution , callback ) ; }
			}
			else
			{
				if ( error ) { callback( error ) ; return ; }
				callback() ;
			}
		} ) ;
	} ) ;
} ;



SpellTag.prototype.prepare = function prepare( castExecution , callback )
{
	var openListener , errorListener , statPath ;
	
	this.prepareDirectories( function( initError ) {
	
		if ( initError ) { callback( initError ) ; return ; }
		
		if ( castExecution.type === 'summon' ) //|| castExecution.type === 'regexp-summon' )
		{
			castExecution.outputFilename = '~' + castExecution.genericSpell.replace( '/' , '~' ) ;
			statPath = castExecution.genericSpell ;
		}
		else
		{
			castExecution.outputFilename = castExecution.genericSpell ;
			statPath = '.spellcast/casted/' + castExecution.genericSpell ;
		}
		
		fs.stat( statPath , function( statError , stats ) {
			
			if ( ! statError ) { castExecution.lastCastedTime = stats.mtime.getTime() ; }
			
			castExecution.outputFile = fs.createWriteStream( '.spellcast/tmp/' + castExecution.outputFilename ) ;
			
			// Define listeners
			openListener = function( fd ) {
				castExecution.outputFile.removeListener( 'error' , errorListener ) ;
				castExecution.outputFileFd = fd ;
				callback() ;
			} ;
			
			errorListener = function( error ) {
				castExecution.outputFile.removeListener( 'open' , openListener ) ;
				callback( error ) ;
			} ;
			
			// Bind them
			castExecution.outputFile.once( 'open' , openListener ) ;
			castExecution.outputFile.once( 'error' , errorListener ) ;
		} ) ;
		
	} ) ;
} ;



SpellTag.prototype.prepareDirectories = function prepareDirectories( callback )
{
	var directories = [ '.spellcast' , '.spellcast/casted' , '.spellcast/fizzled' , '.spellcast/tmp' ] ;
	
	async.foreach( directories , function( path , foreachCallback ) {
		fs.exists( path , function( exists ) {
			if ( exists ) { foreachCallback() ; }
			else { fs.mkdir( path , foreachCallback ) ; }
		} ) ;
	} )
	.exec( callback ) ;
} ;



// callback( error , somethingHasBeenCasted )
SpellTag.prototype.casted = function casted( castExecution , callback )
{
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/casted/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; return ; }
				callback( undefined , castExecution.somethingHasBeenCasted ) ;
				//callback() ;
			} ) ;
		} ) ;
	} ) ;
} ;



// callback( error )
SpellTag.prototype.fizzled = function fizzled( castExecution , fizzledError , callback )
{
	if ( ! fizzledError ) { fizzledError = new Error( 'The spell fizzled' ) ; }
	
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/fizzled/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; }
				//callback( fizzledError , castExecution.somethingHasBeenCasted ) ;
				callback( fizzledError ) ;
			} ) ;
		} ) ;
	} ) ;
} ;


