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
	this.actors = new Map() ;
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



// The previous action is completed, the actor is readying itself, the duration depends on its quickness.
// Once finished, a 'ready' event is fired and the actor can choose to act.
// If it doesn't, then a new 'readying' phase is initiated... and so on...
// This is the phase (with COMMAND and COOLDOWN) where the entity is the less vulnerable.
// At the first run, this phase is used to sort entities by their initiative.
// Later, it is also used as the safe-part of the recovery of an action (aka cooldown), so ready-time should be set
// to aggregate cooldown time and initiative time, there is no need to split it because both behaves exactly the same.
Scheduler.READY = 0 ;

// The actor is awaiting order/command, it remains at this stage until an action is set up, 
Scheduler.COMMAND = 1 ;

// The actor prepare the action, this phase is breakable/cancellable, once finished a 'prepared' event is fired.
// The entity is quite vulnerable during this phase.
Scheduler.PREPARATION = 2 ;

// The actor is releasing the action, the action is not interruptible/cancellable anymore.
// E.g.: even if it dies, either the action killing it is considered simultaneous to this one, or its last spell is already unleashed.
// Usually, the entity is the most vulnerable during release, except of course if it is releasing a defensive move.
// Once finished a 'released' event is fired: the consequences of the action are applied.
Scheduler.RELEASE = 3 ;

// The actor is either recovering/returning from a released action, or recovering from being broken/cancelled.
// Once finished, a 'recovered' event is fired.
// The entity is quite vulnerable during this phase.
Scheduler.RECOVERY = 4 ;

// The actor has fully finished the action and had recovered from it, now there is a little bit of rest-time
// before being able to carry out something else.
// E.g.: breath in, gather strength.
// Once finished, a 'cooled-down' event is fired.
// This is the phase (with READY and COMMAND) where the entity is the less vulnerable.
Scheduler.COOLDOWN = 5 ;

/*
	Breaking:
	When an actor is messing with another, it can 'break' its action: the actor's phase go immediately to 'recovering'.
	If the actor is releasing, it is to late to break it, but the recovery time will be the greatest of
	the action recovery time and the break recovery time.

	Cancelling:
	Only possible when the actor is 'preparing'. The actor switch immediately to the 'recovering' stage, with a lesser recovery time.
*/



Scheduler.STAGE_INDEX_TO_NAME = [ 'ready' , 'command' , 'preparation' , 'release' , 'recovery' , 'cooldown' ] ;
Scheduler.STAGE_INDEX_TO_TIME_KEY = [ 'ready-time' , null , 'preparation-time' , 'release-time' , 'recovery-time' , 'cooldown-time' ] ;

// Stages event: ready, prepared, released, recovered, cooled-down 
// Additional events: start, end, elapsed, break, unbreakable, break-before, break-after, cancel, await
Scheduler.STAGE_INDEX_TO_NEXT_EVENT = [ 'ready' , 'start' , 'prepared' , 'released' , 'recovered' , 'cooled-down' ] ;



Scheduler.prototype.addActor = function( actor , readyTime ) {
	if ( this.actors.has( actor ) ) { return ; }
	//log.hdebug( ".addActor() %s %Y" , actor.name , readyTime ) ;
	this.actors.set( actor , new ActorData( actor , this.time , readyTime ) ) ;
} ;



Scheduler.prototype.removeActor = async function( actor , ctx ) {
	if ( ! actor ) { return ; }
	this.actors.delete( actor ) ;
	if ( ! this.actors.size ) { await ctx.emitEventOnBusAsync( this.events , 'empty' , null , ctx , true ) ; }
} ;



Scheduler.prototype.getActorData = function( actor ) {
	if ( ! actor ) { return ; }

	var actorData = Object.assign( {} , this.actors.get( actor ) ) ;
	actorData['stage-name'] = Scheduler.STAGE_INDEX_TO_NAME[ actorData.stage ] ;
	actorData.time = this.time ;	// Add current scheduler time
	return actorData ;
} ;



Scheduler.prototype.setActorData = function( actor , data ) {
	if ( ! actor ) { return ; }

	var actorData = this.actors.get( actor ) ;
	if ( ! actorData ) { return ; }

	actorData.set( this.time , data ) ;
	return actorData ;
} ;



