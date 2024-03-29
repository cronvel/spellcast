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



const GTransition = require( './GTransition.js' ) ;
const Parametric = require( './Parametric.js' ) ;

const Vector3D = require( 'math-kit/lib/geometry/Vector3D.js' ) ;
const svgKit = require( 'svg-kit' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



const FACING_DIR = {
	n: 0 , north: 0 ,
	nw: Math.PI / 4 , 'north-west': Math.PI / 4 ,
	w: Math.PI / 2 , west: Math.PI / 2 ,
	sw: Math.PI * 3 / 4 , 'south-west': Math.PI * 3 / 4 ,
	s: Math.PI , south: Math.PI ,
	se: Math.PI * 5 / 4 , 'south-east': Math.PI * 5 / 4 ,
	e: Math.PI * 3 / 2 , east: Math.PI * 3 / 2 ,
	ne: Math.PI * 7 / 4 , 'north-east': Math.PI * 7 / 4
} ;



const BILLBOARD_MODES = {
	none: null ,
	all: 'all' ,
	'all-axis': 'all' ,
	x: 'x' ,
	'x-axis': 'x' ,
	y: 'y' ,
	'y-axis': 'y' ,
	z: 'z' ,
	'z-axis': 'z' ,
	xy: 'xy' ,
	xz: 'xz' ,
	yz: 'yz' ,
	xyz: 'xyz'
} ;



/*
	Data:
		show: boolean, if false the GEntity is hidden
		persistent: if the GEntity persists on scene changes (default: yes)
		transient: if set to a number (default: no) the entity is transient/ephemeral, and is not even stored server-side,
			the number being the time in seconds the entity is alive client-side.
			Transient is useful for things like floating text in RPG like damages, healing, and so on... and also for special FX like slash or magical FX.
			If true, then it live infinitely (useful for shadows).
		parent: a parent GEntity, thing like positioning may depends on that parent
		parentMode: parenting mode
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
		location: a location identifier, either it supersedes 'position', or the 'position' is relative to 'location'
		origin: Vector3D (x,y,z) origin relative to the entity, for each axis 0 is the middle, 1 is the upper border of BBox, -1 is the lower border of BBox
		position: Vector3D (x,y,z), the position of the GEntity, depending on the engine and the usage, z may or may not be relevant
		positionMode: positioning mode (e.g. relative to the screen?)
		size: Vector3D (x,y,z), the size of the GEntity, depending on the engine and the usage, z may or may not be relevant
		sizeMode: size mode (e.g. relative to the screen?)
		rotation: Vector3D (x,y,z) Euler angle... later it should support quaternion?
		rotationMode: euler order, like 'xyz', 'zyx', and so on
		direction: Vector3D (x,y,z) the direction of the GEntity, may or may not be relevant depending on engine/usage.
			It will be normalized.
			E.g.: directional light and spot light.
		facing: facing direction in radian, 0 is north (+z), pi/2 is west (-x), etc. Relevant only for some engine and/or usage
		billboard: billboard mode, e.g. for sprite auto-facing the camera
		opacity: set the alpha/opacity
		animation: TO BE DEFINED... animation exists in the current version of spellcast web client, but it should probably be refactored
		tags: (NOT CODED) a Set of tags, used for filtering G-entities
		special: object, contains special data for this GEntity, they MUST be used by the engine, and they are usage-dependent. Some are server-side built-in!
			vgObject: object, for GEntity with usage=vg, this define the Vector Graphics
			vgMorph: object, for GEntity with usage=vg, this define the Vector Graphics Morph
			area: object, for GEntity with usage=vg, this defines multiple areas
			content: the text content of a card, or content of a floating-text, ...
			inVg: for markers, this is the vg id on which the marker is on
			content:
				text: the text
				textColor: the text color
				shadowColor: the shadow color of the text
				shadowBlur: the blur of the text
			light:
				color: this is the normalized light color
				specularColor: this is the normalized light color for specular only
				groundColor: for hemispheric lights, this is the ground color, normalized
				falloff: some lights can have linear or inverse-square falloff (e.g. point-lights or spot-light)
				intensity: for light this is the light intensity
			spriteAutoFacing: for sprite in 2.5D, this will choose the correct variant according to the sprite direction relative to the camera
		meta: object, contains meta-data for this GEntity, they may or may not be used by the engine.
			E.g.: { poison: true }, the sprite may display some greenish poison effects
		engine: object, engine-specific data, e.g.:
			class: the GEntity class (for HTML/CSS engines)
			style: CSS style (for HTML/CSS engines)
			imageStyle: CSS style (for HTML/CSS engines) for the image only (for things like cards, or anything where the image is embedded inside something else)
			maskStyle: CSS style (for HTML/CSS engines) for the mask of the sprite only (for things like sprite in the classic web client)
			backImageStyle: CSS style (for HTML/CSS engines) for the back-image only (back of the cards)
			shader: for WebGL engines
*/
// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GEntity! E.g.: spellcast-ext-web-client/lib/GEntity.js
function GEntity( data , eventData ) {
	this.id = eventData.id = data.id || null ;	// immutable
	//this.roles = eventData.roles = data.roles || null ;	// immutable // eventData.roles cause circular error in JSON.stringify() and is not required by client ATM
	this.roles = data.roles || null ;	// immutable
	this.usage = eventData.usage = data.usage || 'sprite' ;	// immutable
	this.transient = eventData.transient = data.transient || undefined ;	// immutable
	this.parent = eventData.parent = data.parent || undefined ;	// immutable
	this.parentMode = eventData.parentMode = data.parentMode || undefined ;	// immutable
	this.destroyed = false ;		// true when destroyed (some references may still use them)

	this.show = false ;
	this.persistent = ! this.transient ;
	this.button = null ;
	this.theme = null ;
	this.texturePack = null ;
	this.variant = 'default' ;
	this.opacity = 1 ;
	this.location = null ;
	this.origin = new Vector3D( 0 , 0 , 0 ) ;
	this.position = new Vector3D( 0 , 0 , 0 ) ;
	this.positionMode = 'default' ;
	this.size = new Vector3D( 1 , 1 , 1 ) ;
	this.sizeMode = 'default' ;
	this.rotation = new Vector3D( 0 , 0 , 0 ) ;
	this.rotationMode = 'xyz' ;
	this.direction = new Vector3D( 1 , 0 , 0 ) ;
	this.facing = 0 ;
	this.billboard = null ;

	this.special = {} ;
	this.meta = {} ;
	this.engine = {} ;
	this.parametric = null ;	// Parametric animations

	this.update( data , eventData ) ;
}

module.exports = GEntity ;

GEntity.prototype.__prototypeUID__ = 'spellcast/GEntity' ;
GEntity.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// Should we destroy more things?
// In any cases, .roles should be kept, because we need to know to which client to send the 'clearGEntity' event.
GEntity.prototype.destroy = function() { this.destroyed = true ; } ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GEntity! E.g.: spellcast-ext-web-client/lib/GEntity.js
GEntity.prototype.update = function( data , eventData ) {
	if ( this.destroyed ) {
		log.error( "GEntity.update(): Attempt to update a destroyed GEntity" ) ;
		return ;
	}
	
	var key ;

	if ( data.show !== undefined ) { this.show = eventData.show = !! data.show ; }
	if ( data.persistent !== undefined ) { this.persistent = eventData.persistent = !! data.persistent ; }
	if ( data.button !== undefined ) { this.button = eventData.button = data.button || null ; }
	if ( data.theme !== undefined ) { this.theme = eventData.theme = data.theme || null ; }
	if ( data.texturePack !== undefined ) { this.texturePack = eventData.texturePack = data.texturePack || null ; }
	if ( data.variant !== undefined ) { this.variant = eventData.variant = data.variant || 'default' ; }

	if ( data.location !== undefined ) { this.location = eventData.location = data.location || null ; }
	if ( data.origin ) { eventData.origin = this.origin.setObject( data.origin ) ; }
	if ( data.position ) { eventData.position = this.position.setObject( data.position ) ; }
	if ( data.positionMode ) { this.positionMode = eventData.positionMode = data.positionMode || 'default' ; }
	if ( data.size ) { eventData.size = this.size.setObject( data.size ) ; }
	if ( data.sizeMode ) { this.sizeMode = eventData.sizeMode = data.sizeMode || 'default' ; }
	if ( data.rotation ) { eventData.rotation = this.rotation.setObject( data.rotation ) ; }
	if ( data.rotationMode ) { this.rotationMode = eventData.rotationMode = data.rotationMode || 'default' ; }
	if ( data.direction ) { eventData.direction = this.direction.setObject( data.direction ).unit() ; }

	if ( data.facing !== undefined ) {
		if ( typeof data.facing === 'string' ) { data.facing = FACING_DIR[ data.facing.toLowerCase() ] ; }
		this.facing = eventData.facing = + data.facing || 0 ;
	}

	if ( data.billboard !== undefined ) {
		if ( ! data.billboard ) { this.billboard = eventData.billboard = null ; }
		else if ( typeof data.billboard === 'string' ) { this.billboard = eventData.billboard = BILLBOARD_MODES[ data.billboard.toLowerCase() ] || undefined ; }
	}

	if ( typeof data.opacity === 'number' ) { this.opacity = eventData.opacity = data.opacity || 0 ; }

	if ( data.special && typeof data.special === 'object' ) {
		eventData.special = {} ;
		
		for ( key in data.special ) {
			if ( key === 'vgObject' ) {
				// usage=vg or sprite
				if ( data.special.vgObject instanceof svgKit.VG ) {
					this.special.vgObject = data.special.vgObject ;
					eventData.special.vgObject = data.special.vgObject.export() ;
					log.hdebug( "vgObject: %J" , eventData.special.vgObject ) ;
				}
			}
			else if ( key === 'vgMorph' ) {
				// usage=vg or sprite
				if ( data.special.vgMorph instanceof svgKit.VG ) {
					this.special.vgMorph = eventData.special.vgMorph = data.special.vgMorph.exportMorphLog() ;
					log.hdebug( "vgMorph: %J" , eventData.special.vgMorph ) ;
				}
			}
			else if ( key === 'vgUrl' ) {
				// usage=vg (or sprite?)
				if ( data.special.vgUrl && typeof data.special.vgUrl === 'string' ) {
					this.special.vgUrl = eventData.special.vgUrl = data.special.vgUrl ;
					log.hdebug( "vgUrl: %s" , eventData.special.vgUrl ) ;
				}
			}
			else if ( key === 'area' ) {
				// usage=vg
				eventData.special.area = data.special.area ;
				if ( ! this.special.area ) { this.special.area = {} ; }

				for ( let area in data.special.area ) {
					if ( ! this.special.area[ area ] ) { this.special.area[ area ] = {} ; }
					if ( ! this.special.area[ area ].meta ) { this.special.area[ area ].meta = {} ; }

					if ( data.special.area[ area ].hint !== undefined ) { this.special.area[ area ].hint = data.special.area[ area ].hint || null ; }
					if ( data.special.area[ area ].meta ) { Object.assign( this.special.area[ area ].meta , data.special.area[ area ].meta ) ; }
				}
			}
			else if ( key === 'inVg' ) {
				// usage=marker
				this.special.inVg = eventData.special.inVg = data.special.inVg ;
			}
			else {
				this.special[ key ] = eventData.special[ key ] = data.special[ key ] ;
			}
		}
	}
	
	if ( data.meta && typeof data.meta === 'object' ) {
		eventData.meta = data.meta ;
		Object.assign( this.meta , data.meta ) ;
	}

	if ( data.engine && typeof data.engine === 'object' ) {
		eventData.engine = data.engine ;
		Object.assign( this.engine , data.engine ) ;
	}

	if ( data.transition !== undefined ) {
		// Transition are not saved, they are only useful for the client, on update
		eventData.transition = new GTransition( data.transition ) ;
	}
	
	// Delay is not saved, it is only useful for the client
	if ( typeof data.delay === 'number' ) { eventData.delay = data.delay || 0 ; }
	
	if ( data.parametric !== undefined ) {
		if ( ! data.parametric ) {
			this.parametric = null ;
		}
		else if ( typeof data.parametric === 'object' ) {
			eventData.parametric = {} ;
			this.parametric = new Parametric( data.parametric , eventData.parametric ) ;
		}
	}

	log.hdebug( "GEntity update eventData: %[8l50000]Y" , eventData ) ;
} ;

