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
	Only possible when the performer is 'preparing'. The performer switch immediately to the 'recovering' stage, with a lesser recovery time.
*/



Scheduler.STAGE_INDEX_TO_NAME = [ 'readying' , 'ready' , 'preparing' , 'releasing' , 'recovering' , 'cooling-down' ] ;
Scheduler.STAGE_INDEX_TO_TIME_KEY = [ 'ready-time' , null , 'preparation-time' , 'release-time' , 'recovery-time' , 'cooldown-time' ] ;

// Stages event: ready, prepared, released, recovered, cooled-down 
// Additional events: start, end, elapsed, break, unbreakable, cancel, await
Scheduler.STAGE_INDEX_TO_NEXT_EVENT = [ 'ready' , 'start' , 'prepared' , 'released' , 'recovered' , 'cooled-down' ] ;



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



Scheduler.prototype.getPerformerData = function( performer ) {
	if ( ! performer ) { return ; }

	var performerData = Object.assign( {} , this.performers.get( performer ) ) ;
	performerData['stage-name'] = Scheduler.STAGE_INDEX_TO_NAME[ performerData.stage ] ;
	return performerData ;
} ;



Scheduler.prototype.setPerformerData = function( performer , data ) {
	if ( ! performer ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData ) { return ; }

	performerData.set( this.time , data ) ;
	return performerData ;
} ;



