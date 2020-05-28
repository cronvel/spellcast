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
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	Data:
		usage: the type of light, engine specific, e.g.:
			point: point light
			directional: ...
			spot: ...
		falloff: the falloff of the light, engine specific, may not make sense with some type of light, common values:
			linear: linear falloff
			square: inverse square of the distance
		position: Vector3D (x,y,z), the position of the GLight, depending on the engine and the usage, z may or may not be relevant
		rotation: TO BE DEFINED... quaternion? euler? anyone?
		transition: TO BE DEFINED... 
		animation: TO BE DEFINED... (the light move along a known pattern)
		engine: object, engine-specific data
*/
function GLight( book , data = {} ) {
	this.usage = data.usage || 'default' ;
	this.falloff = data.falloff || 'default' ;

	this.color = { r: 0.5 , g: 0.5 , b: 0.5 } ;
	if ( data.color && typeof data.color === 'object' ) {
		this.color.r = data.color.r || 0 ;
		this.color.g = data.color.g || 0 ;
		this.color.b = data.color.b || 0 ;
	}

	this.position = data.position ? Vector3D.fromObject( data.position ) : new Vector3D( 0 , 0 , 0 ) ;
	//this.rotation = TO BE DEFINED....
	//this.transition =  TO BE DEFINED...
	//this.animation =  TO BE DEFINED...

	this.engine = {} ;
	if ( data.engine && typeof data.engine === 'object' ) {
		Object.assign( this.engine , data.engine ) ;
	}
}

module.exports = GLight ;

GLight.prototype.__prototypeUID__ = 'spellcast/GLight' ;
GLight.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

