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

const GSceneTag = require( './GSceneTag.js' ) ;
const GEntity = require( '../../gfx/GEntity.js' ) ;

const Ngev = require( 'nextgen-events' ) ;
const svgKit = require( 'svg-kit' ) ;
const camel = require( '../../camel.js' ) ;
const toClassObject = require( '../../commonUtils.js' ).toClassObject ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function GEntityTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof GEntityTag ) ? this : Object.create( GEntityTag.prototype ) ;
	var matches , usage , id , ref_ , await_ = false ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( tag === 'g-create' ) {
		if ( ! self.attributes || ! ( matches = self.attributes.match( /^([a-zA-Z-]+) +(?:(\$[^ ]+)|([^$ ]+))$/ ) ) ) {
			throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the g-entity syntax." ) ;
		}

		usage = camel.dashToCamelStr( matches[ 1 ] ) ;
		ref_ = matches[ 2 ] && Ref.parse( matches[ 2 ] ) ;
		id = matches[ 3 ] ;
	}
	else if ( tag === 'g-update' ) {
		if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))( +await)?$/ ) ) ) {
			throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the g-entity syntax." ) ;
		}

		usage = null ;
		ref_ = matches[ 1 ] && Ref.parse( matches[ 1 ] ) ;
		id = matches[ 2 ] ;
		await_ = !! matches[ 3 ] ;
	}
	else {
		if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))$/ ) ) ) {
			throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the g-entity syntax." ) ;
		}

		usage = null ;
		ref_ = matches[ 1 ] && Ref.parse( matches[ 1 ] ) ;
		id = matches[ 2 ] ;
	}

	Object.defineProperties( self , {
		id: { value: id , enumerable: true } ,
		ref: { value: ref_ , enumerable: true } ,
		usage: { value: usage , enumerable: true } ,
		await: { value: await_ , enumerable: true }
	} ) ;

	return self ;
}



module.exports = GEntityTag ;
GEntityTag.prototype = Object.create( Tag.prototype ) ;
GEntityTag.prototype.constructor = GEntityTag ;



const SHORTHANDS = {
	tx: 'texturePack'
} ;

const SPECIAL_SHORTHANDS = [ 'vgObject' , 'vgMorph' , 'vgUrl' , 'inVg' , 'area' , 'light' , 'material' , 'shape' ] ;



GEntityTag.prototype.run = function( book , ctx , callback ) {
	var id , key , data , eventName , eventData , gEntity , area ,
		isSync = false ,
		gScene = ctx.data._gScene || ctx.gScenes.default ;

	if ( ! gScene ) { gScene = GSceneTag.createDefault( ctx ) ; }

	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	gEntity = gScene.gEntities[ id ] ;

	if ( this.name !== 'g-clear' ) {
		data = this.getRecursiveFinalContent( ctx.data ) ;

		if ( ! data || typeof data !== 'object' ) {
			scriptLog.error( "GEntity tag error (%s): the content should be an object" , this.location ) ;
			return null ;
		}

		data = camel.inPlaceDashToCamelProps( data , true ) ;

		// Shorthands...
		for ( key in SHORTHANDS ) {
			if ( data[ key ] !== undefined ) {
				data[ SHORTHANDS[ key ] ] = data[ key ] ;
				delete data[ key ] ;
			}
		}

		for ( key of SPECIAL_SHORTHANDS ) {
			if ( data[ key ] !== undefined ) {
				if ( ! data.special ) { data.special = {} ; }
				data.special[ key ] = data[ key ] ;
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

	switch ( this.name ) {
		case 'g-create' :
			eventName = 'createGEntity' ;
			eventData = {} ;
			data.roles = ctx.roles ;
			data.usage = this.usage ;
			
			try {
				gEntity = gScene.gEntities[ id ] = new GEntity( data , eventData ) ;
			}
			catch ( error ) {
				callback( new Error( "[g-create] Bad data when creating the GEntity: " + error ) ) ;
				return ;
			}
			
			/*
			if ( this.usage === 'sprite' ) {
				Object.assign( gEntity , {
					maskStyle: {}
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

		case 'g-update' :
			if ( ! gEntity ) {
				scriptLog.debug( '%s not found' , id ) ;
				return null ;
			}

			eventName = 'updateGEntity' ;
			eventData = {} ;
			gEntity.update( data , eventData ) ;

			/* TO PORT:
			if ( data.style ) { Object.assign( gEntity.style , eventData.style = data.style ) ; }
			if ( data.imageStyle ) { Object.assign( gEntity.imageStyle , eventData.imageStyle = data.imageStyle ) ; }
			if ( data.class ) { Object.assign( gEntity.class , eventData.class = toClassObject( data.class ) ) ; }

			if ( data.location !== undefined ) { gEntity.location = eventData.location = data.location ; }
			if ( data.pose !== undefined ) { gEntity.pose = eventData.pose = data.pose ; }

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

		case 'g-clear' :
			if ( ! gEntity ) {
				// Is it needed to warn if already cleared?
				scriptLog.debug( '%s not found' , id ) ;
				return null ;
			}

			isSync = true ;		// Clear events are immediate, not async
			eventName = 'clearGEntity' ;
			eventData = undefined ;
			gEntity.destroy() ;
			delete gScene.gEntities[ id ] ;
			break ;

		case 'g-animate' :
			if ( ! gEntity ) {
				scriptLog.debug( '%s not found' , id ) ;
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


	// Do not use ctx.roles but gEntity.roles, which contains ctx.roles at element creation (g-create)
	if ( isSync ) {
		Ngev.groupEmit( gEntity.roles , eventName , gScene.id , id , eventData ) ;
		return null ;
	}

	/*
	log.hdebug( "this.name: %s" , this.name ) ;
	log.hdebug( "gEntity: %Y" , gEntity ) ;
	log.hdebug( "eventData: %Y" , eventData ) ;
	//*/

	if ( this.await ) {
		Ngev.groupEmit( gEntity.roles , eventName , gScene.id , id , eventData , true , callback ) ;
	}
	else {
		Ngev.groupEmit( gEntity.roles , eventName , gScene.id , id , eventData , false ) ;
		return null ;
	}
} ;

