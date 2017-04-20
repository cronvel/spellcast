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
Entity.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



var autoId = 0 ;



Entity.create = function create( book , id , options )
{
	var slotType ;
	
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
		
		// Optional, if a model was used, this is the model ID
		model: { value: options.model || null , writable: true , enumerable: true } ,
		
		// Entity's description
		description: { value: options.description || options.label || '(unknown)' , writable: true , enumerable: true } ,
		
		// True if the entity is a Non-Player Character, i.e. controled by the computer
		npc: { value: options.npc !== undefined ? !! options.npc : true , writable: true , enumerable: true } ,
		
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
		
		// Goods that are not items, like gold/monney, etc...
		goods: { value: options.goods || {} , writable: true , enumerable: true } ,
		
		// Items owned by the entity, but not active (e.g. it's inventory)
		items: { value: options.items || [] , writable: true , enumerable: true } ,
		
		// K/V -- key: slot type, value: number of slots available
		slots: { value: options.slots || {} , writable: true , enumerable: true } ,
		
		// K/V -- key: the slot, value: array of items
		equippedItems: { value: options.equippedItems || {} , writable: true , enumerable: true } ,
		
		// Getter, flat version of .equippedItems, without slots (just a concat of all arrays)
		equippedItemList: { get: function() {
			var output = [] ;
			
			Object.keys( this.equippedItems ).forEach( slotType =>
				this.equippedItems[ slotType ].forEach( item => output.push( item ) )
			) ;
			
			return output ;
		} } ,
		
		// K/V -- key: the slot, value: array of items
		innateItems: { value: options.innateItems || {} , writable: true , enumerable: true } ,
		
		// K/V -- key: usage, value: item usage sub-object that is the primary item for that usage,
		// or self if some natural capabilities can be used
		primary: { value: {} , writable: true , enumerable: true } ,
		
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
	
	// Create slots
	for ( slotType in self.slots )
	{
		if ( ! Array.isArray( self.equippedItems[ slotType ] ) ) { self.equippedItems[ slotType ] = [] ; }
		if ( ! Array.isArray( self.innateItems[ slotType ] ) ) { self.innateItems[ slotType ] = [] ; }
	}
	
	// Remove unexisting slots for equipped item
	for ( slotType in self.equippedItems )
	{
		if ( ! self.slots[ slotType ] ) { delete self.equippedItems[ slotType ] ; }
	}
	
	// Remove unexisting slots for innate item
	for ( slotType in self.innateItems )
	{
		if ( ! self.slots[ slotType ] ) { delete self.innateItems[ slotType ] ; }
	}
	
	// Reduce label
	if ( Array.isArray( self.label ) )
	{
		self.label = self.label[ Math.floor( Math.random() * self.label.length ) ] ;
	}
	
	self.update() ;
	
	//log.error( "%Y" , self ) ;
	//log.error( "%Y" , self.actualUsages.missile ) ;
	
	return self ;
} ;



Entity.prototype.computeCompound = function computeCompound( ctx , usage , variation )
{
	var compound ;
	
	if ( usage )
	{
		if ( ! this.book.usageCompoundStats[ usage ] || ! this.book.usageCompoundStats[ usage ].default ) { return {} ; }
		
		compound = this.book.usageCompoundStats[ usage ].default.getRecursiveFinalContent( ctx ) ;
		
		if ( variation && this.book.usageCompoundStats[ usage ][ variation ] )
		{
			tree.extend( null , compound ,
				this.book.usageCompoundStats[ usage ][ variation ].getRecursiveFinalContent( ctx )
			) ;
		}
	}
	else
	{
		if ( ! this.book.entityCompoundStats[ this.class ] ) { return {} ; }
		compound = this.book.entityCompoundStats[ this.class ].getRecursiveFinalContent( ctx ) ;
	}
	
	//log.debug( "Compound stats: %I" , compound ) ;
	return compound ;
} ;



Entity.prototype.update = function update()
{
	this.updateActual() ;
	this.updateActualUsages() ;
	//log.debug( "actual: %I" , this.actual ) ;
	//log.info( "actual usages: %I" , this.actualUsages ) ;
	//log.error( "Update melee: %Y" , this.actualUsages.melee ) ;
	//log.error( "Update missile: %Y" , this.actualUsages.missile ) ;
} ;



