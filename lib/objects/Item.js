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



function Item( book , id , params , noCopy ) {
	if ( ! params || typeof params !== 'object' ) {
		params = {} ;
	}
	else if ( ! noCopy ) {
		// Clone params to avoid parts to be shared
		params = copyData.deep( params ) ;
	}

	if ( ! id ) { id = 'item_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , params ) ;

	// Virtual Item are abstract, not a real.
	// There are cloned when given to an entity, and when they are “dropped”, there are destroyed.
	// E.g.: abilities, innate-equipment item...
	this.virtual = !! params.virtual ;

	// True if the item is a card, so it could be stored in card-piles
	this['is-card'] = !! params['is-card'] ;

	// Internal, set as true when a virtual item is used as 'innate' object
	this.innate = !! params.innate ;

	// Type of slots the item will use when equipped on an entity (e.g. armor, hand, neck, ...),
	// if null, the item cannot be equipped
	this['slot-type'] = params['slot-type'] || null ;

	// How many slots (of the previous type) it would use
	this['slot-count'] =
		! this['slot-type'] ? 0 :
		params['slot-count'] !== undefined ? + params['slot-count'] || 1 :
		1 ;

	// If the item can use an extra slot, if there is one left
	this['extra-slot'] = false ;

	// Statistics bonus for entities just having it in the inventory (NOT equipped)
	this['passive-mods'] = this.createModifiersTable( this.id + '_passive' , params['passive-mods'] ) ;

	// Statistics bonus for entities equipping this item
	this['active-mods'] = this.createModifiersTable( this.id + '_active' , params['active-mods'] ) ;

	// Usages/functions of this item, i.e. a per-usages stats and bonuses, K/V pairs as usage name/bonuses,
	// .['usages-mods'].<usageType>.<primary|primary-extra|support> = mods
	this['usages-mods'] = {} ;

	// Usages/functions of this item, i.e. a per-piles stats and bonuses, K/V pairs as usage name/bonuses,
	// .['card-piles-mods'].<pileName> = mods
	this['card-piles-mods'] = {} ;

	// Statistics bonus for entities equipping this item for a specific usage, with mode: primary|primary-extra|support
	// ['usages-mods'].<usageType>.<primary|primary-extra|support> = mods
	if ( params['usages-mods'] && typeof params['usages-mods'] === 'object' ) {
		for ( let usageType of Object.keys( params['usages-mods'] ) ) {
			if ( ! params['usages-mods'][ usageType ] || typeof params['usages-mods'][ usageType ] !== 'object' ) { continue ; }
			for ( let usageMode of Object.keys( params['usages-mods'][ usageType ] ) ) {
				if ( usageMode === 'primary-extra' ) { this['extra-slot'] = true ; }
				let modifiersTable = this.createModifiersTable(
					this.id + '_usage_' + usageType + '_' + usageMode ,
					params['usages-mods'][ usageType ][ usageMode ] ,
					'usages.' + usageType
				) ;

				if ( modifiersTable ) {
					if ( ! this['usages-mods'][ usageType ] ) { this['usages-mods'][ usageType ] = {} ; }
					this['usages-mods'][ usageType ][ usageMode ] = modifiersTable ;
				}
			}
		}
	}

	// Statistics bonus for entities having this item in a specific card-pile
	// ['card-piles-mods'].<pileName> = mods
	if ( params['card-piles-mods'] && typeof params['card-piles-mods'] === 'object' ) {
		for ( let pileName of Object.keys( params['card-piles-mods'] ) ) {
			if ( ! params['card-piles-mods'][ pileName ] || typeof params['card-piles-mods'][ pileName ] !== 'object' ) { continue ; }
			let modifiersTable = this.createModifiersTable(
				this.id + '_pile_' + pileName ,
				params['card-piles-mods'][ pileName ] ,
				'card-piles.' + pileName
			) ;

			if ( modifiersTable ) {
				this['card-piles-mods'][ pileName ] = modifiersTable ;
			}
		}
	}

	// Own stats of the item (e.g. its durability, ...)
	this.stats = new StatsTable( params.stats || {} ).getProxy() ;
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
		virtual: this.virtual ,
		"is-card": this['is-card'] ,
		innate: this.innate ,
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

	for ( let usageType of Object.keys( this['usages-mods'] ) ) {
		for ( let usageMode of Object.keys( this['usages-mods'][ usageType ] ) ) {
			let modifiersTable = this['usages-mods'][ usageType ][ usageMode ] ;
			if ( ! modifiersTable ) { continue ; }
			if ( ! cloned['usages-mods'][ usageType ] ) { cloned['usages-mods'][ usageType ] = {} ; }
			cloned['usages-mods'][ usageType ][ usageMode ] = modifiersTable.clone( cloned.id + '_usage_' + usageType + '_' + usageMode ) ;
		}
	}

	for ( let pileName of Object.keys( this['card-piles-mods'] ) ) {
		let modifiersTable = this['card-piles-mods'][ pileName ] ;
		if ( modifiersTable ) {
			cloned['card-piles-mods'][ pileName ] = modifiersTable.clone( cloned.id + '_pile_' + pileName ) ;
		}
	}

	for ( let scriptletName of Object.keys( this.scriptlets ) ) {
		// It should be immutable
		cloned[ scriptletName ] = this.scriptlets[ scriptletName ] ;
	}

	if ( this.stats ) {
		cloned.stats = this.stats.clone() ;
	}

	return cloned ;
} ;

