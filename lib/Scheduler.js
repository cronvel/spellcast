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
Scheduler.prototype.__prototypeVersion__ = require( '../package.json' ).version ;

module.exports = Scheduler ;



// The previous action is completed, the target is readying itself, the duration depends on its quickness.
// Once finished, a 'ready' event is fired and the target can choose to act.
// If it doesn't, then a new 'readying' phase is initiated... and so on...
Scheduler.READYING = 0 ;

// Remain 'ready' once an action is set up
Scheduler.READY = 1 ;

// The target prepare the action, this phase is breakable/cancellable, once finished a 'prepared' event is fired.
Scheduler.PREPARING = 2 ;

// The target is releasing the action, the action is not interruptible/cancellable anymore.
// Once finished a 'released' event is fired: the consequences of the action are applied.
Scheduler.RELEASING = 3 ;

// The target is either recovering/returning from a released action, or recovering from being broken/cancelled.
// Once finished, a 'recovered' event is fired.
Scheduler.RECOVERING = 4 ;

/*
	Breaking:
	When an target is messing with another, it can 'break' its action: the target's phase go immediately to 'recovering'.
	If the target is releasing, it is to late to break it, but the recovery time will be the greatest of
	the action recovery and the break recovery.
	
	Cancelling:
	Only possible when the target is 'preparing'. The target switch immediately to the 'recovering' state.
*/



Scheduler.create = function create( targets )
{
	var self = Object.create( Scheduler.prototype , {
		time: { value: 0 , writable: true , enumerable: true } ,
		targets: { value: [] , enumerable: true } ,
		"target-data": { value: [] , enumerable: true }
	} ) ;
	
	return self ;
} ;



Scheduler.prototype.addTarget = function addTarget( target , readyingDuration )
{
	this.targets.push( target ) ;
	
	readyingDuration = readyingDuration || 0 ;
	
	this['target-data'].push( {
		target: target ,
		event: null ,
		action: null ,	// string, userland usage
		"action-data": null ,	// array/object/whatever... userland usage
		state: Scheduler.READYING ,
		time: this.time ,
		"end-time": this.time + readyingDuration ,
		"readying-duration": readyingDuration ,
		"preparing-duration": 0 ,
		"releasing-duration": 0 ,
		"recovering-duration": 0
	} ) ;
} ;



Scheduler.prototype.removeTarget = function removeTarget( target )
{
	if ( ! target ) { return false ; }
	
	var indexOf = this.targets.indexOf( target ) ;
	
	if ( indexOf === -1 ) { return false ; }
	
	this.targets.splice( indexOf , 1 ) ;
	this['target-data'].splice( indexOf , 1 ) ;
	
	return true ;
} ;



Scheduler.prototype.setTarget = function setTarget( target , data , ctx , callback )
{
	if ( ! target ) { return ; }
	
	var indexOf = this.targets.indexOf( target ) ;
	
	if ( indexOf === -1 ) { return ; }
	
	var targetData = this['target-data'][ indexOf ] ;
	
	if ( 'readying-duration' in data ) { targetData['readying-duration'] = data['readying-duration'] ; }
	if ( 'preparing-duration' in data ) { targetData['preparing-duration'] = data['preparing-duration'] ; }
	if ( 'releasing-duration' in data ) { targetData['releasing-duration'] = data['releasing-duration'] ; }
	if ( 'recovering-duration' in data ) { targetData['recovering-duration'] = data['recovering-duration'] ; }
	
	return targetData ;
} ;



Scheduler.prototype.setTargetAction = function setTargetAction( target , data , ctx , callback )
{
	if ( ! target || ! data.action ) { return ; }
	
	var indexOf = this.targets.indexOf( target ) ;
	
	if ( indexOf === -1 ) { return ; }
	
	var targetData = this['target-data'][ indexOf ] ;
	
	if ( targetData.state !== Scheduler.READY ) { return ; }
	
	targetData.action = data.action ;
	targetData['action-data'] = 'action-data' in data ? data['action-data'] : null ;
	
	if ( 'readying-duration' in data ) { targetData['readying-duration'] = data['readying-duration'] ; }
	if ( 'preparing-duration' in data ) { targetData['preparing-duration'] = data['preparing-duration'] ; }
	if ( 'releasing-duration' in data ) { targetData['releasing-duration'] = data['releasing-duration'] ; }
	if ( 'recovering-duration' in data ) { targetData['recovering-duration'] = data['recovering-duration'] ; }
	
	targetData.event = 'started' ;
	targetData.state = Scheduler.PREPARING ;
	targetData.time = this.time ;
	targetData['end-time'] = this.time + targetData['preparing-duration'] ;
	
	this.emit( targetData.event , targetData , ctx , callback ) ;
	
	return ;
} ;



// Advance the scheduler to the next event or to the given duration (whichever comes first)
Scheduler.prototype.advance = function advance( maxDuration , ctx , callback )
{
	var i , iMax , targetData ,
		nextTime = Infinity , nextTarget , nextTargetData , maxTime ,
		elapsedTime = 0 , lastTime = this.time ;
	
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
	for ( i = 0 , iMax = this.targets.length ; i < iMax ; i ++ )
	{
		//at = this.targets[ i ].activeTime ;
		targetData = this['target-data'][ i ] ;
		
		if ( targetData['end-time'] >= this.time && targetData['end-time'] < nextTime && targetData['end-time'] <= maxTime )
		{
			nextTime = targetData['end-time'] ;
			nextTarget = this.targets[ i ] ;
			nextTargetData = targetData ;
		}
	}
	
	// Exit if nothing was found...
	if ( ! nextTarget )
	{
		// In duration mode, we advance at least to this duration
		if ( maxDuration !== Infinity )
		{
			this.time = maxTime ;
			elapsedTime = this.time - lastTime ;
			if ( elapsedTime ) { this.emit( 'elapsed' , elapsedTime , ctx , callback ) ; }
		}
		return ;
	}
	
	// Move the current time to the next time event
	this.time = nextTargetData['end-time'] ;
	elapsedTime = this.time - lastTime ;
	nextTargetData.time = this.time ;
	
	switch ( nextTargetData.state )
	{
		case Scheduler.READYING :
			nextTargetData.event = 'ready' ;
			nextTargetData.state = Scheduler.READY ;
			nextTargetData['end-time'] = Infinity ;
			break ;
		
		case Scheduler.READY :
			// Not possible, nextTargetData['end-time'] === Infinity when state is ready.
			return ;
		
		case Scheduler.PREPARING :
			nextTargetData.event = 'prepared' ;
			nextTargetData.state = Scheduler.RELEASING ;
			nextTargetData['end-time'] = this.time + nextTargetData['releasing-duration'] ;
			break ;
		
		case Scheduler.RELEASING :
			nextTargetData.event = 'released' ;
			nextTargetData.state = Scheduler.RECOVERING ;
			nextTargetData['end-time'] = this.time + nextTargetData['recovering-duration'] ;
			break ;
		
		case Scheduler.RECOVERING :
			nextTargetData.event = 'recovered' ;
			nextTargetData.state = Scheduler.READYING ;
			nextTargetData['end-time'] = this.time + nextTargetData['readying-duration'] ;
			break ;
	}
	
	if ( elapsedTime )
	{
		this.emit( 'elapsed' , elapsedTime , ctx , () => {
			//log.error( '%I' , nextTargetData ) ;
			this.emit( nextTargetData.event , nextTargetData , ctx , callback ) ;
		} ) ;
	}
	else
	{
		this.emit( nextTargetData.event , nextTargetData , ctx , callback ) ;
	}
	
	return ;
} ;


