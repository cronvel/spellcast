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



const BaseObject = require( './BaseObject.js' ) ;
const kungFig = require( 'kung-fig' ) ;
const StatsTable = kungFig.statsModifiers.StatsTable ;
const ModifiersTable = kungFig.statsModifiers.ModifiersTable ;
//const tree = require( 'tree-kit' ) ;
const copyData = require( '../copyData.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Entity( book , id , options , noCopy ) {
	var slotType ;

	if ( ! options || typeof options !== 'object' ) {
		options = {} ;
	}
	else if ( ! noCopy ) {
		// if noCopy is set, this means the caller has already cloned the data
		// Clone options to avoid parts to be shared
		options = copyData.deep( options ) ;
	}

	if ( ! id ) { id = 'entity_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , options ) ;

	// True if the entity is a Non-Player Character, i.e. controled by the computer
	this.npc = options.npc !== undefined ? !! options.npc : true ;

// FIX / TODO turn that into a Set
	// Usage type list
	this['usage-types'] = new Set( Array.isArray( options['usage-types'] ) ? options['usage-types'] : undefined ) ;

	// Statistics of this entity (attributes, e.g. strength, dexterity, ...)
	this.stats = new StatsTable( options.stats || {} ).getProxy() ;

	// USE stats/stats.status instead
	// Skills of this entity, almost like stats, but related to bonuses and open new actions (e.g. spells, ...)
	//skills = options.skills || {} ;

	// USE stats/stats.status instead
	// Status of this entity (health, mana, xp, ...)
	//status = options.status || {} ;

	// USE stats instead
	// Compound stats bonuses (if any)
	//compound = options.compound || {} ;

// FIX / TODO
	// MOVED TO stats.usages
	// Usages/functions of this entity, i.e. a per-function stats and bonuses, K/V pairs as function name/bonuses,
	// where bonuses is an object with keys: params, stats, skills, status, compound, adhoc
	//usages = options.usages || {} ;

	// USE stats[mystat].actual instead (stats-modifiers lib)
	// Actual computed stats and skills, after considering all bonuses provided by items
	// Contains stats, skills, status, compound
	//actual = {} ;

// FIX / TODO
	// USE stats.usages[myusage][mystat].actual instead (stats-modifiers lib)
	// Actual per-usage computed stats and skills, after considering all bonuses provided by items
	//'actual-usages' = {} ;

	// Stances of this entity, e.g. attitude, offensive/defensive stance, all passive reactions
	this.stances = options.stances || {} ;

	// Goods that are not items, like gold/money, etc...
	this.goods = options.goods || {} ;

	// Items owned by the entity, but not active (e.g. it's inventory)
	this.items = options.items || [] ;

	// K/V -- key: slot type, value: number of slots available
	this.slots = options.slots || {} ;

	// K/V -- key: the slot, value: array of items
	this['equipped-items'] = options['equipped-items'] || {} ;

	// K/V -- key: the slot, value: array of items
	this['innate-items'] = options['innate-items'] || {} ;

	// K/V -- key: usage, value: item usage sub-object that is the primary item for that usage,
	// or self if some natural capabilities can be used
	this.primary = {} ;

	// Entities owned by the entity (e.g. allies, familiar, crew, ...)
	this.entities = options.entities || [] ;

	// UI are things like image, sound, message theme, etc... organized by variant (e.g. "sad", "happy" or "happy/snowy")
	this['ui-data'] = options['ui-data'] || {} ;
	this.variant = options.variant || 'default' ;


	//log.error( "raw entity: %I" , this ) ;

	// Create slots
	for ( slotType in this.slots ) {
		if ( ! Array.isArray( this['equipped-items'][ slotType ] ) ) { this['equipped-items'][ slotType ] = [] ; }
		if ( ! Array.isArray( this['innate-items'][ slotType ] ) ) { this['innate-items'][ slotType ] = [] ; }
	}

	// Remove unexisting slots for equipped item
	for ( slotType in this['equipped-items'] ) {
		if ( ! this.slots[ slotType ] ) { delete this['equipped-items'][ slotType ] ; }
	}

	// Remove unexisting slots for innate item
	for ( slotType in this['innate-items'] ) {
		if ( ! this.slots[ slotType ] ) { delete this['innate-items'][ slotType ] ; }
	}

// FIX / TODO: need to check innate equipment (set up modifiers)
	//this.update() ;
}

module.exports = Entity ;

Entity.prototype = Object.create( BaseObject.prototype ) ;
Entity.prototype.constructor = Entity ;
Entity.prototype.__prototypeUID__ = 'spellcast/Entity' ;
Entity.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Object.defineProperties( Entity.prototype , {
	// Getter, flat version of ['equipped-items'], without slots (just a concat of all arrays)
	"equipped-item-list": { get: function() {
		var slotType , output = [] ;

		for ( slotType in this['equipped-items'] ) {
			output.push( ... this['equipped-items'][ slotType ] ) ;
		}

		return output ;
	} }
} ) ;



Entity.serializer = function( entity ) {
	return { override: entity } ;
} ;



Entity.unserializeContext = true ;

Entity.unserializer = function( context ) {
	var entity = Object.create( Entity.prototype ) ;
	Object.defineProperty( entity , 'book' , { value: context.book } ) ;
	//log.error( "Entity.unserializer: %I" , context ) ;
	return entity ;
} ;



// Move the object argument into the current instance
Entity.prototype.moveInto = function( object ) {
	var stack ;

	if ( ! object || typeof object !== 'object' ) { return false ; }

	switch ( object.__prototypeUID__ ) {
		case 'spellcast/Entity' :
			stack = this.entities ;
			break ;
		case 'spellcast/Item' :
			stack = this.items ;
			break ;
		default :
			return false ;
	}

	if ( object.parent ) { object.parent.remove( object ) ; }
	stack.push( object ) ;
	object.parent = this ;

	return true ;
} ;



// Get all sub-objects of the current entity
Entity.prototype.getAllSubObjects = function( recursive = false , masterArray = null ) {
	var slotType , array = [] ;

	array.push( ... this.entities ) ;
	array.push( ... this.items ) ;

	for ( slotType in this['equipped-items'] ) {
		array.push( ... this['equipped-items'][ slotType ] ) ;
	}

	if ( masterArray ) { masterArray.push( ... array ) ; }
	else { masterArray = array ; }

	if ( recursive ) {
		array.forEach( o => o.getAllSubObjects( recursive , masterArray ) ) ;
	}

	return masterArray ;
} ;



/*	stats-modifiers
Entity.prototype.computeCompound = function( ctx , usage , variation ) {
	var compound ;

	if ( usage ) {
		if ( ! this.book.usageCompoundStats[ usage ] || ! this.book.usageCompoundStats[ usage ].default ) { return {} ; }

		compound = this.book.usageCompoundStats[ usage ].default.getRecursiveFinalContent( ctx ) ;

		if ( variation && this.book.usageCompoundStats[ usage ][ variation ] ) {
			copyData.extend( compound , this.book.usageCompoundStats[ usage ][ variation ].getRecursiveFinalContent( ctx ) ) ;
		}
	}
	else {
		if ( ! this.book.entityCompoundStats[ this.class ] ) { return {} ; }
		compound = this.book.entityCompoundStats[ this.class ].getRecursiveFinalContent( ctx ) ;
	}

	//log.debug( "Compound stats: %I" , compound ) ;
	return compound ;
} ;



Entity.prototype.update = function() {
	this.updateActual() ;
	this.updateActualUsages() ;
	//log.debug( "actual: %I" , this.actual ) ;
	//log.info( "actual usages: %I" , this['actual-usages'] ) ;
	//log.error( "Update melee: %Y" , this['actual-usages'].melee ) ;
	//log.error( "Update missile: %Y" , this['actual-usages'].missile ) ;
} ;



Entity.prototype.updateActual = function() {
	var slotType ,
		paramsStack = [ {} , this.params ] ,
		statsStack = [ {} , this.stats ] ,
		skillsStack = [ {} , this.skills ] ,
		statusStack = [ {} , this.status ] ,
		compoundStack = [ {} , undefined , this.compound ] ;

	// First, get all active items
	for ( slotType in this.slots ) {
		if ( this['equipped-items'][ slotType ].length ) {
			this['equipped-items'][ slotType ].forEach( item => {	// jshint ignore:line
				paramsStack.push( item.params ) ;
				statsStack.push( item.stats ) ;
				skillsStack.push( item.skills ) ;
				statusStack.push( item.status ) ;
				compoundStack.push( item.compound ) ;
			} ) ;
		}
		else if ( this['innate-items'][ slotType ].length ) {
			this['innate-items'][ slotType ].forEach( item => {	// jshint ignore:line
				paramsStack.push( item.params ) ;
				statsStack.push( item.stats ) ;
				skillsStack.push( item.skills ) ;
				statusStack.push( item.status ) ;
				compoundStack.push( item.compound ) ;
			} ) ;
		}
	}

	//log.debug( "Stack: %I" , statsStack ) ;

	this.actual.params = kungFig.reduceToObject( ... paramsStack ) ;
	this.actual.stats = kungFig.reduceToObject( ... statsStack ) ;
	this.actual.skills = kungFig.reduceToObject( ... skillsStack ) ;
	this.actual.status = kungFig.reduceToObject( ... statusStack ) ;

	/*
		The order is critical:
		- first compute all actual non-compound stats/skills/whatever
		- then compute compound stats once every item bonuses are applied
		- finally apply compound bonuses from items
	* /

	// compoundStack was not computable until now
	compoundStack[ 1 ] = this.computeCompound( this.actual ) ;

	//log.debug( "Compound stack: %I" , compoundStack ) ;
	this.actual.compound = kungFig.reduceToObject( ... compoundStack ) ;

	//log.debug( "Actual stats: %I" , this.actual ) ;
} ;



Entity.prototype.updateActualUsages = function() {
	//log.error( "Usage: %I" , this['usage-types'] ) ;
	this['usage-types'].forEach( usage => this.updateOneActualUsage( usage ) ) ;
} ;



Entity.prototype.updateOneActualUsage = function( usage ) {
	var slotType , remaining , variation ,
		paramsStack = [ {} , this.actual.params ] ,
		statsStack = [ {} , this.actual.stats ] ,
		skillsStack = [ {} , this.actual.skills ] ,
		statusStack = [ {} , this.actual.status ] ,
		compoundStack = [ {} , undefined ] ;


	var activeUsage = element => {

		compoundStack.push( element.compound ) ;	// Always add global compound bonuses

		if ( ! element.usages[ usage ] ) { return ; }

		if ( ! this.primary[ usage ] && element.usages[ usage ].primary ) { this.primary[ usage ] = element ; }
		//log.debug( "Element '%s' has usage '%s': %I" , element.name , usage , element.usages[ usage ] ) ;

		if ( this.primary[ usage ] === element ) {
			if ( element.usages[ usage ].primary ) {
				//log.debug( "add primary %I" , element.usages[ usage ].primary ) ;
				variation = element.usages[ usage ].primary['compound-variation'] || null ;

				if ( element.usages[ usage ].primary.params ) { paramsStack.push( element.usages[ usage ].primary.params ) ; }
				if ( element.usages[ usage ].primary.stats ) { statsStack.push( element.usages[ usage ].primary.stats ) ; }
				if ( element.usages[ usage ].primary.skills ) { skillsStack.push( element.usages[ usage ].primary.skills ) ; }
				if ( element.usages[ usage ].primary.status ) { statusStack.push( element.usages[ usage ].primary.status ) ; }
				if ( element.usages[ usage ].primary.compound ) { compoundStack.push( element.usages[ usage ].primary.compound ) ; }
			}

			if ( element.usages[ usage ]['extra-slot'] && remaining >= 1 ) {
				//log.debug( "add extra slot %I" , element.usages[ usage ]['extra-slot'] ) ;
				if ( element.usages[ usage ]['extra-slot'].params ) { paramsStack.push( element.usages[ usage ]['extra-slot'].params ) ; }
				if ( element.usages[ usage ]['extra-slot'].stats ) { statsStack.push( element.usages[ usage ]['extra-slot'].stats ) ; }
				if ( element.usages[ usage ]['extra-slot'].skills ) { skillsStack.push( element.usages[ usage ]['extra-slot'].skills ) ; }
				if ( element.usages[ usage ]['extra-slot'].status ) { statusStack.push( element.usages[ usage ]['extra-slot'].status ) ; }
				if ( element.usages[ usage ]['extra-slot'].compound ) { compoundStack.push( element.usages[ usage ]['extra-slot'].compound ) ; }
			}
		}
		else if ( element.usages[ usage ].support ) {
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
	for ( slotType in this.slots ) {
		remaining = this.slots[ slotType ] ;

		if ( this['equipped-items'][ slotType ].length ) {
			//log.debug( 'Usage: %s -- Slot: %s' , usage , slotType ) ;
			this['equipped-items'][ slotType ].forEach( item => remaining -= item['slot-count'] ) ;	// jshint ignore:line
			this['equipped-items'][ slotType ].forEach( activeUsage ) ;
		}
		else if ( this['innate-items'][ slotType ].length ) {
			//log.debug( 'Usage: %s -- Slot: %s' , usage , slotType ) ;
			// This does not make sens for innate items to be counted, as it is used only by the 'extraSlot' feature, but well...
			this['innate-items'][ slotType ].forEach( item => remaining -= item['slot-count'] ) ;	// jshint ignore:line
			this['innate-items'][ slotType ].forEach( activeUsage ) ;
		}
	}

	//log.debug( "Stack: %I" , statsStack ) ;

	this['actual-usages'][ usage ] = {} ;
	this['actual-usages'][ usage ].params = kungFig.reduceToObject( ... paramsStack ) ;
	this['actual-usages'][ usage ].stats = kungFig.reduceToObject( ... statsStack ) ;
	this['actual-usages'][ usage ].skills = kungFig.reduceToObject( ... skillsStack ) ;
	this['actual-usages'][ usage ].status = kungFig.reduceToObject( ... statusStack ) ;

	/*
		The order is critical:
		- first compute all actual non-compound stats/skills/whatever
		- then compute compound stats once every item bonuses are applied
		- finally apply compound bonuses from items
	* /

	// compoundStack was not computable until now
	compoundStack[ 1 ] = this.computeCompound( this['actual-usages'][ usage ] , usage , variation ) ;

	//log.debug( "Usage compound stack: %I" , compoundStack ) ;
	this['actual-usages'][ usage ].compound = kungFig.reduceToObject( ... compoundStack ) ;

	//log.debug( "Usage '%s' stats: %I" , usage , this['actual-usages'][ usage ] ) ;
} ;
*/



Entity.prototype.unequipItem = function( item , options = {} ) {
	var indexOf , usage ;

	if ( ! ( item['slot-type'] in this.slots ) ) { return ; }

	// Search for the item in the slot
	indexOf = this['equipped-items'][ item['slot-type'] ].indexOf( item ) ;

	if ( indexOf === -1 ) {
		log.error( "Not equipped!" ) ;
		return ;
	}

	// Remove the item from the slot
	this['equipped-items'][ item['slot-type'] ].splice( indexOf , 1 ) ;

	// Search and remove the item from any primary
	for ( usage in item['usages-mods'] ) {
		if ( this.primary[ usage ] === item ) {
			this.primary[ usage ] = null ;
		}
	}

	// Add it to the passive inventory
	this.items.push( item ) ;

	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }
} ;



