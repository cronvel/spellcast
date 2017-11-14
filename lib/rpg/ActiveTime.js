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



var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ActiveTime() { throw new Error( 'Use ActiveTime.create() instead.' ) ; }
module.exports = ActiveTime ;

ActiveTime.prototype.__prototypeUID__ = 'spellcast/ActiveTime' ;
ActiveTime.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



ActiveTime.READY = 0 ;			// The entity is ready to act, this phase ends instantly for NPC, or end after PC decides something
ActiveTime.PREPARING = 1 ;		// The entity prepare the action, this phase can be interruptible
ActiveTime.RELEASING = 2 ;		// The entity is releasing the action, the action is not interruptible anymore
ActiveTime.RECOVERING = 3 ;		// The action is released, the action effects are computed, the entity is recovering/returning from it
ActiveTime.COOLING_DOWN = 4 ;	// The action is finished, the entity is idling some time depending on its quickness



ActiveTime.create = function create( entities )
{
	var self = Object.create( ActiveTime.prototype , {
		time: { value: 0 , writable: true , enumerable: true } ,
		entities: { value: [] , enumerable: true } ,
		dataMap: { value: new Map() , enumerable: true }
	} ) ;
	
	entities.forEach( entity => self.addEntity( entity ) ) ;
	
	return self ;
} ;



ActiveTime.prototype.addEntity = function addEntity( entity )
{
	this.entities.push( entity ) ;
	
	this.dataMap.set( entity , {
		state: ActiveTime.COOLING_DOWN ,
		time: 0 ,
		coolDownDuration: 10
	} ) ;
} ;



// Advance the active time to the next event, return the matching entity.
ActiveTime.prototype.next = function next( maxTime )
{
	var i , iMax , at , nextTime = Infinity , nextEntity ;
	
	if ( maxTime === undefined ) { maxTime = Infinity ; }
	
	// First, get the next time event, those with the lowest non-null time
	for ( i = 0 , iMax = this.entities.length ; i < iMax ; i ++ )
	{
		at = this.entities[ i ].activeTime ;
		
		if ( at.time !== null && at.time < nextTime && at.time < maxTime )
		{
			nextTime = at.time ;
			nextEntity = this.entities[ i ] ;
		}
	}
	
	// Exit if nothing was found...
	if ( ! nextEntity ) { return ; }
	
	at = nextEntity.activeTime ;
	
	// Move the current time to the next time event
	this.time = at.time ;
	
	switch ( at.state )
	{
		case ActiveTime.PREPARING :
			at.state = ActiveTime.RELEASING ;
			at.time = this.time + at.duration / 2 ;
			break ;
		
		case ActiveTime.RELEASING :
			if ( typeof at.action === 'function' ) { at.action() ; }
			at.state = ActiveTime.FINISHING ;
			at.time = this.time + at.duration / 2 ;
			break ;
		
		case ActiveTime.RECOVERING :
			at.state = ActiveTime.COOLING_DOWN ;
			at.duration = at.coolDownDuration ;
			at.time = this.time + at.duration ;
			break ;
		
		case ActiveTime.COOLING_DOWN :
			at.state = ActiveTime.READY ;
			at.time = null ;
			break ;
		
		case ActiveTime.READY :
			// Not possible, at.time === null when state is ready.
			break ;
	}
	
	return nextEntity ;
} ;



// Advance the active time to the next event until a ready state is produced, or until nothing is found
ActiveTime.prototype.nextReady = function nextReady( maxTime )
{
	var entity ;
	
	while ( true )
	{
		entity = this.next( maxTime ) ;
		if ( ! entity || entity.activeTime.state === ActiveTime.READY ) { break ; }
	}
	
	return entity ;
} ;



// 
ActiveTime.prototype.setAction = function setAction( entity , duration , action )
{
	var at ;
	
	if ( ! entity || this.entities.indexOf( entity ) === -1 || entity.activeTime.state !== ActiveTime.READY )
	{
		return false ;
	}
	
	at = entity.activeTime ;
	at.state = ActiveTime.RELEASING ;
	at.duration = duration ;
	at.time = this.time + at.duration / 2 ;
	at.action = action ;
	
	return true ;
} ;

