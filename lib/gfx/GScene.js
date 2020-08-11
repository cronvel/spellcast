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



const Camera = require( './Camera.js' ) ;



/*
	data:
		engineId: the ID of the engine that will render this GScene
		roles: the roles that see this GScene
		active: boolean, if false the GScene is hidden (default: false)
		paused: boolean, if true the GScene is paused: it doesn't render anymore (default: false)
		persistent: if the G-scene persists on scene changes (default: false)
		theme: the active texture theme (default: default)
		free: allow free camera move (default: false)
		globalCamera: a Camera instance, the camera used to render the scene, when relevant
		roleCameras: per-role Camera instances if a role as a camera, it will use it (for multiplayer)
		?trackingCamera: string or null, when set it is the name of the tracking mode (engine-specific)
		engine: object, engine-specific data, e.g.: global effect, shader, and so on...
	eventData: an object, will be populated with event data to send to the client
*/
// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GScene! E.g.: spellcast-ext-web-client/lib/GScene.js
function GScene( data , eventData ) {
	//Object.defineProperty( this , 'book' , { value: book } ) ;

	this.id = data.id ;		// immutable, MANDATORY because of scope context _gScene does not track its own ID
	this.engineId = eventData.engineId = data.engineId || 'default' ;	// immutable
	this.rightHanded = eventData.rightHanded = data.rightHanded !== undefined ? !! data.rightHanded : true ;	// immutable, not all engine suport this
	this.roles = data.roles ;

	this.destroyed = false ;
	this.active = eventData.active = false ;
	this.paused = eventData.paused = false ;
	this.persistent = eventData.persistent = false ;
	this.theme = eventData.theme = 'default' ;
	this.engine = {} ;
	this.texturePacks = {} ;
	this.gEntities = {} ;

	this.globalCamera = new Camera() ;	// Global camera, common to all roles who have no per-role camera
	this.roleCameras = {} ;		// Per-role camera, if a role as a camera, it will use it (for multiplayer, not implemented yet)

	this.update( data , eventData ) ;
}

module.exports = GScene ;

GScene.prototype.__prototypeUID__ = 'spellcast/GScene' ;
GScene.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// Should we destroy more things?
// In any cases, .roles should be kept, because we need to know to which client to send the 'clearGScene' event.
GScene.prototype.destroy = function() { this.destroyed = true ; } ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's GScene! E.g.: spellcast-ext-web-client/lib/GScene.js
GScene.prototype.update = function( data , eventData ) {
	if ( data.engine && typeof data.engine === 'object' ) {
		eventData.engine = data.engine ;
		Object.assign( this.engine , data.engine ) ;
	}

	if ( data.active !== undefined ) { this.active = eventData.active = !! data.active ; }
	if ( data.paused !== undefined ) { this.paused = eventData.paused = !! data.paused ; }
	if ( data.persistent !== undefined ) { this.persistent = eventData.persistent = !! data.persistent ; }
	//if ( data.roles !== undefined ) { this.roles = eventData.roles = data.roles ; }
	if ( data.theme !== undefined ) { this.theme = eventData.theme = data.theme || 'default' ; }

	if ( data.globalCamera !== undefined ) {
		this.globalCamera = eventData.globalCamera =
			data.globalCamera instanceof Camera ? data.globalCamera :
			data.globalCamera ? new Camera( data.globalCamera ) :
			null ;
	}
} ;