Entity.prototype.unequipSlot = function( slotType , options = {} ) {
	var usage , changed ;

	if ( ! ( slotType in this.slots ) ) { return false ; }

	this['equipped-items'][ slotType ].forEach( item => {

		// Add the item to the entity's unequipped items
		this.items.push( item ) ;

		// Search and remove the item from any primary
		for ( usage in item['usages-mods'] ) {
			if ( this.primary[ usage ] === item ) {
				this.primary[ usage ] = null ;
			}
		}
	} ) ;

	// Remove all items from those slots
	this['equipped-items'][ slotType ].length = 0 ;

	// Update stats!
	if ( changed && ! options.noUpdate ) { this.update() ; }

	return changed ;
} ;



Entity.prototype.unequipAll = function( options = {} ) {
	Object.keys( this.slots ).forEach( slotType => this.unequipSlot( slotType , { noUpdate: true } ) ) ;

	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }
} ;



Entity.prototype.slotUsed = function( slotType ) {
	if ( ! ( slotType in this.slots ) ) { return 0 ; }

	return this['equipped-items'][ slotType ].reduce(
		( used , item ) => used + item[ 'slot-count' ] ,
		0
	) ;
} ;



Entity.prototype.canEquipItem = function( item , options ) {
	return this.equipItem( item , options , true ) ;
} ;



