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
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const StoryCtx = require( '../../StoryCtx.js' ) ;

const Promise = require( 'seventh' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SplitRolesTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SplitRolesTag ) ? this : Object.create( SplitRolesTag.prototype ) ;

	Tag.call( self , 'split-roles' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'split-roles' tag's content should be a TagContainer." ) ;
	}

	Object.defineProperties( self , {
		gosubs: {
			value: null , writable: true , enumerable: true
		}
	} ) ;

	return self ;
}

module.exports = SplitRolesTag ;
SplitRolesTag.prototype = Object.create( Tag.prototype ) ;
SplitRolesTag.prototype.constructor = SplitRolesTag ;



SplitRolesTag.prototype.init = function( book ) {
	this.gosubs = this.content.getTags( 'gosub' ) ;
	return null ;
} ;



SplitRolesTag.prototype.run = function( book , ctx , callback ) {
	var rolesUsed = [] , count = 0 , eventsChildren = [] ;

	Ngev.groupEmit( ctx.roles , 'splitRoles' ) ;

	// TURN THE PARENT CONTEXT OFF!
	ctx.active = false ;

	Promise.every( this.gosubs , ( gosubTag ) => {

		if ( ! gosubTag.roles ) { return ; }

		var roles = gosubTag.roles.getRecursiveFinalContent( ctx.data ) ;

		if ( ! Array.isArray( roles ) ) { roles = [ roles ] ; }

		// A role cannot be used twice
		roles = ctx.roles.filter( e => roles.indexOf( e.id ) !== -1 && rolesUsed.indexOf( e ) === -1 ) ;
		rolesUsed = rolesUsed.concat( roles ) ;

		// duplicate the event bus
		var events = new Ngev() ;
		Ngev.initFrom.call( events , ctx.events ) ;
		events.listenerMap = Object.assign( {} , ctx.events.listenerMap ) ;

		var subSceneCtx = new StoryCtx( book , {
			newNode: true ,		// has its own tick counter...
			ticks: ctx.ticks ,	// ... but it init it to the current value of its parent
			parent: ctx ,
			nexts: ctx.nexts.slice() ,
			events: events ,
			roles: roles ,
			altBuffer: ctx.altBuffer ,
			hereActions: ctx.hereActions ,
			statusUpdater: ctx.statusUpdater ,
			nextPanel: ctx.nextPanel ,
			sceneConfig: ctx.sceneConfig
		} ) ;

		eventsChildren.push( events ) ;

		count ++ ;

		return new Promise( ( resolve , reject ) => {
			gosubTag.runInContext( book , ctx , subSceneCtx , ( error ) => {
				count -- ;
				if ( error ) { reject( error ) ; return ; }
				if ( count ) { Ngev.groupEmit( subSceneCtx.roles , 'wait' , 'otherBranches' ) ; }
				resolve() ;
			} ) ;
		} ) ;
	} )
		.then(
			() => {
			// TURN THE PARENT CONTEXT ON AGAIN!
				ctx.active = true ;

				Ngev.mergeListeners.call( ctx.events , eventsChildren ) ;
				Ngev.groupEmit( ctx.roles , 'rejoinRoles' ) ;

				// People rejoin from different scenes, hence, no configuration can be held at all
				ctx.activeScene.configure( book , ctx , true ) ;

				callback() ;
			} ,
			error => {
			// TURN THE PARENT CONTEXT ON AGAIN!
				ctx.active = true ;
				callback( error ) ;
			}
		) ;
} ;

