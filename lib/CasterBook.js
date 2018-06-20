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

"use strict" ;



// Load modules
var fs = require( 'fs' ) ;
var pathModule = require( 'path' ) ;
var chokidar = require( 'chokidar' ) ;
var minimatch = require( '@cronvel/minimatch' ) ;
var glob = require( 'glob' ) ;

var async = require( 'async-kit' ) ;

var kungFig = require( 'kung-fig' ) ;
var Ngev = require( 'nextgen-events' ) ;
var Babel = require( 'babel-tower' ) ;

var availableTags = require( './tags/tags.js' ).caster ;

var CastTag = require( './tags/caster/CastTag.js' ) ;
var SummonTag = require( './tags/caster/SummonTag.js' ) ;

var Book = require( './Book.js' ) ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'spellcast' ) ;



function CasterBook( script , options ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	Book.call( this , script , options ) ;

	this.type = 'caster' ;
	this.wands = {} ;
	this.activePrologue = null ;
	this.activeEpilogue = null ;
	this.spells = {} ;
	this.summonings = {} ;
	this.wildSummonings = [] ;
	this.reverseSummonings = [] ;

	// Undead mode
	this.isIdle = true ;
	this.undeadMode = false ;
	this.undeadWatchers = {} ;
	this.undeadRespawnTime = 500 ;
	this.undeadRespawnTimer = null ;
	this.undeadRespawnMap = {} ;
	this.undeadBoundFn = null ;

	this.onFsWatchEvent = CasterBook.onFsWatchEvent.bind( this ) ;
	this.onUndeadRaised = CasterBook.onUndeadRaised.bind( this ) ;
}

CasterBook.prototype = Object.create( Book.prototype ) ;
CasterBook.prototype.constructor = CasterBook ;

module.exports = CasterBook ;



CasterBook.load = async function load( path , options ) {
	var regex , script ;

	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	options.type = 'caster' ;

	if ( ! options.cwd ) {
		// Set the CWD for commands, summonings, and persistent
		if ( pathModule.isAbsolute( path ) ) {
			options.cwd = pathModule.dirname( path ) ;
		}
		else {
			options.cwd = process.cwd() + '/' + pathModule.dirname( path ) ;
		}
	}

	if ( ! options.data ) { options.data = {} ; }

	if ( ! options.data.__babel ) {
		regex = /(\^)/g ;
		regex.substitution = '$1$1' ;
		Object.defineProperty( options.data , '__babel' , { value: new Babel( regex ) , writable: true } ) ;
	}

	if ( ! options.locales ) { options.locales = {} ; }


	script = await kungFig.loadAsync( path , {
		kfgFiles: {
			basename: [ 'spellbook' , 'book' ]
		} ,
		noKfgCache: true ,
		doctype: 'spellcast/spellbook' ,
		metaHook: ( meta , parseOptions ) => {
			var localesMeta , assetsMeta , locale ;

			localesMeta = meta.getFirstTag( 'locales' ) ;
			assetsMeta = meta.getFirstTag( 'assets' ) ;

			if ( localesMeta ) {
				glob.sync( pathModule.dirname( parseOptions.file ) + '/' + localesMeta.attributes , { absolute: true } ).forEach( e => {
					locale = pathModule.basename( e , '.kfg' ) ;
					if ( ! Array.isArray( options.locales[ locale ] ) ) { options.locales[ locale ] = [] ; }
					options.locales[ locale ].push( e ) ;
				} ) ;
			}

			if ( assetsMeta ) {
				if (
					pathModule.isAbsolute( assetsMeta.attributes ) ||
					assetsMeta.attributes[ 0 ] === '~' ||
					assetsMeta.attributes.indexOf( '..' ) !== -1
				) {
					// For security sake...
					throw new Error( "Asset tag's path should be relative to the book and should not contain any '../'" ) ;
				}

				options.assetBaseUrl = fs.realpathSync( pathModule.dirname( path ) + '/' + assetsMeta.attributes ) ;
				//console.log( "options.assetBaseUrl: " , options.assetBaseUrl ) ;
			}
		} ,
		operators: require( './operators.js' ) ,
		tags: availableTags
	} ) ;


	var book = new CasterBook( script , options ) ;

	return book ;
} ;



