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
	var slotType , usage ;

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

	// Usage type list
	this['usage-types'] = new Set( Array.isArray( options['usage-types'] ) ? options['usage-types'] : undefined ) ;

	// Statistics of this entity (attributes, e.g. strength, dexterity, ...)
	this.stats = new StatsTable( options.stats || {} ).getProxy() ;

	// FIX? Move into stats? Create mods for each stance?
	// Stances of this entity, e.g. attitude, offensive/defensive stance, all passive reactions
	this.stances = options.stances || {} ;

	// Goods that are not items, like gold/money, etc...
	this.goods = options.goods || {} ;

	// Describe available slots types and numbers
	// K/V -- key: slot type, value: number of slots available
	this.slots = options.slots || {} ;

	// Store items that are be equipped on a slot
	// K/V -- key: the slot, value: Set of items
	this['equipped-items'] = {} ;

	// Innate items are like items, but they are part of the entity, e.g. beast's claws and fangs.
	// An innate items MUST BE virtual.
	// K/V -- key: the slot, value: Set of items
	this['innate-items'] = {} ;

	// For each usage, store which item is used as primary and supports (if any)
	// K/V -- key: usage, value: item, or self if some natural capabilities can be used
	this.primary = {} ;
	this.supports = {} ;

	// Items owned by the entity, but not active (not equipped, e.g. it's inventory)
	this.items = new Set() ;

	// Entities owned by the entity (e.g. allies, familiar, crew, ...)
	this.entities = new Set() ;

	// UI are things like image, sound, message theme, etc... organized by variant (e.g. "sad", "happy" or "happy/snowy")
	this['ui-data'] = options['ui-data'] || {} ;
	this.variant = options.variant || 'default' ;


	//log.error( "raw entity: %I" , this ) ;

	// Create slots
	for ( slotType in this.slots ) {
		this['equipped-items'][ slotType ] = new Set() ;
		this['innate-items'][ slotType ] = new Set() ;
	}

	for ( usage of this['usage-types'] ) {
		this.primary[ usage ] = null ;
		this.supports[ usage ] = new Set() ;
	}

	if ( options.items ) { options.items.forEach( item => this.addToItems( item , false ) ) ; }
	if ( options.entities ) { options.entities.forEach( entity => this.entities.add( entity , false ) ) ; }
	if ( options['equipped-items'] ) {
		for ( slotType in options['equipped-items'] ) {
			if ( ! this.slots[ slotType ] ) { continue ; }
			// Enforce the slotType
			options['equipped-items'][ slotType ].forEach( item => this.equipItem( item , { owned: false , slotType } ) ) ;
		}
	}
	if ( options['innate-items'] ) {
		for ( slotType in options['innate-items'] ) {
			log.hdebug( "? %Y" , options['innate-items'][ slotType ] ) ;
			if ( ! this.slots[ slotType ] ) { continue ; }
			this.fillInnateItems( slotType , options['innate-items'][ slotType ] ) ;
		}
	}
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
Entity.prototype.store = function( object ) {
	if ( ! object || typeof object !== 'object' ) { return false ; }

	switch ( object.__prototypeUID__ ) {
		case 'spellcast/Entity' :
			this.addToEntities( object ) ;
			return true ;
		case 'spellcast/Item' :
			this.addToItems( object ) ;
			return true ;
		default :
			return false ;
	}
} ;



// Remove an unequiped thing
Entity.prototype.remove = function( object ) {
	if ( ! object || typeof object !== 'object' ) { return false ; }

	switch ( object.__prototypeUID__ ) {
		case 'spellcast/Entity' :
			this.removeFromEntities( object ) ;
			return true ;
		case 'spellcast/Item' :
			this.removeFromItems( object ) ;
			return true ;
		default :
			return false ;
	}
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
		array.forEach( o => o.getAllSubObjects( true , masterArray ) ) ;
	}

	return masterArray ;
} ;



