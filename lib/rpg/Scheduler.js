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



var Ngev = require( 'nextgen-events' ) ;
var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Scheduler() { throw new Error( 'Use Scheduler.create() instead.' ) ; }
Scheduler.prototype = Object.create( Ngev.prototype ) ;
Scheduler.prototype.constructor = Scheduler ;
Scheduler.prototype.__prototypeUID__ = 'spellcast/Scheduler' ;
Scheduler.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

module.exports = Scheduler ;



// The previous action is completed, the entity isreadying itself, the duration depends on its quickness.
// Once finished, a 'ready' event is fired and the entity can choose to act.
// If it doesn't, then a new 'readying' phase is initiated... and so on...
Scheduler.READYING = 0 ;

// Remain 'ready' once an action is set up
Scheduler.READY = 1 ;

// The entity prepare the action, this phase is breakable/cancellable, once finished a 'prepared' event is fired.
Scheduler.PREPARING = 2 ;

// The entity is releasing the action, the action is not interruptible/cancellable anymore.
// Once finished a 'released' event is fired: the consequences of the action are applied.
Scheduler.RELEASING = 3 ;

// The entity is either recovering/returning from a released action, or recovering from being broken/cancelled.
// Once finished, a 'recovered' event is fired.
Scheduler.RECOVERING = 4 ;

/*
	Breaking:
	When an entity is messing with another, it can 'break' its action: the entity's phase go immediately to 'recovering'.
	If the entity is releasing, it is to late to break it, but the recovery time will be the greatest of
	the action recovery and the break recovery.
	
	Cancelling:
	Only possible when the entity is 'preparing'. The entity switch immediately to the 'recovering' state.
*/



Scheduler.create = function create( entities )
{
	var self = Object.create( Scheduler.prototype , {
		time: { value: 0 , writable: true , enumerable: true } ,
		entities: { value: [] , enumerable: true } ,
		entityData: { value: [] , enumerable: true }
	} ) ;
	
	/*
	if ( Array.isArray( entities ) ) 
	{
		entities.forEach( entity => self.addEntity( entity ) ) ;
	}
	*/
	
	return self ;
} ;



Scheduler.prototype.addEntity = function addEntity( entity , readyingDuration )
{
	if ( ! entity || entity.__prototypeUID__ !== 'spellcast/Entity' ) { return ; }
	
	this.entities.push( entity ) ;
	
	readyingDuration = readyingDuration || 0 ;
	
	this.entityData.push( {
		entity: entity ,
		event: null ,
		action: null ,	// string, userland usage
		actionArgs: null ,	// array, userland usage
		state: Scheduler.READYING ,
		time: this.time ,
		endTime: this.time + readyingDuration ,
		readyingDuration: readyingDuration ,
		preparingDuration: 0 ,
		releasingDuration: 0 ,
		recoveringDuration: 0
	} ) ;
} ;



Scheduler.prototype.removeEntity = function removeEntity( entity )
{
	if ( ! entity ) { return false ; }
	
	var indexOf = this.entities.indexOf( entity ) ;
	
	if ( indexOf === -1 ) { return false ; }
	
	this.entities.splice( indexOf , 1 ) ;
	this.entityData.splice( indexOf , 1 ) ;
	
	return true ;
} ;



Scheduler.prototype.setAction = function setAction( entity , data )
{
	if ( ! entity ) { return ; }
	
	var indexOf = this.entities.indexOf( entity ) ;
	
	if ( indexOf === -1 ) { return ; }
	
	var entityData = this.entityData[ indexOf ] ;
	
	if ( entityData.state !== Scheduler.READY ) { return ; }
	
	Object.assign( entityData , data ) ;
	
	entityData.entity = entity ;	// Don't let userland mess with the entity property
	entityData.event = 'started' ;
	entityData.state = Scheduler.PREPARING ;
	entityData.time = this.time ;
	entityData.endTime = this.time + entityData.preparingDuration ;
	
	this.emit( entityData.event , entityData ) ;
	
	return entityData ;
} ;



// Advance the scheduler to the next event or to the given duration (whichever comes first)
Scheduler.prototype.advance = function advance( maxDuration )
{
	var i , iMax , entityData , nextTime = Infinity , nextEntity , maxTime ;
	
	if ( maxDuration === undefined )
	{
		maxDuration = Infinity ;
		maxTime = Infinity ;
	}
	else
	{
		maxTime = this.time + maxDuration ;
	}
	
	// First, get the next time event, those with the lowest non-null time
	for ( i = 0 , iMax = this.entities.length ; i < iMax ; i ++ )
	{
		//at = this.entities[ i ].activeTime ;
		entityData = this.entityData[ i ] ;
		
		if ( entityData.endTime <= this.time && entityData.endTime < nextTime && entityData.endTime <= maxTime )
		{
			nextTime = entityData.endTime ;
			nextEntity = this.entities[ i ] ;
			nextEntityData = entityData ;
		}
	}
	
	// Exit if nothing was found...
	if ( ! nextEntity )
	{
		// In duration mode, we advance at least to this duration
		if ( maxDuration !== Infinity ) { this.time = maxTime ; }
		return ;
	}
	
	// Move the current time to the next time event
	this.time = nextEntityData.endTime ;
	
	nextEntityData.time = this.time ;
	
	switch ( nextEntityData.state )
	{
		case Scheduler.READYING :
			nextEntityData.event = 'ready' ;
			nextEntityData.state = Scheduler.READY ;
			nextEntityData.endTime = Infinity ;
			break ;
		
		case Scheduler.READY :
			// Not possible, nextEntityData.endTime === Infinity when state is ready.
			return ;
		
		case Scheduler.PREPARING :
			nextEntityData.event = 'prepared' ;
			nextEntityData.state = Scheduler.RELEASING ;
			nextEntityData.endTime = this.time + nextEntityData.releasingingDuration ;
			break ;
		
		case Scheduler.RELEASING :
			nextEntityData.event = 'released' ;
			nextEntityData.state = Scheduler.RECOVERING ;
			nextEntityData.endTime = this.time + nextEntityData.recoveringingDuration ;
			break ;
		
		case Scheduler.RECOVERING :
			nextEntityData.event = 'recovered' ;
			nextEntityData.state = Scheduler.READYING ;
			nextEntityData.endTime = this.time + nextEntityData.readyingDuration ;
			break ;
	}
	
	this.emit( entityData.event , entityData ) ;
	
	return entityData ;
} ;


