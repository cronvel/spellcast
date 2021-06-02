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
	Object.defineProperties( this , {
		time: { value: 0 , writable: true , enumerable: true } ,
		performers: { value: [] , enumerable: true } ,
		"performer-data": { value: [] , enumerable: true } ,
		events: { value: new Ngev() , enumerable: true }
	} ) ;

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
Scheduler.READYING = 0 ;

// Remain 'ready' once an action is set up
Scheduler.READY = 1 ;

// The performer prepare the action, this phase is breakable/cancellable, once finished a 'prepared' event is fired.
Scheduler.PREPARING = 2 ;

// The performer is releasing the action, the action is not interruptible/cancellable anymore.
// Once finished a 'released' event is fired: the consequences of the action are applied.
Scheduler.RELEASING = 3 ;

// The performer is either recovering/returning from a released action, or recovering from being broken/cancelled.
// Once finished, a 'recovered' event is fired.
Scheduler.RECOVERING = 4 ;

/*
	Breaking:
	When an performer is messing with another, it can 'break' its action: the performer's phase go immediately to 'recovering'.
	If the performer is releasing, it is to late to break it, but the recovery time will be the greatest of
	the action recovery and the break recovery.

	Cancelling:
	Only possible when the performer is 'preparing'. The performer switch immediately to the 'recovering' state, with a lesser recovery time.
*/



// For backward compatibility
Scheduler.create = function create( ... args ) { return new Scheduler( ... args ) ; } ;



Scheduler.prototype.addPerformer = function( performer , readyTime ) {
	this.performers.push( performer ) ;

	readyTime = + readyTime || 0 ;

	this['performer-data'].push( {
		performer: performer ,
		event: null ,
		action: null ,	// string, userland usage
		"action-data": null ,	// array/object/whatever... userland usage
		state: Scheduler.READYING ,
		time: this.time ,
		"end-time": this.time + readyTime ,
		"ready-time": readyTime ,
		"prepare-time": 0 ,
		"release-time": 0 ,
		"recover-time": 0
	} ) ;
} ;



Scheduler.prototype.removePerformer = function( performer , ctx , callback ) {
	//log.fatal( "removePerformer" ) ;
	if ( ! performer ) { return null ; }

	var indexOf = this.performers.indexOf( performer ) ;

	if ( indexOf === -1 ) { return null ; }

	this.performers.splice( indexOf , 1 ) ;
	this['performer-data'].splice( indexOf , 1 ) ;

	if ( ! this.performers.length ) {
		//this.events.emit( 'empty' , null , ctx , () => callback() ) ;
		ctx.emitEventOnBus( this.events , 'empty' , null , ctx , () => callback() ) ;
		return ;
	}

	return null ;
} ;



Scheduler.prototype.setPerformer = function( performer , data ) {
	if ( ! performer ) { return ; }

	var indexOf = this.performers.indexOf( performer ) ;

	if ( indexOf === -1 ) { return ; }

	var performerData = this['performer-data'][ indexOf ] ;

	if ( 'ready-time' in data ) { performerData['ready-time'] = + data['ready-time'] || 0 ; }
	if ( 'prepare-time' in data ) { performerData['prepare-time'] = + data['prepare-time'] || 0 ; }
	if ( 'release-time' in data ) { performerData['release-time'] = + data['release-time'] || 0 ; }
	if ( 'recover-time' in data ) { performerData['recover-time'] = + data['recover-time'] || 0 ; }

	return performerData ;
} ;



Scheduler.prototype.setPerformerAction = function( performer , data , ctx , callback ) {
	if ( ! performer || ! data.action ) { return null ; }

	var indexOf = this.performers.indexOf( performer ) ;

	if ( indexOf === -1 ) { return null ; }

	var performerData = this['performer-data'][ indexOf ] ;

	if ( performerData.state !== Scheduler.READY ) { return null ; }

	performerData.action = data.action ;
	performerData['action-data'] = 'action-data' in data ? data['action-data'] : null ;

	if ( 'ready-time' in data ) { performerData['ready-time'] = + data['ready-time'] || 0 ; }
	if ( 'prepare-time' in data ) { performerData['prepare-time'] = + data['prepare-time'] || 0 ; }
	if ( 'release-time' in data ) { performerData['release-time'] = + data['release-time'] || 0 ; }
	if ( 'recover-time' in data ) { performerData['recover-time'] = + data['recover-time'] || 0 ; }

	performerData.event = 'started' ;
	performerData.state = Scheduler.PREPARING ;
	performerData.time = this.time ;
	performerData['end-time'] = this.time + performerData['prepare-time'] ;

	//this.events.emit( performerData.event , performerData , ctx , () => callback() ) ;
	ctx.emitEventOnBus( this.events , performerData.event , performerData , ctx , () => callback() ) ;

	return ;
} ;



