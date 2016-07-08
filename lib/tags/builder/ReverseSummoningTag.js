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



//var fs = require( 'fs' ) ;
var glob = require( 'glob' ) ;
var kungFig = require( 'kung-fig' ) ;
var async = require( 'async-kit' ) ;

var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;
var SummoningTag = require( './SummoningTag' ) ;
var SummonTag = require( './SummonTag' ) ;

//var term = require( 'terminal-kit' ).terminal ;

//var utils = require( '../../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ReverseSummoningTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof ReverseSummoningTag ) ? this : Object.create( ReverseSummoningTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer() ;
	}
	
	// Do not call SummoningTag constructor, only call the LabelTag one
	LabelTag.call( self , 'reverse-summoning' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'reverse-summoning' tag's content should be a TagContainer." ) ;
	}
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'spell' tag's id should be non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
		mapping: { value: {} , writable: true , enumerable: true } ,
		undeadDirectories: { value: {} , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = ReverseSummoningTag ;
ReverseSummoningTag.prototype = Object.create( SummoningTag.prototype ) ;
ReverseSummoningTag.prototype.constructor = ReverseSummoningTag ;
ReverseSummoningTag.proxyMode = 'inherit+links' ;



ReverseSummoningTag.prototype.init = function init( book , tagContainer , callback )
{
	// Reverse summonings are both spells and summonings
	book.spells[ this.id ] = this ;
	book.reverseSummonings.push( this ) ;
	
	this.solveReverse( callback ) ;
} ;



ReverseSummoningTag.prototype.exec = function exec( book , options , execContext , callback )
{
	if ( execContext.summoning )
	{
		// This is a regular summoning
		SummoningTag.prototype.exec.call( this , book , options , execContext , callback ) ;
	}
	else if ( execContext.spell )
	{
		// This is a spell-like reverse summoning: it summons everything!
		Object.keys( this.undeadDirectories ).forEach( e => book.castUndead( e ) ) ;
		SummonTag.execMulti( book , Object.keys( this.mapping ) , options , execContext , callback ) ;
	}
	else
	{
		throw new Error( "Reverse-summoning is not exec as spell and not as a summoning..." ) ;
	}
} ;



ReverseSummoningTag.prototype.reset = function reset( callback )
{
	this.mapping = {} ;
	this.undeadDirectories = {} ;
	this.solveReverse( callback ) ;
} ;



ReverseSummoningTag.prototype.solveReverse = function solveReverse( callback )
{
	var self = this , sourcesList ;
	
	//log.debug( "Solve reverse summoning %s" , this.globPattern ) ;
	
	sourcesList = this.content.getTags( 'sources' ) ;
	
	//log.debug( "Sources: %I" , sourcesList ) ;
	
	async.foreach( sourcesList , function( sources , foreachCallback ) {
		self.addSources( sources , function( error ) {
			if ( error ) { foreachCallback( error ) ; return ; }
			self.addSourcesUndeadDirectories( sources , foreachCallback ) ;
		} ) ;
	} )
	.exec( callback ) ;
} ;



ReverseSummoningTag.prototype.addSources = function addSources( sources , callback )
{
	var self = this , target , regex ;
	
	regex = sources.regex ;
	
	glob( sources.globPattern , function( error , sourceFiles ) {
		
		if ( error ) { callback( error ) ; }
		
		//log.debug( "Sources: %s" , sourceFiles ) ;
		
		sourceFiles.forEach( source => {
			
			if ( regex.test( source ) )
			{
				//target = source.replace( regex , regex.replacement ) ;
				target = regex.substitute( source ) ;
				log.debug( "Target found for source %s: %s" , source , target ) ;
				self.mapping[ target ] = source ;
			}
			else
			{
				// Not found! What to do?
				log.verbose( "No target found for this source: %s" , source ) ;
			}
		} ) ;
		
		callback() ;
	} ) ;
} ;



ReverseSummoningTag.prototype.addSourcesUndeadDirectories = function addSourcesUndeadDirectories( sources , callback )
{
	var self = this , globPattern ;
	
	if ( ! glob.hasMagic( sources.globPattern ) ) { callback() ; return ; }
	
	globPattern = sources.globPattern ;
	
	async.while( function( error , results , whileCallback ) {
		//log.error( arguments ) ;
		//log.error( "WHILE" ) ;
		
		var lastStar , lastSlash ;
		
		lastStar = globPattern.lastIndexOf( '*' ) ;
		
		if ( lastStar === -1 ) { /*log.error( "WHILE callback stop" ) ;*/ whileCallback( false ) ; return ; }
		
		lastSlash = globPattern.lastIndexOf( '/' , lastStar ) ;
		
		if ( lastSlash === -1 ) { globPattern = './' ; }
		else if ( lastSlash === 0 ) { globPattern = '/' ; }
		else { globPattern = globPattern.slice( 0 , lastSlash ) ; }
		
		//log.error( "WHILE callback continue" ) ;
		whileCallback( true ) ;
	} )
	.do( function( doCallback ) {
		log.debug( "Adding undead directory pattern: %s" , globPattern ) ;
		//log.error( "DO" ) ;
		
		if ( ! glob.hasMagic( globPattern ) )
		{
			self.undeadDirectories[ globPattern ] = true ;
			doCallback() ;
			return ;
		}
		
		glob( globPattern , function( error , sourceDir ) {
			
			if ( error ) { /*log.error( "DO callback error" ) ;*/ doCallback( error ) ; return ; }
			
			//log.warning( "Source dir: %s" , sourceDir ) ;
			sourceDir.forEach( e => self.undeadDirectories[ e ] = true ) ;
			//log.error( "DO callback" ) ;
			doCallback() ;
		} ) ;
	} )
	.exec( function() {
		//log.error( "EXEC" ) ;
		callback() ;
	} ) ;
} ;

