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

"use strict" ;



const kungFig = require( 'kung-fig' ) ;
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;
const GEntity = require( '../../gfx/GEntity.js' ) ;

const svgKit = require( 'svg-kit' ) ;
const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;
const toClassObject = require( '../../commonUtils.js' ).toClassObject ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



const tagOptions = {
	'show-g-entity': { usage: null , action: 'show' } ,
	'update-g-entity': { usage: null , action: 'update' } ,
	'animate-g-entity': { usage: null , action: 'animate' } ,
	'clear-g-entity': { usage: null , action: 'clear' } ,

	'show-sprite': { usage: 'sprite' , action: 'show' } ,
	'update-sprite': { usage: 'sprite' , action: 'update' } ,
	'animate-sprite': { usage: 'sprite' , action: 'animate' } ,
	'clear-sprite': { usage: 'sprite' , action: 'clear' } ,
	'show-vg': { usage: 'vg' , action: 'show' } ,
	'update-vg': { usage: 'vg' , action: 'update' } ,
	'animate-vg': { usage: 'vg' , action: 'animate' } ,
	'clear-vg': { usage: 'vg' , action: 'clear' } ,
	'show-marker': { usage: 'marker' , action: 'show' } ,
	'update-marker': { usage: 'marker' , action: 'update' } ,
	'animate-marker': { usage: 'marker' , action: 'animate' } ,
	'clear-marker': { usage: 'marker' , action: 'clear' } ,
	'show-card': { usage: 'card' , action: 'show' } ,
	'update-card': { usage: 'card' , action: 'update' } ,
	'animate-card': { usage: 'card' , action: 'animate' } ,
	'clear-card': { usage: 'card' , action: 'clear' }
} ;



function GEntityTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof GEntityTag ) ? this : Object.create( GEntityTag.prototype ) ;
	var matches , action , usage ;

	if ( ! tagOptions[ tag ] ) { throw new Error( 'Unknown tag: ' + tag ) ; }

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the *-sprite syntax." ) ;
	}

	usage = tagOptions[ tag ].usage ;
	action = tagOptions[ tag ].action ;

	Object.defineProperties( self , {
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		usage: { value: usage , enumerable: true } ,
		action: { value: action , enumerable: true }
	} ) ;

	return self ;
}



module.exports = GEntityTag ;
GEntityTag.prototype = Object.create( Tag.prototype ) ;
GEntityTag.prototype.constructor = GEntityTag ;



const DATA_SHORTHANDS = [ 'vgObject' , 'vgMorph' , 'vgUrl' , 'inVg' , 'location' , 'area' ] ;