// Advance the scheduler to the next event or to the given duration (whichever comes first)
Scheduler.prototype.advance = function( maxDuration , ctx , callback ) {
	var i , iMax , performerData ,
		nextTime = Infinity , nextPerformer , nextPerformerData , maxTime ,
		elapsedTime = 0 , lastTime = this.time ;

	if ( maxDuration === undefined ) {
		maxDuration = Infinity ;
		maxTime = Infinity ;
	}
	else {
		maxTime = this.time + maxDuration ;
	}

	// First, get the next time event, those with the lowest non-null time
	for ( i = 0 , iMax = this.performers.length ; i < iMax ; i ++ ) {
		//at = this.performers[ i ].activeTime ;
		performerData = this['performer-data'][ i ] ;

		if ( performerData['end-time'] >= this.time && performerData['end-time'] < nextTime && performerData['end-time'] <= maxTime ) {
			nextTime = performerData['end-time'] ;
			nextPerformer = this.performers[ i ] ;
			nextPerformerData = performerData ;
		}
	}

	// Exit if nothing was found...
	if ( ! nextPerformer ) {
		// In duration mode, we advance at least to this duration
		if ( maxDuration !== Infinity ) {
			this.time = maxTime ;
			elapsedTime = this.time - lastTime ;

			if ( elapsedTime ) {
				//this.events.emit( 'elapsed' , elapsedTime , ctx , () => callback() ) ;
				ctx.emitEventOnBus( this.events , 'elapsed' , elapsedTime , ctx , () => callback() ) ;
				return ;
			}
		}

		return null ;
	}

	// Move the current time to the next time event
	this.time = nextPerformerData['end-time'] ;
	elapsedTime = this.time - lastTime ;
	nextPerformerData.time = this.time ;

	switch ( nextPerformerData.state ) {
		case Scheduler.READYING :
			nextPerformerData.event = 'ready' ;
			nextPerformerData.state = Scheduler.READY ;
			nextPerformerData['end-time'] = Infinity ;
			break ;

		case Scheduler.READY :
			// Not possible, nextPerformerData['end-time'] === Infinity when state is ready.
			return null ;

		case Scheduler.PREPARING :
			nextPerformerData.event = 'prepared' ;
			nextPerformerData.state = Scheduler.RELEASING ;
			nextPerformerData['end-time'] = this.time + nextPerformerData['release-time'] ;
			break ;

		case Scheduler.RELEASING :
			nextPerformerData.event = 'released' ;
			nextPerformerData.state = Scheduler.RECOVERING ;
			nextPerformerData['end-time'] = this.time + nextPerformerData['recover-time'] ;
			break ;

		case Scheduler.RECOVERING :
			nextPerformerData.event = 'recovered' ;
			nextPerformerData.state = Scheduler.READYING ;
			nextPerformerData['end-time'] = this.time + nextPerformerData['ready-time'] ;
			break ;
	}

	if ( elapsedTime ) {
		//this.events.emit( 'elapsed' , elapsedTime , ctx , () => {
		ctx.emitEventOnBus( this.events , 'elapsed' , elapsedTime , ctx , () => {
			//log.error( "emit elapsed CB" ) ;
			//log.error( '%I' , nextPerformerData ) ;
			//log.error( "this.events: %I" , this.events.__ngev.listeners ) ;

			//this.events.emit( nextPerformerData.event , nextPerformerData , ctx , () => {
			ctx.emitEventOnBus( this.events , nextPerformerData.event , nextPerformerData , ctx , () => {
				//log.error( "emit ev CB" ) ;
				callback() ;
			} ) ;
		} ) ;
		return ;
	}

	//this.events.emit( nextPerformerData.event , nextPerformerData , ctx , () => callback() ) ;
	ctx.emitEventOnBus( this.events , nextPerformerData.event , nextPerformerData , ctx , () => callback() ) ;
} ;

