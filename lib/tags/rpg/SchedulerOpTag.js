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



var kungFig = require( 'kung-fig' ) ;
var Tag = kungFig.Tag ;
var VarTag = kungFig.VarTag ;

var Scheduler = require( '../../rpg/Scheduler.js' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SchedulerOpTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof SchedulerOpTag ) ? this : Object.create( SchedulerOpTag.prototype ) ;
	
	VarTag.call( self , tag , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		fn: { value: self[ tag ] , enumerable: true } ,
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = SchedulerOpTag ;
SchedulerOpTag.prototype = Object.create( VarTag.prototype ) ;
SchedulerOpTag.prototype.constructor = SchedulerOpTag ;



SchedulerOpTag.prototype.run = function run( book , ctx , callback )
{
	var scheduler = this.ref.get( ctx.data ) ;
	
	if ( ! scheduler || typeof scheduler !== 'object' || scheduler.__prototypeUID__ !== 'spellcast/Scheduler' )
	{
		return null ;
	}
	
	var content = this.getRecursiveFinalContent( ctx.data ) ;
	
	return this.fn( ctx , scheduler , content , callback ) ;
} ;



SchedulerOpTag.prototype['add-to-scheduler'] = function( ctx , scheduler , content )
{
	if ( ! content || typeof content !== 'object' )
	{
		log.error( "[add-to-scheduler]'s argument should be an object" ) ;
		return null ;
	}
	
	if ( content.__prototypeUID__ === 'spellcast/Entity' )
	{
		scheduler.addEntity( content ) ;
		return null ;
	}
	
	if ( ! content.entity || typeof content.entity !== 'object' || content.entity.__prototypeUID__ !== 'spellcast/Entity' )
	{
		log.error( "[add-to-scheduler]'s argument should be an Entity or an object with an Entity as its 'entity' property" ) ;
		return null ;
	}
	
	scheduler.addEntity( content.entity , content.readyingDuration ) ;
	
	return null ;
} ;



SchedulerOpTag.prototype['remove-from-scheduler'] = function( ctx , scheduler , content )
{
	if ( ! content || typeof content !== 'object' || content.__prototypeUID__ !== 'spellcast/Entity' )
	{
		log.error( "[remove-from-scheduler]'s argument should be an Entity" ) ;
		return null ;
	}
	
	scheduler.removeEntity( content ) ;
	return null ;
} ;



SchedulerOpTag.prototype['schedule-action'] = function( ctx , scheduler , content )
{
	if ( ! content || typeof content !== 'object' )
	{
		log.error( "[schedule-action]'s argument should be an object" ) ;
		return null ;
	}
	
	if ( ! content.entity || typeof content.entity !== 'object' || content.entity.__prototypeUID__ !== 'spellcast/Entity' )
	{
		log.error( "[schedule-action]'s argument should be an object with an Entity as its 'entity' property" ) ;
		return null ;
	}
	
	scheduler.setAction( content.entity , content ) ;
	
	return null ;
} ;



SchedulerOpTag.prototype['advance-scheduler'] = function( ctx , scheduler , content , callback )
{
	if ( content && ( typeof content !== 'number' || isNaN( content ) ) )
	{
		log.error( "[advance-scheduler]'s argument (if present) should be a number" ) ;
		return null ;
	}
	
	scheduler.advance( content , ctx , callback ) ;
	
	return ;
} ;


