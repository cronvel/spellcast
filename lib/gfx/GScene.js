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
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	Data:
		engineId: the ID of the engine that will render this Gscene
		engine: object, engine-specific data, e.g.: global effect, shader, and so on...
		show: boolean, if false the GScene is hidden
		persistent: if the G-scene persists on scene changes (default: no)
		roles: the roles that see this GScene
		theme: the active texture theme (default: default)
		camera: a Camera instance, the camera used to render the scene
*/
function GScene( book , data = {} ) {
	//this.id = data.id ;		// a unique id
	this.engineId = data.engineId ;

	this.engine = {} ;
	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}
	
	this.show = !! data.show ;
	this.persistent = !! data.persistent ;
	this.roles = data.roles ;
	this.theme = data.theme || 'default' ;
	this.texturePacks = [] ;
	this.gEntities = [] ;
	this.camera =
		data.camera instanceof Camera ? data.camera :
		data.camera ? new Camera( data.camera ) :
		null ;
}

module.exports = GScene ;

GScene.prototype.__prototypeUID__ = 'spellcast/GScene' ;
GScene.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