Entity.prototype.equipItem = function( item , options , dry ) {
	var indexOf , changed = false ,
		slotType = item['slot-type'] ;

	options = options || {} ;

	if ( ! ( slotType in this.slots ) ) {
		//log.warning( "This entity can't equip that item" ) ;
		return false ;
	}

	// First, check if this item is already equipped
	indexOf = this['equipped-items'][ slotType ].indexOf( item ) ;

	if ( indexOf === -1 ) {
		if ( this.slotUsed( slotType ) + item['slot-count'] > this.slots[ slotType ] ) {
			//log.warning( 'Not enough slots available' ) ;
			return false ;
		}

		// Is this an owned item?
		indexOf = this.items.indexOf( item ) ;

		if ( options.owned && indexOf === -1 ) {
			//log.warning( 'Not owned' ) ;
			return false ;
		}

		if ( dry ) { return true ; }

		if ( indexOf !== -1 ) {
			this.items.splice( indexOf , 1 ) ;
		}

		this['equipped-items'][ slotType ].push( item ) ;
		changed = true ;
	}
	else if ( dry ) {
		return true ;
	}

	if ( options.primary ) {
		if ( options.primary === true ) {
			options.primary = this['usage-types'] ;
		}
		else if ( typeof options.primary === 'string' ) {
			options.primary = [ options.primary ] ;
		}

		if ( options.primary ) {
			for ( let usage of options.primary ) {
				if ( this['usage-types'].has( usage ) && item['usages-mods'][ usage ] && item['usages-mods'][ usage ].primary ) {
					if ( this.primary[ usage ] ) {
						let oldPrimaryUsage = this.primary[ usage ]['usages-mods'][ usage ] ;
						if ( oldPrimaryUsage.primary ) { this.stats.unstack( oldPrimaryUsage.primary ) ; }
						if ( oldPrimaryUsage['extra-slot'] ) { this.stats.unstack( oldPrimaryUsage['extra-slot'] ) ; }
						if ( oldPrimaryUsage.support ) { this.stats.stack( oldPrimaryUsage.support ) ; }
					}

					this.primary[ usage ] = item ;
					let itemUsage = item['usages-mods'][ usage ]
					if ( itemUsage.primary ) { this.stats.stack( itemUsage.primary ) ; }
					if ( itemUsage['extra-slot'] ) { this.stats.stack( itemUsage['extra-slot'] ) ; }
					//if ( itemUsage.support ) { this.stats.stack( itemUsage.support ) ; }
				}
			}
		}
	}

	// Update stats!
	if ( changed && ! options.noUpdate ) { this.update() ; }

	return changed ;
} ;



