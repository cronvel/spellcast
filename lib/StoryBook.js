/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const fs = require( 'fs' ) ;
const pathModule = require( 'path' ) ;
const glob = require( 'glob' ) ;

const kungFig = require( 'kung-fig' ) ;
const Ngev = require( 'nextgen-events' ) ;
const Babel = require( 'babel-tower' ) ;

const availableTags = require( './tags/tags.js' ).story ;

const Book = require( './Book.js' ) ;
const Role = require( './Role.js' ) ;
const Ctx = require( './Ctx.js' ) ;

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'spellcast' ) ;

function noop() {}



function StoryBook( script , options ) {
	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	Book.call( this , script , options ) ;

	this.type = 'story' ;
	this.ended = false ;
	this.scenes = {} ;
	this.startingScene = null ;
	this.places = {} ;
	this.actions = {} ;
	this.entityClasses = {} ;
	this.entityCompoundStats = {} ;
	this.entityModels = {} ;
	this.itemModels = {} ;
	this.usageCompoundStats = {} ;
	this.hereActions = null ;
	this.statusUpdater = null ;
	this.nextPanel = null ;
	this.generators = {} ;

	// Input interpreter
	this.interpreters = {} ;
}



StoryBook.prototype = Object.create( Book.prototype ) ;
StoryBook.prototype.constructor = StoryBook ;

module.exports = StoryBook ;



const KFG_MODULE_PATH = {
	core: pathModule.normalize( __dirname + '/../script-lib/core' ) ,
	rpg: pathModule.normalize( __dirname + '/../script-lib/rpg' )
} ;



StoryBook.load = async function( path , options ) {
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


	script = await kungFig.loadAsync( path , {
		kfgFiles: {
			basename: [ 'spellbook' , 'book' ]
		} ,
		modulePath: KFG_MODULE_PATH ,
		doctype: 'spellcast/book' ,
		metaHook: ( meta , parseOptions ) => {
			var localesMeta , assetsMeta , locale ;

			localesMeta = meta.getFirstTag( 'locales' ) ;
			assetsMeta = meta.getFirstTag( 'assets' ) ;

			if ( localesMeta ) {
				pathSecurityCheck( localesMeta.attributes , true ) ;
				glob.sync( pathModule.dirname( parseOptions.file ) + '/' + localesMeta.attributes , { absolute: true } ).forEach( e => {
					locale = pathModule.basename( e , '.kfg' ) ;
					if ( ! Array.isArray( options.locales[ locale ] ) ) { options.locales[ locale ] = [] ; }
					options.locales[ locale ].push( e ) ;
				} ) ;
			}

			if ( assetsMeta ) {
				pathSecurityCheck( assetsMeta.attributes ) ;
				options.assetBaseUrl = fs.realpathSync( pathModule.dirname( path ) + '/' + assetsMeta.attributes ) ;
				//console.log( "options.assetBaseUrl: " , options.assetBaseUrl ) ;
			}
		} ,
		operators: require( './operators.js' ) ,
		classes: require( './kfgClasses.js' ) ,
		tags: availableTags
	} ) ;

	var book = new StoryBook( script , options ) ;

	return book ;
} ;



Object.assign( StoryBook.prototype , require( './loadSaveState.js' ) ) ;



StoryBook.prototype.initBook = async function( stateFile ) {
	this.startTask() ;

	try {
		// Script init
		await this.engine.initAsync( this.script , this ) ;

		// We need to restore state
		if ( stateFile ) {
			await this.loadState( stateFile ) ;
			this.emit( 'ready' ) ;
			this.endTask() ;
			return ;
		}

		// Run the top-level
		var initCtx = Ctx.create( this ) ;

		await this.engine.runAsync( this.script , this , initCtx , null ) ;

		// Save the events used for init
		this.initEvents = initCtx.events ;

		// Destroy the init context now!
		initCtx.destroy() ;

		if ( ! this.roles.length ) {
			this.roles.push( new Role( 'default' , {
				name: 'main role' ,
				noChat: true
			} ) ) ;
		}

		this.emit( 'ready' ) ;
	}
	catch ( error ) {
		this.endTask() ;
		throw error ;
	}

	this.endTask() ;
} ;



StoryBook.prototype.startStory = async function( options ) {
	if ( ! this.startingScene ) { return ; }

	this.startTask() ;

	try {
		await this.startingScene.execAsync( this , options , null ) ;
	}
	catch ( error ) {
		if ( error instanceof Error ) {
			log.fatal( "startStory: %E" , error ) ;
		}
	}

	await this.end( null , null ) ;
	this.endTask() ;
} ;



// End
StoryBook.prototype.end = async function( result , data ) {
	if ( this.ended ) { return ; }
	this.ended = true ;
	if ( ! result ) { result = 'end' ; }
	return Ngev.groupWaitForEmit( this.clients , 'end' , result , data ) ;
} ;



function pathSecurityCheck( path , isPattern = false ) {
	if ( pathModule.isAbsolute( path ) || path[ 0 ] === '~' || path.indexOf( '..' ) !== -1 ) {
		// For security sake...
		throw new Error( "Assets and locales meta-tag's path should be relative to the book and should not contain any '../'" ) ;
	}

	// /!\ SECURITY! it should check dangerous pattern too!
	//if ( isPattern ) {}
}



// How API events should be managed? (particularly during [split])

/*
StoryBook.prototype.apiEmit = function( eventName , data , callback )
{
	//log.error( "Api emit: %I" , arguments ) ;
	//this.api.emit( -1 , eventName , data ) ;
	this.api.emit( eventName , data , callback ) ;
} ;



StoryBook.prototype.apiOn = function( eventName , tag , ctx , options )
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



StoryBook.prototype.apiOff = function( id )
{
	if ( ! this.apiListeners[ id ] ) { return ; }

	this.api.off( this.apiListeners[ id ].event , id ) ;
	delete this.apiListeners[ id ] ;
} ;
*/

