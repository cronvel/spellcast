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

// This works only for the story mode

"use strict" ;



var StoryCtx = require( './StoryCtx.js' ) ;
var Role = require( './Role.js' ) ;

var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
//var TagContainer = kungFig.TagContainer ;

var jsbindat = require( 'jsbindat' ) ;
var tree = require( 'tree-kit' ) ;
//var fs = require( 'fs' ) ;

var utils = require( './utils.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var classMap = {
	StoryCtx: StoryCtx ,
	Role: Role ,

	Entity: require( './rpg/Entity.js' ) ,
	Item: require( './rpg/Item.js' )
} ;

classMap = new jsbindat.ClassMap( classMap ) ;



var jsbindatOptions = {
	classMap: classMap ,
	universal: {
		serializer: object => {
			if ( object instanceof Tag ) {
				return {
					className: 'Tag' ,
					args: [ object.uid ]
				}
			}
		} ,
		unserializer: ( context , className , ... args ) => {
			switch ( className ) {
				case 'Tag' :
					return context.book.tags[ args[ 0 ] ] ;
				default :
					// Not known? so it should be a regular object
					log.error( "Universal unserializer: class '%s' not found" , className ) ;
					return {} ;
			}
		} ,
		unserializeClassName: true ,
		unserializeContext: true
	}
} ;



exports.saveState = function saveState( filePath , callback ) {
	var element ;

	var state = {
		roles: this.roles ,

		hereActions: this.hereActions && this.hereActions.uid ,
		statusUpdater: this.statusUpdater && this.statusUpdater.uid ,
		nextPanel: this.nextPanel && this.nextPanel.uid ,

		data: this.data ,
		staticData: this.staticData ,
		ctx: this.ctx && this.ctx.serialize()

		// Those are created only at Book init, and does not need to be saved:
		// entityModels, itemModels, entityClasses, entityCompoundStats, usageCompoundStats,
		// generators, interpreters, queryPatternTree
	} ;

	//log.error( "%Y" , this.ctx ) ;
	log.error( "Saved state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;

	jsbindat.writeFile( filePath , state , jsbindatOptions ).then( callback , callback ) ;
} ;



exports.loadState = function loadState( filePath , callback ) {
	var context = { book: this } ;

	jsbindat.readFile( filePath , jsbindatOptions , context ).then(
		state => {
			//log.error( "State: %Y" , state ) ;
			log.error( "Loaded state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;

			this.roles = state.roles ;
			this.roles.get = utils.get ;

			this.hereActions = state.hereActions && this.tags[ state.hereActions ] ;
			this.statusUpdater = state.statusUpdater && this.tags[ state.statusUpdater ] ;
			this.nextPanel = state.nextPanel && this.tags[ state.nextPanel ] ;

			this.data = state.data ;

			// Add some properties to data
			Object.defineProperties( this.data , {
				global: { value: this.data }
			} ) ;

			this.staticData = state.staticData ;

			// It registers itself to the book automatically
			StoryCtx.unserialize( state.ctx , this ) ;

			log.error( "Book ctx: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 3 } , this.ctx ) ) ;

			callback() ;
		} ,
		error => {
			callback( error ) ;
		}
	) ;
} ;



exports.resumeState = function resumeState( callback ) {
	this.busy( ( busyCallback ) => {

		this.ctx.activeScene.resume( this , this.ctx , ( error ) => {

			if ( error && ( error instanceof Error ) ) {
				log.fatal( "Error: %E" , error ) ;
			}

			this.end( null , null , busyCallback ) ;
		} ) ;

	} , callback ) ;
} ;


