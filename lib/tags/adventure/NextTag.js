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
		auto: { value: null , writable: true , enumerable: true } ,
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
	
	var auto = this.content.getFirstTag( 'auto' ) ;
	this.auto = auto && auto.content ;
	
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
		execContext.nextTriggeringRoles && execContext.nextTriggeringRoles.map( e => e.id ) ,
		execContext.nextTriggeringSpecial
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
	var firstUpdate = true , firstVote = true , selectTriggered = false ,
		timer = null , timedOut = false , startTime , timeoutTime ,
		autoTimer = null , autoTime = Infinity , autoNext ;
	
	var voteTime =
		1000 * ( execContext.activeScene.voteTime && execContext.activeScene.voteTime.__isDynamic__ ?
			execContext.activeScene.voteTime.getFinalValue() :
			execContext.activeScene.voteTime ) || 
		Infinity ;
	
	var hurryTime =
		1000 * ( execContext.activeScene.hurryTime && execContext.activeScene.hurryTime.__isDynamic__ ?
			execContext.activeScene.hurryTime.getFinalValue() :
			execContext.activeScene.hurryTime ) || 
		15000 ;
	
	var showTimer =
		( execContext.activeScene.showTimer && execContext.activeScene.showTimer.__isDynamic__ ?
			execContext.activeScene.showTimer.getFinalValue() :
			execContext.activeScene.showTimer ) !== false ;
	
	execContext.nexts.forEach( e => {
		var t = e.auto && e.auto.__isDynamic__ ? e.auto.getFinalValue() : e.auto ;
		
		if ( t === false ) { return ; }
		if ( typeof t !== 'number' ) { t = voteTime + 5000 ; }
		else { t *= 1000 ; }
		
		if ( t < autoTime )
		{
			autoTime = t ;
			autoNext = e ;
		}
	} ) ;
	
	if ( autoNext )
	{
		//console.log( '\n\n>>> HAS AUTO! <<<\n\n' ) ;
		
		autoTimer = setTimeout( function() {
			//console.log( '\n\n>>> AUTO! <<<\n\n' ) ;
			select( autoNext , [] , 'auto' ) ;
		} , autoTime ) ;
	}
	
	//console.log( "Vote time:" , voteTime ) ;
	
	var select = function select( next , voters , special ) {
		if ( selectTriggered ) { return ; }
		selectTriggered = true ;
		
		execContext.nextTriggeringRoles = voters ;
		execContext.nextTriggeringSpecial = special || null ;
		
		// Reset next selection
		execContext.roles.forEach( e => e.nextSelected = null ) ;
		
		// Unbind everything
		if ( timer !== null ) { clearTimeout( timer ) ; timer = null ; }
		if ( autoTimer !== null ) { clearTimeout( autoTimer ) ; autoTimer = null ; }
		Ngev.groupOff( execContext.roles , 'selectNext' , onSelectNext ) ;
		
		callback( next ) ;
	} ;
	
	var onTimeout = function onTimeout() {
		//console.log( 'Time out!' ) ;
		var checkVotes , next ;
		
		timedOut = true ;
		
		// On timeout, all nexts should be checked again
		// The first passing the test is used
		next = execContext.nexts.find( e => checkVotes = NextTag.checkOneNext( execContext , e , timedOut ) ) ;
		
		if ( checkVotes ) { select( next , checkVotes ) ; }
	} ;
	
	var resetTimeout = function resetTimeout( time )
	{
		if ( timer !== null ) { clearTimeout( timer ) ; timer = null ; }
		
		startTime = Date.now() ;
		timeoutTime = startTime + time ;
		
		if ( time < Infinity ) { timer = setTimeout( onTimeout , time ) ; }
	} ;
	
	var shrinkTimeout = function shrinkTimeout( time )
	{
		if ( Date.now() + time < timeoutTime ) { resetTimeout( time ) ; }
	} ;
	
	var update = function update() {
		
		Ngev.groupEmit(
			execContext.roles ,
			'nextList' ,
			execContext.nexts.map( next => {
				return {
					//target: next.target ,
					label: next.label && next.label.__isDynamic__ ? next.label.getFinalValue() : next.label ,
					roleIds: execContext.roles.filter( role => role.nextSelected === next ).map( role => role.id )
				} ;
			} ) ,
			execContext.roles.filter( e => ! e.nextSelected ).map( e => e.id ) ,
			showTimer && timeoutTime < Infinity ? timeoutTime - Date.now() : null ,
			! firstUpdate
		) ;
		
		firstUpdate = false ;
	} ;
	
	var onSelectNext = function onSelectNext( role , nextIndex ) {
		
		if ( nextIndex === null )
		{
			role.nextSelected = null ;
			update() ;
			return ;
		}
		
		if ( firstVote && hurryTime < Infinity ) { shrinkTimeout( hurryTime ) ; }
		
		firstVote = false ;
		
		var next = execContext.nexts[ nextIndex ] ;
		if ( ! next ) { return ; }
		
		role.nextSelected = next ;
		
		update() ;
		
		var checkVotes = NextTag.checkOneNext( execContext , next , timedOut ) ;
		
		if ( checkVotes ) { select( next , checkVotes ) ; }
	} ;
	
	Ngev.groupOn( execContext.roles , 'selectNext' , onSelectNext ) ;
	resetTimeout( voteTime ) ;
	
	update() ;
} ;



