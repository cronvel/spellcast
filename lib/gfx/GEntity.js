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
		texture: (mandatory) the texture pack to use
		variant: the variant to use (default: default), e.g.: 'standing', 'attack', etc...
		location: string, may be relevant only in some engine, e.g. cards or markers in the classic web client engine
		pose: string, may be relevant only in some engine, e.g. cards in the classic web client engine
		position: Vector3D (x,y,z), the position of the GEntity, depending on the engine and the usage, z may or may not be relevant
		size: Vector3D (x,y,z), the size of the GEntity, depending on the engine and the usage, z may or may not be relevant
		rotation: TO BE DEFINED... quaternion? euler? anyone?
		animation: TO BE DEFINED... animation exists in the current version of spellcast web client, but it should probably be refactored
		tags: (NOT CODED) a Set of tags, used for filtering G-entities
		transition: if there is transition for this GEntity, an object with value passed to the Transition constructor, key being:
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
function GEntity( book , data = {} ) {
	this.show = !! data.show ;
	this.persistent = data.persistent === undefined ? true : !! data.persistent ;
	this.roles = data.roles || null ;
	this.usage = data.usage || 'default' ;
	this.button = data.button || null ;
	this.theme = data.theme || null ;
	this.texture = data.texture ;
	this.variant = data.variant || 'default' ;
	this.location = data.location || null ;
	this.pose = data.pose || null ;
	this.position = data.position ? Vector3D.fromObject( data.position ) : new Vector3D( 0 , 0 , 0 ) ;
	this.size = data.size ? Vector3D.fromObject( data.size ) : new Vector3D( 1 , 1 , 1 ) ;
	//this.rotation = TO BE DEFINED....
	this.transition = {
		position: data.transition && data.transition.position ? new Transition( data.transition.position ) : null ,
		size: data.transition && data.transition.size ? new Transition( data.transition.size ) : null ,
		//rotation: data.transition && data.transition.rotation ? new Transition( data.transition.rotation ) : null ,
		opacity: data.transition && data.transition.opacity ? new Transition( data.transition.opacity ) : null ,
		color: data.transition && data.transition.color ? new Transition( data.transition.color ) : null ,
		effect: data.transition && data.transition.effect ? new Transition( data.transition.effect ) : null ,
	} ;

	this.engine = {} ;
	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}
}

module.exports = GEntity ;

GEntity.prototype.__prototypeUID__ = 'spellcast/GEntity' ;
GEntity.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



/*
	duration: transition duration in ms
	easing: the easing function used
*/
function Transition( data = {} ) {
	this.duration = data.duration || 200 ;
	this.easing = data.easing || 'linear' ;
}

module.exports = Transition ;

Transition.prototype.__prototypeUID__ = 'spellcast/GEntity.Transition' ;
Transition.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

