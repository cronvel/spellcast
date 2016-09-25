/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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
var tree = require( 'tree-kit' ) ;

var log = require( 'logfella' ).global.use( 'spellcast' ) ;



function Entity() { throw new Error( 'Use Entity.create() instead.' ) ; }
module.exports = Entity ;

Entity.prototype.__prototypeUID__ = 'spellcast/Entity' ;
Entity.prototype.__prototypeVersion__ = require( '../package.json' ).version ;



var autoId = 0 ;



Entity.create = function create( book , id , options )
{
	if ( ! options || typeof options !== 'object' )
	{
		options = {} ;
	}
	else
	{
		// Clone options to avoid parts to be shared
		options = tree.extend(
			{
				deep: true ,
				deepFilter: { whitelist: [ Object.prototype , Array.prototype ] }
			} ,
			{} ,
			options
		) ;
	}
	
	if ( ! id ) { id = 'entity_' + ( autoId ++ ) ; }
	
	var self = Object.create( Entity.prototype , {
		book: { value: book } ,
		id: { value: id , enumerable: true } ,
		label: { value: options.label || '(unknown)' , writable: true , enumerable: true } ,
		
		// Entity class, if different type of entities exists in the game (characters, kingdoms, ...)
		class: { value: options.class || 'entity' , writable: true , enumerable: true } ,
		
		// True if the entity is a Non-Player Character, i.e. controled by the computer
		npc: { value: true , writable: true , enumerable: true } ,
		
		// Parameters of this entity
		params: { value: options.params || {} , writable: true , enumerable: true } ,
		
		// Statistics of this entity (attributes, e.g. strength, dexterity, ...)
		stats: { value: options.stats || {} , writable: true , enumerable: true } ,
		
		// Skills of this entity, almost like stats, but related to bonuses and open new actions (e.g. spells, ...)
		skills: { value: options.skills || {} , writable: true , enumerable: true } ,
		
		// Status of this entity (health, mana, xp, ...)
		status: { value: options.status || {} , writable: true , enumerable: true } ,
		
		// Stances of this entity, e.g. attitude, offensive/defensive stance, all passive reaction
		stances: { value: options.stances || {} , writable: true , enumerable: true } ,
		
		// Compound/derived statistics/attributes
		//compoundStats: { value: {} , writable: true , enumerable: true } ,
		
		// Items owned by the entity, but not active (e.g. it's inventory)
		items: { value: options.items || [] , writable: true , enumerable: true } ,
		
		// K/V -- key: slot type, value: number of slots available
		slots: { value: options.slots || {} , writable: true , enumerable: true } ,
		
		// K/V -- key: the slot, value: array of items
		equippedItems: { value: options.equippedItems || {} , writable: true , enumerable: true } ,
		
		// Entities owned by the entity (e.g. allies, familiar, crew, ...)
		entities: { value: options.entities || [] , writable: true , enumerable: true } ,
		
		// Actual computed stats and skills, after considering all bonuses provided by items
		// Contains stats and skills keys
		actual: { value: {} , writable: true , enumerable: true } ,
		
		// Actual per-context computed stats and skills, after considering all bonuses provided by items
		// Contains K/V -- K: action/context/function/usage, V: object containing stats and skills keys
		actions: { value: {} , writable: true , enumerable: true } ,
		
		// Adhoc namespace where script and API may store temporary data related to the entity (e.g. attack score, ...)
		adhoc: { value: options.adhoc || {} , writable: true , enumerable: true } ,
	} ) ;
	
	
	// Reduce label
	if ( Array.isArray( self.label ) )
	{
		self.label = self.label[ Math.floor( Math.random() * self.label.length ) ] ;
	}
	
	self.update() ;
	
	return self ;
} ;



Entity.prototype.update = function update()
{
	this.updateActual() ;
} ;



Entity.prototype.compound = function compound( ctx , type )
{
	type = type || 'global' ;
	if ( ! this.book.compoundStats[ this.class ] || ! this.book.compoundStats[ this.class ][ type ] ) { return {} ; }
	
	var compoundStats = this.book.compoundStats[ this.class ].global.getRecursiveFinalContent( ctx ) ;
	//log.warning( "Compound stats: %I" , compoundStats ) ;
	return compoundStats ;
} ;



Entity.prototype.updateActual = function updateActual()
{
	var k , compoundStats ,
		statsStack = [ {} , this.stats ] ,
		skillsStack = [ {} , this.skills ] ,
		statusStack = [ {} , this.status ] ,
		compoundStack = [ {} , undefined ] ;
	
	// First, get all active items
	for ( k in this.equippedItems )
	{
		this.equippedItems[ k ].forEach( item => {	// jshint ignore:line
			statsStack.push( item.stats ) ;
			skillsStack.push( item.skills ) ;
			statusStack.push( item.status ) ;
			compoundStack.push( item.compound ) ;
		} ) ;
	}
	
	//log.info( "Stack: %I" , statsStack ) ;
	
	this.actual.stats = kungFig.reduceToObject.apply( kungFig , statsStack ) ;
	this.actual.skills = kungFig.reduceToObject.apply( kungFig , skillsStack ) ;
	this.actual.status = kungFig.reduceToObject.apply( kungFig , statusStack ) ;
	
	/*
		The order is critical:
		- first compute all actual non-compound stats/skills/whatever
		- then compute compound stats once every item bonuses are applied
		- finally apply compound bonuses from items
	*/
	
	compoundStack[ 1 ] = this.compound( this.actual ) ;	// compoundStack was not computable until now
	log.info( compoundStack ) ;
	this.actual.compound = kungFig.reduceToObject.apply( kungFig , compoundStack ) ;
	
	log.warning( "Actual stats: %I" , this.actual ) ;
} ;


