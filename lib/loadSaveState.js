/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const Ngev = require( 'nextgen-events' ) ;
const Listener = require( './Listener.js' ) ;
const StoryCtx = require( './StoryCtx.js' ) ;
const Role = require( './Role.js' ) ;

const Ref = require( 'kung-fig-ref' ) ;
const Expression = require( 'kung-fig-expression' ) ;
const template = require( 'kung-fig-template' ) ;
const TemplateSentence = template.Sentence ;
const TemplateAtom = template.Atom ;

const kungFig = require( 'kung-fig' ) ;
const Tag = kungFig.Tag ;
//const TagContainer = kungFig.TagContainer ;

const jsbindat = require( 'jsbindat' ) ;
const tree = require( 'tree-kit' ) ;
//const fs = require( 'fs' ) ;

const utils = require( './utils.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



Ngev.serializer = function( object ) {
	//log.error( ".__ngev: %I" , object.__ngev && object.__ngev.listeners ) ;
	return {
		className: 'EventBus' ,
		args: [] ,
		override: {
			listenerMap: object.listenerMap ,
			__ngev: object.__ngev
		}
	} ;
} ;

Ngev.unserializer = function() {
	return new Ngev() ;
} ;

Ngev.unserializeFinalizer = function( object ) {
	// From new Ctx():
	object.setInterruptible( true ) ;
	object.setNice( Ngev.DESYNC ) ;
	object.desyncUseNextTick( true ) ;
	object.serializeListenerContext( 'script' ) ;
	//log.error( "Ngev.unserializeFinalizer: %I" , object ) ;
} ;



Ngev.Internal.serializer = function( object ) {
	return { override: {
		states: object.states ,
		stateGroups: object.stateGroups ,
		listeners: object.listeners
	} } ;
} ;

Ngev.Internal.unserializer = function() {
	return new Ngev.Internal() ;
} ;

/*
Ngev.Internal.unserializeFinalizer = function( object ) {
	log.error( "Ngev.Internal.unserializeFinalizer: %I" , object.listeners ) ;
} ;
*/



var classMap = {
	Ref: Ref ,
	Expression: Expression ,
	TemplateSentence: TemplateSentence ,
	TemplateAtom: TemplateAtom ,

	EventBus: Ngev ,
	EventBusInternal: Ngev.Internal ,
	Listener: Listener ,
	StoryCtx: StoryCtx ,
	Role: Role ,

	Scheduler: require( './Scheduler.js' ) ,
	Entity: require( './objects/Entity.js' ) ,
	Item: require( './objects/Item.js' )
} ;

classMap = new jsbindat.ClassMap( classMap ) ;



const jsbindatOptions = {
	classMap: classMap ,
	prototypeChain: true ,
	universal: {

		serializer: object => {
			var proto = Object.getPrototypeOf( object ) ;

			if ( object instanceof Tag ) {
				// All tags and tag instances are serialized the same way
				if ( object.isInstance ) {
					return {
						className: 'TagInstance' ,
						args: [ object.uid ] ,
						override: object
					} ;
				}

				return {
					className: 'Tag' ,
					args: [ object.uid ]
				} ;

			}

			// Anything else is a regular object
			return ;
		} ,

		unserializeClassName: true ,
		unserializeContext: true ,

		unserializer: ( context , className , ... args ) => {
			var object ;

			switch ( className ) {
				case 'Tag' :
					object = context.book.tags[ args[ 0 ] ] ;

					if ( ! object ) {
						throw new Error( "Tag UID " + args[ 0 ] + " not found." ) ;
					}

					return object ;

				case 'TagInstance' :
					object = context.book.tags[ args[ 0 ] ] ;

					if ( ! object ) {
						throw new Error( "Tag UID " + args[ 0 ] + " not found." ) ;
					}

					// This is an instance, so create it from that tag
					return Object.create( object ) ;

				default :
					// Not known? return a regular object
					log.error( "Universal unserializer: class '%s' not found" , className ) ;
					return {} ;
			}
		}
	}
} ;



exports.saveState = async function( filePath , fromCtx ) {
	var element ;

	log.error( "Code stack (%i) %I" , this.ctx.syncCodeDepth , this.ctx.syncCodeStack ) ;

	var state = {
		roles: this.roles ,

		hereActions: this.hereActions && this.hereActions.uid ,
		statusUpdater: this.statusUpdater && this.statusUpdater.uid ,
		nextPanel: this.nextPanel && this.nextPanel.uid ,
		messageModels: this.messageModels ,

		data: this.data ,
		staticData: this.staticData ,
		ctx: this.ctx
		//resumeCtx: fromCtx

		// Those are created only at Book init, and does not need to be saved:
		// entityModels, itemModels, entityClasses, entityCompoundStats, usageCompoundStats,
		// generators, interpreters, queryPatternTree
	} ;

	//log.error( "%Y" , this.ctx ) ;
	//log.error( "Saved state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;

	try {
		// return-await on purpose, we want to catch!
		return await jsbindat.writeFile( filePath , state , jsbindatOptions ) ;
	}
	catch ( error ) {
		log.error( "saveState(): %E" , error ) ;
		throw error ;
	}
} ;



exports.loadState = async function( filePath ) {
	var context = { book: this } ;

	var state = await jsbindat.readFile( filePath , jsbindatOptions , context ) ;

	//log.error( "State: %Y" , state ) ;
	//log.error( "Loaded state: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 7 } , state ) ) ;

	this.roles = state.roles ;
	this.roles.get = utils.get ;

	this.hereActions = state.hereActions && this.tags[ state.hereActions ] ;
	this.statusUpdater = state.statusUpdater && this.tags[ state.statusUpdater ] ;
	this.nextPanel = state.nextPanel && this.tags[ state.nextPanel ] ;
	this.messageModels = state.messageModels ;

	this.data = state.data ;

	// Add some properties to data
	/*
	Object.defineProperties( this.data , {
		global: { value: this.data }
	} ) ;
	*/

	this.staticData = state.staticData ;
	this.ctx = state.ctx ;
	//this.resumeCtx = state.resumeCtx ;

	// /!\ Should be done only here or for every Ctx?
	//this.resumeCtx.resume = true ;

	// It registers itself to the book automatically
	//StoryCtx.unserialize( state.ctx , this ) ;

	//log.error( "Book ctx: %s" , require( 'string-kit' ).inspect( { style: 'color' , depth: 3 } , this.ctx ) ) ;
} ;



exports.resumeState = async function() {
	this.startTask() ;
	var ctx = this.ctx ;
	//var ctx = this.resumeCtx ;

	try {
		await ctx.activeScene.execAsync( this , null , ctx ) ;
	}
	catch ( error ) {
		if ( error instanceof Error ) {
			log.fatal( "resumeState() -> scene#exec(): %E" , error ) ;
		}
	}

	await this.end( null , null ) ;
	this.endTask() ;
} ;

