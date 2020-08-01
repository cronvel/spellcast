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
	position: the 3D position of the camera
	targetPosition: the 3D point the camera is aiming at
	free: boolean, if set, the camera can be moved freely by the user
	trackingMode: string or null, when set it is the name of the tracking mode, an engine-specific feature
	perspective: null or number, when set it is the perspective distance, an engine-specific feature.
		E.g.: 'perspective' in the CSS Web renderer.
*/
function Camera( data = {} ) {
	this.position = data.position ? Vector3D.fromObject( data.position ) : new Vector3D( 0 , -10 , 10 ) ;
	this.targetPosition = data.targetPosition ? Vector3D.fromObject( data.target ) : new Vector3D( 0 , 0 , 0 ) ;
	this.free = !! data.free ;
	this.trackingMode = data.trackingMode || null ;
	this.perspective = data.perspective || null ;
}

module.exports = Camera ;

Camera.prototype.__prototypeUID__ = 'spellcast/Camera' ;
Camera.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

