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
		
		// Usages/functions of this entity, i.e. a per-function stats and bonuses, K/V pairs as function name/bonuses, 
        // where bonuses is an object with keys: params, stats, skills, status, compound, adhoc
		usageTypes: { value: options.usageTypes || [] , writable: true , enumerable: true } ,
		
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
		
		// Compound stats bonuses (if any)
		compound: { value: options.compound || {} , writable: true , enumerable: true } ,
		
		// Usages/functions of this entity, i.e. a per-function stats and bonuses, K/V pairs as function name/bonuses, 
        // where bonuses is an object with keys: params, stats, skills, status, compound, adhoc
		usages: { value: options.usages || {} , writable: true , enumerable: true } ,
		
		// Items owned by the entity, but not active (e.g. it's inventory)
		items: { value: options.items || [] , writable: true , enumerable: true } ,
		
		// K/V -- key: slot type, value: number of slots available
		slots: { value: options.slots || {} , writable: true , enumerable: true } ,
		
		// K/V -- key: the slot, value: array of items
		equippedItems: { value: options.equippedItems || {} , writable: true , enumerable: true } ,
		
		// Entities owned by the entity (e.g. allies, familiar, crew, ...)
		entities: { value: options.entities || [] , writable: true , enumerable: true } ,
		
		// Actual computed stats and skills, after considering all bonuses provided by items
		// Contains stats, skills, status, compound
		actual: { value: {} , writable: true , enumerable: true } ,
		
		// Actual per-usage computed stats and skills, after considering all bonuses provided by items
		actualUsages: { value: {} , writable: true , enumerable: true } ,
		
		// Adhoc namespace where script and API may store temporary data related to the entity (e.g. attack score, ...)
		adhoc: { value: options.adhoc || {} , writable: true , enumerable: true } ,
	} ) ;
	
	//log.error( "raw entity: %I" , self ) ;
	
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
	this.updateActualUsages() ;
} ;



Entity.prototype.computeCompound = function computeCompound( ctx , usage )
{
	usage = usage || 'global' ;
	if ( ! this.book.compoundStats[ this.class ] || ! this.book.compoundStats[ this.class ][ usage ] ) { return {} ; }
	
	var compound = this.book.compoundStats[ this.class ][ usage ].getRecursiveFinalContent( ctx ) ;
	//log.debug( "Compound stats: %I" , compound ) ;
	return compound ;
} ;



Entity.prototype.updateActual = function updateActual()
{
	var k ,
		paramsStack = [ {} , this.params ] ,
		statsStack = [ {} , this.stats ] ,
		skillsStack = [ {} , this.skills ] ,
		statusStack = [ {} , this.status ] ,
		compoundStack = [ {} , undefined , this.compound ] ;
	
	// First, get all active items
	for ( k in this.equippedItems )
	{
		this.equippedItems[ k ].forEach( item => {	// jshint ignore:line
			paramsStack.push( item.params ) ;
			statsStack.push( item.stats ) ;
			skillsStack.push( item.skills ) ;
			statusStack.push( item.status ) ;
			compoundStack.push( item.compound ) ;
		} ) ;
	}
	
	//log.debug( "Stack: %I" , statsStack ) ;
	
	this.actual.params = kungFig.reduceToObject.apply( kungFig , paramsStack ) ;
	this.actual.stats = kungFig.reduceToObject.apply( kungFig , statsStack ) ;
	this.actual.skills = kungFig.reduceToObject.apply( kungFig , skillsStack ) ;
	this.actual.status = kungFig.reduceToObject.apply( kungFig , statusStack ) ;
	
	/*
		The order is critical:
		- first compute all actual non-compound stats/skills/whatever
		- then compute compound stats once every item bonuses are applied
		- finally apply compound bonuses from items
	*/
	
	compoundStack[ 1 ] = this.computeCompound( this.actual ) ;	// compoundStack was not computable until now
	//log.debug( "Compound stack: %I" , compoundStack ) ;
	this.actual.compound = kungFig.reduceToObject.apply( kungFig , compoundStack ) ;
	
	//log.debug( "Actual stats: %I" , this.actual ) ;
} ;



Entity.prototype.updateActualUsages = function updateActualUsages()
{
	//log.error( "Usage: %I" , this.usageTypes ) ;
	this.usageTypes.forEach( usage => this.updateOneActualUsage( usage ) ) ;
} ;


	
Entity.prototype.updateOneActualUsage = function updateOneActualUsage( usage )
{
	var k ,
		paramsStack = [ {} , this.actual.params ] ,
		statsStack = [ {} , this.actual.stats ] ,
		skillsStack = [ {} , this.actual.skills ] ,
		statusStack = [ {} , this.actual.status ] ,
		compoundStack = [ {} , undefined , this.compound ] ;
	
	if ( this.usages[ usage ] )
	{
		if ( this.usages[ usage ].params ) { paramsStack.push( this.usages[ usage ].params ) ; }
		if ( this.usages[ usage ].stats ) { statsStack.push( this.usages[ usage ].stats ) ; }
		if ( this.usages[ usage ].skills ) { skillsStack.push( this.usages[ usage ].skills ) ; }
		if ( this.usages[ usage ].status ) { statusStack.push( this.usages[ usage ].status ) ; }
		if ( this.usages[ usage ].compound ) { compoundStack.push( this.usages[ usage ].compound ) ; }
	}
	
	// First, get all active items
	for ( k in this.equippedItems )
	{
		this.equippedItems[ k ].forEach( item => {	// jshint ignore:line
			compoundStack.push( item.compound ) ;	// Always add global compound bonuses
			if ( ! item.usages[ usage ] ) { return ; }
			if ( item.usages[ usage ].params ) { paramsStack.push( item.usages[ usage ].params ) ; }
			if ( item.usages[ usage ].stats ) { statsStack.push( item.usages[ usage ].stats ) ; }
			if ( item.usages[ usage ].skills ) { skillsStack.push( item.usages[ usage ].skills ) ; }
			if ( item.usages[ usage ].status ) { statusStack.push( item.usages[ usage ].status ) ; }
			if ( item.usages[ usage ].compound ) { compoundStack.push( item.usages[ usage ].compound ) ; }
		} ) ;
	}
	
	//log.debug( "Stack: %I" , statsStack ) ;
	
	this.actualUsages[ usage ] = {} ;
	this.actualUsages[ usage ].params = kungFig.reduceToObject.apply( kungFig , paramsStack ) ;
	this.actualUsages[ usage ].stats = kungFig.reduceToObject.apply( kungFig , statsStack ) ;
	this.actualUsages[ usage ].skills = kungFig.reduceToObject.apply( kungFig , skillsStack ) ;
	this.actualUsages[ usage ].status = kungFig.reduceToObject.apply( kungFig , statusStack ) ;
	
	/*
		The order is critical:
		- first compute all actual non-compound stats/skills/whatever
		- then compute compound stats once every item bonuses are applied
		- finally apply compound bonuses from items
	*/
	
	compoundStack[ 1 ] = this.computeCompound( this.actualUsages[ usage ] , usage ) ;	// compoundStack was not computable until now
	//log.debug( "Usage compound stack: %I" , compoundStack ) ;
	this.actualUsages[ usage ].compound = kungFig.reduceToObject.apply( kungFig , compoundStack ) ;
	
	//log.debug( "Usage '%s' stats: %I" , usage , this.actualUsages[ usage ] ) ;
} ;