Entity.prototype.updateActual = function updateActual()
{
	var slotType ,
		paramsStack = [ {} , this.params ] ,
		statsStack = [ {} , this.stats ] ,
		skillsStack = [ {} , this.skills ] ,
		statusStack = [ {} , this.status ] ,
		compoundStack = [ {} , undefined , this.compound ] ;
	
	// First, get all active items
	for ( slotType in this.slots )
	{
		if ( this.equippedItems[ slotType ].length )
		{
			this.equippedItems[ slotType ].forEach( item => {	// jshint ignore:line
				paramsStack.push( item.params ) ;
				statsStack.push( item.stats ) ;
				skillsStack.push( item.skills ) ;
				statusStack.push( item.status ) ;
				compoundStack.push( item.compound ) ;
			} ) ;
		}
		else if ( this.innateItems[ slotType ].length )
		{
			this.innateItems[ slotType ].forEach( item => {	// jshint ignore:line
				paramsStack.push( item.params ) ;
				statsStack.push( item.stats ) ;
				skillsStack.push( item.skills ) ;
				statusStack.push( item.status ) ;
				compoundStack.push( item.compound ) ;
			} ) ;
		}
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
	
	// compoundStack was not computable until now
	compoundStack[ 1 ] = this.computeCompound( this.actual ) ;
	
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
	var self = this , slotType , remaining , variation ,
		paramsStack = [ {} , this.actual.params ] ,
		statsStack = [ {} , this.actual.stats ] ,
		skillsStack = [ {} , this.actual.skills ] ,
		statusStack = [ {} , this.actual.status ] ,
		compoundStack = [ {} , undefined ] ;
	
	
	var activeUsage = function( element ) {
		
		compoundStack.push( element.compound ) ;	// Always add global compound bonuses
		
		if ( ! element.usages[ usage ] ) { return ; }
		
		if ( ! self.primary[ usage ] && element.usages[ usage ].primary ) { self.primary[ usage ] = element ; }
		//log.debug( "Element '%s' has usage '%s': %I" , element.label , usage , element.usages[ usage ] ) ;
		
		if ( self.primary[ usage ] === element )
		{
			if ( element.usages[ usage ].primary )
			{
				//log.debug( "add primary %I" , element.usages[ usage ].primary ) ;
				variation = element.usages[ usage ].primary.compoundVariation || null ;
				
				if ( element.usages[ usage ].primary.params ) { paramsStack.push( element.usages[ usage ].primary.params ) ; }
				if ( element.usages[ usage ].primary.stats ) { statsStack.push( element.usages[ usage ].primary.stats ) ; }
				if ( element.usages[ usage ].primary.skills ) { skillsStack.push( element.usages[ usage ].primary.skills ) ; }
				if ( element.usages[ usage ].primary.status ) { statusStack.push( element.usages[ usage ].primary.status ) ; }
				if ( element.usages[ usage ].primary.compound ) { compoundStack.push( element.usages[ usage ].primary.compound ) ; }
			}
			
			if ( element.usages[ usage ].extraSlot && remaining >= 1 )
			{
				//log.debug( "add extra slot %I" , element.usages[ usage ].extraSlot ) ;
				if ( element.usages[ usage ].extraSlot.params ) { paramsStack.push( element.usages[ usage ].extraSlot.params ) ; }
				if ( element.usages[ usage ].extraSlot.stats ) { statsStack.push( element.usages[ usage ].extraSlot.stats ) ; }
				if ( element.usages[ usage ].extraSlot.skills ) { skillsStack.push( element.usages[ usage ].extraSlot.skills ) ; }
				if ( element.usages[ usage ].extraSlot.status ) { statusStack.push( element.usages[ usage ].extraSlot.status ) ; }
				if ( element.usages[ usage ].extraSlot.compound ) { compoundStack.push( element.usages[ usage ].extraSlot.compound ) ; }
			}
		}
		else if ( element.usages[ usage ].support )
		{
			//log.debug( "add support %I" , element.usages[ usage ].support ) ;
			if ( element.usages[ usage ].support.params ) { paramsStack.push( element.usages[ usage ].support.params ) ; }
			if ( element.usages[ usage ].support.stats ) { statsStack.push( element.usages[ usage ].support.stats ) ; }
			if ( element.usages[ usage ].support.skills ) { skillsStack.push( element.usages[ usage ].support.skills ) ; }
			if ( element.usages[ usage ].support.status ) { statusStack.push( element.usages[ usage ].support.status ) ; }
			if ( element.usages[ usage ].support.compound ) { compoundStack.push( element.usages[ usage ].support.compound ) ; }
		}
	} ;
	
	// Add the entity itself, if it has some innate usages
	activeUsage( this ) ;
	
	// Then add all active items
	for ( slotType in this.slots )
	{
		remaining = this.slots[ slotType ] ;
		
		if ( this.equippedItems[ slotType ].length )
		{
			//log.debug( 'Usage: %s -- Slot: %s' , usage , slotType ) ;
			this.equippedItems[ slotType ].forEach( item => remaining -= item.slotCount ) ;	// jshint ignore:line
			this.equippedItems[ slotType ].forEach( activeUsage ) ;
		}
		else if ( this.innateItems[ slotType ].length )
		{
			//log.debug( 'Usage: %s -- Slot: %s' , usage , slotType ) ;
			// This does not make sens for innate items to be counted, as it is used only by the 'extraSlot' feature, but well...
			this.innateItems[ slotType ].forEach( item => remaining -= item.slotCount ) ;	// jshint ignore:line
			this.innateItems[ slotType ].forEach( activeUsage ) ;
		}
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
	
	// compoundStack was not computable until now
	compoundStack[ 1 ] = this.computeCompound( this.actualUsages[ usage ] , usage , variation ) ;
	
	//log.debug( "Usage compound stack: %I" , compoundStack ) ;
	this.actualUsages[ usage ].compound = kungFig.reduceToObject.apply( kungFig , compoundStack ) ;
	
	//log.debug( "Usage '%s' stats: %I" , usage , this.actualUsages[ usage ] ) ;
} ;



Entity.prototype.unequipItem = function unequipItem( item , options )
{
	var indexOf , usage ;
	
	options = options || {} ;
	
	if ( ! ( item.slotType in this.slots ) ) { return ; }
	
	// Search for the item in the slot
	indexOf = this.equippedItems[ item.slotType ].indexOf( item ) ;
	
	if ( indexOf === -1 )
	{
		log.error( "Not equipped!" ) ;
		return ;
	}
	
	// Remove the item from the slot
	this.equippedItems[ item.slotType ].splice( indexOf , 1 ) ;
	
	// Search and remove the item from any primary
	for ( usage in item.usages )
	{
		if ( this.primary[ usage ] === item )
		{
			this.primary[ usage ] = null ;
		}
	}
	
	// Add it to the passive inventory
	this.items.push( item ) ;
	
	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }
} ;



Entity.prototype.unequipSlot = function unequipSlot( slotType , options )
{
	var usage ;
	
	options = options || {} ;
	
	if ( ! ( slotType in this.slots ) ) { return ; }
	
	this.equippedItems[ slotType ].forEach( item => {
		
		// Add the item to the entity's unequipped items
		this.items.push( item ) ;
		
		// Search and remove the item from any primary
		for ( usage in item.usages )
		{
			if ( this.primary[ usage ] === item )
			{
				this.primary[ usage ] = null ;
			}
		}
	} ) ;
	
	// Remove all items from those slots
	this.equippedItems[ slotType ].length = 0 ;
	
	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }
} ;



