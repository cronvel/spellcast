/*
	Spellcast

	Copyright (c) 2014 - 2021 Cédric Ronvel

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



const spellcastPackage = require( '../package.json' ) ;
const semver = require( 'semver' ) ;

const path = require( 'path' ) ;
const glob = require( 'glob' ) ;
const minimatch = require( '@cronvel/minimatch' ) ;

const fs = require( 'fs' ) ;
const Promise = require( 'seventh' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



// Array utilities: add thoses functions to an array
exports.get = function( id ) {
	return this.find( e => e.id === id ) ;
} ;

exports.getToken = function( token ) {
	return this.find( e => e.token === token ) ;
} ;



exports.isPlainObject = function( value ) {
	var proto ;

	return value &&
		typeof value === 'object' &&
		( ( proto = Object.getPrototypeOf( value ) ) === Object.prototype || proto === null ) ;
} ;



exports.debugDate = function( d ) {
	if ( d === Infinity || d === -Infinity ) { return d ; }
	return new Date( d ).toISOString() ;
} ;



exports.isCompatible = function( version ) {
	var mainVersion = semver.parse( spellcastPackage.version ) ;

	try {
		version = semver.parse( version ) ;
	}
	catch ( error ) {
		return false ;
	}

	return mainVersion.major === version.major && ( mainVersion.major > 0 || mainVersion.minor === version.minor ) ;
} ;



exports.debugDate = function( d ) {
	if ( d === Infinity || d === -Infinity ) { return d ; }
	return new Date( d ).toISOString() ;
} ;



// Clone ID
const cloneRegexp = /_clone_[0-9]+/ ;
var cloneAutoId = 0 ;

exports.createCloneId = id => {
    if ( id.match( cloneRegexp ) ) {
        return id.replace( cloneRegexp , '_clone_' + ( cloneAutoId ++ ) ) ;
    }

    return id + '_clone_' + ( cloneAutoId ++ ) ;
} ;

// Unit test only
exports.unitTestResetCloneId = () => cloneAutoId = 0 ;



exports.glob = {} ;

exports.glob.hasMagic = function( pattern , options ) {
	var mm , i , iMax ;

	mm = new minimatch.Minimatch( pattern , options ) ;

	if ( mm.set.length > 1 ) { return true ; }

	for ( i = 0 , iMax = mm.set[ 0 ].length ; i < iMax ; i ++ ) {
		if ( typeof mm.set[ 0 ][ i ] !== 'string' ) { return true ; }
	}

	return false ;
} ;



exports.glob.map = async function( cwd , leftGlob , rightGlob ) {
	var tmp , map = {} ;

	//cwd = path.normalize( cwd ) ;
	leftGlob = path.normalize( leftGlob ) ;
	rightGlob = path.normalize( rightGlob ) ;

	// A bit nasty, but well...
	var leftCount =
		( ( ( tmp = leftGlob.match( /\*/g ) ) && tmp.length ) || 0 ) -
		( ( ( tmp = leftGlob.match( /\*\*/g ) ) && tmp.length ) || 0 ) * 2 ;

	var rightCount =
		( ( ( tmp = rightGlob.match( /\*/g ) ) && tmp.length ) || 0 ) -
		( ( ( tmp = rightGlob.match( /\*\*/g ) ) && tmp.length ) || 0 ) * 2 ;

	if ( rightCount > leftCount ) {
		throw new Error( "utils.glob.map(): rightGlob should not have more stars than leftGlob" ) ;
	}

	var offset = leftCount - rightCount ;

	var leftRegex = new minimatch.Minimatch( leftGlob , { captureStar: true } ).makeRe() ;
	//var rightRegex = new minimatch.Minimatch( rightGlob , { captureStar: true } ).makeRe() ;

	//log.info( "cwd + leftGlob = %s" , cwd + '/' + leftGlob ) ;

	var cwdPaths = await glob.async( cwd + '/' + leftGlob ) ;

	cwdPaths.forEach( ( cwdPath ) => {

		var path_ = path.relative( cwd , cwdPath ) ;
		//log.info( "one path: %I" , path_ ) ;
		var count = 1 ;
		var matches = path_.match( leftRegex ) ;

		map[ path_ ] = rightGlob.replace( /\*\*|\*/g , ( stars ) => {
			if ( stars === '**' ) { return stars ; }
			return matches[ offset + ( count ++ ) ] ;
		} ) ;
	} ) ;

	//log.info( "map: %I" , map ) ;

	return map ;
} ;



function addDir( dirMap , dir , pattern ) {
	dir = dir || './' ;
	if ( ! dirMap[ dir ] ) { dirMap[ dir ] = {} ; }
	dirMap[ dir ][ pattern ] = true ;
}



// Directories to watch based on a glob
// Brace expansion are still not well handled, if parts of the expansion does not exists
exports.glob.getUndeadDirectoriesGlobMap = function( globPattern ) {
	var mm , i , iMax , j , jMax , map = {} ;

	mm = new minimatch.Minimatch( globPattern ) ;

	for ( i = 0 , iMax = mm.set.length ; i < iMax ; i ++ ) {
		for ( j = 0 , jMax = mm.set[ i ].length ; j < jMax ; j ++ ) {
			if ( typeof mm.set[ i ][ j ] !== 'string' ) {
				addDir( map , mm.globParts[ i ].slice( 0 , j ).join( '/' ) , globPattern ) ;

				if ( j < jMax - 1 ) {
					addDir( map , mm.globParts[ i ].slice( 0 , j + 1 ).join( '/' ) , globPattern ) ;
				}
			}
		}

		if ( iMax > 1 ) {
			map[ mm.globParts[ i ].slice( 0 , -1 ).join( '/' ) ] = true ;
			addDir( map , mm.globParts[ i ].slice( 0 , -1 ).join( '/' ) , globPattern ) ;
		}
	}

	return map ;
} ;



exports.glob.getUndeadDirectoriesMap = async function( globPattern ) {
	var dirMap = exports.glob.getUndeadDirectoriesGlobMap( globPattern ) ;

	//log.error( "globPattern: %I" , globPattern ) ;
	//log.error( "dirGlobPatternList: %I" , dirGlobPatternList ) ;

	await Promise.forEach( Object.keys( dirMap ) , async ( maybeDirGlobPattern ) => {
		//log.error( "maybeDirGlobPattern: %I" , maybeDirGlobPattern ) ;

		if ( ! glob.hasMagic( maybeDirGlobPattern ) ) { return ; }

		var paths = await glob.async( maybeDirGlobPattern ) ;

		// ??? path_ === maybeDirGlobPattern when nothing is found ???
		paths.forEach( path_ => dirMap[ path_ ] = dirMap[ maybeDirGlobPattern ] ) ;
		delete dirMap[ maybeDirGlobPattern ] ;
	} ) ;

	return dirMap ;
} ;

