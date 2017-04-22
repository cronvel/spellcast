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
var Tag = kungFig.Tag ;
var Ref = kungFig.Ref ;

var chatBot = require( '../../chatBot.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;
var scriptLog = require( 'logfella' ).userland.use( 'script' ) ;



function RequestTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof RequestTag ) ? this : Object.create( RequestTag.prototype ) ;
	
	var matches ;
	
	Tag.call( self , 'request' , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(?:(\$[^ ]+)|([^$ ]+))(?: *=> *(\$[^ ]+))?$/ ) ) )
	{
		throw new SyntaxError( "The 'request' tag's attribute should validate the request syntax." ) ;
	}
	
	Object.defineProperties( self , {
		interpreterRef: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , writable: true , enumerable: true } ,
		interpreterId: { value: matches[ 2 ] , writable: true , enumerable: true } ,
		replyRef: { value: matches[ 3 ] && Ref.parse( matches[ 3 ] ) , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = RequestTag ;
RequestTag.prototype = Object.create( Tag.prototype ) ;
RequestTag.prototype.constructor = RequestTag ;



RequestTag.prototype.run = function run( book , ctx , callback )
{
	var interpreterId , query , returnVal , output ,
		input = this.getRecursiveFinalContent( ctx.data ) ;
	
	interpreterId = this.interpreterId || this.interpreterRef.get( ctx.data , true ) ;
	
	if ( ! book.queryPatternTree[ interpreterId ] )
	{
		// Interpreter not found
		this.replyRef.set( ctx.data , undefined ) ;
		return null ;
	}
	
	if ( ctx.resume )
	{
		// /!\ Not supported ATM: need to store the query somewhere along the line
		log.error( "Warning: resuming Query/Request is not supported ATM" ) ;
	}
	
	//log.error( "Input: %I" , input ) ;
	
	// Get the query tag
	query = chatBot.query( book.queryPatternTree[ interpreterId ] , input ) ;
	
	if ( ! query )
	{
		this.replyRef.set( ctx.data , undefined ) ;
		return null ;
	}
	
	returnVal = query.tag.exec( book , query.data , ctx , ( error ) => {
		
		// Async variant...
		
		if ( error )
		{
			switch ( error.break )
			{
				case 'reply' :
					this.replyRef.set( ctx.data , error.reply ) ;
					callback() ;
					return ;
				default :
					//this.replyRef.set( ctx.data , undefined ) ;
					callback( error ) ;
					return ;
			}
		}
		
		// Ended without a reply...
		this.replyRef.set( ctx.data , undefined ) ;
		callback() ;
	} ) ;
	
	// When the return value is undefined, it means this is an async tag execution
	if ( returnVal === undefined ) { return ; }
	
	// Sync variant...
	
	if ( returnVal )
	{
		switch ( returnVal.break )
		{
			case 'reply' :
				this.replyRef.set( ctx.data , returnVal.reply ) ;
				return null ;
			default :
				//this.replyRef.set( ctx.data , undefined ) ;
				return returnVal ;
		}
	}
	
	// Ended without a reply...
	this.replyRef.set( ctx.data , undefined ) ;
	return null ;
} ;


