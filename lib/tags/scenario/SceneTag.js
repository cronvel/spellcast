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



const path = require( 'path' ) ;

const Ngev = require( 'nextgen-events' ) ;
const kungFig = require( 'kung-fig' ) ;
const LabelTag = kungFig.LabelTag ;
const TagContainer = kungFig.TagContainer ;

const NextTag = require( './NextTag.js' ) ;
const StoryCtx = require( '../../StoryCtx.js' ) ;

const camel = require( '../../camel.js' ) ;
const tree = require( 'tree-kit' ) ;
const doormen = require( 'doormen' ) ;

const Promise = require( 'seventh' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SceneTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SceneTag ) ? this : Object.create( SceneTag.prototype ) ;

	LabelTag.call( self , 'scene' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'scene' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'scene' tag's id should be a non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
		groupTag: { value: null , writable: true , enumerable: true } ,
		isStartingScene: { value: tag === 'starting-scene' , enumerable: true } ,
		nextStyle: { value: null , writable: true , enumerable: true } ,
		shuffleNext: { value: false , writable: true , enumerable: true } ,
		voteStyle: { value: null , writable: true , enumerable: true } ,
		voteTime: { value: null , writable: true , enumerable: true } ,
		hurryTime: { value: null , writable: true , enumerable: true } ,
		showTimer: { value: null , writable: true , enumerable: true } ,
		theme: { value: null , writable: true , enumerable: true } ,
		image: { value: null , writable: true , enumerable: true } ,
		music: { value: null , writable: true , enumerable: true } ,
		chat: { value: null , writable: true , enumerable: true } ,
		initSub: { value: null , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = SceneTag ;
SceneTag.prototype = Object.create( LabelTag.prototype ) ;
SceneTag.prototype.constructor = SceneTag ;



SceneTag.prototype.init = function( book ) {
	this.groupTag = this.getParentTag() ;

	if ( ! this.groupTag || ( this.groupTag.name !== 'chapter' && this.groupTag.name !== 'system' ) ) {
		// /!\ or create a default chapter? /!\
		return new Error( "The [scene] tag should be inside a [chapter] or a [system] tag." ) ;
	}

	if ( ! book.scenes[ this.groupTag.id ] ) { book.scenes[ this.groupTag.id ] = {} ; }

	book.scenes[ this.groupTag.id ][ this.id ] = this ;

	if ( this.isStartingScene || ! book.startingScene ) { book.startingScene = this ; }

	// Do not use *.extractContent()! it should not be resolved at init step!
	var voteStyle = this.content.getFirstTag( 'vote-style' ) ;
	this.voteStyle = ( voteStyle && voteStyle.content ) || null ;

	var voteTime = this.content.getFirstTag( 'vote-time' ) ;
	this.voteTime = ( voteTime && voteTime.content ) || null ;

	var hurryTime = this.content.getFirstTag( 'hurry-time' ) ;
	this.hurryTime = ( hurryTime && hurryTime.content ) || null ;

	var showTimer = this.content.getFirstTag( 'show-timer' ) ;
	this.showTimer = showTimer && showTimer.content ;

	var nextStyle = this.content.getFirstTag( 'next-style' ) ;
	this.nextStyle = ( nextStyle && nextStyle.content ) || null ;

	var shuffleNext = this.content.getFirstTag( 'shuffle-next' ) ;
	this.shuffleNext = shuffleNext ? shuffleNext.content : false ;

	this.theme = this.content.getFirstTag( 'theme' ) ;
	this.image = this.content.getFirstTag( 'image' ) ;
	this.music = this.content.getFirstTag( 'music' ) ;
	this.chat = this.content.getFirstTag( 'chat' ) ;
	this.initSub = this.content.getFirstTag( 'init-sub' ) ;

	return null ;
} ;



const NEXT_RUNLEVEL = {
	beforeInit: 'init' ,
	init: 'scene' ,
	beforeScene: 'scene' ,
	scene: 'hereActions' ,
	beforeHereActions: 'hereActions' ,
	hereActions: 'nextSelection' ,
	beforeNextSelection: 'nextSelection' ,
	nextSelection: 'next' ,
	beforeNext: 'next'
} ;



SceneTag.prototype.exec = function( book , options , ctx , callback ) {
	options = options || {} ;

	// Lazily create the static data for the scene
	if ( ! book.staticData[ this.uid ] ) {
		book.staticData[ this.uid ] = {} ;
	}

	if ( ! ctx ) {
		// Create a context if none was provided
		ctx = new StoryCtx( book , { events: book.initEvents } ) ;

		// Add the default/global [here-actions]/[status]/[panel]
		ctx.hereActions = book.hereActions ;
		ctx.statusUpdater = book.statusUpdater ;
		ctx.nextPanel = book.nextPanel ;

		// Probably the starting scene, so exec nextPanel now
		if ( ctx.nextPanel ) {
			ctx.nextPanel.exec( book , null , ctx ) ;
		}
	}

	if ( ! ctx.resume ) {
		// Reset 'nexts'
		// /!\ or at the end of the scene?
		ctx.nexts = [] ;
		ctx.nextGroupBreak = false ;

		ctx.activeScene = this ;
		ctx.activeNext = null ;
		ctx.isSubscene = !! ( ctx.data.args && ctx.data.args.__gosub ) ;
		ctx.sceneRunLevel = 'beforeInit' ;

		// Always reset local for a scene
		ctx.data.local = ctx.data[''] = {} ;

		// Always set static data of the scene
		ctx.data.static = book.staticData[ this.uid ] ;

		// Always remove here data
		ctx.data.here = null ;

		Ngev.groupEmit( ctx.roles , 'enterScene' , ctx.isSubscene , ctx.altBuffer ) ;
		this.configure( book , ctx ) ;
	}

	if ( ctx.resume ) {
		//log.error( "		>>> Resuming!!!" ) ;
		options.noRunLevelInc = true ;
	}

	this.runLevelLoop( book , options , ctx , callback ) ;

	/*
	if ( ctx.isSubscene ) {
		delete ctx.data.args.__gosub ;

		if ( this.initSub ) {
			this.execInitSub( book , options , ctx , callback ) ;
			return ;
		}
	}

	this.execScene( book , options , ctx , callback ) ;
	//*/
} ;

SceneTag.prototype.execAsync = Promise.promisify( SceneTag.prototype.exec ) ;



SceneTag.prototype.runLevelLoop = function( book , options , ctx , callback , error ) {
	options = options || {} ;

	if ( error ) {
		//log.error( "Error: %s" , error.break ) ;
		switch ( error.break ) {
			case 'goto' :
				//log.warning( 'goto' ) ;
				this.leaveScene( book , options , ctx , () => {
					error.goto.exec( book , options , ctx , callback ) ;
				} ) ;
				return ;
			case 'return' :
				// Explicit return: leave scene and do not swallow the pseudo-error
				//log.warning( 'explicit return' ) ;
				options.isReturn = true ;
				this.leaveScene( book , options , ctx , () => {
					callback( error ) ;
				} ) ;
				return ;
			default :
				//log.warning( 'default %s %I' , this.id , error ) ;
				callback( error ) ;
				return ;
		}
	}

	if ( ! options.noRunLevelInc ) {
		ctx.sceneRunLevel = NEXT_RUNLEVEL[ ctx.sceneRunLevel ] ;
	}
	else {
		delete options.noRunLevelInc ;
	}

	if ( ! ctx.sceneRunLevel ) {
		//log.fatal( "no more runlevel" ) ;
		callback() ;
		return ;
	}

	var selfCallback = this.runLevelLoop.bind( this , book , options , ctx , callback ) ;

	for ( ;; ) {

		//log.info( "runLevel: %s" , ctx.sceneRunLevel ) ;
		switch ( ctx.sceneRunLevel ) {
			case 'init' :
				if ( ctx.isSubscene ) {
					delete ctx.data.args.__gosub ;

					if ( this.initSub ) {
						book.engine.runCb( this.initSub.content , book , ctx , null , selfCallback ) ;
						return ;
					}
				}
				break ;

			case 'scene' :
				book.engine.runCb( this.content , book , ctx , null , selfCallback ) ;
				return ;

			case 'hereActions' :
				if ( ctx.hereActions && ctx.data.here ) {
					book.engine.runCb( ctx.hereActions.content , book , ctx , null , selfCallback ) ;
					return ;
				}
				break ;

			case 'nextSelection' :
				this.execNextSelection( book , options , ctx , selfCallback ) ;
				return ;

			case 'next' :
				this.execNext( book , options , ctx , selfCallback ) ;
				return ;

			default :
				// Done!
				ctx.resume = false ;
				callback() ;
				return ;
		}

		ctx.sceneRunLevel = NEXT_RUNLEVEL[ ctx.sceneRunLevel ] ;
	}
} ;



// What to do once the scene is rendered
SceneTag.prototype.execNextSelection = function( book , options , ctx , callback ) {
	//log.fatal( "execNextSelection()" ) ;
	options = options || {} ;

	// There is nothing to run here, so we need to manually set it to false (usually done by engine.run())
	ctx.resume = false ;

	if ( ctx.nexts.length ) {
		// Normal 'next' case
		NextTag.selectNext( book , options , ctx , ( error , next ) => {
			if ( error ) { callback( error ) ; return ; }
			ctx.activeNext = next ;
			callback() ;
		} ) ;
	}
	else if ( ctx.parent ) {
		// Implicit return from sub-scene, no pause
		//log.warning( 'implicit return' ) ;
		//log.debug( 'No next tag: implicit return from subscene (%s)' , this.location ) ;
		callback( { break: 'return' } ) ;
	}
	else {
		// Nothing more to do: this is either the end or wait for event
		//log.warning( 'nothing' ) ;
		//log.warning( 'implicit return/end' ) ;
		log.debug( 'No next tag: end or wait for event (%s)' , this.location ) ;
		ctx.sceneRunLevel = 'wait' ;
		callback() ;
	}
} ;



SceneTag.prototype.execNext = function( book , options , ctx , callback ) {
	if ( ! ctx.activeNext ) {
		log.warning( 'No activeNext (%s)' , this.location ) ;
		ctx.sceneRunLevel = 'wait' ;
		callback() ;
		return ;
	}

	ctx.activeNext.exec( book , options , ctx , error => {

		if ( error ) {
			switch ( error.break ) {
				case 'cancel' :
					//log.warning( 'next/cancel' ) ;
					// either a [fake-next] tag was selected, or a [cancel] tag aborted the process
					//log.error( ">>>>>>>>>>>>>>>> cancel %s %s" , next.uid , next.target ) ;
					if ( ctx.resetHereActions ) {
						ctx.nexts = ctx.nexts.filter( e => ! e.isHereAction ) ;
						ctx.sceneRunLevel = 'beforeHereActions' ;
					}
					else {
						ctx.sceneRunLevel = 'beforeNextSelection' ;
					}

					callback() ;
					return ;
				default :
					//log.warning( 'next/default %s %I' , this.id , error ) ;
					callback( error ) ;
					return ;
			}
		}

		// We fall through here if the next is not fake but doesn't have a target
		if ( ctx.parent ) {
			// Implicit next/return
			//log.warning( 'next/implicit return' ) ;
			callback( { break: 'return' } ) ;
		}
		else {
			// Nothing more to do: this is either the end or wait for event
			//log.warning( 'nothing' ) ;
			log.debug( 'No next tag: end or wait for event (%s)' , this.location ) ;
			ctx.sceneRunLevel = 'wait' ;
			callback() ;
		}
	} ) ;
} ;



SceneTag.prototype.leaveScene = function( book , options , ctx , callback ) {
	var backToMainBuffer = !! ( options.isReturn && ctx.altBuffer && ctx.parent && ! ctx.parent.altBuffer ) ;
	//log.error( 'leaveScene() %s -- backToMainBuffer %I' , this.id , backToMainBuffer ) ;

	ctx.localListeners.forEach( listener => ctx.offEvent( listener.id ) ) ;
	ctx.localListeners.length = 0 ;

	Ngev.groupEmit( ctx.roles , 'leaveScene' , !! options.isReturn , backToMainBuffer ) ; //, callback ) ;

	if ( options.isReturn && ctx.parent && ctx.nextPanel && ctx.parent.nextPanel && ctx.nextPanel !== ctx.parent.nextPanel ) {
		ctx.parent.nextPanel.exec( book , null , ctx ) ;
	}

	callback() ;
} ;



SceneTag.prototype.getScene = function( book , target ) {
	var tmp , groupId , sceneId ;

	tmp = target.split( '/' ) ;

	if ( tmp.length <= 1 ) {
		groupId = this.groupTag.id ;
		sceneId = tmp[ 0 ] ;
	}
	else {
		groupId = tmp[ 0 ] ;
		sceneId = tmp[ 1 ] ;
	}

	return book.scenes[ groupId ] && book.scenes[ groupId ][ sceneId ] ;
} ;



SceneTag.prototype.onCommand = function( book , ctx , role , command ) {
	//book.apiEmit( 'command' , { role: role , entity: role.entity , command: command } , ( cancel ) => {
	ctx.emitEvent( 'command' , {
		role: role , entity: role.entity , command: command
	} , ctx , ( cancelValue , $event ) => {
		// Useful?
	} ) ;
} ;



SceneTag.prototype.configure = function( book , ctx , force ) {
	this.configureAmbiance( 'theme' , book , ctx , force ) ;
	this.configureAmbiance( 'image' , book , ctx , force ) ;
	this.configureAmbiance( 'music' , book , ctx , force ) ;
} ;



SceneTag.prototype.configureAmbiance = function( type , book , ctx , force ) {
	var element ;

	if ( this[ type ] ) { element = this[ type ].extractContent( ctx.data ) ; }
	if ( ! element && this.groupTag[ type ] ) { element = this.groupTag[ type ].extractContent( ctx.data ) ; }
	if ( element && typeof element === 'string' ) { element = { url: element } ; }

	if ( ! element || typeof element !== 'object' ) { element = {} ; }
	else { element = camel.inPlaceDashToCamelProps( element , true ) ; }

	if ( type === 'theme' && element.url && element.url.startsWith( '/themes/' ) &&  element.url.indexOf( '.' ) === -1 ) {
		element.url = path.join( element.url , 'main.css' ) ;
	}

	if ( force || ! doormen.isEqual( ctx.sceneConfig[ type ] , element ) ) {
		ctx.sceneConfig[ type ] = element ;
		Ngev.groupEmit( ctx.roles , type , element ) ;
	}
} ;

