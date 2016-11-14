/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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



// Cover [on] *AND* [once] tags

var kungFig = require( 'kung-fig' ) ;
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function OnTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof OnTag ) ? this : Object.create( OnTag.prototype ) ;
	
	var once , isGlobal ;
	
	switch ( tag )
	{
		case 'on' :
			once = false ;
			isGlobal = false ;
			break ;
			
		case 'once' :
			once = true ;
			isGlobal = false ;
			break ;
		
		case 'on-global' :
			once = false ;
			isGlobal = true ;
			break ;
		
		case 'once-global' :
			once = true ;
			isGlobal = true ;
			break ;
		
		default: 
			tag = 'on' ;
			once = false ;
			isGlobal = false ;
	}
	
	LabelTag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'on' tag's content should be a TagContainer." ) ;
	}
		
	Object.defineProperties( self , {
		event: { value: self.attributes , enumerable: true } ,
		once: { value: once , enumerable: true } ,
		isGlobal: { value: isGlobal , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = OnTag ;
OnTag.prototype = Object.create( LabelTag.prototype ) ;
OnTag.prototype.constructor = OnTag ;
//OnTag.proxyMode = 'inherit+links' ;



OnTag.prototype.run = function run( book , ctx )
{
	book.apiOn( this.event , this , ctx , {
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
	
	// Solve args BEFORE replacing $local! Since $args may use $local!
	ctx.data.args = {
		event: this.event ,
		data: options.data
	} ;
	
	ctx.data.local = {} ;
	
	returnVal = book.engine.run( this.content , book , ctx , function( error ) {
		
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


