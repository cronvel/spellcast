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



function NextTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof NextTag ) ? this : Object.create( NextTag.prototype ) ;
	
	if ( ! content ) { content = new TagContainer( undefined , self ) ; }
	
	if ( ! ( content instanceof TagContainer ) )
	{
		throw new SyntaxError( "The 'next' tag's content should be a TagContainer." ) ;
	}
	
	LabelTag.call( self , 'next' , attributes , content , shouldParse ) ;
	
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



NextTag.prototype.run = function run( book , ctx , callback )
{
	ctx.nexts.push( this ) ;
	callback() ;
} ;



NextTag.prototype.exec = function exec( book , options , ctx , callback )
{
	var self = this ;
	
	Ngev.groupEmit(
		ctx.roles ,
		'nextTriggered' ,
		ctx.nexts.indexOf( this ) ,
		ctx.nextTriggeringRoles && ctx.nextTriggeringRoles.map( e => e.id ) ,
		ctx.nextTriggeringSpecial
	) ;
	
	this.execOnTrigger( book , options , ctx , function( error ) {
		if ( error ) { callback( error ) ; return ; }
		
		ctx.nexts = [] ;
		
		var nextScene = ctx.activeScene.getScene( book , self.target ) ;
		
		if ( ! nextScene ) { callback( new Error( 'Cannot find next scene: ' + self.target ) ) ; return ; }
		
		nextScene.exec( book , options , ctx , callback ) ;
	} ) ;
} ;



NextTag.prototype.execOnTrigger = function execOnTrigger( book , options , ctx , callback )
{
	if ( ! this.onTrigger || ! ( this.onTrigger.content instanceof TagContainer ) ) { callback() ; return ; }
	book.run( this.onTrigger.content , ctx , callback ) ;
} ;



NextTag.selectNextScene = function selectNextScene( book , options , ctx , callback )
{
	var firstUpdate = true , firstVote = true , selectTriggered = false ,
		timer = null , timedOut = false , startTime , timeoutTime ,
		autoTimer = null , autoTime = Infinity , autoNext ;
	
	var voteTime =
		1000 * ( ctx.activeScene.voteTime && ctx.activeScene.voteTime.__isDynamic__ ?
			ctx.activeScene.voteTime.getFinalValue() :
			ctx.activeScene.voteTime ) || 
		Infinity ;
	
	var hurryTime =
		1000 * ( ctx.activeScene.hurryTime && ctx.activeScene.hurryTime.__isDynamic__ ?
			ctx.activeScene.hurryTime.getFinalValue() :
			ctx.activeScene.hurryTime ) || 
		15000 ;
	
	var showTimer =
		( ctx.activeScene.showTimer && ctx.activeScene.showTimer.__isDynamic__ ?
			ctx.activeScene.showTimer.getFinalValue() :
			ctx.activeScene.showTimer ) !== false ;
	
	ctx.nexts.forEach( e => {
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
		
		ctx.nextTriggeringRoles = voters ;
		ctx.nextTriggeringSpecial = special || null ;
		
		// Reset next selection
		ctx.roles.forEach( e => e.nextSelected = null ) ;
		
		// Unbind everything
		if ( timer !== null ) { clearTimeout( timer ) ; timer = null ; }
		if ( autoTimer !== null ) { clearTimeout( autoTimer ) ; autoTimer = null ; }
		Ngev.groupOff( ctx.roles , 'selectNext' , onSelectNext ) ;
		
		callback( next ) ;
	} ;
	
	var onTimeout = function onTimeout() {
		//console.log( 'Time out!' ) ;
		var checkVotes , next ;
		
		timedOut = true ;
		
		// On timeout, all nexts should be checked again
		// The first passing the test is used
		next = ctx.nexts.find( e => checkVotes = NextTag.checkOneNext( ctx , e , timedOut ) ) ;
		
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
			ctx.roles ,
			'nextList' ,
			ctx.nexts.map( next => {
				return {
					//target: next.target ,
					label: next.label && next.label.__isDynamic__ ? next.label.getFinalValue() : next.label ,
					roleIds: ctx.roles.filter( role => role.nextSelected === next ).map( role => role.id )
				} ;
			} ) ,
			ctx.roles.map( e => e.id ) ,	// /!\ GRANTED ROLES: TODO!!! /!\
			ctx.roles.filter( e => ! e.nextSelected ).map( e => e.id ) ,	// undecided roles
			showTimer && timeoutTime < Infinity ? timeoutTime - Date.now() : null ,	// timeout
			! firstUpdate	// isUpdate
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
		
		var next = ctx.nexts[ nextIndex ] ;
		if ( ! next ) { return ; }
		
		role.nextSelected = next ;
		
		update() ;
		
		var checkVotes = NextTag.checkOneNext( ctx , next , timedOut ) ;
		
		if ( checkVotes ) { select( next , checkVotes ) ; }
	} ;
	
	Ngev.groupOn( ctx.roles , 'selectNext' , onSelectNext ) ;
	resetTimeout( voteTime ) ;
	
	update() ;
} ;



NextTag.checkOneNext = function checkOneNext( ctx , next , timedOut )
{
	var max = 0 ,
		votesNotCasted ,
		votesCasted = 0 ,
		proVoters = ctx.roles.filter( e => e.nextSelected === next ) ,
		pro = proVoters.length ,
		consArray = new Array( ctx.nexts ).fill( 0 ) ,
		maxCons = 0 ;
	
	var voteStyle =
		( next.voteStyle && next.voteStyle.__isDynamic__ ? next.voteStyle.getFinalValue() : next.voteStyle ) ||
		( ctx.activeScene.voteStyle && ctx.activeScene.voteStyle.__isDynamic__ ?
			ctx.activeScene.voteStyle.getFinalValue() :
			ctx.activeScene.voteStyle ) ;
	
	if ( ! voteStyle )
	{
		if ( ctx.roles.length <= 1 ) { voteStyle = 'immediate' ; }
		else if ( ctx.nexts.length >= 2 ) { voteStyle = 'majority' ; }
		else { voteStyle = 'majority' ; }
	}
	
	ctx.roles.forEach( e => {
		var indexOf ;
		
		if ( e.nextSelected !== null )
		{
			votesCasted ++ ;
			if ( e.nextSelected !== next )
			{
				indexOf = ctx.nexts.indexOf( e.nextSelected ) ;
				consArray[ indexOf ] ++ ;
				maxCons = Math.max( consArray[ indexOf ] , maxCons ) ;
			}
		}
	} ) ;
	
	votesNotCasted = ctx.roles.length - votesCasted ;
	
	// 'Max' equals votes casted in case of timeout, or the roles count when not timed out
	max = timedOut ? votesCasted : ctx.roles.length ;
	
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