Scheduler.prototype.setActorAction = async function( actor , data , ctx ) {
	if ( ! actor || ! data.action ) { return ; }

	var actorData = this.actors.get( actor ) ;
	if ( ! actorData || actorData.stage !== Scheduler.COMMAND ) { return ; }

	actorData.startAction( this.time , data ) ;
	log.hdebug( "%s is starting preparing phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , actor.name , actorData['start-at'] , actorData['end-at'] , actorData['end-at'] - actorData['start-at'] ) ;

	var eventData = this.buildEventData( actor , actorData , Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ Scheduler.COMMAND ] ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
} ;



Scheduler.prototype.actorAwait = async function( actor , readyTime , ctx ) {
	if ( ! actor || ! readyTime ) { return ; }

	var actorData = this.actors.get( actor ) ;
	if ( ! actorData || actorData.stage !== Scheduler.COMMAND ) { return ; }

	log.hdebug( ">>>>>>> time Δ: %[.2]f" , readyTime ) ;
	actorData.await( this.time , readyTime ) ;
	log.hdebug( "%s is starting readying phase (await), start: %[.2]f end: %[.2]f Δ: %[.2]f" , actor.name , actorData['start-at'] , actorData['end-at'] , actorData['end-at'] - actorData['start-at'] ) ;

	var eventData = this.buildEventData( actor , actorData , 'await' ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
} ;



Scheduler.prototype.actorBreak = async function( actor , recoveryTime , cooldownTime , ctx ) {
	if ( ! actor ) { return ; }

	var actorData = this.actors.get( actor ) ;
	if ( ! actorData ) { return ; }

	var event = actorData.break( this.time , recoveryTime , cooldownTime ) ;
	log.hdebug( "%s is breaking, start: %[.2]f end: %[.2]f Δ: %[.2]f" , actor.name , actorData['start-at'] , actorData['end-at'] , actorData['end-at'] - actorData['start-at'] ) ;

	var eventData = this.buildEventData( actor , actorData , event ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
} ;



// Cancel is like break, but it only works in preparation phase, it is the actor itself that stop the action, not external conditions,
// the recovery/cooldown time applied is pro-rata of the elapsed time in the preparation phase.
Scheduler.prototype.actorCancel = async function( actor , ctx ) {
	if ( ! actor ) { return ; }

	var actorData = this.actors.get( actor ) ;
	if ( ! actorData || actorData.stage !== Scheduler.PREPARATION ) { return ; }

	var rate = ( ( this.time - actorData['start-at'] ) / ( actorData['end-at'] - actorData['start-at'] ) ) || 0 ;
	rate = rate < 0 ? 0 : rate > 1 ? 1 : rate ;
	
	var recoveryTime = rate * actorData['recovery-time'] ,
		cooldownTime = rate * actorData['cooldown-time'] ;

	actorData.break( this.time , recoveryTime , cooldownTime ) ;
	log.hdebug( "%s is canceling, start: %[.2]f end: %[.2]f Δ: %[.2]f" , actor.name , actorData['start-at'] , actorData['end-at'] , actorData['end-at'] - actorData['start-at'] ) ;

	var eventData = this.buildEventData( actor , actorData , 'cancel' ) ;
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
} ;



// Lookup for the next event
Scheduler.prototype.lookup = function( events = null , excludingActor = null , fallback = false ) {
	var actor , actorData , nextActor , nextDryData , dryData ,
		nextTime = Infinity ;

	if ( Array.isArray( events ) ) { events = new Set( [ ... events ] ) ; }
	else if ( ! ( events instanceof Set ) ) { events = null ; }

	//log.hdebug( "****** params -- ev: %Y , perf: %Y" , events , excludingActor ) ;

	for ( [ actor , actorData ] of this.actors ) {
		if ( excludingActor === actor ) { continue ; }

		dryData = actorData.getNextMatchingEvent( this.time , events , fallback ) ;

		if ( dryData && dryData.time >= this.time && dryData.time < nextTime ) {
			nextTime = dryData.time ;
			nextActor = actor ;
			nextDryData = dryData ;
		}
	}

	if ( ! nextActor ) { return null ; }

	nextDryData['elapsed-time'] = nextDryData.time - this.time ;
	//log.hdebug( "****** Returning: %Y (actor: %s)" , nextDryData , nextActor.name ) ;

	return nextDryData ;
} ;



// Advance the scheduler to the next event or to the given duration (whichever comes first)
Scheduler.prototype.advance = async function( maxDuration , ctx , dry = false ) {
	var actor , actorData , nextActor , nextActorData , maxTime , eventData , dryData , ended ,
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
	for ( [ actor , actorData ] of this.actors ) {
		if ( actorData['end-at'] >= this.time && actorData['end-at'] < nextTime && actorData['end-at'] <= maxTime ) {
			nextTime = actorData['end-at'] ;
			nextActor = actor ;
			nextActorData = actorData ;
		}
	}

	// Exit if nothing was found...
	if ( ! nextActor ) {
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
		dryData = nextActorData.nextStage( nextTime , true ) ;
		dryData['elapsed-time'] = elapsedTime ;
		return dryData ;
	}

	log.hdebug( "%s is finishing %s phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , nextActor.name , Scheduler.STAGE_INDEX_TO_NAME[ nextActorData.stage ] , nextActorData['start-at'] , nextActorData['end-at'] , nextActorData['end-at'] - nextActorData['start-at'] ) ;
	
	// Build event data *BEFORE* updating the stages: those events are supposed to be triggered at the end of the phase,
	// but the uninterruptible event is emitted at the end of the function to avoid listeners' side-effect to be cancelled out.
	eventData = this.buildEventData( nextActor , nextActorData ) ;

	// Now update then move the current time to that event
	nextActorData.nextStage( nextTime ) ;
	ended = nextActorData.stage === Scheduler.READY ;	// set it now, it can be changed by event
	this.time = nextTime ;

	// Finally emit events
	if ( elapsedTime ) { await ctx.emitEventOnBusAsync( this.events , 'elapsed' , elapsedTime , ctx , true ) ; }
	await ctx.emitEventOnBusAsync( this.events , eventData.event , eventData , ctx , true ) ;
	if ( ended ) { ctx.emitEventOnBusAsync( this.events , 'end' , eventData , ctx , true ) ; }

	log.hdebug( "    >>>> %s is starting %s phase, start: %[.2]f end: %[.2]f Δ: %[.2]f" , nextActor.name , Scheduler.STAGE_INDEX_TO_NAME[ nextActorData.stage ] , nextActorData['start-at'] , nextActorData['end-at'] , nextActorData['end-at'] - nextActorData['start-at'] ) ;
} ;



Scheduler.prototype.buildEventData = function( actor , actorData , eventOveride = null ) {
	var eventData = Object.assign( { actor } , actorData ) ;
	eventData.event = eventOveride ?? Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ actorData.stage ] ;

	// Prevent a bug due to complicated code flow because of events, where .released is only true starting at the recovery phase
	if ( eventData.event === 'released' ) { eventData.released = true ; }

	return eventData ;
} ;



function ActorData( actor , time , readyTime ) {
	readyTime = + readyTime || 0 ;

	this.event = 'ready' ;
	this.action = null ;	// string, userland usage
	this['action-data'] = null ;	// array/object/whatever... userland usage
	this.released = false ;	// true once the action was released
	this.interrupted = false ;	// true if its a interrupted cycle: something interrupted the regular phase cycle
	this.broken = false ;	// true if break/cancel was called during the cycle
	this.stage = Scheduler.READY ;

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

ActorData.prototype.__prototypeUID__ = 'spellcast/Scheduler/ActorData' ;
ActorData.prototype.__prototypeVersion__ = require( '../package.json' ).version ;

Scheduler.ActorData = ActorData ;



// Clear action, when looping at stage 0 (READYING)
ActorData.prototype.clearAction = function() {
	this.action = null ;
	this['action-data'] = null ;
	this.released = false ;
	this.interrupted = false ;
	this.broken = false ;

	this['preparation-time'] = 0 ;
	this['release-time'] = 0 ;
	this['recovery-time'] = 0 ;
	this['cooldown-time'] = 0 ;
} ;



// Set limited data
ActorData.prototype.set = function( time , data ) {
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
ActorData.prototype.startAction = function( time , data ) {
	this.action = data.action ;
	this['action-data'] = data['action-data'] !== undefined ? data['action-data'] : null ;
	this.interrupted = false ;
	this.broken = false ;
	this.released = false ;

	if ( data['ready-time'] !== undefined ) { this['ready-time'] = + data['ready-time'] || 0 ; }
	if ( data['preparation-time'] !== undefined ) { this['preparation-time'] = + data['preparation-time'] || 0 ; }
	if ( data['release-time'] !== undefined ) { this['release-time'] = + data['release-time'] || 0 ; }
	if ( data['recovery-time'] !== undefined ) { this['recovery-time'] = + data['recovery-time'] || 0 ; }
	if ( data['cooldown-time'] !== undefined ) { this['cooldown-time'] = + data['cooldown-time'] || 0 ; }

	this.stage = Scheduler.PREPARATION ;
	this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
	this['start-at'] = time ;
	this['end-at'] = time + this['preparation-time'] ;
} ;



// The actor, which was ready, return to the readying phase
ActorData.prototype.await = function( time , readyTime ) {
	if ( readyTime !== undefined ) { this['ready-time'] = + readyTime || 0 ; }

	this.stage = Scheduler.READY ;
	this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
	this['start-at'] = time ;
	this['end-at'] = time + this['ready-time'] ;
} ;



// The actor is broken, it usually turns to recovering phase except if it is releasing
ActorData.prototype.break = function( time , recoveryTime = 0 , cooldownTime = 0 ) {
	recoveryTime = + recoveryTime || 0 ;
	cooldownTime = + cooldownTime || 0 ;
	this.broken = true ;

	switch ( this.stage ) {
		case Scheduler.READY :
		case Scheduler.COMMAND :
			this.stage = Scheduler.RECOVERY ;
			this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
			this.interrupted = true ;

			// This is the simplest case, we simply switch immediately to recovery with given times
			this['recovery-time'] = recoveryTime ;
			this['cooldown-time'] = cooldownTime ;

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			return 'break-before' ;

		case Scheduler.PREPARATION :
			this.stage = Scheduler.RECOVERY ;
			this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
			this.interrupted = true ;

			// Since the action is aborted (no release), we use the greatest time
			if ( recoveryTime > this['recovery-time'] ) { this['recovery-time'] = recoveryTime ; }
			if ( cooldownTime > this['cooldown-time'] ) { this['cooldown-time'] = cooldownTime ; }

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			return 'break' ;

		case Scheduler.RELEASE :
			// The action is unbreakable, but we will add additional times to the action times
			this['recovery-time'] += recoveryTime ;
			this['cooldown-time'] += cooldownTime ;
			return 'unbreakable' ;

		case Scheduler.RECOVERY :
			// We are already recovering, we add the current time to the recovery time,
			// 'interrupted' is not set, because the cycle is not modified
			this['recovery-time'] += recoveryTime ;
			this['cooldown-time'] += cooldownTime ;
			this['end-at'] += recoveryTime ;
			return 'break-after' ;

		case Scheduler.COOLDOWN :
			this.stage = Scheduler.RECOVERY ;
			this.event = Scheduler.STAGE_INDEX_TO_NEXT_EVENT[ this.stage ] ;
			this.interrupted = true ;

			// We are cooling down, so we go back to recovery, cooldown time will include current remaining time
			this['recovery-time'] = recoveryTime ;
			this['cooldown-time'] = cooldownTime + this['end-at'] - time ;

			this['start-at'] = time ;
			this['end-at'] = time + this['recovery-time'] ;
			return 'break-after' ;
	}
} ;



ActorData.prototype.nextStage = function( time , dry = false ) {
	var event , stage , timeKey , startAt , endAt , released ,
		looped = false ,
		currentStage = dry?.stage ?? this.stage ;

	if ( currentStage === Scheduler.COMMAND ) { return ; }

	stage = currentStage + 1 ;
	if ( stage > Scheduler.COOLDOWN ) {
		looped = true ;
		stage = Scheduler.READY ;
	}

	released = currentStage === Scheduler.RELEASE ;
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
ActorData.prototype.getNextMatchingEvent = function( time , eventTypes = null , fallback = false ) {
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