CasterBook.prototype.destroy = function destroy() {
	if ( this.destroyed ) { return ; }
	Book.prototype.destroy.call( this ) ;
	this.stopUndeadMode() ;
} ;



CasterBook.prototype.reset = function reset( callback ) {
	this.resetReverseSummonings( callback ) ;
} ;



CasterBook.prototype.resetReverseSummonings = function resetReverseSummonings( callback ) {
	async.foreach( this.reverseSummonings , ( reverseSummoning , foreachCallback ) => {
		reverseSummoning.reset( this , foreachCallback ) ;
	} )
	.exec( callback ) ;
} ;



CasterBook.prototype.cast = async function cast( spellName , options ) {
	if ( options && options.again ) { this.persistent.summoned = {} ; }

	if ( options && options.undead ) {
		this.initUndeadMode( options.undead , this.cast.bind( this , spellName , null ) ) ;
	}
	
	this.startTask() ;
	await CastTag.execAsync( this , spellName , options , null ) ;
	await this.savePersistent() ;
	term( '^MAll casting done.^:\n\n' ) ;
	this.endTask() ;
} ;



CasterBook.prototype.summon = function summon( summoningName , options ) {
	if ( options && options.again ) { this.persistent.summoned = {} ; }

	if ( options && options.undead ) {
		this.initUndeadMode( options.undead , this.summon.bind( this , summoningName , null ) ) ;
	}

	this.startTask() ;
	await SummonTag.execAsync( this , summoningName , options , null ) ;
	await this.savePersistent() ;
	term( '^MAll summoning done.^:\n\n' ) ;
	this.endTask() ;
} ;



/* Undead Mode */



CasterBook.prototype.initUndeadMode = function initUndeadMode( time , boundFn ) {
	Object.keys( this.undeadWatchers ).forEach( e => this.dispellUndead( e ) ) ;
	if ( typeof time === 'number' ) { this.undeadRespawnTime = time ; }
	this.undeadBoundFn = boundFn ;
	this.undeadMode = true ;
	this.on( 'undeadRaised' , this.onUndeadRaised ) ;
} ;



CasterBook.prototype.stopUndeadMode = function stopUndeadMode() {
	Object.keys( this.undeadWatchers ).forEach( e => this.dispellUndead( e ) ) ;
	this.off( 'undeadRaised' , this.onUndeadRaised ) ;
	this.undeadBoundFn = null ;
	this.undeadMode = false ;
} ;



/*
	Possible refacto: chokidar watcher supports multiple path at once.
*/
CasterBook.prototype.castUndead = function castUndead( path , discoveryPathObject ) {
	if ( ! this.undeadMode ) { return ; }

	if ( this.undeadWatchers[ path ] ) {
		if ( discoveryPathObject ) {
			if ( ! this.undeadWatchers[ path ].__discoveryPathObject ) { this.undeadWatchers[ path ].__discoveryPathObject = {} ; }
			Object.keys( discoveryPathObject ).forEach( glob_ => this.undeadWatchers[ path ].__discoveryPathObject[ glob_ ] = true ) ;
		}

		return ;
	}

	log.debug( "New undead: %s" , path ) ;

	this.undeadWatchers[ path ] = chokidar.watch( path , { ignoreInitial: true } ) ;

	if ( discoveryPathObject ) {
		this.undeadWatchers[ path ].__discoveryPathObject = {} ;
		Object.keys( discoveryPathObject ).forEach( glob_ => this.undeadWatchers[ path ].__discoveryPathObject[ glob_ ] = true ) ;
	}

	this.undeadWatchers[ path ].on( 'all' , this.onFsWatchEvent.bind( this , path ) ) ;

	this.undeadWatchers[ path ].on( 'error' , ( error ) => {
		log.error( "Undead watcher error: %E" , error ) ;
	} ) ;
} ;