GEntityTag.prototype.run = function( book , ctx , callback ) {
	var id , key , data , eventName , eventData , gEntity , area ,
		isSync = false ,
		usage = this.usage || data.usage || 'sprite' ;

	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	gEntity = ctx.gEntities[ id ] ;

	if ( this.action !== 'clear' ) {
		data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;

		// Shorthands...
		for ( key of DATA_SHORTHANDS ) {
			if ( data[ key ] ) {
				if ( ! data.data ) { data.data = {} ; }
				data.data[ key ] = data[ key ] ;
				delete data[ key ] ;
			}
		}
	}

	/*
		This is important to store internally the existing sprites/VGs/markers/cards in order to manage:

			- replay/reconnection
			- return from gosub/split
			- non-persistent sprites should be automatically cleared when leaving the current scene
	*/

	switch ( this.action ) {
		case 'show' :
			eventName = 'showGEntity' ;
			eventData = {} ;
			data.roles = ctx.roles ;
			data.usage = usage ;
			
			try {
				gEntity = ctx.gEntities[ id ] = new GEntity( data , eventData ) ;
			}
			catch ( error ) {
				callback( new Error( "[show-g-entity] Bad data when creating the GEntity: " + error ) ) ;
				return ;
			}
			
			/*
			if ( this.usage === 'sprite' ) {
				Object.assign( gEntity , {
					maskStyle: {}
				} ) ;
			}

			if ( this.usage === 'vg' ) {
				Object.assign( gEntity , {
					area: {} ,
					vgObject: null
				} ) ;
			}

			if ( this.usage === 'marker' ) {
				Object.assign( gEntity , {
					vg: null
				} ) ;
			}

			if ( this.usage === 'card' ) {
				Object.assign( gEntity , {
					backImageStyle: {} ,
					content: {}
				} ) ;
			}
			*/
			break ;

		case 'update' :
			if ( ! gEntity ) {
				scriptLog.debug( '%s %s not found' , usage , id ) ;
				return null ;
			}

			eventName = 'updateGEntity' ;
			eventData = {} ;
			gEntity.update( data , eventData ) ;

			/* TO PORT:
			if ( data.url ) { gEntity.url = eventData.url = data.url ; }
			if ( data.style ) { Object.assign( gEntity.style , eventData.style = data.style ) ; }
			if ( data.imageStyle ) { Object.assign( gEntity.imageStyle , eventData.imageStyle = data.imageStyle ) ; }
			if ( data.class ) { Object.assign( gEntity.class , eventData.class = toClassObject( data.class ) ) ; }

			if ( data.transition !== undefined ) { gEntity.transition = eventData.transition = data.transition ; }

			if ( data.size ) { Object.assign( gEntity.size , eventData.size = data.size ) ; }
			if ( data.position ) { Object.assign( gEntity.position , eventData.position = data.position ) ; }

			if ( data.button !== undefined ) { gEntity.button = eventData.button = data.button ; }

			if ( data.location !== undefined ) { gEntity.location = eventData.location = data.location ; }
			if ( data.pose !== undefined ) { gEntity.pose = eventData.pose = data.pose ; }
			if ( data.meta ) { Object.assign( gEntity.meta , eventData.meta = data.meta ) ; }

			// /!\ BAD! should be in the texture! /!\
			if ( usage === 'sprite' ) {
				if ( data.maskUrl ) { gEntity.maskUrl = eventData.maskUrl = data.maskUrl ; }
				if ( data.maskStyle ) { Object.assign( gEntity.maskStyle , eventData.maskStyle = data.maskStyle ) ; }
			}

			if ( usage === 'card' ) {
				if ( data.backUrl ) { gEntity.backUrl = eventData.backUrl = data.backUrl ; }
				if ( data.backImageStyle ) { Object.assign( gEntity.backImageStyle , eventData.backImageStyle = data.backImageStyle ) ; }
				if ( data.content ) { Object.assign( gEntity.content , eventData.content = data.content ) ; }
			}
			*/

			break ;

		case 'clear' :
			if ( ! gEntity ) {
				// Is it needed to warn if already cleared?
				scriptLog.debug( '%s %s not found' , usage , id ) ;
				return null ;
			}

			isSync = true ;		// Clear events are immediate, not async
			eventName = 'clearGEntity' ;
			eventData = undefined ;

			// Probably better to empty it before unlinking it?
			// So references point to an empty object.
			Object.keys( gEntity ).forEach( e => delete gEntity[ e ] ) ;
			delete ctx.gEntities[ id ] ;
			break ;

		case 'animate' :
			if ( ! gEntity ) {
				scriptLog.debug( '%s %s not found' , usage , id ) ;
				return null ;
			}

			// /!\ Check if the animation exists, once stored inside the book /!\

			if ( typeof data !== 'string' ) {
				return new TypeError( '[sprite/vg/marker/card] tag: bad animation ID.' ) ;
			}

			eventName = 'animateGEntity' ;
			gEntity.animation = eventData = data ;

			break ;
	}


	// Do not use ctx.roles but gEntity.roles, which contains ctx.roles at element creation (show-*)
	if ( isSync ) {
		Ngev.groupEmit( gEntity.roles , eventName , id , eventData ) ;
		return null ;
	}

	log.hdebug( "this.action: %s" , this.action ) ;
	log.hdebug( "gEntity: %Y" , gEntity ) ;
	log.hdebug( "eventData: %Y" , eventData ) ;
	Ngev.groupEmit( gEntity.roles , eventName , id , eventData , callback ) ;
} ;

