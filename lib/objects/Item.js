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
const tree = require( 'tree-kit' ) ;
const copyData = require( '../copyData.js' ) ;
const Ngev = require( 'nextgen-events' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



/*
	Items can be object like weapon, armor, keys, or anything providing bonuses or maluses to an entity,
	like enchantment, spells, illness...
*/



var autoId = 0 ;



function Item( book , id , options ) {
	if ( ! options || typeof options !== 'object' ) {
		options = {} ;
	}
	else {
		// Clone options to avoid parts to be shared
		options = copyData.deep( options ) ;
	}

	if ( ! id ) { id = 'item_' + ( autoId ++ ) ; }

	BaseObject.call( this , book , id , options ) ;

	// Type of slots the item will use when equipped on an entity (e.g. armor, hand, neck, ...),
	// if null, the item cannot be equipped
	this['slot-type'] = options['slot-type'] || null ;

	// How many slots (of the previous type) it would use
	this['slot-count'] =
		! this['slot-type'] ? 0 :
		options['slot-count'] !== undefined ? options['slot-count'] :
		1 ;

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

