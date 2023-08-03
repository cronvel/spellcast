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



const kungFig = require( 'kung-fig' ) ;
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;
const TagContainer = kungFig.TagContainer ;

const CallTag = require( '../flow/CallTag.js' ) ;

const svgKit = require( 'svg-kit' ) ;
//const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;
const toClassObject = require( '../../commonUtils.js' ).toClassObject ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function VGInstance( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof VGInstance ) ? this : Object.create( VGInstance.prototype ) ;
	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))(?: *=> *(\$[^ ]+))$/ ) ) ) {
		throw new SyntaxError( "The 'vg-instance' tag's attribute should validate the vg-instance syntax." ) ;
	}

	Object.defineProperties( self , {
		defaultNamespace: { value: '' , writable: true , enumerable: true } ,
		vgTemplateRef: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		vgTemplateNsId: { value: matches[ 2 ] , writable: true , enumerable: true } ,
		returnRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;

	return self ;
}



module.exports = VGInstance ;
VGInstance.prototype = Object.create( Tag.prototype ) ;
VGInstance.prototype.constructor = VGInstance ;



VGInstance.prototype.init = function( book ) {
	var tmp , parentTag = this ;

	while ( ( parentTag = parentTag.getParentTag() ) ) {
		if ( parentTag.name === 'chapter' || parentTag.name === 'system' ) {
			this.defaultNamespace = parentTag.id ;
		}
	}

	if ( ! this.vgTemplateNsId ) { return null ; }

	// /!\ There is gotcha with init and multiple book based on the same script:
	// init patch the cached script, but cached script are init again...
	// So it should be somewhat idem-potent, until a more reliable script caching is done...
	if ( ! Array.isArray( this.vgTemplateNsId ) ) { this.vgTemplateNsId = CallTag.splitNsId( this.vgTemplateNsId ) ; }

	return null ;
} ;



VGInstance.prototype.run = function( book , ctx , callback ) {
	var vgTemplate , returnVal , args ;

	if ( this.vgTemplateRef ) {
		vgTemplate = this.vgTemplateRef.get( ctx.data , true ) ;
		if ( typeof vgTemplate === 'string' ) { vgTemplate = CallTag.splitNsId( vgTemplate ) ; }
	}
	else {
		vgTemplate = this.vgTemplateNsId ;
	}

	if ( Array.isArray( vgTemplate ) ) {
		if ( vgTemplate[ 0 ] ) {
			vgTemplate = ( book.vgTemplates[ vgTemplate[ 0 ] ] && book.vgTemplates[ vgTemplate[ 0 ] ][ vgTemplate[ 1 ] ] ) || null ;
		}
		else {
			vgTemplate = ( book.vgTemplates[ this.defaultNamespace ] && book.vgTemplates[ this.defaultNamespace ][ vgTemplate[ 1 ] ] ) ||
				( book.vgTemplates[ '' ] && book.vgTemplates[ '' ][ vgTemplate[ 1 ] ] ) ||
				null ;
		}
	}

	// If we are resuming, we don't solve args, it has been done already
	args = ctx.resume ? undefined : this.extractContent( ctx.data ) ;

	// VGTemplateTag#exec() is “maybe async”
	returnVal = vgTemplate.exec( book , args , ctx , ( error ) => {

		if ( error ) {
			switch ( error.break ) {
				case 'return' :
					if ( this.returnRef ) { this.returnRef.set( ctx.data , error.return ) ; }
					callback() ;
					return ;
				default :
					callback( error ) ;
					return ;
			}
		}

		if ( this.returnRef ) { this.returnRef.set( ctx.data , undefined ) ; }
		callback() ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	// Truthy value: an error or an interruption had happened
	if ( returnVal ) {
		switch ( returnVal.break ) {
			case 'return' :
				if ( this.returnRef ) { this.returnRef.set( ctx.data , returnVal.return ) ; }
				return null ;
			default :
				return returnVal ;
		}
	}

	if ( this.returnRef ) { this.returnRef.set( ctx.data , undefined ) ; }
	return null ;
} ;

