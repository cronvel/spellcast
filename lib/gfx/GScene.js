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
		engineId: the ID of the engine that will render this Gscene
		engine: object, engine-specific data, e.g.: global effect, shader, and so on...
		active: boolean, if false the GScene is hidden
		paused: boolean, if true the GScene is paused: it doesn't render anymore
		persistent: if the G-scene persists on scene changes (default: no)
		roles: the roles that see this GScene
		theme: the active texture theme (default: default)
		camera: a Camera instance, the camera used to render the scene, when relevant
		freeCamera: allow free camera move (default: false)
		trackingCamera: string or null, when set it is the name of the tracking mode (engine-specific)
	eventData: an object, will be populated with event data to send to the client
*/
function GScene( book , data , eventData ) {
	Object.defineProperty( this , 'book' , { value: book } ) ;

	this.id = data.id || null ;		// if set, it's a unique ID for the scene
	this.engineId = eventData.engineId = data.engineId ;
	this.roles = eventData.roles = data.roles ;

	this.engine = {} ;
	this.active = eventData.active = false ;
	this.paused = eventData.paused = false ;
	this.persistent = eventData.persistent = false ;
	this.theme = eventData.theme = 'default' ;
	this.texturePacks = [] ;
	this.gEntities = [] ;
	this.camera = null ;
	
	this.set( data , eventData ) ;
}

module.exports = GScene ;

GScene.prototype.__prototypeUID__ = 'spellcast/GScene' ;
GScene.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Gscene.prototype.update = function( data , eventData ) {
	if ( data.engine && typeof data.engine === 'object' ) {
		eventData.engine = data.engine ;
		Object.assign( this.engine , data.engine ) ;
	}

	if ( data.active !== undefined ) { this.active = eventData.active = !! data.active ; }
	if ( data.paused !== undefined ) { this.paused = eventData.paused = !! data.paused ; }
	if ( data.persistent !== undefined ) { this.persistent = eventData.persistent = !! data.persistent ; }
	//if ( data.roles !== undefined ) { this.roles = eventData.roles = data.roles ; }
	if ( data.theme !== undefined ) { this.theme = eventData.theme = data.theme || 'default' ; }
	if ( data.camera !== undefined ) {
		this.camera = eventData.camera =
			data.camera instanceof Camera ? data.camera :
			data.camera ? new Camera( data.camera ) :
			null ;
	}
} ;