NextTag.checkOneNext = function checkOneNext( execContext , next , timedOut )
{
	var max = 0 ,
		votesNotCasted ,
		votesCasted = 0 ,
		proVoters = execContext.roles.filter( e => e.nextSelected === next ) ,
		pro = proVoters.length ,
		consArray = new Array( execContext.nexts ).fill( 0 ) ,
		maxCons = 0 ;
	
	var voteStyle =
		( next.voteStyle && next.voteStyle.__isDynamic__ ? next.voteStyle.getFinalValue() : next.voteStyle ) ||
		( execContext.activeScene.voteStyle && execContext.activeScene.voteStyle.__isDynamic__ ?
			execContext.activeScene.voteStyle.getFinalValue() :
			execContext.activeScene.voteStyle ) ;
	
	if ( ! voteStyle )
	{
		if ( execContext.roles.length <= 1 ) { voteStyle = 'immediate' ; }
		else if ( execContext.nexts.length >= 2 ) { voteStyle = 'majority' ; }
		else { voteStyle = 'majority' ; }
	}
	
	execContext.roles.forEach( e => {
		var indexOf ;
		
		if ( e.nextSelected !== null )
		{
			votesCasted ++ ;
			if ( e.nextSelected !== next )
			{
				indexOf = execContext.nexts.indexOf( e.nextSelected ) ;
				consArray[ indexOf ] ++ ;
				maxCons = Math.max( consArray[ indexOf ] , maxCons ) ;
			}
		}
	} ) ;
	
	votesNotCasted = execContext.roles.length - votesCasted ;
	
	// 'Max' equals votes casted in case of timeout, or the roles count when not timed out
	max = timedOut ? votesCasted : execContext.roles.length ;
	
	/*
	console.log( {
		pro: pro ,
		votesCasted: votesCasted ,
		votesNotCasted: votesNotCasted ,
		maxCons: maxCons ,
		max: max 
	} ) ;
	//*/
	
	switch ( voteStyle )
	{
		case 'unanimity' :
			if ( pro === max )
			{
				return proVoters ;
			}
			break ;
			
		case 'relative' :
		case 'relative-majority' :
		case 'majority' :
			// Absolute majority or relative majority after the timeout
			if ( pro >= Math.round( ( max + 1 ) / 2 ) )
			{
				return proVoters ;
			}
			else if ( timedOut && pro > maxCons )
			{
				return proVoters ;
			}
			break ;
		case 'absolute' :
		case 'absolute-majority' :
			if ( pro >= Math.round( ( max + 1 ) / 2 ) )
			{
				return proVoters ;
			}
			break ;
		case 'immediate' :	// jshint ignore:line
		default :
			return proVoters ;
	}
	
	return null ;
} ;


