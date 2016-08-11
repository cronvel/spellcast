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
var Tag = kungFig.Tag ;
var TagContainer = kungFig.TagContainer ;

var ExecContext = require( '../../AdventureExecContext.js' ) ;

var async = require( 'async-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SplitTag( tag , attributes , content , proxy , shouldParse )
{
	var self = ( this instanceof SplitTag ) ? this : Object.create( SplitTag.prototype ) ;
	
	Tag.call( self , 'split' , attributes , content , proxy , shouldParse ) ;
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'split' tag's content should be a TagContainer." ) ;
	}
	
	Object.defineProperties( self , {
		subscenes: { value: null , writable: true , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = SplitTag ;
SplitTag.prototype = Object.create( Tag.prototype ) ;
SplitTag.prototype.constructor = SplitTag ;
//SplitTag.proxyMode = 'parent' ; // inherit+links will be used in each divergence



SplitTag.prototype.init = function init( book , callback )
{
	this.subscenes = this.content.getTags( 'subscene' ) ;
	callback() ;
} ;



SplitTag.prototype.run = function run( book , execContext , callback )
{
	var self = this , rolesUsed = [] , count = 0 ;
	
	book.init( this.content , function( error ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		Ngev.groupEmit( execContext.roles , 'split' ) ;
		
		async.foreach( self.subscenes , function( subsceneTag , foreachCallback ) {
			
			if ( ! subsceneTag.roles ) { foreachCallback() ; return ; }
			
			var roles = subsceneTag.roles.getFinalContent() ;
			
			if ( ! Array.isArray( roles ) ) { foreachCallback() ; return ; }
			
			// A role cannot be used twice
			roles = execContext.roles.filter( e => roles.indexOf( e.id ) !== -1 && rolesUsed.indexOf( e ) === -1 ) ;
			rolesUsed = rolesUsed.concat( roles ) ;
			//console.log( 'roles: ' , roles ) ;
			
			var subsceneExecContext = ExecContext.create( book , {
				parent: execContext ,
				nexts: execContext.nexts.slice() ,
				roles: roles ,
				sceneConfig: execContext.sceneConfig ,
				sceneStack: execContext.sceneStack.slice()
			} ) ;
			
			//console.log( "subsceneExecContext:" , subsceneExecContext ) ;
			
			// TURN THE PARENT CONTEXT OFF!
			execContext.active = false ;
			
			count ++ ;
			
			subsceneTag.run( book , subsceneExecContext , function( error ) {
				count -- ;
				subsceneExecContext.active = false ;
				if ( error ) { foreachCallback( error ) ; return ; }
				
				if ( count )
				{
					Ngev.groupEmit( subsceneExecContext.roles , 'wait' , 'otherBranches' ) ;
				}
				
				foreachCallback() ;
			} ) ;
		} )
		.parallel()
		.exec( function( error ) {
			// TURN THE PARENT CONTEXT ON AGAIN!
			execContext.active = true ;
			
			if ( error ) { callback( error ) ; return ; }
			
			Ngev.groupEmit( execContext.roles , 'rejoin' ) ;
			
			// People rejoin from different scenes, hence, no configuration can be held at all
			execContext.activeScene.configure( book , execContext , true ) ;
			
			callback() ;
		} ) ;
	} ) ;
} ;


