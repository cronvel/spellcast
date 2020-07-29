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



const Vector3D = require( 'math-kit/lib/geometry/Vector3D.js' ) ;
const GTransition = require( './GTransition.js' ) ;



/*
	Data:
		show: boolean, if false the GEntity is hidden
		persistent: if the GEntity persists on scene changes (default: yes)
		roles: the roles that see this GEntity, null: use the GScene roles (the default)
		usage: the usage for the GEntity, depend on engine, but here are some standard values:
			- portrait: the GEntity is a portrait, e.g. a speaking NPC, the portrait is overlayed on top of the eventual scene, usually light doesn't affect it
			- sprite: a sprite on the scene, sprite and portrait are the same on the default GScene engine
			- card: cards have special features, see the standard web client
			...
		button: a button id or null, if set clicking on the GEntity is like clicking on the related button
		theme: the texture theme used, null: use the GScene theme (the default)
		texturePack: (mandatory) the texture pack to use
		variant: the variant to use (default: default), e.g.: 'standing', 'attack', etc...
		position: Vector3D (x,y,z), the position of the GEntity, depending on the engine and the usage, z may or may not be relevant
		size: Vector3D (x,y,z), the size of the GEntity, depending on the engine and the usage, z may or may not be relevant
		rotation: TO BE DEFINED... quaternion? euler? anyone?
		animation: TO BE DEFINED... animation exists in the current version of spellcast web client, but it should probably be refactored
		tags: (NOT CODED) a Set of tags, used for filtering G-entities
		data: object, contains data for this GEntity, they MUST be used by the engine, and they are usage-dependent.
			E.g.: Vector Graphic needs a data.vgObject, can contains data.area ; a card need a data.content, and so on
		meta: object, contains meta-data for this GEntity, they may or may not be used by the engine.
			E.g.: { poison: true }, the sprite may display some greenish poison effects
		transitions: if there are transitions for this GEntity, an object with value passed to the GTransition constructor, key being:
			position: ...
			size: ...
			rotation: ...
			opacity: transparency and alpha channel
			color: all color changes, like brightness, contrast, color dodge, make the GEntity redish/blueish/whateverish, darker, brighter, flash, and so on
			effect: all other effect, like blur, or any possible filter, like drop shadow
		engine: object, engine-specific data, e.g.:
			class: the GEntity class (for HTML/CSS engines)
			style: CSS style (for HTML/CSS engines)
			imageStyle: CSS style (for HTML/CSS engines) for the image only (for things like cards, or anything where the image is embedded inside something else)
			maskStyle: CSS style (for HTML/CSS engines) for the mask of the sprite only (for things like sprite in the classic web client)
			backImageStyle: CSS style (for HTML/CSS engines) for the back-image only (back of the cards)
			content: CSS style (for HTML/CSS engines) for the text content of a card
			vgObject: object, for GEntity with usage=vg, this define the Vector Graphics
			vg: for markers, this is the vg id on which the marker is on
			area: object, for GEntity with usage=vg, this defines multiple areas
			shader: for WebGL engines
*/
function GEntity( data , eventData ) {
	//this.roles = eventData.roles = data.roles || null ;	// immutable // eventData.roles cause circular error in JSON.stringify() and is not required by client ATM
	this.roles = data.roles || null ;	// immutable
	
	this.usage = eventData.usage = data.usage || 'sprite' ;	// immutable

	this.show = false ;
	this.persistent = true ;
	this.button = null ;
	this.theme = null ;
	this.texturePack = null ;
	this.variant = 'default' ;
	this.position = new Vector3D( 0 , 0 , 0 ) ;
	this.positionMode = 'default' ;
	this.size = new Vector3D( 1 , 1 , 1 ) ;
	this.sizeMode = 'default' ;
	//this.rotation = TO BE DEFINED....

	this.data = {} ;
	this.meta = {} ;
	this.engine = {} ;

	this.transitions = {
		position: null ,
		size: null ,
		//rotation: null ,
		opacity: null ,
		color: null ,
		effect: null
	} ;

	this.update( data , eventData ) ;
}

module.exports = GEntity ;

GEntity.prototype.__prototypeUID__ = 'spellcast/GEntity' ;
GEntity.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



GEntity.prototype.update = function( data , eventData ) {
	var key ;

	if ( data.show !== undefined ) { this.show = eventData.show = !! data.show ; }
	if ( data.persistent !== undefined ) { this.persistent = eventData.persistent = !! data.persistent ; }
	if ( data.button !== undefined ) { this.button = eventData.button = data.button || null ; }
	if ( data.theme !== undefined ) { this.theme = eventData.theme = data.theme || null ; }
	if ( data.texturePack !== undefined ) { this.texturePack = eventData.texturePack = data.texturePack || null ; }
	if ( data.variant !== undefined ) { this.variant = eventData.variant = data.variant || 'default' ; }

	if ( data.position ) { eventData.position = this.position.setObject( data.position ) ; }
	if ( data.positionMode ) { this.positionMode = eventData.positionMode = data.positionMode || 'default' ; }
	if ( data.size ) { eventData.size = this.size.setObject( data.size ) ; }
	if ( data.sizeMode ) { this.sizeMode = eventData.sizeMode = data.sizeMode || 'default' ; }
	//this.rotation = TO BE DEFINED....

	if ( data.data && typeof data.data === 'object' ) {
		eventData.data = data.data ;
		Object.assign( this.data , data.data ) ;
	}
	
	if ( data.meta && typeof data.meta === 'object' ) {
		eventData.meta = data.meta ;
		Object.assign( this.meta , data.meta ) ;
	}

	if ( data.engine && typeof data.engine === 'object' ) {
		eventData.engine = data.engine ;
		Object.assign( this.engine , data.engine ) ;
	}

	if ( data.transitions && typeof data.transitions === 'object' ) {
		eventData.transitions = {} ;
		for ( key in data.transitions ) {
			if ( ! ( key in this.transitions ) ) { continue ; }
			
			if ( ! data.transitions[ key ] ) {
				this.transitions[ key ] = eventData.transitions[ key ] = null ;
			}
			else if ( typeof data.transitions[ key ] === 'object' ) {
				if ( this.transitions[ key ] ) {
					eventData.transitions[ key ] = this.transitions[ key ].update( data.transitions[ key ] ) ;
				}
				else {
					this.transitions[ key ] = eventData.transitions[ key ] = new GTransition( data.transitions[ key ] ) ;
				}
			}
		}
	}

	return this ;
} ;

