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



const Ngev = require( 'nextgen-events' ) ;
const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Scheduler() {
	this.time = 0 ;
	this.performers = new Map() ;
	this.events = new Ngev() ;

	this.events.setInterruptible( true ) ;
	this.events.setListenerPriority( true ) ;
	this.events.setNice( Ngev.DESYNC ) ;
	this.events.desyncUseNextTick( true ) ;
	this.events.serializeListenerContext( 'script' ) ;
}

//Scheduler.prototype = Object.create( Ngev.prototype ) ;
//Scheduler.prototype.constructor = Scheduler ;
Scheduler.prototype.__prototypeUID__ = 'spellcast/Scheduler' ;
Scheduler.prototype.__prototypeVersion__ = require( '../package.json' ).version ;

module.exports = Scheduler ;



// The previous action is completed, the performer is readying itself, the duration depends on its quickness.
// Once finished, a 'ready' event is fired and the performer can choose to act.
// If it doesn't, then a new 'readying' phase is initiated... and so on...
// This is the phase (with READY and COOLING_DOWN) where the entity is the less vulnerable.
// At the first run, this phase is used to sort entities by their initiative.
// Later, it is also used as the safe-part of the recovery of an action (aka cooldown), so ready-time should be set
// to aggregate cooldown time and initiative time, there is no need to split it because both behaves exactly the same.
Scheduler.READYING = 0 ;

// Remain 'ready' once an action is set up
Scheduler.READY = 1 ;

// The performer prepare the action, this phase is breakable/cancellable, once finished a 'prepared' event is fired.
// The entity is quite vulnerable during this phase.
Scheduler.PREPARING = 2 ;

// The performer is releasing the action, the action is not interruptible/cancellable anymore.
// E.g.: even if it dies, either the action killing it is considered simultaneous to this one, or its last spell is already unleashed.
// Usually, the entity is the most vulnerable during release, except of course if it is releasing a defensive move.
// Once finished a 'released' event is fired: the consequences of the action are applied.
Scheduler.RELEASING = 3 ;

// The performer is either recovering/returning from a released action, or recovering from being broken/cancelled.
// Once finished, a 'recovered' event is fired.
// The entity is quite vulnerable during this phase.
Scheduler.RECOVERING = 4 ;

// The performer has fully finished the action and had recovered from it, now there is a little bit of rest-time
// before being able to carry out something else.
// E.g.: breath in, gather strength.
// Once finished, a 'cooled-down' event is fired.
// This is the phase (with READY and READYING) where the entity is the less vulnerable.
Scheduler.COOLING_DOWN = 5 ;

/*
	Breaking:
	When an performer is messing with another, it can 'break' its action: the performer's phase go immediately to 'recovering'.
	If the performer is releasing, it is to late to break it, but the recovery time will be the greatest of
	the action recovery time and the break recovery time.

	Cancelling:
	Only possible when the performer is 'preparing'. The performer switch immediately to the 'recovering' state, with a lesser recovery time.
*/



Scheduler.STATE_INDEX_TO_NAME = [ 'readying' , 'ready' , 'preparing' , 'releasing' , 'recovering' , 'cooling-down' ] ;
Scheduler.STATE_INDEX_TO_TIME_KEY = [ 'ready-time' , null , 'preparation-time' , 'release-time' , 'recovery-time' , 'cooldown-time' ] ;
Scheduler.STATE_INDEX_TO_NEXT_EVENT = [ 'ready' , 'started' , 'prepared' , 'released' , 'recovered' , 'cooled-down' ] ;



Scheduler.prototype.addPerformer = function( performer , readyTime ) {
	if ( this.performers.has( performer ) ) { return ; }
	//log.hdebug( ".addPerformer() %s %Y" , performer.name , readyTime ) ;
	this.performers.set( performer , new PerformerData( performer , this.time , readyTime ) ) ;
} ;



Scheduler.prototype.removePerformer = async function( performer , ctx ) {
	if ( ! performer ) { return ; }
	this.performers.delete( performer ) ;
	if ( ! this.performers.size ) { await ctx.emitEventOnBusAsync( this.events , 'empty' , null , ctx , true ) ; }
} ;



Scheduler.prototype.setPerformer = function( performer , data ) {
	if ( ! performer ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData ) { return ; }

	performerData.set( this.time , data ) ;
	return performerData ;
} ;