// 'extra' count 'primary-extra'
Entity.prototype.usedSlots = function( slotType , excludeInnate = false , extra = false ) {
	if ( ! this.slots[ slotType ] ) { return 0 ; }

	var item , used = 0 ;

	for ( item of this['equipped-items'][ slotType ] ) {
		if ( ! item.innate || ! excludeInnate ) { used += item['slot-count'] ; }
	}

	if ( extra && used < this.slots[ slotType ] && this.primary[ slotType ] && this.primary[ slotType ]['extra-slot'] ) {
		used ++ ;
	}

	return used ;
} ;



// 'extra' count 'primary-extra'
Entity.prototype.remainingSlots = function( slotType , excludeInnate = false , extra = false ) {
	if ( ! this.slots[ slotType ] ) { return 0 ; }

	var item ,
		remaining = this.slots[ slotType ] ;

	for ( item of this['equipped-items'][ slotType ] ) {
		if ( ! item.innate || ! excludeInnate ) { remaining -= item['slot-count'] ; }
	}

	if ( extra && remaining && this.primary[ slotType ] && this.primary[ slotType ]['extra-slot'] ) {
		remaining -- ;
	}

	return remaining ;
} ;



Entity.prototype.equipItem = function( item , options = {} , dry = false ) {
	log.hdebug( "Equip item %s!" , item.name ) ;
	var remainingSlots , remainingSlotsNoInnate , primaryUsages , wasAlreadyEquipped ,
		changed = false ,
		slotType = item['slot-type'] ;

	if ( ! slotType || ! this.slots[ slotType ] || ( options.slotType && options.slotType !== slotType ) ) {
		//log.warning( "This item is not equippable or the entity can't equip that item" ) ;
		return false ;
	}

	// First, equip it if it is not
	if ( this['equipped-items'][ slotType ].has( item ) ) {
		if ( dry ) { return true ; }
		wasAlreadyEquipped = true ;
	}
	else {
		log.hdebug( "Equip item: go!" ) ;
		remainingSlots = this.remainingSlots( slotType ) ;
		if ( ! remainingSlots || remainingSlots < item['slot-count'] ) {
			if ( ! item.innate && this['innate-items'][ slotType ].size ) {
				remainingSlotsNoInnate = this.remainingSlots( slotType , true ) ;
				if ( ! remainingSlotsNoInnate || remainingSlotsNoInnate < item['slot-count'] ) {
					//log.warning( 'Not enough slots available' ) ;
					return false ;
				}
			}
			else {
				//log.warning( 'Not enough slots available' ) ;
				return false ;
			}
		}
		log.hdebug( "Equip item: go2!" ) ;

		// Is this an owned item?
		if ( options.owned && ! this.items.has( item ) ) {
			//log.warning( 'Not owned' ) ;
			return false ;
		}

		log.hdebug( "Equip item: go3!" ) ;

		if ( dry ) { return true ; }

		// Check if we have to make room for the item by removing innate-item.
		if ( remainingSlots < item['slot-count'] && ! item.innate && this['innate-items'][ slotType ].size ) {
			// Try to make room from equipped innate items
			this.freeInnateSlots( slotType , item['slot-count'] - remainingSlots ) ;
		}

		this.removeFromItems( item ) ;
		this.addToSlot( slotType , item ) ;
		log.hdebug( "Equip: %s\n%Y" , slotType , this['equipped-items'] ) ;

		changed = true ;
		wasAlreadyEquipped = false ;
	}

	primaryUsages =
		options.primary === true ? this['usage-types'] :
		typeof options.primary === 'string' ? new Set( [ options.primary ] ) :
		Array.isArray( options.primary ) ? new Set( options.primary ) :
		options.primary instanceof Set ? options.primary :
		null ;

	if ( this.setAllPrimaries( item , primaryUsages , wasAlreadyEquipped ) ) {
		changed = true ;
	}

	return changed ;
} ;

Entity.prototype.canEquipItem = function( item , options ) { return this.equipItem( item , options , true ) ; } ;



