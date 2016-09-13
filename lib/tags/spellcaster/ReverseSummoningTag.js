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



var Ngev = require( 'nextgen-events' ) ;

var glob = require( 'glob' ) ;
var kungFig = require( 'kung-fig' ) ;
var async = require( 'async-kit' ) ;
//var tree = require( 'tree-kit' ) ;

var fs = require( 'fs' ) ;

var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;
var SummoningTag = require( './SummoningTag' ) ;
var SummonTag = require( './SummonTag' ) ;

var utils = require( '../../utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ReverseSummoningTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof ReverseSummoningTag ) ? this : Object.create( ReverseSummoningTag.prototype ) ;
	
	if ( content === undefined )
	{
		content = new TagContainer( undefined , self ) ;
	}
	
	// Do not call SummoningTag constructor, only call the LabelTag one
	LabelTag.call( self , 'reverse-summoning' , attributes , content , shouldParse ) ;
	
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
		targetToSourceMapping: { value: {} , writable: true , enumerable: true } ,
		sourceToTargetMapping: { value: {} , writable: true , enumerable: true } ,
		undeadDirectoriesMap: { value: {} , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = ReverseSummoningTag ;
ReverseSummoningTag.prototype = Object.create( SummoningTag.prototype ) ;
ReverseSummoningTag.prototype.constructor = ReverseSummoningTag ;
//ReverseSummoningTag.proxyMode = 'inherit+links' ;



ReverseSummoningTag.prototype.init = function init( book , callback )
{
	// Reverse summonings are both spells and summonings
	book.spells[ this.id ] = this ;
	book.reverseSummonings.push( this ) ;
	
	this.solveReverse( book , callback ) ;
} ;



ReverseSummoningTag.prototype.exec = function exec( book , options , ctx , callback )
{
	var self = this ;
	
	if ( ctx.summoning )
	{
		// This is a regular summoning
		SummoningTag.prototype.exec.call( this , book , options , ctx , callback ) ;
	}
	else if ( ctx.spell )
	{
		// This is a spell-like reverse summoning: it summons everything!
		Object.keys( this.undeadDirectoriesMap )
			.forEach( dir => book.castUndead( dir , this.undeadDirectoriesMap[ dir ] ) ) ;
		
		SummonTag.execMulti( book , Object.keys( this.targetToSourceMapping ) , options , ctx , function( error ) {
			if ( error ) { callback( error ) ; return ; }
			self.deleteOrphans( book , ctx , callback ) ;
		} ) ;
	}
	else
	{
		throw new Error( "Reverse-summoning is not exec as spell and not as a summoning..." ) ;
	}
} ;



ReverseSummoningTag.prototype.reset = function reset( book , callback )
{
	this.undeadDirectoriesMap = {} ;
	this.solveReverse( book , callback ) ;
} ;



ReverseSummoningTag.prototype.deleteOrphans = function deleteOrphans( book , ctx , callback )
{
	var self = this , map , reverseMap = {} , mappingTag , orphans = [] ;
	
	mappingTag = this.content.getFirstTag( 'mapping' ) ;
	
	if ( ! mappingTag )
	{
		callback( new SyntaxError( 'The [reverse-summoning] tag needs one [mapping] tag inside it' ) ) ;
		return ;
	}
	
	map = mappingTag.getRecursiveFinalContent( ctx.data ) ;
	Object.keys( map ).forEach( k => reverseMap[ map[ k ] ] = true ) ;
	
	async.foreach( reverseMap , function( trash , targetGlob , foreachCallback ) {
		
		//log.error( "\n##### %s\n" , targetGlob ) ;
		
		glob( book.cwd + '/' + targetGlob , function( error , cwdTargetList ) {
			if ( error ) { foreachCallback( error ) ; return ; }
			
			cwdTargetList.forEach( cwdTarget => {
				//log.error( ">>> %s" , target ) ;
				var target = cwdTarget.slice( book.cwd.length + 1 ) ;
				
				if ( ! self.targetToSourceMapping[ target ] ) {
					//log.error( "--- %s" , target ) ;
					orphans.push( target ) ;
				}
			} ) ;
			
			foreachCallback() ;
		} ) ;
	} )
	.exec( function( error ) {
		var summonMap = book.persistent.summonMap ;
		
		if ( error ) { callback( error ) ; return ; }
		
		if ( ! orphans.length ) { callback() ; return ; }
		
		if ( ctx.parent ) { ctx.parent.dependenciesTime = Infinity ; }
		else { log.debug( "Deleting orphan, but no parent" ) ; }
		
		async.foreach( orphans , function( path , foreachCallback ) {
			//log.error( "Unlink '%s'" , path ) ;
			Ngev.groupEmit( ctx.roles , 'coreMessage' , '^r^/%s^:^R was unsummoned.^:\n' , path ) ;
			
			if ( book.persistent.summonMap.spell[ self.id ] ) { delete book.persistent.summonMap.spell[ self.id ][ path ] ; }
			delete book.persistent.summonMap.summoning[ path ]  ;
			
			fs.unlink( book.cwd + '/' + path , foreachCallback ) ;
		} )
		.exec( callback ) ;
	} ) ;
} ;



ReverseSummoningTag.prototype.solveReverse = function solveReverse( book , callback )
{
	var self = this , map , mappingTag ;
	
	self.targetToSourceMapping = {} ;
	self.sourceToTargetMapping = {} ;
	
	//log.debug( "Solve reverse summoning %s" , this.globPattern ) ;
	
	mappingTag = this.content.getFirstTag( 'mapping' ) ;
	
	if ( ! mappingTag )
	{
		callback( new SyntaxError( 'The [reverse-summoning] tag needs one [mapping] tag inside it' ) ) ;
		return ;
	}
	
	map = mappingTag.getRecursiveFinalContent( book.data ) ;
	
	//log.debug( "Sources: %I" , sourcesList ) ;
	
	async.foreach( map , function( targetGlob , sourceGlob , foreachCallback ) {
		
		//var cwdTargetGlob = book.cwd + '/' + targetGlob ;
		//var cwdSourceGlob = book.cwd + '/' + sourceGlob ;
		
		utils.glob.map( book.cwd , sourceGlob , targetGlob , function( error , oneMap ) {
			
			if ( error ) { foreachCallback( error ) ; return ; }
			
			//log.error( "%I" , oneMap ) ;
			//Object.keys( oneMap ).forEach( ( k ) => self.sourceToTargetMapping[ k ] = oneMap[ k ] ) ;
			Object.keys( oneMap ).forEach( k => self.targetToSourceMapping[ oneMap[ k ] ] = k ) ;
			
			// if ( ! undead mode ) callback return
			
			utils.glob.getUndeadDirectoriesMap( book.cwd + '/' + sourceGlob , function( error , dirMap ) {
				if ( error ) { foreachCallback( error ) ; return ; }
				
				Object.keys( dirMap ).forEach( dir => {
					if ( ! self.undeadDirectoriesMap[ dir ] ) { self.undeadDirectoriesMap[ dir ] = {} ; }
					Object.keys( dirMap[ dir ] ).forEach( glob => self.undeadDirectoriesMap[ dir ][ glob ] = true ) ;
				} ) ;
				
				foreachCallback() ;
			} ) ;
		} ) ;
	} )
	.exec( function( error ) {
		if ( error ) { callback( error ) ; return ; }
		
		// Should be done at the end, because it should verify one to one relationship.
		var keys = Object.keys( self.targetToSourceMapping ) ;
		keys.forEach( ( k ) => self.sourceToTargetMapping[ self.targetToSourceMapping[ k ] ] = k ) ;
		
		log.debug( "targetToSourceMapping: %I" , self.targetToSourceMapping ) ;
		log.debug( "sourceToTargetMapping: %I" , self.sourceToTargetMapping ) ;
		
		if ( keys.length !== Object.keys( self.sourceToTargetMapping ).length )
		{
			callback( new Error( "[mapping] error, it should produce a one to one relationship" ) ) ;
			return ;
		}
		
		callback() ;
	} ) ;
} ;


