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
var glob = require( 'glob' ) ;

var kungFig = require( 'kung-fig' ) ;
var Ngev = require( 'nextgen-events' ) ;
var Babel = require( 'babel-tower' ) ;

var availableTags = require( './tags/tags.js' ).story ;

var Book = require( './Book.js' ) ;
var Role = require( './Role.js' ) ;
var Ctx = require( './Ctx.js' ) ;

var Logfella = require( 'logfella' ) ;
var log = Logfella.global.use( 'spellcast' ) ;

function noop() {}



function StoryBook() { throw new Error( "Use StoryBook.create() instead." ) ; }
StoryBook.prototype = Object.create( Book.prototype ) ;
StoryBook.prototype.constructor = StoryBook ;

module.exports = StoryBook ;



StoryBook.create = function createStoryBook( script , options ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	options.type = 'story' ;

	var book = Object.create( StoryBook.prototype ) ;
	Book.create( script , options , book ) ;

	Object.defineProperties( book , {
		ended: { value: false , writable: true , enumerable: true } ,
		scenes: { value: {} , enumerable: true } ,
		startingScene: { value: null , writable: true , enumerable: true } ,
		entityModels: { value: {} , writable: true , enumerable: true } ,
		itemModels: { value: {} , writable: true , enumerable: true } ,
		entityClasses: { value: {} , writable: true , enumerable: true } ,
		entityCompoundStats: { value: {} , writable: true , enumerable: true } ,
		usageCompoundStats: { value: {} , writable: true , enumerable: true } ,
		hereActions: { value: null , writable: true , enumerable: true } ,
		statusUpdater: { value: null , writable: true , enumerable: true } ,
		nextPanel: { value: null , writable: true , enumerable: true } ,
		generators: { value: {} , writable: true , enumerable: true } ,

		// Chatbot
		interpreters: { value: {} , writable: true , enumerable: true } ,
		queryPatternTree: { value: {} , writable: true , enumerable: true }
	} ) ;

	return book ;
} ;



const KFG_MODULE_PATH = {
	core: pathModule.normalize( __dirname + '/../script-lib/core' ) ,
	rpg: pathModule.normalize( __dirname + '/../script-lib/rpg' )
} ;



