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
var Ref = kungFig.Ref ;
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var Ngev = require( 'nextgen-events' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



var tagOptions = {
	'show-sprite': { type: 'sprite' , action: 'show' } ,
	'update-sprite': { type: 'sprite', action: 'update' } ,
	'animate-sprite': { type: 'sprite', action: 'animate' } ,
	'clear-sprite': { type: 'sprite', action: 'clear' } ,
	'show-ui': { type: 'ui', action: 'show' } ,
	'update-ui': { type: 'ui', action: 'update' } ,
	'animate-ui': { type: 'ui', action: 'animate' } ,
	'clear-ui': { type: 'ui', action: 'clear' } ,
	'show-marker': { type: 'marker', action: 'show' } ,
	'update-marker': { type: 'marker', action: 'update' } ,
	'animate-marker': { type: 'marker', action: 'animate' } ,
	'clear-marker': { type: 'marker', action: 'clear' }
} ;



function UiTag( tag , attributes , content , shouldParse , options )
{
	var self = ( this instanceof UiTag ) ? this : Object.create( UiTag.prototype ) ;
	
	var matches , action , type , eventName ;
	
	if ( ! tagOptions[ tag ] ) { throw new Error( 'Unknown tag: ' + tag ) ; }
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	if ( ! self.attributes || ! ( matches = self.attributes.match( /^(\$[^ ]+)|([^$ ]+)$/ ) ) )
	{
		throw new SyntaxError( "The '" + tag + "' tag's attribute should validate the *-sprite syntax." ) ;
	}
	
	type = tagOptions[ tag ].type ;
	action = tagOptions[ tag ].action ;
	eventName = action + type[ 0 ].toUpperCase() + type.slice( 1 ) ;
	
	Object.defineProperties( self , {
		id: { value: matches[ 2 ] , enumerable: true } ,
		ref: { value: matches[ 1 ] && Ref.parse( matches[ 1 ] ) , enumerable: true } ,
		type: { value: type , enumerable: true } ,
		action: { value: action , enumerable: true } ,
		eventName: { value: eventName , enumerable: true }
	} ) ;
	
	return self ;
}



module.exports = UiTag ;
UiTag.prototype = Object.create( Tag.prototype ) ;
UiTag.prototype.constructor = UiTag ;



UiTag.prototype.run = function run( book , ctx )
{
	var id , data , store ;
	
	id = this.id !== undefined ? this.id : this.ref.get( ctx.data ) ;
	store = ctx[ this.type + 's' ] ;
	
	if ( this.action !== 'clear' )
	{
		data = this.getRecursiveFinalContent( ctx.data ) ;
		
		if ( this.action !== 'animate' )
		{
			if ( data && typeof data === 'string' ) { data = { url: data } ; }
				
			if ( typeof data.url !== 'string' && ( this.action === 'show' || data.url ) )
			{
				return new TypeError( '[sprite/ui/marker] tag: bad URL.' ) ;
			}
		}
	}
	
	switch ( this.action )
	{
		case 'show' :
			delete store[ this.id ] ;
			// Fall-through
		case 'update' :
			break ;
		case 'clear' :
			delete store[ this.id ] ;
			break ;
		case 'animate' :
			break ;
	}
	
	Ngev.groupEmit( ctx.roles , this.eventName , id , data ) ;
	return null ;
} ;


