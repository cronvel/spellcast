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



const kungFig = require( 'kung-fig' ) ;
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;

const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;
const toClassObject = require( '../../commonUtils.js' ).toClassObject ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



const tagOptions = {
	'show-sprite': { type: 'sprite' , action: 'show' } ,
	'update-sprite': { type: 'sprite' , action: 'update' } ,
	'animate-sprite': { type: 'sprite' , action: 'animate' } ,
	'clear-sprite': { type: 'sprite' , action: 'clear' } ,
	'show-ui': { type: 'ui' , action: 'show' } ,
	'update-ui': { type: 'ui' , action: 'update' } ,
	'animate-ui': { type: 'ui' , action: 'animate' } ,
	'clear-ui': { type: 'ui' , action: 'clear' } ,
	'show-marker': { type: 'marker' , action: 'show' } ,
	'update-marker': { type: 'marker' , action: 'update' } ,
	'animate-marker': { type: 'marker' , action: 'animate' } ,
	'clear-marker': { type: 'marker' , action: 'clear' } ,
	'show-card': { type: 'card' , action: 'show' } ,
	'update-card': { type: 'card' , action: 'update' } ,
	'animate-card': { type: 'card' , action: 'animate' } ,
	'clear-card': { type: 'card' , action: 'clear' }
} ;



function UiTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof UiTag ) ? this : Object.create( UiTag.prototype ) ;
	var matches , action , type , eventName ;

	if ( ! tagOptions[ tag ] ) { throw new Error( 'Unknown tag: ' + tag ) ; }

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the *-sprite syntax." ) ;
	}

	type = tagOptions[ tag ].type ;
	action = tagOptions[ tag ].action ;
	eventName = action + type[ 0 ].toUpperCase() + type.slice( 1 ) ;

	Object.defineProperties( self , {
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		type: { value: type , enumerable: true } ,
		action: { value: action , enumerable: true } ,
		eventName: { value: eventName , enumerable: true }
	} ) ;

	return self ;
}



module.exports = UiTag ;
UiTag.prototype = Object.create( Tag.prototype ) ;
UiTag.prototype.constructor = UiTag ;