Entity.prototype.unequipItem = function( item ) {
	var remainingSlots ,
		slotType = item['slot-type'] ;

	if ( ! this.slots[ slotType ] ) { return ; }

	// Search for the item in the slot
	log.hdebug( "unequipItem: %s\n%Y" , slotType , this['equipped-items'][ item['slot-type'] ] ) ;
	if ( ! this['equipped-items'][ slotType ].has( item ) ) {
		log.error( "Not equipped!" ) ;
		return ;
	}

	// Remove the item from the slot
	this.removeFromSlot( slotType , item ) ;

	// Add it to the passive inventory
	this.addToItems( item ) ;

	remainingSlots = this.remainingSlots( slotType ) ;
	if ( remainingSlots && ! item.innate && this['innate-items'][ slotType ].size ) {
		// Try to make room from equipped innate items
		this.fillInInnateSlots( slotType , remainingSlots ) ;
	}

	this.removeAndReplaceFromAllPrimaries( item ) ;
} ;



Entity.prototype.unequipSlot = function( slotType ) {
	var item , changed ;

	if ( ! this.slots[ slotType ] ) { return false ; }

	for ( item of this['equipped-items'][ slotType ] ) {
		this.unequipItem( item ) ;
		changed = true ;
	}

	return changed ;
} ;



Entity.prototype.unequipAll = function() {
	Object.keys( this.slots ).forEach( slotType => this.unequipSlot( slotType ) ) ;
} ;



// Fill an innate slotType with the given items
Entity.prototype.fillInnateItems = function( slotType , items ) {
	if ( ! this.slots[ slotType ] ) { return ; }
	items.forEach( item => this.addInnateItem( slotType , item ) ) ;
	this.fillInInnateSlots( slotType , this.remainingSlots( slotType ) ) ;
} ;



Entity.prototype.addInnateItem = function( slotType , item ) {
	log.hdebug( "Add Innate item %s!" , item.name ) ;
	if ( ! item.virtual ) {
		log.hdebug( "This is not a virtual item! Only virtual items can be added as innate items" ) ;
		return false ;
	}

	if ( item['slot-type'] !== slotType ) {
		log.hdebug( "Innate item slot mismatch!" ) ;
		return false ;
	}

	if ( item['slot-count'] !== 1 ) {
		log.hdebug( "Innate items MUST use exactly ONE slot" ) ;
		return false ;
	}

	if ( this['innate-items'][ slotType ].size >= this.slots[ slotType ] ) {
		log.hdebug( "No more innate '%s' slot available" ) ;
		return false ;
	}

	// Now it's time to clone it!
	item = item.clone() ;
	item.innate = true ;

	this['innate-items'][ slotType ].add( item ) ;
	item.parent = this ;

	log.hdebug( "Innate: %s\n%Y" , slotType , this['innate-items'] ) ;

	return true ;
} ;



Entity.prototype.grabItem = function( item , container ) {
	var stack , indexOf ;

	// First check if the item is not already stored in the inventory, to avoid duplicate
	if ( this.items.has( item ) ) { return false ; }

	// If there is a stack array and the item should be present, and should be removed from
	if ( container ) {
		if ( container === 'place' ) {
			container = this.getParentPlace() ;
			if ( ! container ) { return false ; }
		}

		if ( Array.isArray( container ) || ( container instanceof Set ) ) {
			stack = container ;
			container = null ;
		}
		else if ( container.__prototypeUID__ === 'spellcast/Place' || container.__prototypeUID__ === 'spellcast/Entity' ) {
			stack = container.items ;
		}
		else {
			return false ;
		}

		if ( Array.isArray( container ) ) {
			indexOf = stack.indexOf( item ) ;

			// Not in the stack? exit now!
			if ( indexOf === -1 ) { return false ; }

			// Remove the item from the stack
			stack.splice( indexOf , 1 ) ;
		}
		// Not in the set? exit now!
		else if ( ! stack.delete( item ) ) {
			return false ;
		}
	}

	// Add the item to the inventory
	this.addToItems( item ) ;

	return true ;
} ;



