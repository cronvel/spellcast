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



const Promise = require( 'seventh' ) ;

const camel = require( '../../camel.js' ) ;
const kungFig = require( 'kung-fig' ) ;
const Ref = kungFig.Ref ;
const Tag = kungFig.Tag ;

const Entity = require( '../../objects/Entity.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function MessageTag( tag , attributes , content , shouldParse , options ) {
	var self = ( this instanceof MessageTag ) ? this : Object.create( MessageTag.prototype ) ;
	var matches , ref_ , model , await_ ;

	if ( tag === 'm' ) { tag = 'message' ; }

	Tag.call( self , tag , attributes , content , shouldParse ) ;

	if ( self.attributes ) {
		if ( ! ( matches = self.attributes.match( /^(?:(await)|(\$[^ ]+)|([^$ ]+))( +await)?$/ ) ) ) {
            throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the message syntax." ) ;
        }

		ref_ = matches[ 2 ] ;
		model = matches[ 3 ] ;
		await_ = !! ( matches[ 1 ] || matches[ 4 ] ) ;
	}

	Object.defineProperties( self , {
		model: { value: model , enumerable: true } ,
		ref: { value: ref_ && Ref.parse( ref_ ) , enumerable: true } ,
		await: { value: await_ , enumerable: true } ,
		random: { value: tag === 'fortune' , enumerable: true } ,
		important: { value: tag === 'important-message' , enumerable: true } ,
		isSpeech: { value: tag === 'speech' , enumerable: true }
	} ) ;

	return self ;
}

module.exports = MessageTag ;
MessageTag.prototype = Object.create( Tag.prototype ) ;
MessageTag.prototype.constructor = MessageTag ;



MessageTag.prototype.run = function( book , ctx , callback ) {
	var model ,
		content = this.extractContent( ctx.data ) ;

	if ( this.model ) {
		model = this.model && book.messageModels[ this.model ] ;

		if ( model && ( model.entity instanceof Entity ) ) {
			model = Object.assign( {} , model.entity.getUiData() , model ) ;
			delete model.entity ;
		}
	}
	else if ( this.ref ) {
		model = this.ref.get( ctx.data ) ;

		if ( ! model || typeof model !== 'object' ) {
			model = null ;
		}
		else if ( model instanceof Entity ) {
			model = model.getUiData() ;
		}
	}

	//log.error( 'model: %I' , model ) ;

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

	Promise.forEach( content , message =>
		new Promise( ( resolve , reject ) => {
			this.sendMessage( book , ctx , message , model , error => {
				if ( error ) { reject( error ) ; }
				else { resolve() ; }
			} ) ;
		} )
	).callback( callback ) ;
} ;



MessageTag.prototype.sendMessage = function( book , ctx , message , model , callback ) {
	var text , options = null ;

	// Manage arguments
	if ( message && typeof message === 'object' ) {
		options = message ;
		camel.inPlaceDashToCamelProps( options , true ) ;
		text = message.text ;
		delete message.text ;
	}
	else {
		text = message ;
		options = {} ;
	}

	if ( typeof text !== 'string' ) {
		callback( new TypeError( '[message] tag text should be a string' ) ) ;
		return ;
	}

	if ( model ) { options = Object.assign( {} , model , options ) ; }

	if ( this.important ) { options.important = true ; }

	if ( this.isSpeech ) { options.speech = true ; }
	else { delete options.speechOnly ; }

	if ( ! options.type ) { options.type = 'log' ; }
	
	if ( options.before ) {
		text = options.before + text ;
		delete options.before ;
	}

	if ( options.after ) {
		text += options.after ;
		delete options.after ;
	}

	if ( this.await ) {
		book.sendMessageToAll( ctx , text , options , callback ) ;
	}
	else {
		book.sendMessageToAll( ctx , text , options ) ;
		callback() ;
	}
} ;