Entity.prototype.grabItem = function( item , container ) {
	var stack , indexOf ;

	// First check if the item is not already stored in the inventory, to avoid duplicate
	if ( this.items.includes( item ) ) { return false ; }

	// If there is a stack array and the item should be present, and should be removed from
	if ( container ) {
		if ( Array.isArray( container ) ) {
			stack = container ;
			container = null ;
		}
		else if ( container.__prototypeUID__ === 'spellcast/Place' || container.__prototypeUID__ === 'spellcast/Entity' ) {
			stack = container.items ;
		}
		else {
			return false ;
		}

		indexOf = stack.indexOf( item ) ;

		// Not in the stack? exit now!
		if ( indexOf === -1 ) { return false ; }

		// Remove the item from the stack
		stack.splice( indexOf , 1 ) ;
	}

	// Add the item to the inventory
	this.items.push( item ) ;
	item.parent = this ;

	// Update stats!
	//if ( ! options.noUpdate ) { this.update() ; }
	this.update() ;

	return true ;
} ;



Entity.prototype.dropItem = function( item , container , options = {} ) {
	var stack ,
		indexOf = this.items.indexOf( item ) ;

	if ( options.unequip ) { this.unequip( item , { noUpdate: true } ) ; }

	// Not found in the inventory? exit now!
	if ( indexOf === -1 ) { return true ; }

	if ( Array.isArray( container ) ) {
		stack = container ;
		container = null ;
	}
	else {
		if ( ! container ) {
			container = this.getParentPlace() ;
			if ( ! container ) { return false ; }
		}

		if ( container.__prototypeUID__ === 'spellcast/Place' || container.__prototypeUID__ === 'spellcast/Entity' ) {
			stack = container.items ;
		}
		else {
			// Drop it into the void...
			stack = container = null ;
		}
	}

	// Remove the item from the inventory
	if ( stack ) { stack.push( item ) ; }
	item.parent = container ;
	this.items.splice( indexOf , 1 ) ;

	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }

	return true ;
} ;



