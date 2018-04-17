/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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



var Ngev = require( 'nextgen-events' ) ;
var async = require( 'async-kit' ) ;

var kungFig = require( 'kung-fig' ) ;
var Dynamic = kungFig.Dynamic ;
var LabelTag = kungFig.LabelTag ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function MessageTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof MessageTag ) ? this : Object.create( MessageTag.prototype ) ;

	if ( tag === 'm' ) { tag = 'message' ; }

	//if ( ! options ) { options = {} ; }
	//options.keyValueSeparator = ':' ;

	LabelTag.call( self , tag , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		model: { value: self.attributes || null , enumerable: true } ,
		random: { value: tag === 'fortune' , enumerable: true } ,
		important: { value: tag === 'important-message' , enumerable: true }
	} ) ;

	return self ;
}

module.exports = MessageTag ;
MessageTag.prototype = Object.create( LabelTag.prototype ) ;
MessageTag.prototype.constructor = MessageTag ;



MessageTag.prototype.run = function run( book , ctx , callback ) {
	var content = this.getRecursiveFinalContent( ctx.data ) ;

	var model = this.model && book.messageModels[ this.model ] &&
		book.messageModels[ this.model ].getRecursiveFinalContent( ctx.data ) ;

	if ( ! Array.isArray( content ) ) {
		this.sendMessage( book , ctx , content , model , callback ) ;
		return ;
	}

	if ( this.random ) {
		this.sendMessage(
			book , ctx ,
			content[ Math.floor( content.length * Math.random() ) ] ,
			model ,
			callback
		) ;

		return ;
	}


	// /!\ Remove async-kit! /!\
	async.foreach( content , ( message , foreachCallback ) => {
		this.sendMessage( book , ctx , message , model , foreachCallback ) ;
	} )
	.exec( callback ) ;
} ;



MessageTag.prototype.sendMessage = function sendMessage( book , ctx , message , model , callback ) {
	var text , options = null ;

	//message = Dynamic.getRecursiveFinalValue( message , ctx.data ) ;

	if ( message && typeof message === 'object' ) {
		options = message ;
		text = message.text ;
		delete message.text ;
	}
	else {
		text = message ;
	}

	if ( this.important ) {
		if ( ! options ) { options = {} ; }
		options.important = true ;
	}

	if ( typeof text !== 'string' ) {
		callback( new TypeError( '[message] tag text should be a string' ) ) ;
		return ;
	}

	if ( model ) {
		if ( ! options ) { options = model ; }
		else { options = Object.assign( {} , model , options ) ; }
	}

	// Apply few things locally
	if ( options ) {
		if ( options['text-style'] ) {
			if ( Array.isArray( options['text-style'] ) ) {
				text = options['text-style'].map( style => STYLE_TO_MARK[ style ] || '' ).join( '' ) + text ;
			}
			else {
				text = ( STYLE_TO_MARK[ options['text-style'] ] || '' ) + text ;
			}

			delete options['text-style'] ;
		}

		if ( options.before ) {
			text = options.before + text ;
			delete options.before ;
		}

		if ( options.after ) {
			text += options.after ;
			delete options.after ;
		}
	}

	//Ngev.groupEmit( ctx.roles , 'message' , text , options , callback ) ;
	book.sendMessageToAll( ctx , text , options , callback ) ;
} ;



const STYLE_TO_MARK = {
	red: '^r' ,
	green: '^g' ,
	blue: '^b' ,
	yellow: '^y' ,
	brown: '^y' ,
	cyan: '^c' ,
	mangenta: '^m' ,
	white: '^w' ,
	black: '^k' ,

	"bright-red": '^R' ,
	"bright-green": '^G' ,
	"bright-blue": '^B' ,
	"bright-yellow": '^Y' ,
	"bright-cyan": '^C' ,
	"bright-mangenta": '^M' ,
	"bright-white": '^W' ,
	grey: '^K' ,

	underline: '^_' ,
	italic: '^/' ,
	bold: '^+' ,
	dim: '^-' ,
	inverse: '^!'
} ;

