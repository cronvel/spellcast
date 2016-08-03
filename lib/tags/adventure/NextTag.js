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



var Ngev = require( 'nextgen-events' ) ;
var kungFig = require( 'kung-fig' ) ;
var LabelTag = kungFig.LabelTag ;
var TagContainer = kungFig.TagContainer ;

//var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function NextTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof NextTag ) ? this : Object.create( NextTag.prototype ) ;
	
	if ( ! content ) { content = new TagContainer( undefined , self ) ; }
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'next' tag's content should be a TagContainer." ) ;
	}
	
	LabelTag.call( self , 'next' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! self.attributes )
	{
		throw new SyntaxError( "The 'next' tag's target id should be non-empty string." ) ;
	}
	
	Object.defineProperties( self , {
		target: { value: self.attributes , writable: true , enumerable: true } ,
		label: { value: null , writable: true , enumerable: true } ,
		voteStyle: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = NextTag ;
NextTag.prototype = Object.create( LabelTag.prototype ) ;
NextTag.prototype.constructor = NextTag ;
//NextTag.proxyMode = 'parent' ;



NextTag.prototype.init = function init( book , callback )
{
	var label = this.content.getFirstTag( 'label' ) ;
	
	// Do not use label.getFinalContent()! it should not be resolved at init step!
	this.label = ( label && label.content ) || null ;
	
	var voteStyle = this.content.getFirstTag( 'vote-style' ) ;
	this.voteStyle = ( voteStyle && voteStyle.content ) || null ;
	
	this.onTrigger = this.content.getFirstTag( 'on-trigger' ) ;
	callback() ;
} ;



NextTag.prototype.run = function run( book , execContext , callback )
{
	execContext.nexts.push( this ) ;
	callback() ;
} ;



NextTag.prototype.exec = function exec( book , options , execContext , callback )
{
	var self = this ;
	
	Ngev.groupEmit(
		execContext.roles ,
		'nextTriggered' ,
		execContext.nexts.indexOf( this ) ,
		execContext.nextTriggeringRoles && execContext.nextTriggeringRoles.map( e => book.roles.indexOf( e ) )
	) ;
	
	this.execOnTrigger( book , options , execContext , function( error ) {
		if ( error ) { callback( error ) ; return ; }
		
		execContext.nexts = [] ;
		
		var nextScene = execContext.activeScene.getScene( book , self.target ) ;
		
		if ( ! nextScene ) { callback( new Error( 'Cannot find next scene: ' + self.target ) ) ; return ; }
		
		nextScene.exec( book , options , execContext , callback ) ;
	} ) ;
} ;



NextTag.prototype.execOnTrigger = function execOnTrigger( book , options , execContext , callback )
{
	if ( ! this.onTrigger || ! ( this.onTrigger.content instanceof TagContainer ) ) { callback() ; return ; }
	book.run( this.onTrigger.content , execContext , callback ) ;
} ;



NextTag.selectNextScene = function selectNextScene( book , options , execContext , callback )
{
	var first = true , selectTriggered = false ;
	
	var select = function select( next , voters ) {
		if ( selectTriggered ) { return ; }
		selectTriggered = true ;
		
		execContext.nextTriggeringRoles = voters ;
		
		// Reset next selection
		execContext.roles.forEach( e => e.nextSelected = null ) ;
		
		Ngev.groupOff( execContext.roles , 'selectNext' , onSelectNext ) ;
		callback( next ) ;
	} ;
	
	var update = function update() {
		
		Ngev.groupEmit(
			execContext.roles ,
			'nextList' ,
			execContext.nexts.map( next => {
				return {
					//target: next.target ,
					label: next.label && next.label.__isDynamic__ ? next.label.getFinalValue() : next.label ,
					roleIndexes: execContext.roles.filter( role => role.nextSelected === next ).map( role => book.roles.indexOf( role ) )
				} ;
			} ) ,
			! first
		) ;
		
		first = false ;
	} ;
	
	var onSelectNext = function onSelectNext( role , nextIndex ) {
		
		if ( nextIndex === null )
		{
			role.nextSelected = null ;
			update() ;
			return ;
		}
		
		var next = execContext.nexts[ nextIndex ] ;
		if ( ! next ) { return ; }
		
		role.nextSelected = next ;
		
		update() ;
		
		var voteStyle = ( next.voteStyle && next.voteStyle.__isDynamic__ ? next.voteStyle.getFinalValue() : next.voteStyle ) ;
			// || ( execContext.activeScene.voteStyle && execContext.activeScene.voteStyle.__isDynamic__ ?
			// execContext.activeScene.voteStyle.getFinalValue() : execContext.activeScene.voteStyle )
		
		var voters = execContext.roles.filter( e => e.nextSelected === next ) ;
		
		if ( ! voteStyle )
		{
			if ( execContext.roles.length <= 1 ) { voteStyle = 'immediate' ; }
			else if ( execContext.nexts.length >= 2 ) { voteStyle = 'absolute' ; }
			else { voteStyle = 'absolute' ; }
		}
		
		switch ( voteStyle )
		{
			case 'absolute' :
				if ( voters.length >= Math.round( ( execContext.roles.length + 1 ) / 2 ) )
				{
					select( next , voters ) ;
				}
				break ;
			case 'immediate' :	// jshint ignore:line
			default :
				select( next , voters ) ;
				break ;
		}
		
	} ;
	
	Ngev.groupOn( execContext.roles , 'selectNext' , onSelectNext ) ;
	
	update() ;
} ;


