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



const Ngev = require( 'nextgen-events' ) ;
const kungFig = require( 'kung-fig' ) ;
const Dynamic = kungFig.Dynamic ;
const LabelTag = kungFig.LabelTag ;
const TagContainer = kungFig.TagContainer ;

const StoryCtx = require( '../../StoryCtx.js' ) ;

const tree = require( 'tree-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function NextTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof NextTag ) ? this : Object.create( NextTag.prototype ) ;

	if ( ! content ) { content = new TagContainer( undefined , self ) ; }

	if (
		! ( content instanceof TagContainer ) && typeof content !== 'string' &&
		( ! content || typeof content !== 'object' || ! content.__isDynamic__ )
	) {
		throw new SyntaxError( "The 'next' tag's content should be a TagContainer or a string/template." ) ;
	}

	LabelTag.call( self , 'next' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		roles: { value: null , writable: true , enumerable: true } ,
		fake: { value: tag === 'fake-next' && ( self.attributes || 'normal' ) , enumerable: true } ,
		target: { value: tag !== 'fake-next' && self.attributes || null , writable: true , enumerable: true } ,
		label: { value: null , writable: true , enumerable: true } ,
		style: { value: null , writable: true , enumerable: true } ,
		class: { value: null , writable: true , enumerable: true } ,
		image: { value: null , writable: true , enumerable: true } ,
		button: { value: null , writable: true , enumerable: true } ,
		voteStyle: { value: null , writable: true , enumerable: true } ,
		auto: { value: null , writable: true , enumerable: true } ,
		groupBreak: { value: null , writable: true , enumerable: true } ,
		onTrigger: { value: null , writable: true , enumerable: true } ,
		args: { value: null , writable: true , enumerable: true } ,
		isInstance: { value: false , writable: true , enumerable: true } ,
		id: { value: null , writable: true , enumerable: true } ,	// instance UID
		//instanceCtx: { value: null , writable: true , enumerable: true } ,
		instanceArgs: { value: null , writable: true , enumerable: true } ,
		isHereAction: { value: false , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = NextTag ;
NextTag.prototype = Object.create( LabelTag.prototype ) ;
NextTag.prototype.constructor = NextTag ;



NextTag.prototype.init = function( book ) {
	if ( ! ( this.content instanceof TagContainer ) ) {
		this.label = this.content ;
		return null ;
	}

	this.label = this.content.getFirstTag( 'label' ) ;
	this.label = this.label && this.label.content || null ;

	this.style = this.content.getFirstTag( 'style' ) ;
	this.style = this.style && this.style.content || null ;

	this.class = this.content.getFirstTag( 'class' ) ;
	this.class = this.class && this.class.content || null ;

	this.image = this.content.getFirstTag( 'image' ) ;
	this.image = this.image && this.image.content || null ;

	this.button = this.content.getFirstTag( 'button' ) ;
	this.button = this.button && this.button.content || null ;

	this.voteStyle = this.content.getFirstTag( 'vote-style' ) ;
	this.voteStyle = this.voteStyle && this.voteStyle.content || null ;

	this.auto = this.content.getFirstTag( 'auto' ) ;
	this.auto = this.auto && this.auto.content ;

	this.groupBreak = this.content.getFirstTag( 'group-break' ) ;

	this.onTrigger = this.content.getFirstTag( 'on-trigger' ) ;

	this.args = this.content.getFirstTag( 'args' ) ;

	return null ;
} ;



NextTag.prototype.run = function( book , ctx ) {
	var nextInstance = Object.create( this ) ;

	nextInstance.isInstance = true ;

	// It doesn't need to be super-safe, it just needs to avoid cheat based on ID analysis to guess missing next instances in multiplayer mode
	nextInstance.id = Math.floor( 1000000 * Math.random() ) ;

	nextInstance.roles = ctx.roles ;
	nextInstance.label = Dynamic.getFinalValue( this.label , ctx.data ) ;
	nextInstance.style = Dynamic.getFinalValue( this.style , ctx.data ) ;
	nextInstance.class = Dynamic.getFinalValue( this.class , ctx.data ) ;
	nextInstance.image = Dynamic.getFinalValue( this.image , ctx.data ) ;
	nextInstance.button = Dynamic.getFinalValue( this.button , ctx.data ) ;

	if ( ctx.nextGroupBreak ) {
		nextInstance.groupBreak = true ;
		ctx.nextGroupBreak = false ;
	}
	else if ( this.groupBreak ) {
		nextInstance.groupBreak = this.groupBreak.extractContent( ctx.data ) ;
		if ( nextInstance.groupBreak === undefined ) { nextInstance.groupBreak = true ; }
		else { nextInstance.groupBreak = !! nextInstance.groupBreak ; }
	}
	else {
		nextInstance.groupBreak = false ;
	}

	//nextInstance.instanceCtx = ctx.createScope() ;

	if ( this.args ) {
		//nextInstance.instanceCtx.data.args = this.args.extractContent( ctx.data ) ;
		nextInstance.instanceArgs = this.args.extractContent( ctx.data ) ;
	}

	if ( ctx.sceneRunLevel === 'hereActions' ) { nextInstance.isHereAction = true ; }

	ctx.nexts.push( nextInstance ) ;

	return null ;
} ;



// Exec this particular next: the chosen one
// NOTE: this is executed on a Next Instance, not on its parent Next Tag
NextTag.prototype.exec = function( book , options , ctx , callback ) {
	if ( ! ctx.resume ) {
		Ngev.groupEmit(
			ctx.roles ,
			'nextTriggered' ,
			this.id ,
			ctx.nextTriggeringRoles && ctx.nextTriggeringRoles.map( e => e.id ) ,
			ctx.nextTriggeringSpecial
		) ;

		// Not even sure it will be ever needed to restore parent's args, since the scene is already rendered
		//var parentArgs = ctx.data.args ;

		ctx.data.args = this.instanceArgs ;
	}

	//this.execOnTrigger( book , options , this.instanceCtx , ( error ) => {
	this.execOnTrigger( book , options , ctx , ( error ) => {

		// Import back the instance's data
		//ctx.importScopeData( this.instanceCtx ) ;

		// Not even sure it will be ever needed to restore parent's args, since the scene is already rendered
		//ctx.data.args = parentArgs ;

		var nextScene ;

		if ( error ) {
			callback( error ) ;
			return ;
		}

		if ( this.fake ) {
			if ( this.fake === 'once' ) {
				// Remove the fake-next from the current next list
				ctx.nexts = ctx.nexts.filter( e => e !== this ) ;
			}

			callback( { break: 'cancel' } ) ;
			return ;
		}

		if ( this.target ) {
			nextScene = ctx.activeScene.getScene( book , this.target ) ;
			if ( ! nextScene ) { callback( new Error( 'Cannot find next scene: ' + this.target ) ) ; return ; }

			// This would cause scene to be stacked, so we use a goto instead
			/*
			ctx.activeScene.leaveScene( book , options , ctx , () => {
				nextScene.exec( book , options , ctx , callback ) ;
			} ) ;
			*/

			callback( { break: 'goto' , goto: nextScene } ) ;
			return ;
		}

		// If no target, this will produce a "return from subscene"
		callback() ;
	} ) ;
} ;



NextTag.prototype.execOnTrigger = function( book , options , ctx , callback ) {
	if ( ! this.onTrigger || ! ( this.onTrigger.content instanceof TagContainer ) ) {
		// If there is no [on-trigger], there is nothing to resume...
		ctx.resume = false ;
		callback() ;
		return ;
	}

	book.engine.runCb( this.onTrigger.content , book , ctx , null , callback ) ;
} ;



// This is time for the user to choose something
NextTag.selectNext = function( book , options , ctx , callback ) {
	var firstUpdate = true , firstVote = true , selectTriggered = false ,
		timer = null , timedOut = false , startTime , timeoutTime ,
		autoTimer = null , autoTime = Infinity , autoNext ;


	// First check status updater: this is the good timing to do so
	if ( ctx.statusUpdater ) {
		ctx.statusUpdater.exec( book , null , ctx ) ;
	}


	var nextStyle = Dynamic.getFinalValue( ctx.activeScene.nextStyle , ctx.data ) || null ;
	var shuffleNext = Dynamic.getFinalValue( ctx.activeScene.shuffleNext , ctx.data ) !== false ;
	var voteTime = 1000 * Dynamic.getFinalValue( ctx.activeScene.voteTime , ctx.data ) || Infinity ;
	var hurryTime = 1000 * Dynamic.getFinalValue( ctx.activeScene.hurryTime , ctx.data ) || 15000 ;
	var showTimer = Dynamic.getFinalValue( ctx.activeScene.showTimer , ctx.data ) !== false ;


	// First, shuffle the next-list if needed
	if ( shuffleNext ) {
		NextTag.shuffle( ctx.nexts ) ;
	}


	ctx.nexts.forEach( e => {
		var t = Dynamic.getFinalValue( e.auto , ctx.data ) ;

		if ( t === false ) { return ; }
		if ( typeof t !== 'number' ) { t = voteTime + 5000 ; }
		else { t *= 1000 ; }

		if ( t < autoTime ) {
			autoTime = t ;
			autoNext = e ;
		}
	} ) ;

	if ( autoNext ) {
		//console.log( '\n\n>>> HAS AUTO! <<<\n\n' ) ;

		autoTimer = setTimeout( () => {
			//console.log( '\n\n>>> AUTO! <<<\n\n' ) ;
			select( autoNext , [] , 'auto' ) ;
		} , autoTime ) ;
	}

	//console.log( "Vote time:" , voteTime ) ;

	var select = ( next , voters , special ) => {
		if ( selectTriggered ) { return ; }
		selectTriggered = true ;

		ctx.nextTriggeringRoles = voters ;
		ctx.nextTriggeringSpecial = special || null ;

		// Reset next selection
		ctx.roles.forEach( e => e.nextSelected = null ) ;

		// Unbind everything
		if ( timer !== null ) { clearTimeout( timer ) ; timer = null ; }
		if ( autoTimer !== null ) { clearTimeout( autoTimer ) ; autoTimer = null ; }
		Ngev.groupOff( ctx.roles , 'selectNext' , onSelectNext ) ;

		// Next triggered by some voters: that's a user interaction, we can reset the number of ticks
		if ( voters.length ) {
			//log.warning( "User interaction -- reset ctx.ticks (was %i)" , ctx.ticks ) ;
			ctx.nodeRoot.ticks = 0 ;
		}

		callback( undefined , next ) ;
	} ;

	var onTimeout = () => {
		//console.log( 'Time out!' ) ;
		var checkVotes , next ;

		timedOut = true ;

		// On timeout, all nexts should be checked again
		// The first passing the test is used
		next = ctx.nexts.find( e => checkVotes = NextTag.checkOneNext( ctx , e , timedOut ) ) ;

		if ( checkVotes ) { select( next , checkVotes ) ; }
	} ;

	var resetTimeout = time => {
		if ( timer !== null ) { clearTimeout( timer ) ; timer = null ; }

		startTime = Date.now() ;
		timeoutTime = startTime + time ;

		if ( time < Infinity ) { timer = setTimeout( onTimeout , time ) ; }
	} ;

	var shrinkTimeout = time => {
		if ( Date.now() + time < timeoutTime ) { resetTimeout( time ) ; }
	} ;

	var update = () => {
		// /!\ Warning: concurrency issues for local synchronous listeners /!\
		// Either emit asynchronously everywhere (do not mess with event order), or be careful about how things works
		var eventOptions = {} , isUpdate = ! firstUpdate , undecidedRoles , nextsData ;
		firstUpdate = false ;

		if ( showTimer && timeoutTime < Infinity ) { eventOptions.timeout = timeoutTime - Date.now() ; }

		if ( typeof nextStyle === 'string' ) {
			nextStyle = { format: nextStyle } ;
		}
		eventOptions.nextStyle = {
			format: nextStyle?.format || 'auto' ,
			position: nextStyle?.position || 'auto'
		} ;

		undecidedRoles = ctx.roles.filter( e => ! e.nextSelected ).map( e => e.id ) ;

		nextsData = ctx.nexts.map( next => ( {
			id: next.id ,
			label: next.label ,
			// undefined values will be stripped out of JSON
			style: next.style || undefined ,
			class: next.class || undefined ,
			image: next.image || undefined ,
			button: next.button || undefined ,
			groupBreak: next.groupBreak ,
			roleIds: ctx.roles.filter( role => role.nextSelected === next ).map( role => role.id )
		} ) ) ;

		// Build the nextList dedicated for each roles
		ctx.roles.forEach( role => {
			var ownNextsData = nextsData.filter( ( n , index ) => ctx.nexts[ index ].roles.includes( role ) ) ;
			role.emit( 'nextList' , ownNextsData , undecidedRoles , eventOptions , isUpdate ) ;
		} ) ;
	} ;

	var onSelectNext = ( role , nextId ) => {
		if ( nextId === null ) {
			role.nextSelected = null ;
			update() ;
			return ;
		}

		var nextIndex = ctx.nexts.findIndex( e => e.id === nextId ) ;

		// The client sent garbage data
		if ( nextIndex === -1 ) { return ; }

		var next = ctx.nexts[ nextIndex ] ;

		// First, check if the client is allowed to select this role
		if ( ! next.roles.includes( role ) ) { return ; }

		if ( firstVote && hurryTime < Infinity ) { shrinkTimeout( hurryTime ) ; }

		firstVote = false ;

		role.nextSelected = next ;

		update() ;

		var checkVotes = NextTag.checkOneNext( ctx , next , timedOut ) ;

		if ( checkVotes ) { select( next , checkVotes ) ; }
	} ;

	Ngev.groupOn( ctx.roles , 'selectNext' , onSelectNext ) ;
	resetTimeout( voteTime ) ;

	update() ;
} ;



NextTag.checkOneNext = function( ctx , next , timedOut ) {
	var max = 0 ,
		votesNotCasted ,
		votesCasted = 0 ,
		proVoters = ctx.roles.filter( e => e.nextSelected === next ) ,
		pro = proVoters.length ,
		consArray = new Array( ctx.nexts ).fill( 0 ) ,
		maxCons = 0 ;

	var voteStyle =
		Dynamic.getFinalValue( next.voteStyle , ctx.data ) ||
		Dynamic.getFinalValue( ctx.activeScene.voteStyle , ctx.data ) ;

	if ( ! voteStyle ) {
		if ( ctx.roles.length <= 1 ) { voteStyle = 'immediate' ; }
		else if ( ctx.nexts.length >= 2 ) { voteStyle = 'majority' ; }
		else { voteStyle = 'majority' ; }
	}

	ctx.roles.forEach( e => {
		var indexOf ;

		if ( e.nextSelected !== null ) {
			votesCasted ++ ;
			if ( e.nextSelected !== next ) {
				indexOf = ctx.nexts.indexOf( e.nextSelected ) ;
				consArray[ indexOf ] ++ ;
				maxCons = Math.max( consArray[ indexOf ] , maxCons ) ;
			}
		}
	} ) ;

	votesNotCasted = ctx.roles.length - votesCasted ;

	// 'Max' equals votes casted in case of timeout, or the roles count when not timed out
	max = timedOut ? votesCasted : ctx.roles.length ;

	/*
	console.log( {
		pro: pro ,
		votesCasted: votesCasted ,
		votesNotCasted: votesNotCasted ,
		maxCons: maxCons ,
		max: max
	} ) ;
	//*/

	switch ( voteStyle ) {
		case 'unanimity' :
			if ( pro === max ) {
				return proVoters ;
			}
			break ;

		case 'relative' :
		case 'relative-majority' :
		case 'majority' :
			// Absolute majority or relative majority after the timeout
			if ( pro >= Math.round( ( max + 1 ) / 2 ) ) {
				return proVoters ;
			}
			else if ( timedOut && pro > maxCons ) {
				return proVoters ;
			}
			break ;
		case 'absolute' :
		case 'absolute-majority' :
			if ( pro >= Math.round( ( max + 1 ) / 2 ) ) {
				return proVoters ;
			}
			break ;
		case 'immediate' :
		default :
			return proVoters ;
	}

	return null ;
} ;



NextTag.shuffle = function( nexts ) {
	// /!\ It would be nice if it would preserve groub-break:
	// shuffle group, shuffle 'next' in group, but do not mix 'next' from one group to another
	nexts.sort( () => Math.random() - 0.5 ) ;
} ;

