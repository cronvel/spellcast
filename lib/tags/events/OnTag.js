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
const Tag = kungFig.Tag ;
const Ref = kungFig.Ref ;
const TagContainer = kungFig.TagContainer ;

const Ngev = require( 'nextgen-events' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function OnTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof OnTag ) ? this : Object.create( OnTag.prototype ) ;

	var matches ;

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:<([a-zA-Z0-9.+-]+)> +)?(?:(\$[^ ]+) +)?([^ ]+)$/ ) ) ) {
		throw new SyntaxError( "The 'on' tag's attribute should validate the On syntax." ) ;
	}

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'on' tag's content should be a TagContainer." ) ;
	}
	
	var priority = matches[ 1 ] ;
	
	priority =
		! priority ? 0 :
		priority === 'low' ? -1 :
		priority === 'medium' ? 0 :
		priority === 'high' ? 1 :
		+ priority || 0 ;

	Object.defineProperties( self , {
		event: { value: matches[ 3 ] , enumerable: true } ,
		emitterRef: { value: matches[ 2 ] && Ref.parse( matches[ 2 ] ) , writable: true , enumerable: true } ,
		priority: { value: priority , writable: true , enumerable: true } ,
		id: { value: undefined , writable: true , enumerable: true } ,
		isGlobal: { value: false , writable: true , enumerable: true } ,
		isDefault: { value: false , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = OnTag ;
OnTag.prototype = Object.create( Tag.prototype ) ;
OnTag.prototype.constructor = OnTag ;



OnTag.prototype.init = function( book ) {
	var tag ;

	tag = this.content.getFirstTag( 'id' ) ;
	this.id = tag && tag.content || 'on_' + this.uid ;

	tag = this.content.getFirstTag( 'global' ) ;
	this.isGlobal = !! ( tag && ( tag.content || tag.content === undefined ) ) ;

	tag = this.content.getFirstTag( 'default' ) ;
	this.isDefault = !! ( tag && ( tag.content || tag.content === undefined ) ) ;

	return null ;
} ;



OnTag.prototype.run = function( book , ctx ) {
	var emitter , bus = null ;

	if ( this.emitterRef ) {
		emitter = this.emitterRef.get( ctx.data ) ;
		if ( emitter && typeof emitter === 'object' && ( emitter.events instanceof Ngev ) ) {
			bus = emitter.events ;
		}
	}

	ctx.onEventOnBus( bus , this.event , this ) ;

	return null ;
} ;



var count_ = 0 ;
// “maybe async” exec
OnTag.prototype.exec = function( book , options , ctx , callback ) {
	var returnVal , ctxArgs , ctxEvent , ctxLocal ;

	var count = count_ ++ ;
	//log.warning( "\t\t\t\tOn tag: exec %i" , count ) ;
	
	// backup context
	ctxArgs = ctx.data.args ;
	ctxEvent = ctx.data.event ;
	ctxLocal = ctx.data.local ;

	ctx.data.args = options.data ;
	ctx.data.event = options.$event ;
	ctx.data.local = {} ;

	returnVal = book.engine.run( this.content , book , ctx , null , ( error ) => {

		// Async variant...

		// restore context
		ctx.data.args = ctxArgs ;
		ctx.data.event = ctxEvent ;
		ctx.data.local = ctxLocal ;

		//log.warning( "\t\t\t\t^ROn tag: async cb %i" , count ) ;
		callback( error ) ;
	} ) ;

	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) {
		//log.warning( "\t\t\t\tOn tag: ......... waiting async cb %i" , count ) ;
		return ;
	}

	// Sync variant...

	// restore context
	ctx.data.args = ctxArgs ;
	ctx.data.event = ctxEvent ;
	ctx.data.local = ctxLocal ;
	//log.warning( "\t\t\t\t^ROn tag: sync return %i" , count ) ;

	return returnVal ;
} ;