Scheduler.prototype.setPerformerAction = async function( performer , data , ctx ) {
	if ( ! performer || ! data.action ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData || performerData.state !== Scheduler.READY ) { return ; }

	performerData.setAction( this.time , data ) ;
	log.hdebug( "%s is starting preparing phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , performerData.performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	await ctx.emitEventOnBusAsync( this.events , performerData.event , performerData , ctx , true ) ;
} ;



Scheduler.prototype.performerAwait = async function( performer , readyTime , ctx ) {
	if ( ! performer ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData || performerData.state !== Scheduler.READY ) { return ; }

	log.hdebug( ">>>>>>> time Δ: %[.2]f" , readyTime ) ;
	performerData.await( this.time , readyTime ) ;
	log.hdebug( "%s is starting readying phase (await), start: %[.2]f end: %[.2]f Δ: %[.2]f" , performerData.performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	await ctx.emitEventOnBusAsync( this.events , performerData.event , performerData , ctx , true ) ;
} ;



Scheduler.prototype.performerBreak = async function( performer , recoveryTime , cooldownTime , ctx ) {
	if ( ! performer ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData ) { return ; }

	performerData.break( this.time , recoveryTime , cooldownTime ) ;
	log.hdebug( "%s is breaking, start: %[.2]f end: %[.2]f Δ: %[.2]f" , performerData.performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	await ctx.emitEventOnBusAsync( this.events , performerData.event , performerData , ctx , true ) ;
} ;



// Cancel is like break, but it only works in preparation phase, it is the performer itself that stop the action, not external conditions
Scheduler.prototype.performerCancel = async function( performer , ctx ) {
	if ( ! performer ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData || performerData.state !== Scheduler.PREPARING ) { return ; }

	performerData.break( this.time ) ;
	log.hdebug( "%s is canceling, start: %[.2]f end: %[.2]f Δ: %[.2]f" , performerData.performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	await ctx.emitEventOnBusAsync( this.events , performerData.event , performerData , ctx , true ) ;
} ;



// Lookup for the next event
Scheduler.prototype.lookup = function( events = null , excludingPerformer = null , fallback = false ) {
	var performer , performerData , nextPerformer , nextDryData , dryData ,
		nextTime = Infinity ;

	if ( Array.isArray( events ) ) { events = new Set( [ ... events ] ) ; }
	else if ( ! ( events instanceof Set ) ) { events = null ; }

	//log.hdebug( "****** params -- ev: %Y , perf: %Y" , events , excludingPerformer ) ;

	for ( [ performer , performerData ] of this.performers ) {
		if ( excludingPerformer === performer ) { continue ; }

		dryData = performerData.getNextMatchingEvent( this.time , events , fallback ) ;

		if ( dryData && dryData.time >= this.time && dryData.time < nextTime ) {
			nextTime = dryData.time ;
			nextPerformer = performer ;
			nextDryData = dryData ;
		}
	}

	if ( ! nextPerformer ) { return null ; }

	nextDryData['elapsed-time'] = nextDryData.time - this.time ;
	log.hdebug( "****** Returning: %Y (performer: %s)" , nextDryData , nextPerformer.name ) ;

	return nextDryData ;
} ;



// Advance the scheduler to the next event or to the given duration (whichever comes first)
Scheduler.prototype.advance = async function( maxDuration , ctx , dry = false ) {
	var performer , performerData , nextPerformer , nextPerformerData , maxTime , dryData ,
		nextTime = Infinity ,
		elapsedTime = 0 ,
		lastTime = this.time ;

	if ( maxDuration === undefined ) {
		maxDuration = Infinity ;
		maxTime = Infinity ;
	}
	else {
		maxTime = this.time + maxDuration ;
	}

	// First, get the next time event, those with the lowest non-null time
	for ( [ performer , performerData ] of this.performers ) {
		if ( performerData['end-at'] >= this.time && performerData['end-at'] < nextTime && performerData['end-at'] <= maxTime ) {
			nextTime = performerData['end-at'] ;
			nextPerformer = performer ;
			nextPerformerData = performerData ;
		}
	}

	// Exit if nothing was found...
	if ( ! nextPerformer ) {
		// In duration mode, we advance at least to this duration
		if ( maxDuration !== Infinity && ! dry ) {
			elapsedTime = maxTime - lastTime ;
			this.time = maxTime ;
			if ( elapsedTime ) { await ctx.emitEventOnBusAsync( this.events , 'elapsed' , elapsedTime , ctx , true ) ; }
		}

		return ;
	}

	elapsedTime = nextTime - lastTime ;

	if ( dry ) {
		dryData = nextPerformerData.nextState( nextTime , true ) ;
		dryData['elapsed-time'] = elapsedTime ;
		return dryData ;
	}

	// Move the current time to the next time event
	log.hdebug( "%s is finishing %s phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , nextPerformerData.performer.name , Scheduler.STATE_INDEX_TO_NAME[ nextPerformerData.state ] , nextPerformerData['start-at'] , nextPerformerData['end-at'] , nextPerformerData['end-at'] - nextPerformerData['start-at'] ) ;
	nextPerformerData.nextState( nextTime ) ;
	this.time = nextTime ;

	if ( elapsedTime ) { await ctx.emitEventOnBusAsync( this.events , 'elapsed' , elapsedTime , ctx , true ) ; }
	await ctx.emitEventOnBusAsync( this.events , nextPerformerData.event , nextPerformerData , ctx , true ) ;

	log.hdebug( "    >>>> %s is starting %s phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , nextPerformerData.performer.name , Scheduler.STATE_INDEX_TO_NAME[ nextPerformerData.state ] , nextPerformerData['start-at'] , nextPerformerData['end-at'] , nextPerformerData['end-at'] - nextPerformerData['start-at'] ) ;
} ;



function PerformerData( performer , time , readyTime ) {
	readyTime = + readyTime || 0 ;

	this.performer = performer ;	// This is mandatory, because performerData is passed to the script as the event argument
	this.event = 'ready' ;
	this.action = null ;	// string, userland usage
	this['action-data'] = null ;	// array/object/whatever... userland usage
	this.state = Scheduler.READYING ;

	// Timestamp
	this['start-at'] = time ;
	this['end-at'] = time + readyTime ;

	// Duration
	this['ready-time'] = readyTime ;
	this['preparation-time'] = 0 ;
	this['release-time'] = 0 ;
	this['recovery-time'] = 0 ;
	this['cooldown-time'] = 0 ;
}

PerformerData.prototype.__prototypeUID__ = 'spellcast/Scheduler/PerformerData' ;
PerformerData.prototype.__prototypeVersion__ = require( '../package.json' ).version ;

Scheduler.PerformerData = PerformerData ;



// Set limited data
PerformerData.prototype.set = function( time , data ) {
	if ( data['ready-time'] !== undefined ) { this['ready-time'] = + data['ready-time'] || 0 ; }
	if ( data['preparation-time'] !== undefined ) { this['preparation-time'] = + data['preparation-time'] || 0 ; }
	if ( data['release-time'] !== undefined ) { this['release-time'] = + data['release-time'] || 0 ; }
	if ( data['recovery-time'] !== undefined ) { this['recovery-time'] = + data['recovery-time'] || 0 ; }
	if ( data['cooldown-time'] !== undefined ) { this['cooldown-time'] = + data['cooldown-time'] || 0 ; }

	// Check if something changed for the current state/phase, if so, re-compute times
	var stateTimeKey = Scheduler.STATE_INDEX_TO_TIME_KEY[ this.state ] ;
	if ( data[ stateTimeKey ] !== undefined ) {
		// End time could not be in the past, but don't adjust ready-time, since it could be re-used for next action round-trip
		this['end-at'] = Math.max( time , this['start-at'] + this[ stateTimeKey ] ) ;
	}
} ;



// Set all action data data
PerformerData.prototype.setAction = function( time , data ) {
	this.action = data.action ;
	this['action-data'] = data['action-data'] !== undefined ? data['action-data'] : null ;

	if ( data['ready-time'] !== undefined ) { this['ready-time'] = + data['ready-time'] || 0 ; }
	if ( data['preparation-time'] !== undefined ) { this['preparation-time'] = + data['preparation-time'] || 0 ; }
	if ( data['release-time'] !== undefined ) { this['release-time'] = + data['release-time'] || 0 ; }
	if ( data['recovery-time'] !== undefined ) { this['recovery-time'] = + data['recovery-time'] || 0 ; }
	if ( data['cooldown-time'] !== undefined ) { this['cooldown-time'] = + data['cooldown-time'] || 0 ; }

	this.event = 'started' ;
	this.state = Scheduler.PREPARING ;
	this['start-at'] = time ;
	this['end-at'] = time + this['preparation-time'] ;
} ;



// The performer, which was ready, return to the readying phase
PerformerData.prototype.await = function( time , readyTime ) {
	if ( readyTime !== undefined ) { this['ready-time'] = + readyTime || 0 ; }

	this.event = 'await' ;
	this.state = Scheduler.READYING ;
	this['start-at'] = time ;
	this['end-at'] = time + this['ready-time'] ;
} ;



// The performer is broken, it usually turns to recovering phase except if it is releasing
PerformerData.prototype.break = function( time , recoveryTime = 0 , cooldownTime = 0 ) {
	recoveryTime = + recoveryTime || 0 ;
	cooldownTime = + cooldownTime || 0 ;

	switch ( this.state ) {
		case Scheduler.READYING :
		case Scheduler.READY :
			this.event = 'broken' ;
			this.state = Scheduler.RECOVERING ;

			// This is the simplest case, we simply switch immediately to recovery with given times
			this['recovery-time'] = recoveryTime ;
			this['cooldown-time'] = cooldownTime ;

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			break ;

		case Scheduler.PREPARING :
			this.event = 'broken' ;
			this.state = Scheduler.RECOVERING ;

			// Since the action is aborted (no release), we use the greatest time
			if ( recoveryTime > this['recovery-time'] ) { this['recovery-time'] = recoveryTime ; }
			if ( cooldownTime > this['cooldown-time'] ) { this['cooldown-time'] = cooldownTime ; }

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			break ;

		case Scheduler.RELEASING :
			this.event = 'unbreakable' ;

			// The action is unbreakable, we will add additional times to the action times
			this['recovery-time'] += recoveryTime ;
			this['cooldown-time'] += cooldownTime ;
			break ;

		case Scheduler.RECOVERING :
			this.event = 'broken' ;

			// We are already recovering, we add the current time to the recovery time
			this['recovery-time'] += recoveryTime ;
			this['cooldown-time'] += cooldownTime ;
			this['end-at'] += recoveryTime ;
			break ;

		case Scheduler.COOLING_DOWN :
			this.event = 'broken' ;
			this.state = Scheduler.RECOVERING ;

			// We are cooling down, so we go back to recovery, cooldown time will include current remaining time
			this['recovery-time'] = recoveryTime ;
			this['cooldown-time'] = cooldownTime + this['end-at'] - time ;

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			break ;
	}
} ;



PerformerData.prototype.nextState = function( time , dry = false ) {
	var event , state , timeKey , startAt , endAt ,
		currentState = dry?.state ?? this.state ;

	if ( currentState === Scheduler.READY ) { return ; }

	event = Scheduler.STATE_INDEX_TO_NEXT_EVENT[ currentState ] ;

	state = currentState + 1 ;
	if ( state > Scheduler.COOLING_DOWN ) {
		if ( dry?.noLoop ) { return ; }
		state = Scheduler.READYING ;
	}

	startAt = dry?.['end-at'] ?? time ;
	timeKey = Scheduler.STATE_INDEX_TO_TIME_KEY[ state ] ;
	endAt = timeKey ? startAt + this[ timeKey ] : Infinity ;

	if ( dry ) {
		if ( typeof dry !== 'object' ) { dry = {} ; }

		dry.event = event ;
		dry.state = state ;
		dry.time = dry['start-at'] = startAt ;
		dry['end-at'] = endAt ;

		return dry ;
	}

	this.event = event ;
	this.state = state ;
	this['start-at'] = time ;
	this['end-at'] = endAt ;
} ;



// 'eventTypes' should be null or a Set
PerformerData.prototype.getNextMatchingEvent = function( time , eventTypes = null , fallback = false ) {
	var dryData = { time , "end-at": this['end-at'] , noLoop: true } ,
		lastDryData = dryData ;

	while ( ( dryData = this.nextState( dryData.time , dryData ) ) ) {
		if ( dryData.time >= time && ( ! eventTypes || eventTypes.has( dryData.event ) ) ) {
			return dryData ;
		}
	}

	log.hdebug( "Last dry data: %Y" , lastDryData ) ;
	return fallback ? { time: lastDryData.time , event: 'end' } : null ;
} ;

