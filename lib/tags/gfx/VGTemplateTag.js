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

const VGTag = require( './VGTag.js' ) ;

const svgKit = require( 'svg-kit' ) ;
//const Ngev = require( 'nextgen-events' ) ;

const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;
const scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function VGTemplateTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof VGTemplateTag ) ? this : Object.create( VGTemplateTag.prototype ) ;
	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)|([^$ ]+)$/ ) ) ) {
		throw new SyntaxError( "The 'vg-template' tag's attribute should validate the vg-template syntax." ) ;
	}

	Object.defineProperties( self , {
		namespace: { value: '' , writable: true , enumerable: true } ,
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		attrTag: { value: null , writable: true , enumerable: true }
	} ) ;

	// A bit of optimization here: erase the run() method if there is no ref
	if ( ! self.ref ) { self.run = null ; }

	return self ;
}



module.exports = VGTemplateTag ;
VGTemplateTag.prototype = Object.create( Tag.prototype ) ;
VGTemplateTag.prototype.constructor = VGTemplateTag ;



VGTemplateTag.prototype.init = function( book ) {
	var groupTag = this.getParentTag() ;

	if ( groupTag && ( groupTag.name === 'chapter' || groupTag.name === 'system' ) ) {
		this.namespace = groupTag.id ;
	}

	if ( ! book.vgTemplates[ this.namespace ] ) { book.vgTemplates[ this.namespace ] = {} ; }
	book.vgTemplates[ this.namespace ][ this.id ] = this ;

	this.attrTag = this.content instanceof TagContainer ? this.content.getFirstTag( 'attr' ) : this ;

	return null ;
} ;



VGTemplateTag.prototype.run = function( book , ctx ) {
	if ( this.ref ) { this.ref.set( ctx.data , this ) ; }
	return null ;
} ;



VGTemplateTag.prototype.exec = function( book , args , ctx , callback ) {
	var lvar , vgObject , returnVal ;

	if ( this.id && ! book.staticData[ this.uid ] ) {
		book.staticData[ this.uid ] = {} ;
	}

	if ( ctx.resume ) {
		lvar = ctx.syncCodeStack[ ctx.syncCodeDepth ].lvar ;
	}
	else {
		// backup some context var
		lvar = {
			parentArgs: ctx.data.args ,
			parentLocal: ctx.data.local ,
			parentStatic: ctx.data.static ,
			parentVgContext: ctx.data._vgContext
		} ;

		// Solve args BEFORE replacing $local! Since $args may use $local!
		ctx.data.args = args ;
		ctx.data.local = ctx.data[''] = {} ;
		ctx.data.static = this.id ? book.staticData[ this.uid ] : null ;
		ctx.data._vgContext = vgObject = this.create( book , ctx ) ;
	}

	// “maybe async”
	returnVal = book.engine.run( this.content , book , ctx , lvar , ( error ) => {
		// Async variant...

		// restore context
		ctx.data.args = lvar.parentArgs ;
		ctx.data.local = ctx.data[''] = lvar.parentLocal ;
		ctx.data.static = lvar.parentStatic ;
		/*
		log.hdebug( "vgContext text: %s" , ctx.data._vgContext.renderText() ) ;
		log.hdebug( "vgContext JSON: %s" , JSON.stringify( ctx.data._vgContext ) ) ;
		log.hdebug( "vgContext JSON, then unserialized: %Y" , svgKit.unserializeVG( JSON.stringify( ctx.data._vgContext ) ) ) ;
		*/
		ctx.data._vgContext = lvar.parentVgContext ;

		callback( error || { 'break': 'return' , 'return': vgObject } ) ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }

	// Sync variant...

	// restore context
	ctx.data.args = lvar.parentArgs ;
	ctx.data.local = ctx.data[''] = lvar.parentLocal ;
	ctx.data.static = lvar.parentStatic ;
	/*
	log.hdebug( "vgContext text: %s" , ctx.data._vgContext.renderText() ) ;
	log.hdebug( "vgContext JSON: %s" , JSON.stringify( ctx.data._vgContext ) ) ;
	log.hdebug( "vgContext JSON, then unserialized: %Y" , svgKit.unserializeVG( JSON.stringify( ctx.data._vgContext ) ) ) ;
	*/
	ctx.data._vgContext = lvar.parentVgContext ;

	return returnVal || { 'break': 'return' , 'return': vgObject } ;
} ;



VGTemplateTag.prototype.create = function( book , ctx ) {
	var vgObject , attr ;

	if ( this.attrTag ) {
		attr = camel.inPlaceDashToCamelProps( this.attrTag.extractContent( ctx.data ) , true , undefined , undefined , VGTag.PROPERTY_ALIASES ) ;

		if ( VGTag.CONFIG.vg.defaultAttr ) {
			attr = Object.assign( {} , VGTag.CONFIG.vg.defaultAttr , attr ) ;
		}
	}
	else if ( VGTag.CONFIG.vg.defaultAttr ) {
		attr = VGTag.CONFIG.vg.defaultAttr ;
	}

	log.hdebug( "new vg-template instance ( %Y )" , attr ) ;
	vgObject = new svgKit.VG( attr ) ;

	return vgObject ;
} ;

