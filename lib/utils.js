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



var glob = require( 'glob' ) ;
var minimatch = require( '@cronvel/minimatch' ) ;

var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



exports.isPlainObject = function isPlainObject( value )
{
	var proto ;
	
	return value &&
		typeof value === 'object' &&
		( ( proto = Object.getPrototypeOf( value ) ) === Object.prototype || proto === null ) ;
} ;



exports.debugDate = function debugDate( d )
{
	if ( d === Infinity || d === -Infinity ) { return d ; }
	else { return new Date( d ).toISOString() ; }
} ;



exports.glob = {} ;

exports.glob.hasMagic = function hasMagic( pattern , options )
{
	var mm , i , iMax ;
	
	mm = new minimatch.Minimatch( pattern , options ) ;
	
	if ( mm.set.length > 1 ) { return true ; }
	
	for ( i = 0 , iMax = mm.set[ 0 ].length ; i < iMax ; i ++ )
	{
		if ( typeof mm.set[ 0 ][ i ] !== 'string' ) { return true ; }
	}
	
	return false ;
} ;



exports.glob.map = function map( leftGlob , rightGlob , callback )
{
	var tmp , map = {} ;
	
	// A bit nasty, but well...
	var leftCount =
		( ( ( tmp = leftGlob.match( /\*/g ) ) && tmp.length ) || 0 ) -
		( ( ( tmp = leftGlob.match( /\*\*/g ) ) && tmp.length ) || 0 ) * 2 ;
	
	var rightCount =
		( ( ( tmp = rightGlob.match( /\*/g ) ) && tmp.length ) || 0 ) -
		( ( ( tmp = rightGlob.match( /\*\*/g ) ) && tmp.length ) || 0 ) * 2 ;
	
	if ( rightCount > leftCount )
	{
		callback( new Error( "utils.glob.map(): rightGlob should not have more stars than leftGlob" ) ) ;
		return ;
	}
	
	var offset = leftCount - rightCount ;
	
	var leftRegex = new minimatch.Minimatch( leftGlob , { captureStar: true } ).makeRe() ;
	//var rightRegex = new minimatch.Minimatch( rightGlob , { captureStar: true } ).makeRe() ;
	
	glob( leftGlob , function( error , paths ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		paths.forEach( function( path ) {
			
			var count = 1 ;
			var matches = path.match( leftRegex ) ;
			
			map[ path ] = rightGlob.replace( /\*\*|\*/g , function( stars ) {
				if ( stars === '**' ) { return stars ; }
				return matches[ offset + ( count ++ ) ] ;
			} ) ;
			
		} ) ;
		
		callback( undefined , map ) ;
	} ) ;
} ;



function addDir( dirMap , dir , pattern )
{
	dir = dir || './' ;
	if ( ! dirMap[ dir ] ) { dirMap[ dir ] = {} ; }
	dirMap[ dir ][ pattern ] = true ;
}



// Directories to watch based on a glob
// Brace expansion are still not well handled, if parts of the expansion does not exists
exports.glob.getUndeadDirectoriesGlobMap = function getUndeadDirectoriesGlobMap( globPattern )
{
	var mm , i , iMax , j , jMax , map = {} ;
	
	mm = new minimatch.Minimatch( globPattern ) ;
	
	for ( i = 0 , iMax = mm.set.length ; i < iMax ; i ++ )
	{
		for ( j = 0 , jMax = mm.set[ i ].length ; j < jMax ; j ++ )
		{
			if ( typeof mm.set[ i ][ j ] !== 'string' )
			{
				addDir( map , mm.globParts[ i ].slice( 0 , j ).join( '/' ) , globPattern ) ;
				
				if ( j < jMax - 1 )
				{
					addDir( map , mm.globParts[ i ].slice( 0 , j + 1 ).join( '/' ) , globPattern ) ;
				}
			}
		}
		
		if ( iMax > 1 )
		{
			map[ mm.globParts[ i ].slice( 0 , -1 ).join( '/' ) ] = true ;
			addDir( map , mm.globParts[ i ].slice( 0 , -1 ).join( '/' ) , globPattern ) ;
		}
	}
	
	return map ;
} ;



exports.glob.getUndeadDirectoriesMap = function getUndeadDirectoriesMap( globPattern , callback )
{
	var dirMap = exports.glob.getUndeadDirectoriesGlobMap( globPattern ) ;
	
	//log.error( "globPattern: %I" , globPattern ) ;
	//log.error( "dirGlobPatternList: %I" , dirGlobPatternList ) ;
	
	async.foreach( dirMap , function( includeMap , dirGlobPattern , foreachCallback ) {
		
		//log.error( "dirGlobPattern: %I" , dirGlobPattern ) ;
		
		if ( ! glob.hasMagic( dirGlobPattern ) ) { foreachCallback() ; return ; }
		
		glob( dirGlobPattern , function( error , paths ) {
			if ( error ) { foreachCallback( error ) ; return ; }
			
			// ??? path === dirGlobPattern when nothing is found ???
			paths.forEach( path => dirMap[ path ] = dirMap[ dirGlobPattern ] ) ;
			delete dirMap[ dirGlobPattern ] ;
			
			foreachCallback() ;
		} ) ;
	} )
	.exec( function( error ) {
		if ( error ) { callback( error ) ; return ; }
		callback( undefined , dirMap ) ;
	} ) ;
} ;