UiTag.prototype.run = function( book , ctx , callback ) {
	var id , data , eventData , store , current , area , roles , isSync = false ;

	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	store = ctx[ this.type + 's' ] ;
	current = store[ id ] ;

	if ( this.action !== 'clear' ) {
		data = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;

		if ( this.action !== 'animate' ) {
			if ( data && typeof data === 'string' ) { data = { url: data } ; }

			if ( typeof data.url !== 'string' && ( this.action === 'show' || data.url ) ) {
				return new TypeError( '[sprite/ui/marker/card] tag: bad URL.' ) ;
			}
		}
	}

	/*
		This is important to store internally the existing sprites/UIs/markers/cards in order to manage:

			- replay/reconnection
			- return from gosub/split
			- non-persistent sprites should be automatically cleared when leaving the current scene
	*/

	switch ( this.action ) {
		case 'show' :
			if ( current ) {
				// It's probably better to empty the existing object rather than remove it,
				// because of eventual references...
				Object.keys( current ).forEach( e => delete current[ e ] ) ;
				//delete store[ id ] ;
			}
			else {
				store[ id ] = current = {} ;
			}

			Object.assign( current , {
				roles: ctx.roles ,	// immutable
				type: this.type ,
				button: null ,
				location: null ,
				pose: null ,
				status: {} ,
				style: {} ,
				imageStyle: {} ,
				class: {} ,
				transition: null ,	// Framework transition
				size: {} ,			// Framwork size
				position: {} ,		// Framwork position
				animation: null
			} ) ;

			if ( this.type === 'sprite' ) {
				Object.assign( current , {
					maskStyle: {}
				} ) ;
			}

			if ( this.type === 'ui' ) {
				Object.assign( current , {
					area: {}
				} ) ;
			}

			if ( this.type === 'marker' ) {
				Object.assign( current , {
					ui: null
				} ) ;
			}

			if ( this.type === 'card' ) {
				Object.assign( current , {
					backImageStyle: {} ,
					content: {}
				} ) ;
			}
			// Intentional fall-through
		case 'update' :
			if ( ! current ) {
				scriptLog.debug( '%s %s not found' , this.type , id ) ;
				return null ;
			}

			roles = current.roles ;
			
			eventData = {} ;

			if ( data.url ) { current.url = eventData.url = data.url ; }
			if ( data.style ) { Object.assign( current.style , eventData.style = data.style ) ; }
			if ( data.imageStyle ) { Object.assign( current.imageStyle , eventData.imageStyle = data.imageStyle ) ; }
			if ( data.class ) { Object.assign( current.class , eventData.class = toClassObject( data.class ) ) ; }

			if ( data.transition !== undefined ) { current.transition = eventData.transition = data.transition ; }
			
			if ( data.size ) { Object.assign( current.size , eventData.size = data.size ) ; }
			if ( data.position ) { Object.assign( current.position , eventData.position = data.position ) ; }
			
			if ( data.button !== undefined ) { current.button = eventData.button = data.button ; }

			if ( data.location !== undefined ) { current.location = eventData.location = data.location ; }
			if ( data.pose !== undefined ) { current.pose = eventData.pose = data.pose ; }
			if ( data.status ) { Object.assign( current.status , eventData.status = data.status ) ; }

			if ( this.type === 'sprite' ) {
				if ( data.maskUrl ) { current.maskUrl = eventData.maskUrl = data.maskUrl ; }
				if ( data.maskStyle ) { Object.assign( current.maskStyle , eventData.maskStyle = data.maskStyle ) ; }
			}

			if ( this.type === 'ui' ) {
				if ( data.area ) {
					eventData.area = data.area ;

					for ( area in data.area ) {
						if ( ! current.area[ area ] ) { current.area[ area ] = {} ; }
						if ( ! current.area[ area ].status ) { current.area[ area ].status = {} ; }

						if ( data.area[ area ].hint !== undefined ) { current.area[ area ].hint = data.area[ area ].hint || null ; }
						if ( data.area[ area ].status ) { Object.assign( current.area[ area ].status , data.area[ area ].status ) ; }
					}
				}
			}

			if ( this.type === 'marker' ) {
				if ( data.ui ) { current.ui = eventData.ui = data.ui ; }
			}

			if ( this.type === 'card' ) {
				if ( data.backUrl ) { current.backUrl = eventData.backUrl = data.backUrl ; }
				if ( data.backImageStyle ) { Object.assign( current.backImageStyle , eventData.backImageStyle = data.backImageStyle ) ; }
				if ( data.content ) { Object.assign( current.content , eventData.content = data.content ) ; }
			}

			break ;
		case 'clear' :
			roles = current.roles ;
			isSync = true ;		// Clear events are immediate, not async
			eventData = undefined ;
			if ( current ) {
				// Probably better to empty it before unlinking it?
				// So references point to an empty object.
				Object.keys( current ).forEach( e => delete current[ e ] ) ;
				delete store[ id ] ;
			}
			break ;
		case 'animate' :
			if ( ! current ) {
				scriptLog.debug( '%s %s not found' , this.type , id ) ;
				return null ;
			}

			roles = current.roles ;
			
			// /!\ Check if the animation exists, once stored inside the book /!\

			if ( typeof data !== 'string' ) {
				return new TypeError( '[sprite/ui/marker/card] tag: bad animation ID.' ) ;
			}

			current.animation = eventData = data ;

			break ;
	}


	// Do not use ctx.roles but roles/current.roles, which contains ctx.roles at element creation (show-*)
	if ( isSync ) {
		Ngev.groupEmit( roles , this.eventName , id , eventData ) ;
		return null ;
	}

	Ngev.groupEmit( roles , this.eventName , id , eventData , callback ) ;
} ;

