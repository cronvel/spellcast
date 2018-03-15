/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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
//Scheduler.prototype = Object.create( Ngev.prototype ) ;
//Scheduler.prototype.constructor = Scheduler ;
Scheduler.prototype.__prototypeUID__ = 'spellcast/Scheduler' ;
Scheduler.prototype.__prototypeVersion__ = require( '../package.json' ).version ;

module.exports = Scheduler ;



// The previous action is completed, the subject is readying itself, the duration depends on its quickness.
// Once finished, a 'ready' event is fired and the subject can choose to act.
// If it doesn't, then a new 'readying' phase is initiated... and so on...
Scheduler.READYING = 0 ;

// Remain 'ready' once an action is set up
Scheduler.READY = 1 ;

// The subject prepare the action, this phase is breakable/cancellable, once finished a 'prepared' event is fired.
Scheduler.PREPARING = 2 ;

// The subject is releasing the action, the action is not interruptible/cancellable anymore.
// Once finished a 'released' event is fired: the consequences of the action are applied.
Scheduler.RELEASING = 3 ;

// The subject is either recovering/returning from a released action, or recovering from being broken/cancelled.
// Once finished, a 'recovered' event is fired.
Scheduler.RECOVERING = 4 ;

/*
	Breaking:
	When an subject is messing with another, it can 'break' its action: the subject's phase go immediately to 'recovering'.
	If the subject is releasing, it is to late to break it, but the recovery time will be the greatest of
	the action recovery and the break recovery.

	Cancelling:
	Only possible when the subject is 'preparing'. The subject switch immediately to the 'recovering' state.
*/



Scheduler.create = function create( subjects ) {
	var self = Object.create( Scheduler.prototype , {
		time: { value: 0 , writable: true , enumerable: true } ,
		subjects: { value: [] , enumerable: true } ,
		"subject-data": { value: [] , enumerable: true } ,
		events: { value: new Ngev() , enumerable: true }
	} ) ;

	self.events.setInterruptible( true ) ;
	self.events.setNice( Ngev.DESYNC ) ;
	self.events.desyncUseNextTick( true ) ;
	self.events.serializeListenerContext( 'script' ) ;

	return self ;
} ;



