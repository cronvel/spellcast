/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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



var kungFig = require( 'kung-fig' ) ;
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function OnTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof OnTag ) ? this : Object.create( OnTag.prototype ) ;
	
	LabelTag.call( self , 'on' , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'on' tag's content should be a TagContainer." ) ;
	}
		
	Object.defineProperties( self , {
		event: { value: self.attributes , enumerable: true } ,
		id: { value: undefined , writable: true , enumerable: true } ,
		once: { value: false , writable: true , enumerable: true } ,
		isGlobal: { value: false , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = OnTag ;
OnTag.prototype = Object.create( LabelTag.prototype ) ;
OnTag.prototype.constructor = OnTag ;



OnTag.prototype.init = function init( book , ctx )
{
	var tag ;
	
	tag = this.content.getFirstTag( 'id' ) ;
	this.id = tag && tag.content || 'on_' + this.uid ;
	
	tag = this.content.getFirstTag( 'global' ) ;
	this.isGlobal = !! ( tag && ( tag.content || tag.content === undefined ) ) ;
	
	tag = this.content.getFirstTag( 'once' ) ;
	this.once = !! ( tag && ( tag.content || tag.content === undefined ) ) ;
	
	return null ;
} ;



OnTag.prototype.run = function run( book , ctx )
{
	if ( ! this.isGlobal && ! ctx.activeScene )
	{
		log.error( 'Non-global listener defined outside a scene (%s)' , this.location ) ;
		return null ;
	}
	
	book.apiOn( this.event , this , ctx , {
		id: this.id ,
		scene: this.isGlobal ? null : ctx.activeScene ,
		once: this.once
	} ) ;
	
	return null ;
} ;



// “maybe async” exec
OnTag.prototype.exec = function exec( book , options , ctx , callback )
{
	var self = this , returnVal , ctxArgs , ctxLocal ;
	
	// backup context
	ctxArgs = ctx.data.args ;
	ctxLocal = ctx.data.local ;
	
	ctx.data.args = options.data ;
	ctx.data.local = {} ;
	
	returnVal = book.engine.run( this.content , book , ctx , null , function( error ) {
		
		// Async variant...
		
		// restore context
		ctx.data.args = ctxArgs ;
		ctx.data.local = ctxLocal ;
		
		callback( error ) ;
	} ) ;
	
	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }
	
	// Sync variant...
	
	// restore context
	ctx.data.args = ctxArgs ;
	ctx.data.local = ctxLocal ;
	
	return returnVal ;
} ;