// Drop all items
Entity.prototype.dropAll = function( container , options = {} ) {
	var stack ;

	if ( options.unequip ) { this.unequipAll( { noUpdate: true } ) ; }

	if ( Array.isArray( container ) ) {
		stack = container ;
		container = null ;
	}
	else {
		if ( ! container ) {
			container = this.getParentPlace() ;
			if ( ! container ) { return false ; }
		}

		if ( container.__prototypeUID__ === 'spellcast/Place' || container.__prototypeUID__ === 'spellcast/Entity' ) {
			stack = container.items ;
		}
		else {
			// Drop them into the void...
			stack = container = null ;
		}
	}

	// Remove all items
	this.items.forEach( item => {
		if ( stack ) { stack.push( item ) ; }
		item.parent = container ;
	} ) ;

	this.items.length = 0 ;

	// Update stats!
	if ( ! options.noUpdate ) { this.update() ; }

	return true ;
} ;



Entity.prototype.hasItem = function( item ) {
	var slotType ;

	if ( this.items.includes( item ) ) { return true ; }

	for ( slotType in this['equipped-items'] ) {
		if ( this['equipped-items'][ slotType ].includes( item ) ) { return true ; }
	}

	return false ;
} ;



Entity.prototype.hasEquippedItem = function( item ) {
	var slotType ;

	for ( slotType in this['equipped-items'] ) {
		if ( this['equipped-items'][ slotType ].includes( item ) ) { return true ; }
	}

	return false ;
} ;