Entity.prototype.dropItem = function( item , container , options = {} ) {
	var stack = null ;

	if ( options.unequip ) { this.unequip( item ) ; }

	// Not found in the inventory? exit now!
	if ( ! this.items.has( item ) ) { return false ; }

	if ( container ) {
		if ( container === 'place' ) {
			container = this.getParentPlace() ;
			if ( ! container ) { return false ; }
		}

		if ( Array.isArray( container ) || ( container instanceof Set ) ) {
			stack = container ;
			container = null ;
		}
		else if ( container.__prototypeUID__ === 'spellcast/Place' || container.__prototypeUID__ === 'spellcast/Entity' ) {
			stack = container.items ;
		}
		else {
			return false ;
		}

		if ( Array.isArray( container ) ) {
			if ( ! stack.includes( item ) ) { stack.push( item ) ; }
		}
		// Not in the set? exit now!
		else {
			stack.add( item ) ;
		}
	}
	else {
		container = null ;
	}

	this.removeFromItems( item ) ;
	item.parent = container ;

	return true ;
} ;



// Drop all items
Entity.prototype.dropAll = function( container , options = {} ) {
	var item , changed = false ;

	// Remove all items
	for ( item of this.items ) {
		if ( this.dropItem( item , container , options ) ) { changed = true ; }
	}

	return changed ;
} ;



Entity.prototype.hasItem = function( item ) {
	var slotType ;

	if ( this.items.has( item ) ) { return true ; }

	for ( slotType in this['equipped-items'] ) {
		if ( this['equipped-items'][ slotType ].has( item ) ) { return true ; }
	}

	return false ;
} ;



Entity.prototype.hasEquippedItem = function( item ) {
	var slotType ;

	for ( slotType in this['equipped-items'] ) {
		if ( this['equipped-items'][ slotType ].has( item ) ) { return true ; }
	}

	return false ;
} ;



// E.g. hero.getItemMatching( 'id' , 'excalibur' ) or hero.getItemMatching( 'model' , 'broadsword' )
Entity.prototype.getItemMatching = function( key , value ) {
	var item , slotType ;

	for ( item of this.items ) {
		if ( item[ key ] === value ) { return item ; }
	}

	for ( slotType in this['equipped-items'] ) {
		for ( item of this['equipped-items'][ slotType ] ) {
			if ( item[ key ] === value ) { return item ; }
		}
	}

	return null ;
} ;