Entity.prototype.unequipAll = function unequipAll( options )
{
	options = options || {} ;
	
	Object.keys( this.slots ).forEach( slotType => this.unequipSlot( slotType , { noUpdate: true } ) ) ;
	
	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }
} ;



Entity.prototype.equipItem = function equipItem( item , options )
{
	var indexOf ;
	
	options = options || {} ;
	
	if ( ! ( item.slotType in this.slots ) )
	{
		log.warning( "This entity can't equip that item" ) ;
		return ;
	}
	
	// First, check if this item is already equipped
	indexOf = this.equippedItems[ item.slotType ].indexOf( item ) ;
	
	if ( indexOf === -1 )
	{
		if ( this.equippedItems[ item.slotType ].length + item.slotCount > this.slots[ item.slotType ] )
		{
			log.warning( 'Not enough slots available' ) ;
			return ;
		}
		
		// Is this an owned item?
		indexOf = this.items.indexOf( item ) ;
		
		if ( indexOf !== -1 )
		{
			this.items.splice( indexOf , 1 ) ;
		}
		else if ( options.owned )
		{
			log.warning( 'Not owned' ) ;
			return ;
		}
		
		this.equippedItems[ item.slotType ].push( item ) ;
	}
	
	if ( options.primary )
	{
		if ( typeof options.primary === 'string' )
		{
			options.primary = [ options.primary ] ;
		}
		
		if ( options.primary === true )
		{
			options.primary = this.usageTypes ;
		}
		
		if ( Array.isArray( options.primary ) )
		{
			options.primary.forEach( usage => {
				
				if ( this.usageTypes.indexOf( usage ) !== -1 && item.usages[ usage ] && item.usages[ usage ].primary )
				{
					this.primary[ usage ] = item ;
				}
			} ) ;
		}
	}
	
	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }
} ;