// E.g. hero.getItemMatching( 'id' , 'excalibur' ) or hero.getItemMatching( 'model' , 'broadsword' )
Entity.prototype.getItemMatching = function( key , value ) {
	var item , slotType ;

	item = this.items.find( e => e[ key ] === value ) ;
	if ( item ) { return item ; }

	for ( slotType in this['equipped-items'] ) {
		item = this['equipped-items'][ slotType ].some( e => e[ key ] === value ) ;
		if ( item ) { return item ; }
	}
} ;



// E.g. hero.hasEquippedItemMatching( 'id' , 'excalibur' ) or hero.hasEquippedItemMatching( 'model' , 'broadsword' )
Entity.prototype.getEquippedItemMatching = function( key , value ) {
	var item , slotType ;

	for ( slotType in this['equipped-items'] ) {
		item = this['equipped-items'][ slotType ].some( e => e[ key ] === value ) ;
		if ( item ) { return item ; }
	}
} ;



Entity.prototype.setVariant = function( variant ) {
	if ( ! this.variant ) {
		this.variant = variant ;
		return ;
	}

	var oldSplitted = this.variant.split( '/' ) ;
	var newSplitted = variant.split( '/' ) ;
	var i , iMax = Math.max( oldSplitted.length , newSplitted.length ) ;

	for ( i = 0 ; i < iMax ; i ++ ) {
		if ( newSplitted[ i ] && newSplitted[ i ] !== 'default' ) { continue ; }
		if ( oldSplitted[ i ] && oldSplitted[ i ] !== 'default' ) { newSplitted[ i ] = oldSplitted[ i ] ; }
		else { newSplitted[ i ] = 'default' ; }
	}

	this.variant = newSplitted.join( '/' ) ;
} ;



Entity.prototype.getUiData = function() {
	var variant = this.variant ;

	while ( variant ) {
		if ( this['ui-data'][ variant ] ) { return this['ui-data'][ variant ] ; }
		variant = variant.replace( /\/*[^/]*$/ , '' ) ;
	}

	if ( ! this['ui-data'].default ) { this['ui-data'].default = {} ; }

	return this['ui-data'].default ;
} ;