StoryBook.load = function load( path , options ) {
	var regex , script ;

	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	options.type = 'story' ;

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


	script = kungFig.load( path , {
		kfgFiles: {
			basename: [ 'spellbook' , 'book' ]
		} ,
		noKfgCache: true ,
		modulePath: KFG_MODULE_PATH ,
		doctype: 'spellcast/book' ,
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


	var book = StoryBook.create( script , options ) ;

	return book ;
} ;



Object.assign( StoryBook.prototype , require( './loadSaveState.js' ) ) ;



StoryBook.prototype.initBook = function initBook( stateFile , callback ) {

	if ( typeof stateFile === 'function' ) {
		callback = stateFile ;
		stateFile = null ;
	}

	this.busy( ( busyCallback ) => {

		this.prepareDotSpellcastDirectory( ( initError ) => {

			if ( initError ) { busyCallback( initError ) ; return ; }

			// Script init
			this.engine.init( this.script , this , ( initError_ ) => {

				if ( initError_ ) { busyCallback( initError_ ) ; return ; }

				// We need to restore state
				if ( stateFile ) {
					this.loadState( stateFile , ( loadError ) => {
						if ( loadError ) { busyCallback( loadError ) ; return ; }
						this.emit( 'ready' ) ;
						busyCallback() ;
					} ) ;

					return ;
				}

				// Run the top-level
				var initCtx = Ctx.create( this ) ;

				this.engine.runCb( this.script , this , initCtx , null , ( runError ) => {

					// Save the events used for init
					this.initEvents = initCtx.events ;

					// Destroy the init context now!
					initCtx.destroy() ;

					if ( runError ) { busyCallback( runError ) ; return ; }

					if ( ! this.roles.length ) {
						this.roles.push( Role.create( 'default' , {
							label: 'main role' ,
							noChat: true
						} ) ) ;
					}

					this.emit( 'ready' ) ;

					busyCallback() ;
				} ) ;
			} ) ;
		} ) ;
	} , callback ) ;
} ;



StoryBook.prototype.startStory = function startStory( options , callback ) {
	if ( typeof options === 'function' ) { callback = options ; options = null ; }

	if ( typeof callback !== 'function' ) { callback = noop ; }

	if ( ! this.startingScene ) { callback() ; return ; }

	this.busy( ( busyCallback ) => {

		this.startingScene.exec( this , options , null , ( error ) => {
			if ( error && ( error instanceof Error ) ) {
				log.fatal( "Error: %E" , error ) ;
			}

			this.end( null , null , busyCallback ) ;
		} ) ;

	} , callback ) ;
} ;



// End
StoryBook.prototype.end = function end( result , data , callback ) {
	if ( this.ended ) { callback() ; return ; }
	this.ended = true ;
	if ( ! result ) { result = 'end' ; }
	Ngev.groupEmit( this.clients , 'end' , result , data , callback ) ;
} ;



// How API events should be managed? (particularly during [split])

/*
StoryBook.prototype.apiEmit = function apiEmit( eventName , data , callback )
{
	//log.error( "Api emit: %I" , arguments ) ;
	//this.api.emit( -1 , eventName , data ) ;
	this.api.emit( eventName , data , callback ) ;
} ;



StoryBook.prototype.apiOn = function apiOn( eventName , tag , ctx , options )
{
	options = options || {} ;

	var listener ,
		id = options.id || undefined ,
		once = options.once ;

	//log.error( "Api on: %I" , arguments ) ;

	// Event emitting is serialized:
	// async listeners are called one at a time, because the 'script' context is serialized

	listener = {
		//nice: -1 ,
		event: eventName ,
		id: id ,
		async: true ,
		context: 'script' ,
		once: once ,
		fn: ( data , callback ) => {

			//log.error( "Api listener: %I" , arguments ) ;

			if ( tag.isDefault && this.api.listenerCount( eventName ) > 1 )
			{
				// Default listener only fire if they are alone
				callback() ;
				return ;
			}

			var returnVal = tag.exec( this , { data: data , event: eventName } , ctx , ( error ) => {
				if ( once ) { delete this.apiListeners[ id ] ; }

				if ( error )
				{
					switch ( error.break )
					{
						case 'cancel' :
							//log.error( "Async returnval: %I" , error ) ;
							callback( error.cancel ) ;
							return ;
						default :
							log.error( '[on] tag execution returned error: %E' , error ) ;
							//callback( error ) ;	// or not???
							break ;
					}
				}

				//log.error( "[on] tag finished" ) ;

				callback() ;
			} ) ;

			// When the return value is undefined, it means this was an async tag execution
			if ( returnVal === undefined ) { return ; }

			// Sync variant...

			if ( once ) { delete this.apiListeners[ id ] ; }

			if ( returnVal )
			{
				switch ( returnVal.break )
				{
					case 'cancel' :
						//log.error( "Returnval: %I" , returnVal ) ;
						callback( returnVal.cancel ) ;
						return ;
					default :
						log.error( '[on] tag execution returned error: %E' , returnVal ) ;
						//callback( error ) ;	// or not???
						break ;
				}
			}

			callback() ;
		}
	} ;

	this.api.on( eventName , listener ) ;

	this.apiListeners[ id ] = listener ;
	if ( options.scene ) { options.scene.apiListeners[ id ] = listener ; }
} ;



StoryBook.prototype.apiOff = function apiOff( id )
{
	if ( ! this.apiListeners[ id ] ) { return ; }

	this.api.off( this.apiListeners[ id ].event , id ) ;
	delete this.apiListeners[ id ] ;
} ;
*/