Scheduler.prototype.addSubject = function addSubject( subject , readyTime ) {
	this.subjects.push( subject ) ;

	readyTime = readyTime || 0 ;

	this['subject-data'].push( {
		subject: subject ,
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



Scheduler.prototype.removeSubject = function removeSubject( subject , ctx , callback ) {
	//log.fatal( "removeSubject" ) ;
	if ( ! subject ) { return null ; }

	var indexOf = this.subjects.indexOf( subject ) ;

	if ( indexOf === -1 ) { return null ; }

	this.subjects.splice( indexOf , 1 ) ;
	this['subject-data'].splice( indexOf , 1 ) ;

	if ( ! this.subjects.length ) {
		//log.fatal( "removeSubject: emit empty" ) ;
		//callback() ;
		this.events.emit( 'empty' , null , ctx , () => callback() ) ;
		return ;
	}

	return null ;
} ;



Scheduler.prototype.setSubject = function setSubject( subject , data ) {
	if ( ! subject ) { return ; }

	var indexOf = this.subjects.indexOf( subject ) ;

	if ( indexOf === -1 ) { return ; }

	var subjectData = this['subject-data'][ indexOf ] ;

	if ( 'ready-time' in data ) { subjectData['ready-time'] = data['ready-time'] || 0 ; }
	if ( 'prepare-time' in data ) { subjectData['prepare-time'] = data['prepare-time'] || 0 ; }
	if ( 'release-time' in data ) { subjectData['release-time'] = data['release-time'] || 0 ; }
	if ( 'recover-time' in data ) { subjectData['recover-time'] = data['recover-time'] || 0 ; }

	return subjectData ;
} ;



Scheduler.prototype.setSubjectAction = function setSubjectAction( subject , data , ctx , callback ) {
	if ( ! subject || ! data.action ) { return null ; }

	var indexOf = this.subjects.indexOf( subject ) ;

	if ( indexOf === -1 ) { return null ; }

	var subjectData = this['subject-data'][ indexOf ] ;

	if ( subjectData.state !== Scheduler.READY ) { return null ; }

	subjectData.action = data.action ;
	subjectData['action-data'] = 'action-data' in data ? data['action-data'] : null ;

	if ( 'ready-time' in data ) { subjectData['ready-time'] = data['ready-time'] || 0 ; }
	if ( 'prepare-time' in data ) { subjectData['prepare-time'] = data['prepare-time'] || 0 ; }
	if ( 'release-time' in data ) { subjectData['release-time'] = data['release-time'] || 0 ; }
	if ( 'recover-time' in data ) { subjectData['recover-time'] = data['recover-time'] || 0 ; }

	subjectData.event = 'started' ;
	subjectData.state = Scheduler.PREPARING ;
	subjectData.time = this.time ;
	subjectData['end-time'] = this.time + subjectData['prepare-time'] ;

	this.events.emit( subjectData.event , subjectData , ctx , () => callback() ) ;

	return ;
} ;



// Advance the scheduler to the next event or to the given duration (whichever comes first)
Scheduler.prototype.advance = function advance( maxDuration , ctx , callback ) {
	var i , iMax , subjectData ,
		nextTime = Infinity , nextSubject , nextSubjectData , maxTime ,
		elapsedTime = 0 , lastTime = this.time ;

	if ( maxDuration === undefined ) {
		maxDuration = Infinity ;
		maxTime = Infinity ;
	}
	else {
		maxTime = this.time + maxDuration ;
	}

	// First, get the next time event, those with the lowest non-null time
	for ( i = 0 , iMax = this.subjects.length ; i < iMax ; i ++ ) {
		//at = this.subjects[ i ].activeTime ;
		subjectData = this['subject-data'][ i ] ;

		if ( subjectData['end-time'] >= this.time && subjectData['end-time'] < nextTime && subjectData['end-time'] <= maxTime ) {
			nextTime = subjectData['end-time'] ;
			nextSubject = this.subjects[ i ] ;
			nextSubjectData = subjectData ;
		}
	}

	// Exit if nothing was found...
	if ( ! nextSubject ) {
		// In duration mode, we advance at least to this duration
		if ( maxDuration !== Infinity ) {
			this.time = maxTime ;
			elapsedTime = this.time - lastTime ;

			if ( elapsedTime ) {
				this.events.emit( 'elapsed' , elapsedTime , ctx , () => callback() ) ;
				return ;
			}
		}

		return null ;
	}

	// Move the current time to the next time event
	this.time = nextSubjectData['end-time'] ;
	elapsedTime = this.time - lastTime ;
	nextSubjectData.time = this.time ;

	switch ( nextSubjectData.state ) {
		case Scheduler.READYING :
			nextSubjectData.event = 'ready' ;
			nextSubjectData.state = Scheduler.READY ;
			nextSubjectData['end-time'] = Infinity ;
			break ;

		case Scheduler.READY :
			// Not possible, nextSubjectData['end-time'] === Infinity when state is ready.
			return null ;

		case Scheduler.PREPARING :
			nextSubjectData.event = 'prepared' ;
			nextSubjectData.state = Scheduler.RELEASING ;
			nextSubjectData['end-time'] = this.time + nextSubjectData['release-time'] ;
			break ;

		case Scheduler.RELEASING :
			nextSubjectData.event = 'released' ;
			nextSubjectData.state = Scheduler.RECOVERING ;
			nextSubjectData['end-time'] = this.time + nextSubjectData['recover-time'] ;
			break ;

		case Scheduler.RECOVERING :
			nextSubjectData.event = 'recovered' ;
			nextSubjectData.state = Scheduler.READYING ;
			nextSubjectData['end-time'] = this.time + nextSubjectData['ready-time'] ;
			break ;
	}

	if ( elapsedTime ) {
		this.events.emit( 'elapsed' , elapsedTime , ctx , () => {
			//log.error( "emit elapsed CB" ) ;
			//log.error( '%I' , nextSubjectData ) ;
			//this.events.emit( nextSubjectData.event , nextSubjectData , ctx , callback ) ;
			//log.error( "this.events: %I" , this.events.__ngev.listeners ) ;
			this.events.emit( nextSubjectData.event , nextSubjectData , ctx , () => {
				//log.error( "emit ev CB" ) ;
				callback() ;
			} ) ;
		} ) ;
		return ;
	}

	this.events.emit( nextSubjectData.event , nextSubjectData , ctx , () => callback() ) ;
} ;