CasterBook.prototype.dispellUndead = function dispellUndead( path ) {
	if ( ! this.undeadMode || ! this.undeadWatchers[ path ] ) { return ; }
	this.undeadWatchers[ path ].close() ;
	delete this.undeadWatchers[ path ] ;
} ;



CasterBook.prototype.cancelUndeadRespawn = function cancelUndeadRespawn( path ) {
	log.debug( "Canceling respawn for '%s'" , path ) ;
	delete this.undeadRespawnMap[ path ] ;

	// Because of race conditions, the filesystem watch event can happened slightly after the cancel action
	setTimeout( () => {
		log.debug( "Delayed canceling respawn for '%s'" , path ) ;
		delete this.undeadRespawnMap[ path ] ;
	} , 10 ) ;
} ;



CasterBook.onFsWatchEvent = async function onFsWatchEvent( watchPath , event , path ) {
	var i , iMax , discoveryPathObject , discoveryList , found ;

	if ( ! this.undeadMode ) { return ; }

	log.verbose( "onFsWatchEvent(): '%s' '%s' '%s'" , watchPath , event , path ) ;

	discoveryPathObject = this.undeadWatchers[ watchPath ].__discoveryPathObject ;
	//log.debug( "onFsWatchEvent() disco:\n%I" , discoveryPathObject ) ;

	// The file should not be in the include list
	if ( discoveryPathObject ) {
		if ( event !== 'add' && event !== 'addDir' ) {
			log.verbose( "discovery: excluding path '%s' (not an 'add' event)" , path ) ;
			return ;
		}

		log.verbose( "discovery: path: %s -- %I" , path , discoveryPathObject ) ;

		discoveryList = Object.keys( discoveryPathObject ) ;

		found = false ;

		for ( i = 0 , iMax = discoveryList.length ; i < iMax ; i ++ ) {
			log.verbose( "discovery: tried '%s'" , discoveryList[ i ] ) ;

			if ( minimatch( path , discoveryList[ i ] ) ) {
				log.verbose( "discovery: including path '%s' by '%s'" , path , discoveryList[ i ] ) ;
				found = true ;
				break ;
			}
		}

		if ( ! found ) {
			log.verbose( "discovery: excluding path '%s' (nothing found)" , path ) ;
			return ;
		}
	}


	var clear = () => {
		if ( this.undeadRespawnTimer ) {
			clearTimeout( this.undeadRespawnTimer ) ;
			this.undeadRespawnTimer = null ;
		}
	} ;

	this.undeadRespawnMap[ path ] = true ;

	log.debug( "About to raise undead: '%s' ('%s' event on '%s')" , path , event , watchPath ) ;

	clear() ;
	await this.waitFor( 'idle' ) ;
	clear() ;
	this.undeadRespawnTimer = setTimeout( async () => {
		clear() ;
		await this.waitFor( 'idle' ) ;
		clear() ;
		var undeadList = Object.keys( this.undeadRespawnMap ) ;
		this.undeadRespawnMap = {} ;

		if ( undeadList.length ) {
			// Some respawn may have been canceled
			this.emit( 'undeadRaised' , undeadList ) ;
		}
		else {
			log.debug( "undeadRaised canceled: all respawn were canceled" ) ;
		}
	} , this.undeadRespawnTime ) ;
} ;



CasterBook.onUndeadRaised = function onUndeadRaised( undeadList ) {
	var date = new Date() ;

	log.debug( "Undeads raised: %s" , undeadList ) ;

	Ngev.groupEmit(
		this.clients ,
		'coreMessage' ,
		"^MIt's %s, the hour the DEAD are walking!!!^:\n" ,
		( '0' + date.getHours() ).slice( -2 ) + ':' + ( '0' + date.getMinutes() ).slice( -2 ) + ':' + ( '0' + date.getSeconds() ).slice( -2 )
	) ;

	this.reset( ( error ) => {

		if ( error ) { log.error( "Undead raised, reset error: %E" , error ) ; }

		this.undeadBoundFn( ( error_ ) => {
			log.debug( "Undead raised: %s" , error_ || 'ok' ) ;
		} ) ;
	} ) ;
} ;

