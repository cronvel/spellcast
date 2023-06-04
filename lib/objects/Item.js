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



/*
	Items can be object like weapon, armor, keys, or anything providing bonuses or maluses to an entity,
	like enchantment, spells, illness...
*/



const BaseObject = require( './BaseObject.js' ) ;
const kungFig = require( 'kung-fig' ) ;
const StatsTable = kungFig.statsModifiers.StatsTable ;
const ModifiersTable = kungFig.statsModifiers.ModifiersTable ;
const copyData = require( '../copyData.js' ) ;
const utils = require( '../utils.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



var autoId = 0 ;



function Item( book , id , options , noCopy ) {
	if ( ! options || typeof options !== 'object' ) {
		options = {} ;
	}
	else if ( ! noCopy ) {
		// Clone options to avoid parts to be shared
		options = copyData.deep( options ) ;
	}

	if ( ! id ) { id = 'item_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , options ) ;

	// Virtual Item are abstract, not a real.
	// There are cloned when given to an entity, and when they are “dropped”, there are destroyed.
	// E.g.: abilities, innate-equipment item...
	this.virtual = !! options.virtual ;
	
	// Internal, set as true when a virtual item is used as 'innate' object
	this.innate = false ;

	// Type of slots the item will use when equipped on an entity (e.g. armor, hand, neck, ...),
	// if null, the item cannot be equipped
	this['slot-type'] = options['slot-type'] || null ;

	// How many slots (of the previous type) it would use
	this['slot-count'] =
		! this['slot-type'] ? 0 :
		options['slot-count'] !== undefined ? + options['slot-count'] || 1 :
		1 ;

	// If the item can use an extra slot, if there is one left
	this['extra-slot'] = false ;

	// Statistics bonus for entities just having it in the inventory (NOT equipped)
	this['passive-mods'] = this.createModifiersTable( this.id + '_passive' , options['passive-mods'] ) ;

	// Statistics bonus for entities equipping this item
	this['active-mods'] = this.createModifiersTable( this.id + '_active' , options['active-mods'] ) ;

	// Usages/functions of this item, i.e. a per-usages stats and bonuses, K/V pairs as usage name/bonuses,
	// .['usages-mods'].<usageType>.<primary|primary-extra|support> = mods
	this['usages-mods'] = {} ;
	
	// Statistics bonus for entities equipping this item for a specific usage, with mode: primary|primary-extra|support
	// ['usages-mods'].<usageType>.<primary|primary-extra|support> = mods
	if ( options['usages-mods'] && typeof options['usages-mods'] === 'object' ) {
		for ( let usageType in options['usages-mods'] ) {
			if ( ! options['usages-mods'][ usageType ] || typeof options['usages-mods'][ usageType ] !== 'object' ) { continue ; }
			for ( let usageMode in options['usages-mods'][ usageType ] ) {
				if ( usageMode === 'primary-extra' ) { this['extra-slot'] = true ; }
				let modifiersTable = this.createModifiersTable(
					this.id + '_usage_' + usageType + '_' + usageMode ,
					options['usages-mods'][ usageType ][ usageMode ] ,
					'usages.' + usageType
				) ;
				
				if ( modifiersTable ) {
					if ( ! this['usages-mods'][ usageType ] ) { this['usages-mods'][ usageType ] = {} ; }
					this['usages-mods'][ usageType ][ usageMode ] = modifiersTable ;
				}
			}
		}
	}

	// Own stats of the item (e.g. its durability, ...)
	this.stats = new StatsTable( options.stats || {} ).getProxy() ;
}

module.exports = Item ;

Item.prototype = Object.create( BaseObject.prototype ) ;
Item.prototype.constructor = Item ;
Item.prototype.__prototypeUID__ = 'spellcast/Item' ;
Item.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;



Item.prototype.clone = function() {
	var newId = utils.createCloneId( this.id ) ;
	var cloned = new Item( this.book , newId , {
		// BaseObject:
		name: this.name ,
		class: this.class ,
		model: this.model ,
		description: this.description ,
		params: copyData.deep( this.params ) ,
		
		// Item:
		virual: this.virtual ,
		"slot-type": this['slot-type'] ,
		"slot-count": this['slot-count'] ,
		"extra-slot": this['extra-slot']
	} , true ) ;
	
	if ( this['passive-mods'] ) {
		cloned['passive-mods'] = this['passive-mods'].clone( newId + '_passive' ) ;
	}

	if ( this['active-mods'] ) {
		cloned['active-mods'] = this['active-mods'].clone( newId + '_active' ) ;
	}

	for ( let usageType in this['usages-mods'] ) {
		for ( let usageMode in this['usages-mods'][ usageType ] ) {
			let modifiersTable = this['usages-mods'][ usageType ][ usageMode ] ;
			if ( ! modifiersTable ) { continue ; }
			if ( ! cloned['usages-mods'][ usageType ] ) { cloned['usages-mods'][ usageType ] = {} ; }
			cloned['usages-mods'][ usageType ][ usageMode ] = modifiersTable.clone( cloned.id + '_usage_' + usageType + '_' + usageMode ) ;
		}
	}
	
	if ( this.stats ) {
		cloned.stats = this.stats.clone() ;
	}
	
	return cloned ;
} ;

