/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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



const kungFig = require( 'kung-fig' ) ;
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const svgKit = require( 'svg-kit' ) ;
//const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;
const toClassObject = require( '../../commonUtils.js' ).toClassObject ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



const aliasTags = {
	'vg-g': 'vg-group' ,
	'vg-rectangle': 'vg-rect' ,
	'vg-circle': 'vg-ellipse'
} ;

const containerTags = new Set( [ 'vg' , 'vg-group' ] ) ;



function VGTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof VGTag ) ? this : Object.create( VGTag.prototype ) ;
	var matches ;

	if ( aliasTags[ tag ] ) { tag = aliasTags[ tag ] ; }
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( self.attributes && ! ( matches = self.attributes.match( /^(\$[^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the vg-* syntax." ) ;
	}

	Object.defineProperties( self , {
		type: { value: tag , enumerable: true } ,
		isContainer: { value: containerTags.has( tag ) , enumerable: true } ,
		ref: { value: matches && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		//parentContainerTag: { value: null , writable: true , enumerable: true } ,
		attrTag: { value: null , writable: true , enumerable: true }
	} ) ;

	return self ;
}



module.exports = VGTag ;
VGTag.prototype = Object.create( Tag.prototype ) ;
VGTag.prototype.constructor = VGTag ;



VGTag.prototype.init = function( book ) {
	//this.parentContainerTag = this.findAncestorKV( 'isContainer' , true ) ;
	this.attrTag = this.content instanceof TagContainer ? this.content.getFirstTag( 'attr' ) : this ;
	return null ;
} ;



VGTag.prototype.run = function( book , ctx , callback ) {
	if ( ! ( this.content instanceof TagContainer ) || ! this.isContainer ) {
		this.create( book , ctx ) ;
		return null ;
	}
	
	// If it's a TagContainer, then run its content now
	
	var lvar , returnVal ;
	
	if ( ctx.resume ) {
		lvar = ctx.syncCodeStack[ ctx.syncCodeDepth ].lvar ;
	}
	else {
		// backup some context var
		lvar = { parentVgContext: ctx.data._vgContext } ;
		ctx.data._vgContext = this.create( book , ctx ) ;
	}

	// “maybe async”
	returnVal = book.engine.run( this.content , book , ctx , lvar , ( error ) => {
		// Async variant...
		// restore context
		/*
		log.hdebug( "vgContext text: %s" , ctx.data._vgContext.renderText() ) ;
		log.hdebug( "vgContext JSON: %s" , JSON.stringify( ctx.data._vgContext ) ) ;
		log.hdebug( "vgContext JSON, then unserialized: %Y" , svgKit.unserializeVG( JSON.stringify( ctx.data._vgContext ) ) ) ;
		*/
		ctx.data._vgContext = lvar.parentVgContext ;
		callback( error ) ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	// restore context
	/*
	log.hdebug( "vgContext text: %s" , ctx.data._vgContext.renderText() ) ;
	log.hdebug( "vgContext JSON: %s" , JSON.stringify( ctx.data._vgContext ) ) ;
	log.hdebug( "vgContext JSON, then unserialized: %Y" , svgKit.unserializeVG( JSON.stringify( ctx.data._vgContext ) ) ) ;
	*/
	ctx.data._vgContext = lvar.parentVgContext ;

	return returnVal ;
} ;



VGTag.prototype.create = function( book , ctx ) {
	var vgObject , attr ;
	
	if ( this.attrTag ) {
		//attr = camel.inPlaceDashToCamelProps( this.getRecursiveFinalContent( ctx.data ) , true ) ;
		attr = this.attrTag.getRecursiveFinalContent( ctx.data ) ;
	}

	switch ( this.type ) {
		case 'vg' :
			vgObject = new svgKit.VG( attr ) ;
			break ;
		case 'vg-rect' :
			vgObject = new svgKit.VGRect( attr ) ;
			break ;
		case 'vg-ellipse' :
			vgObject = new svgKit.VGEllipse( attr ) ;
			break ;
		case 'vg-path' :
			vgObject = new svgKit.VGPath( attr ) ;
			break ;
	}

	if ( this.ref ) {
		this.ref.set( ctx.data , vgObject ) ;
	}

	if ( ctx.data._vgContext ) {
		// If we are inside a VG Container, then append current element to it
		ctx.data._vgContext.items.push( vgObject ) ;
	}
	
	return vgObject ;
} ;

