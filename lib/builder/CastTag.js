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



var ClassicTag = require( 'kung-fig' ).ClassicTag ;
var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function CastTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof CastTag ) ? this : Object.create( CastTag.prototype ) ;
	ClassicTag.call( self , 'cast' , attributes , content , proxy , shouldParse , ':' ) ;
	
	if ( ! Array.isArray( content ) )
	{
		throw new SyntaxError( "The 'cast' tag's content must be an array." ) ;
	}
	
	return self ;
}

module.exports = CastTag ;
CastTag.prototype = Object.create( ClassicTag.prototype ) ;
CastTag.prototype.constructor = CastTag ;
CastTag.proxyMode = 'parent' ;



CastTag.prototype.run = function run( book , execContext , callback )
{
	log.debug( "Run [cast] for '%s'" , execContext.summoning || execContext.spell ) ;
	
	async.foreach( this.content , function( spellName , foreachCallback ) {
		
		log.debug( "Cast '%s'" , spellName ) ;
		CastTag.exec( book , spellName , null , execContext , foreachCallback ) ;
	} )
	.nice( 0 )
	.exec( callback ) ;
} ;



CastTag.exec = function exec( book , spellName , options , parentExecContext , callback )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	var error , execContext ;
	
	if ( options.useParentContext )
	{
		execContext = parentExecContext ;
	}
	else
	{
		execContext = {
			spell: spellName ,
			lastCastedTime: -Infinity ,
			dependenciesTime: -Infinity ,
			again: !! options.again ,
			summoningList: [] ,
			outputFile: null ,
			outputFilename: null
		} ;
		
		execContext.parent = parentExecContext ;
		execContext.root = ( parentExecContext && parentExecContext.root ) || execContext ;
	}

	if ( ! execContext.root.watchList ) { execContext.root.watchList = new Set() ; }
	
	var triggerCallback = function( error ) {
		if ( options.eternal )
		{
			book.eternal(
				execContext.root.watchList ,
				CastTag.exec.bind( CastTag , book , spellName , { calledByEternal: true } , parentExecContext )
			) ;
		}
		else
		{
			callback( error ) ;
		}
	} ;
	
	if ( Array.isArray( spellName ) )
	{
		return CastTag.execMulti( book , spellName , null , execContext , triggerCallback ) ;
	}
	
	if ( ! book.spells[ spellName ] )
	{
		error = new Error( "Spell '" + spellName + "' not found." ) ;
		error.type = 'notFound' ;
		throw error ;
	}
	
	book.spells[ spellName ].exec( book , null , execContext , triggerCallback ) ;
} ;



CastTag.execMulti = function execMulti( book , spells , options , execContext , callback )
{
	async.foreach( spells , function( spell , foreachCallback ) {
		CastTag.exec( book , spell , { useParentContext: true } , execContext , function( error ) {
			if ( error && ! error.continue ) { foreachCallback( error ) ; return ; }
			foreachCallback() ;
		} ) ;
	} )
	.exec( callback ) ;
} ;


