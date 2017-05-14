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



function Role() { throw new Error( 'Use Role.create() instead.' ) ; }
Role.prototype = Object.create( Ngev.prototype ) ;
Role.prototype.constructor = Role ;

module.exports = Role ;

Role.prototype.__prototypeUID__ = 'spellcast/Role' ;
Role.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



Role.create = function create( id , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	var self = Object.create( Role.prototype , {
		id: { value: id , enumerable: true } ,
		label: { value: options.label || '(undefined)' , writable: true , enumerable: true } ,
		client: { value: options.client || null , writable: true , enumerable: true } ,
		nextSelected: { value: null , writable: true , enumerable: true } ,
		entity: { value: null , writable: true , enumerable: true } ,
		entities: { value: [] , enumerable: true } ,
	} ) ;
	
	return self ;
} ;



Role.prototype.assignClient = function assignClient( client )
{
	// Already a client assigned? Unassign it first.
	if ( this.client ) { this.unassignClient() ; }
	
	this.client = client ;
	this.client.role = this ;
	Ngev.share( this.client , this ) ;
} ;



Role.prototype.unassignClient = function unassignClient()
{
	if ( ! this.client ) { return ; }
	
	this.client.role = null ;
	this.client = null ;
	Ngev.reset( this ) ;
} ;



Role.prototype.addEntity = function addEntity( entity )
{
	entity.npc = false ;
	if ( ! this.entity ) { this.entity = entity ; }
	this.entities.push( entity ) ;
} ;