// E.g. hero.hasEquippedItemMatching( 'id' , 'excalibur' ) or hero.hasEquippedItemMatching( 'model' , 'broadsword' )
Entity.prototype.getEquippedItemMatching = function( key , value ) {
	var item , slotType ;

	for ( slotType in this['equipped-items'] ) {
		for ( item of this['equipped-items'][ slotType ] ) {
			if ( item[ key ] === value ) { return item ; }
		}
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



// Internal



Entity.prototype.addToEntities = function( entity , enforceTest = true ) {
	if ( enforceTest ) {
		if ( this.entities.has( entity ) ) { return false ; }
		if ( entity.parent && entity.parent !== this ) { entity.parent.remove( entity ) ; }
	}

	this.entities.add( entity ) ;
	entity.parent = this ;
	return true ;
} ;



Entity.prototype.removeFromEntities = function( entity ) {
	if ( ! this.entities.delete( entity ) ) { return false ; }
	entity.parent = null ;
	return true ;
} ;



Entity.prototype.addToItems = function( item , enforceTest = true ) {
	if ( enforceTest ) {
		if ( this.items.has( item ) ) { return false ; }
		if ( item.parent && item.parent !== this ) { item.parent.remove( item ) ; }
	}

	this.items.add( item ) ;
	item.parent = this ;
	// If this item have passive (unequipped) modifiers, install them now!
	if ( item['passive-mods'] ) { this.stats.stack( item['passive-mods'] ) ; }
	return true ;
} ;



Entity.prototype.removeFromItems = function( item ) {
	if ( ! this.items.delete( item ) ) { return false ; }
	item.parent = null ;
	// If this item have passive (unequipped) modifiers, uninstall them now!
	if ( item['passive-mods'] ) { this.stats.unstack( item['passive-mods'] ) ; }
	return true ;
} ;



Entity.prototype.addToSlot = function( slotType , item , enforceTest = true ) {
	if ( enforceTest ) {
		if ( this['equipped-items'][ slotType ].has( item ) ) { return false ; }
		if ( item.parent && item.parent !== this ) { item.parent.remove( item ) ; }
	}

	this['equipped-items'][ slotType ].add( item ) ;
	item.parent = this ;
	// If this item have equipped modifiers, install them now!
	if ( item['active-mods'] ) { this.stats.stack( item['active-mods'] ) ; }
	return true ;
} ;



Entity.prototype.removeFromSlot = function( slotType , item ) {
	if ( ! this['equipped-items'][ slotType ].delete( item ) ) { return false ; }
	item.parent = null ;
	// If this item have equipped modifiers, uninstall them now!
	if ( item['active-mods'] ) { this.stats.unstack( item['active-mods'] ) ; }
	return true ;
} ;



Entity.prototype.removeAndReplaceFromAllPrimaries = function( item ) {
	var usage , newPrimaryItem ;

	// Search and remove the item from any primary
	for ( usage in item['usages-mods'] ) {
		if ( ! this['usage-types'].has( usage ) ) { continue ; }

		if ( this.primary[ usage ] === item ) {
			this.removeFromPrimary( usage , item ) ;

			if ( this.supports[ usage ].size ) {
				// Choose the first support item as the new 'primary'
				newPrimaryItem = this.supports[ usage ].values().next().value ;
				this.removeFromSupports( usage , newPrimaryItem ) ;
				this.addToPrimary( usage , newPrimaryItem ) ;
			}
		}
		else {
			this.removeFromSupports( usage , item ) ;
		}
	}
} ;



Entity.prototype.setAllPrimaries = function( item , primaryUsages = null , dontCheckSupport = false ) {
	var usage , oldPrimaryItem , changed = false ;

	// Install per usage modifiers
	for ( usage in item['usages-mods'] ) {
		if ( ! this['usage-types'].has( usage ) ) { continue ; }

		oldPrimaryItem = this.primary[ usage ] ;
		
		// When we equip an item, we want it to have priority over innate items
		if ( ! oldPrimaryItem || ( oldPrimaryItem.innate && ! item.innate ) || ( primaryUsages && primaryUsages.has( usage ) ) ) {

			if ( oldPrimaryItem ) {
				if ( oldPrimaryItem === item ) { continue ; }	// Already primary on this usage, skip...

				// Switch former primary to 'support' mode
				this.removeFromPrimary( usage , oldPrimaryItem ) ;
				this.addToSupports( usage , oldPrimaryItem ) ;
			}

			// Set/switch it to 'primary' mode
			this.removeFromSupports( usage , item ) ;
			this.addToPrimary( usage , item ) ;
			changed = true ;
		}
		else if ( ! dontCheckSupport ) {
			// Set it to 'support' mode
			this.addToSupports( usage , item ) ;
			this.checkPrimaryExtraSlot( usage ) ;
		}
	}

	return changed ;
} ;



Entity.prototype.checkPrimaryExtraSlot = function( usage ) {
	var item = this.primary[ usage ] ;
	log.hdebug( "checkPrimaryExtraSlot! %s %s" , usage , item.name ) ;
	if ( ! item ) { return ; }

	var itemUsage = item['usages-mods'][ usage ] ;
	log.hdebug( "checkPrimaryExtraSlot! 2 %I" , itemUsage ) ;
	if ( ! itemUsage['primary-extra'] ) { return ; }
	log.hdebug( "checkPrimaryExtraSlot! 3" ) ;

	// If this item have primary or primary-extra modifiers, install them now!
	// We exclude innate items here: their slots are still considered free!
	if ( this.remainingSlots( item['slot-type'] , true ) ) {
		log.hdebug( "checkPrimaryExtraSlot (primary-extra) %s %I" , item.name , itemUsage['primary-extra'] ) ;
		if ( itemUsage.primary ) { this.stats.unstack( itemUsage.primary ) ; }
		this.stats.stack( itemUsage['primary-extra'] ) ;
	}
	else {
		log.hdebug( "checkPrimaryExtraSlot (primary-extra) %s %I" , item.name , itemUsage['primary-extra'] ) ;
		this.stats.unstack( itemUsage['primary-extra'] ) ;
		if ( itemUsage.primary ) { this.stats.stack( itemUsage.primary ) ; }
	}
} ;



Entity.prototype.addToPrimary = function( usage , item ) {
	if ( this.primary[ usage ] === item ) { return false ; }

	this.primary[ usage ] = item ;
	var itemUsage = item['usages-mods'][ usage ] ;

	// If this item have primary or primary-extra modifiers, install them now!
	// We exclude innate items here: their slots are still considered free!
	if ( itemUsage['primary-extra'] && this.remainingSlots( item['slot-type'] , true ) ) {
		log.hdebug( "addToPrimary (primary-extra) %s %I" , item.name , itemUsage['primary-extra'] ) ;
		this.stats.stack( itemUsage['primary-extra'] ) ;
	}
	else if ( itemUsage.primary ) {
		log.hdebug( "addToPrimary (primary) %s %I" , item.name , itemUsage.primary ) ;
		this.stats.stack( itemUsage.primary ) ;
	}

	return true ;
} ;



Entity.prototype.removeFromPrimary = function( usage , item ) {
	if ( this.primary[ usage ] !== item ) { return false ; }

	this.primary[ usage ] = null ;
	var itemUsage = item['usages-mods'][ usage ] ;

	// If this item have primary or primary-extra modifiers, uninstall them now!
	if ( itemUsage.primary ) { this.stats.unstack( itemUsage.primary ) ; }
	if ( itemUsage['primary-extra'] ) { this.stats.unstack( itemUsage['primary-extra'] ) ; }

	return true ;
} ;



Entity.prototype.addToSupports = function( usage , item ) {
	if ( this.supports[ usage ].has( item ) ) { return false ; }

	this.supports[ usage ].add( item ) ;

	// If this item have support modifiers, install them now!
	var itemUsage = item['usages-mods'][ usage ] ;
	if ( itemUsage.support ) { this.stats.stack( itemUsage.support ) ; }

	return true ;
} ;



Entity.prototype.removeFromSupports = function( usage , item ) {
	if ( ! this.supports[ usage ].has( item ) ) { return false ; }

	this.supports[ usage ].delete( item ) ;

	// If this item have support modifiers, uninstall them now!
	var itemUsage = item['usages-mods'][ usage ] ;
	if ( itemUsage.support ) { this.stats.unstack( itemUsage.support ) ; }

	return true ;
} ;



// Clear all innate items for a given slotType
Entity.prototype.clearInnateItems = function( slotType ) {
	if ( ! this.slots[ slotType ] ) { return ; }
	this['innate-items'][ slotType ].clear() ;
} ;



Entity.prototype.fillInInnateSlots = function( slotType , slotCount ) {
	if ( ! slotCount || ! this['innate-items'][ slotType ].size ) { return ; }

	for ( let item of this['innate-items'][ slotType ] ) {
		if ( ! this['equipped-items'][ slotType ].has( item ) ) {
			// Should always be 1, but a bit of defensive programming does not hurt, in case of future changes
			if ( item['slot-count'] <= slotCount ) {
				if ( this.addToSlot( slotType , item ) ) {
					slotCount -= item['slot-count'] ;
					this.setAllPrimaries( item ) ;
					// Stop we have filled enough slots
					if ( ! slotCount ) { break ; }
				}
			}
			else {
				// It never happens ATM, it would happen if item['slot-count'] could be > 1 for innate
				break ;
			}
		}
	}
} ;



Entity.prototype.freeInnateSlots = function( slotType , slotCount ) {
	if ( ! slotCount || ! this['innate-items'][ slotType ].size ) { return ; }

	for ( let item of this['equipped-items'][ slotType ] ) {
		if ( item.innate ) {
			if ( this.removeFromSlot( slotType , item ) ) {
				// Should always be 1, but a bit of defensive programming does not hurt, in case of future changes
				slotCount -= item['slot-count'] ;
				this.removeAndReplaceFromAllPrimaries( item ) ;
				// Stop when there is enough room
				if ( slotCount <= 0 ) { break ; }
			}
		}
	}
} ;

