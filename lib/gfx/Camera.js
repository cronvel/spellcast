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



/*
	position: the 3D position of the camera
	targetPosition: the 3D point the camera is aiming at
	free: boolean, if set, the camera can be moved freely by the user
	trackingMode: string or null, when set it is the name of the tracking mode, an engine-specific feature
	perspective: null or number, when set it is the perspective distance, an engine-specific feature.
		E.g.: 'perspective' in the CSS Web renderer.
*/
// !CHANGE HERE MUST BE REFLECTED IN CLIENT's Camera! E.g.: spellcast-ext-web-client/lib/Camera.js
function Camera( data , eventData ) {
	this.destroyed = false ;

	this.position = new Vector3D( 0 , 0 , 10 ) ;
	this.targetPosition = new Vector3D( 0 , 0 , 0 ) ;
	this.free = false ;
	this.trackingMode = null ;
	this.perspective = 1 ;

	this.transitions = {
		transform: null   // transition position, target and perspective/parallax
	} ;

	if ( data && eventData ) { this.update( data , eventData ) ; }
}

module.exports = Camera ;

Camera.prototype.__prototypeUID__ = 'spellcast/Camera' ;
Camera.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



// Should we destroy more things?
// In any cases, .roles should be kept, because we need to know to which client to send the 'clearCamera' event.
Camera.prototype.destroy = function() { this.destroyed = true ; } ;



// !CHANGE HERE MUST BE REFLECTED IN CLIENT's Camera! E.g.: spellcast-ext-web-client/lib/Camera.js
Camera.prototype.update = function( data , eventData ) {
	if ( this.destroyed ) {
		log.error( "Camera.update(): Attempt to update a destroyed Camera" ) ;
		return ;
	}

	if ( data.position ) { eventData.position = this.position.setObject( data.position ) ; }
	if ( data.targetPosition ) { eventData.targetPosition = this.targetPosition.setObject( data.targetPosition ) ; }
	if ( data.free !== undefined ) { this.free = eventData.free = !! data.free ; }
	if ( data.trackingMode !== undefined ) { this.trackingMode = eventData.trackingMode = data.trackingMode || null ; }
	if ( data.perspective !== undefined ) { this.perspective = eventData.perspective = data.perspective || null ; }

	if ( data.transitions && typeof data.transitions === 'object' ) {
		eventData.transitions = {} ;
		for ( let key in data.transitions ) {
			if ( ! ( key in this.transitions ) ) { continue ; }

			if ( ! data.transitions[ key ] ) {
				this.transitions[ key ] = eventData.transitions[ key ] = null ;
			}
			else if ( this.transitions[ key ] ) {
				eventData.transitions[ key ] = this.transitions[ key ].update( data.transitions[ key ] ) ;
			}
			else {
				this.transitions[ key ] = eventData.transitions[ key ] = new GTransition( data.transitions[ key ] ) ;
			}
		}
	}
} ;

