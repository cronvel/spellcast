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



const GTransition = require( './GTransition.js' ) ;

const Vector3D = require( 'math-kit/lib/geometry/Vector3D.js' ) ;
const Quaternion = require( 'math-kit/lib/Quaternion.js' ) ;



/*
	position: the 3D position of the camera
	target: the 3D point the camera is aiming at
	free: boolean, if set, the camera can be moved freely by the user
	trackingMode: string or null, when set it is the name of the tracking mode, an engine-specific feature
	perspective: null or number, when set it is the perspective distance, an engine-specific feature.
		E.g.: 'perspective' in the CSS Web renderer.
*/
// !CHANGE HERE MUST BE REFLECTED IN CLIENT's Camera! E.g.: spellcast-ext-web-client/lib/Camera.js
function Camera( data , eventData ) {
	this.destroyed = false ;

	this.mode = 'firstPerson' ;
	this.position = new Vector3D( 0 , 0 , 10 ) ;
	this.target = new Vector3D( 0 , 0 , 0 ) ;
	this.rotation = new Quaternion( 0 , 0 , 0 , 1 ) ;	// rotation quaternion
	this.yaw = 0 ;		// yaw in degree, 0 means looking at world's "north" (+z for left-hand y-up)
	this.pitch = 0 ;	// pitch in degree, 0 means looking at the world's "horizon"
	this.roll = 0 ;		// roll in degree, 0 means camera "up" is aligned with world's "up" projection
	this.fov = 90 ;		// Field of view in degree
	this.perspective = 1 ;
	this.free = false ;
	this.trackingMode = null ;

	this.transitions = {
		transform: null   // transition position, target and perspective/parallax
	} ;

	if ( data && eventData ) { this.update( data , eventData ) ; }
}

module.exports = Camera ;

Camera.prototype.__prototypeUID__ = 'spellcast/Camera' ;
Camera.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// Camera modes and their primary properties
Camera.modes = {
	// Defined by a the position of the camera and the target
	positions: [ 'position' , 'target' , 'roll' ] ,

	// Defined by the camera position and its rotation in Euler angles
	firstPerson: [ 'position' , 'yaw' , 'pitch' , 'roll' ] ,

	// Same than 'firstPerson', but use the 'rotation' property which is a quaternion
	firstPersonQuaternion: [ 'position' , 'rotation' ] ,

	// Defined by the target position and a rotation around the target in Euler angles: the camera is orbiting around the target
	orbital: [ 'target' , 'yaw' , 'pitch' , 'roll' ] ,
	
	// Same than 'orbital', but use the 'rotation' property which is a quaternion
	orbitalQuaternion: [ 'target' , 'rotation' ]
}



Camera.modeAliases = {
	'first-person' : 'firstPerson' ,
	'1st-person' : 'firstPerson' ,
	'1stPerson' : 'firstPerson' ,
	'first-person-quaternion' : 'firstPersonQuaternion' ,
	'1st-person-quaternion' : 'firstPersonQuaternion' ,
	'1stPersonQuaternion' : 'firstPersonQuaternion' ,
	'third-person' : 'orbital' ,
	'thirdPerson' : 'orbital' ,
	'3rd-person' : 'orbital' ,
	'3rdPerson' : 'orbital' ,
	'orbital-quaternion' : 'orbitalQuaternion' ,
	'third-person-quaternion' : 'orbitalQuaternion' ,
	'thirdPersonQuaternion' : 'orbitalQuaternion' ,
	'3rd-person-quaternion' : 'orbitalQuaternion' ,
	'3rdPersonQuaternion' : 'orbitalQuaternion'
} ;



// Should we destroy more things?
// In any cases, .roles should be kept, because we need to know to which client to send the 'clearCamera' event.
Camera.prototype.destroy = function() { this.destroyed = true ; } ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's Camera! E.g.: spellcast-ext-web-client/lib/Camera.js
Camera.prototype.update = function( data , eventData ) {
	if ( this.destroyed ) {
		log.error( "Camera.update(): Attempt to update a destroyed Camera" ) ;
		return ;
	}

	if ( data.mode ) {
		if ( Camera.modes[ data.mode ] ) { eventData.mode = this.mode = data.mode ; }
		else if ( Camera.modeAliases[ data.mode ] ) { eventData.mode = this.mode = Camera.modeAliases[ data.mode ] ; }
	}
	
	if ( data.position ) { eventData.position = this.position.setObject( data.position ) ; }
	if ( data.target ) { eventData.target = this.target.setObject( data.target ) ; }
	if ( data.rotation ) { eventData.rotation = this.rotation.setObject( data.rotation ) ; }
	if ( data.yaw !== undefined ) { this.yaw = eventData.yaw = data.yaw || 0 ; }
	if ( data.pitch !== undefined ) { this.pitch = eventData.pitch = data.pitch || 0 ; }
	if ( data.roll !== undefined ) { this.roll = eventData.roll = data.roll || 0 ; }
	if ( data.fov !== undefined ) { this.fov = eventData.fov = data.fov || 90 ; }
	if ( data.perspective !== undefined ) { this.perspective = eventData.perspective = data.perspective || null ; }
	if ( data.free !== undefined ) { this.free = eventData.free = !! data.free ; }
	if ( data.trackingMode !== undefined ) { this.trackingMode = eventData.trackingMode = data.trackingMode || null ; }
	
	if ( data.transition !== undefined ) {
		// Transition are not saved, they are only useful for the client, on update
		eventData.transition = new GTransition( data.transition ) ;
	}
} ;