Scheduler.prototype.setPerformerAction = async function( performer , data , ctx ) {
	if ( ! performer || ! data.action ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData || performerData.stage !== Scheduler.READY ) { return ; }

	performerData.startAction( this.time , data ) ;
	log.hdebug( "%s is starting preparing phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	var eventData = this.buildEventData( performer , performerData , Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ Scheduler.READY ] ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
} ;



Scheduler.prototype.performerAwait = async function( performer , readyTime , ctx ) {
	if ( ! performer || ! readyTime ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData || performerData.stage !== Scheduler.READY ) { return ; }

	log.hdebug( ">>>>>>> time Δ: %[.2]f" , readyTime ) ;
	performerData.await( this.time , readyTime ) ;
	log.hdebug( "%s is starting readying phase (await), start: %[.2]f end: %[.2]f Δ: %[.2]f" , performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	var eventData = this.buildEventData( performer , performerData , 'await' ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
} ;



Scheduler.prototype.performerBreak = async function( performer , recoveryTime , cooldownTime , ctx ) {
	if ( ! performer ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData ) { return ; }

	var broken = performerData.break( this.time , recoveryTime , cooldownTime ) ;
	log.hdebug( "%s is breaking, start: %[.2]f end: %[.2]f Δ: %[.2]f" , performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	var eventData = this.buildEventData( performer , performerData , broken ? 'break' : 'unbreakable' ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
} ;



// Cancel is like break, but it only works in preparation phase, it is the performer itself that stop the action, not external conditions,
// the recovery/cooldown time applied is pro-rata of the elapsed time in the preparation phase.
Scheduler.prototype.performerCancel = async function( performer , ctx ) {
	if ( ! performer ) { return ; }

	var performerData = this.performers.get( performer ) ;
	if ( ! performerData || performerData.stage !== Scheduler.PREPARING ) { return ; }

	var rate = ( ( this.time - performerData['start-at'] ) / ( performerData['end-at'] - performerData['start-at'] ) ) || 0 ;
	rate = rate < 0 ? 0 : rate > 1 ? 1 : rate ;
	
	var recoveryTime = rate * performerData['recovery-time'] ,
		cooldownTime = rate * performerData['cooldown-time'] ;

	performerData.break( this.time , recoveryTime , cooldownTime ) ;
	log.hdebug( "%s is canceling, start: %[.2]f end: %[.2]f Δ: %[.2]f" , performer.name , performerData['start-at'] , performerData['end-at'] , performerData['end-at'] - performerData['start-at'] ) ;

	var eventData = this.buildEventData( performer , performerData , 'cancel' ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
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
	//log.hdebug( "****** Returning: %Y (performer: %s)" , nextDryData , nextPerformer.name ) ;

	return nextDryData ;
} ;



// Advance the scheduler to the next event or to the given duration (whichever comes first)
Scheduler.prototype.advance = async function( maxDuration , ctx , dry = false ) {
	var performer , performerData , nextPerformer , nextPerformerData , maxTime , eventData , dryData , ended ,
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
		dryData = nextPerformerData.nextStage( nextTime , true ) ;
		dryData['elapsed-time'] = elapsedTime ;
		return dryData ;
	}

	log.hdebug( "%s is finishing %s phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , nextPerformer.name , Scheduler.STAGE_INDEX_TO_NAME[ nextPerformerData.stage ] , nextPerformerData['start-at'] , nextPerformerData['end-at'] , nextPerformerData['end-at'] - nextPerformerData['start-at'] ) ;
	
	// Build event data *BEFORE* updating the stages: those events are supposed to be triggered at the end of the phase,
	// but the uninterruptible event is emitted at the end of the function to avoid listeners' side-effect to be cancelled out.
	eventData = this.buildEventData( nextPerformer , nextPerformerData ) ;

	// Now update then move the current time to that event
	nextPerformerData.nextStage( nextTime ) ;
	ended = nextPerformerData.stage === Scheduler.READYING ;	// set it now, it can be changed by event
	this.time = nextTime ;

	// Finally emit events
	if ( elapsedTime ) { await ctx.emitEventOnBusAsync( this.events , 'elapsed' , elapsedTime , ctx , true ) ; }
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
	if ( ended ) { ctx.emitEventOnBusAsync( this.events , 'end' , eventData , ctx , true ) ; }

	log.hdebug( "    >>>> %s is starting %s phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , nextPerformer.name , Scheduler.STAGE_INDEX_TO_NAME[ nextPerformerData.stage ] , nextPerformerData['start-at'] , nextPerformerData['end-at'] , nextPerformerData['end-at'] - nextPerformerData['start-at'] ) ;
} ;



Scheduler.prototype.buildEventData = function( performer , performerData , eventOveride = null ) {
	var eventData = Object.assign( { performer } , performerData ) ;
	eventData.event = eventOveride ?? Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ performerData.stage ] ;

	// Prevent a bug due to complicated code flow because of events, where .released is only true starting at the recovery phase
	if ( eventData.event === 'released' ) { eventData.released = true ; }

	return eventData ;
} ;



function PerformerData( performer , time , readyTime ) {
	readyTime = + readyTime || 0 ;

	this.event = 'ready' ;
	this.action = null ;	// string, userland usage
	this['action-data'] = null ;	// array/object/whatever... userland usage
	this.released = false ;	// true once the action was released
	this.broken = false ;	// true if its a broken cycle: something interrupted the regular phase cycle
	this.stage = Scheduler.READYING ;

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



// Clear action, when looping at stage 0 (READYING)
PerformerData.prototype.clearAction = function() {
	this.action = null ;
	this['action-data'] = null ;
	this.released = false ;
	this.broken = false ;

	this['preparation-time'] = 0 ;
	this['release-time'] = 0 ;
	this['recovery-time'] = 0 ;
	this['cooldown-time'] = 0 ;
} ;



// Set limited data
PerformerData.prototype.set = function( time , data ) {
	if ( data['ready-time'] !== undefined ) { this['ready-time'] = + data['ready-time'] || 0 ; }
	if ( data['preparation-time'] !== undefined ) { this['preparation-time'] = + data['preparation-time'] || 0 ; }
	if ( data['release-time'] !== undefined ) { this['release-time'] = + data['release-time'] || 0 ; }
	if ( data['recovery-time'] !== undefined ) { this['recovery-time'] = + data['recovery-time'] || 0 ; }
	if ( data['cooldown-time'] !== undefined ) { this['cooldown-time'] = + data['cooldown-time'] || 0 ; }

	// Check if something changed for the current stage/phase, if so, re-compute times
	var stageTimeKey = Scheduler.STAGE_INDEX_TO_TIME_KEY[ this.stage ] ;
	if ( data[ stageTimeKey ] !== undefined ) {
		// End time could not be in the past, but don't adjust ready-time, since it could be re-used for next action round-trip
		this['end-at'] = Math.max( time , this['start-at'] + this[ stageTimeKey ] ) ;
	}
} ;



// Set all action data data
PerformerData.prototype.startAction = function( time , data ) {
	this.action = data.action ;
	this['action-data'] = data['action-data'] !== undefined ? data['action-data'] : null ;
	this.broken = false ;
	this.released = false ;

	if ( data['ready-time'] !== undefined ) { this['ready-time'] = + data['ready-time'] || 0 ; }
	if ( data['preparation-time'] !== undefined ) { this['preparation-time'] = + data['preparation-time'] || 0 ; }
	if ( data['release-time'] !== undefined ) { this['release-time'] = + data['release-time'] || 0 ; }
	if ( data['recovery-time'] !== undefined ) { this['recovery-time'] = + data['recovery-time'] || 0 ; }
	if ( data['cooldown-time'] !== undefined ) { this['cooldown-time'] = + data['cooldown-time'] || 0 ; }

	this.stage = Scheduler.PREPARING ;
	this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
	this['start-at'] = time ;
	this['end-at'] = time + this['preparation-time'] ;
} ;



// The performer, which was ready, return to the readying phase
PerformerData.prototype.await = function( time , readyTime ) {
	if ( readyTime !== undefined ) { this['ready-time'] = + readyTime || 0 ; }

	this.stage = Scheduler.READYING ;
	this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
	this['start-at'] = time ;
	this['end-at'] = time + this['ready-time'] ;
} ;



// The performer is broken, it usually turns to recovering phase except if it is releasing
PerformerData.prototype.break = function( time , recoveryTime = 0 , cooldownTime = 0 ) {
	recoveryTime = + recoveryTime || 0 ;
	cooldownTime = + cooldownTime || 0 ;

	switch ( this.stage ) {
		case Scheduler.READYING :
		case Scheduler.READY :
			this.stage = Scheduler.RECOVERING ;
			this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
			this.broken = true ;

			// This is the simplest case, we simply switch immediately to recovery with given times
			this['recovery-time'] = recoveryTime ;
			this['cooldown-time'] = cooldownTime ;

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			return true ;

		case Scheduler.PREPARING :
			this.stage = Scheduler.RECOVERING ;
			this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
			this.broken = true ;

			// Since the action is aborted (no release), we use the greatest time
			if ( recoveryTime > this['recovery-time'] ) { this['recovery-time'] = recoveryTime ; }
			if ( cooldownTime > this['cooldown-time'] ) { this['cooldown-time'] = cooldownTime ; }

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			return true ;

		case Scheduler.RELEASING :
			// The action is unbreakable, but we will add additional times to the action times
			this['recovery-time'] += recoveryTime ;
			this['cooldown-time'] += cooldownTime ;
			return false ;

		case Scheduler.RECOVERING :
			// We are already recovering, we add the current time to the recovery time,
			// 'broken' is not set, because the cycle is not modified
			this['recovery-time'] += recoveryTime ;
			this['cooldown-time'] += cooldownTime ;
			this['end-at'] += recoveryTime ;
			return true ;

		case Scheduler.COOLING_DOWN :
			this.stage = Scheduler.RECOVERING ;
			this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
			this.broken = true ;

			// We are cooling down, so we go back to recovery, cooldown time will include current remaining time
			this['recovery-time'] = recoveryTime ;
			this['cooldown-time'] = cooldownTime + this['end-at'] - time ;

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			return true ;
	}
} ;



PerformerData.prototype.nextStage = function( time , dry = false ) {
	var event , stage , timeKey , startAt , endAt , released ,
		looped = false ,
		currentStage = dry?.stage ?? this.stage ;

	if ( currentStage === Scheduler.READY ) { return ; }

	stage = currentStage + 1 ;
	if ( stage > Scheduler.COOLING_DOWN ) {
		looped = true ;
		stage = Scheduler.READYING ;
	}

	released = currentStage === Scheduler.RELEASING ;
	event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ stage ] ;
	startAt = dry?.['end-at'] ?? time ;
	timeKey = Scheduler.STAGE_INDEX_TO_TIME_KEY[ stage ] ;
	endAt = timeKey ? startAt + this[ timeKey ] : Infinity ;

	if ( dry ) {
		if ( typeof dry !== 'object' ) { dry = {} ; }

		dry.event = event ;
		dry.stage = stage ;
		dry.time = dry['start-at'] = startAt ;
		dry['end-at'] = endAt ;
		dry.released = released ;
		dry.looped = looped ;

		return dry ;
	}

	this.event = event ;
	this.stage = stage ;
	this['start-at'] = time ;
	this['end-at'] = endAt ;
	this.released = released ;

	if ( looped ) { this.clearAction() ; }
} ;



// 'eventTypes' should be null or a Set
PerformerData.prototype.getNextMatchingEvent = function( time , eventTypes = null , fallback = false ) {
	var dryData = { time , "end-at": this['end-at'] } ,
		lastDryData = dryData ;

	while ( ( dryData = this.nextStage( dryData.time , dryData ) ) && ! dryData.looped ) {
		if ( dryData.time >= time && ( ! eventTypes || eventTypes.has( dryData.event ) ) ) {
			return dryData ;
		}
	}

	//log.hdebug( "Last dry data: %Y" , lastDryData ) ;
	return fallback ? { time: lastDryData.time , event: 'end' } : null ;
} ;