Entity.prototype.grabItem = function grabItem( item , stack )
{
	var indexOf ;
	
	// First check if the item is not already stored in the inventory, to avoid duplicate
	if ( this.items.indexOf( item ) !== -1 ) { return ; }
	
	// If there is a stack array and the item should be present, and will be removed
	if ( Array.isArray( stack ) )
	{
		indexOf = stack.indexOf( item ) ;
		
		// Not in the stack? exit now!
		if ( indexOf === -1 ) { return ; }
		
		//log.error( "Stack before: %Y" , stack ) ;
		// Remove the item from the stack
		stack.splice( indexOf , 1 ) ;
		//log.error( "Stack after: %Y" , stack ) ;
	}
	
	// Add the item to the inventory
	this.items.push( item ) ;
	
	// Update stats? For instance, there are no item that can modify stats when owned
	//this.update() ;
} ;



Entity.prototype.dropItem = function dropItem( item , stack )
{
	var indexOf = this.items.indexOf( item ) ;
	
	// Not found in the inventory? exit now!
	if ( indexOf === -1 ) { return ; }
	
	// Remove the item from the inventory
	this.items.splice( indexOf , 1 ) ;
	
	// If there is a stack array and the item does not exist there, put it in the stack
	if ( Array.isArray( stack ) && stack.indexOf( item ) === -1 )
	{
		stack.push( item ) ;
	}
	
	// Update stats? For instance, there are no item that can modify stats when owned
	//this.update() ;
} ;



// Drop all items
Entity.prototype.dropAll = function dropAll( stack , options )
{
	options = options || {} ;
	
	if ( options.unequip ) { this.unequipAll( options ) ; }
	
	if ( Array.isArray( stack ) )
	{
		this.items.forEach( item => stack.push( item ) ) ;
	}
	
	this.items.length = 0 ;
	
	// Update stats? For instance, there are no item that can modify stats when owned
	//this.update() ;
} ;



Entity.prototype.hasItem = function hasItem( item )
{
	var slotType ;
	
	if ( this.items.indexOf( item ) !== -1 ) { return true ; }
	
	for ( slotType in this.equippedItems )
	{
		if ( this.equippedItems[ slotType ].indexOf( item ) !== -1 ) { return true ; }
	}
	
	return false ;
} ;



Entity.prototype.hasEquippedItem = function hasEquippedItem( item )
{
	var slotType ;
	
	for ( slotType in this.equippedItems )
	{
		if ( this.equippedItems[ slotType ].indexOf( item ) !== -1 ) { return true ; }
	}
	
	return false ;
} ;



// E.g. hero.getItemMatching( 'id' , 'excalibur' ) or hero.getItemMatching( 'model' , 'broadsword' )
Entity.prototype.getItemMatching = function getItemMatching( key , value )
{
	var item , slotType ;
	
	if ( item = this.items.find( e => e[ key ] === value ) ) { return item ; }
	
	for ( slotType in this.equippedItems )
	{
		if ( item = this.equippedItems[ slotType ].some( e => e[ key ] === value ) ) { return item ; }
	}
} ;



// E.g. hero.hasEquippedItemMatching( 'id' , 'excalibur' ) or hero.hasEquippedItemMatching( 'model' , 'broadsword' )
Entity.prototype.getEquippedItemMatching = function getEquippedItemMatching( key , value )
{
	var item , slotType ;
	
	for ( slotType in this.equippedItems )
	{
		if ( item = this.equippedItems[ slotType ].some( e => e[ key ] === value ) ) { return item ; }
	}
} ;



