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

// FIX / TODO
	// MOVED TO modifiers
	// Global statistics of this item, bonus given to stats out of any usages (e.g. ring & necklace bonuses)
	//stats = options.stats || {} ;
	this.modifiers =
		! options.modifiers || typeof options.modifiers !== 'object' ? new ModifiersTable() :
		options.modifiers instanceof ModifiersTable ? options.modifiers :
		new ModifiersTable( options.modifiers ) ;

// FIX / TODO
	// MOVED TO modifiers / modifiers.skills
	// Global skills of this item, bonus given to skills out of any usages (e.g. ring & necklace bonuses)
	//skills = options.skills || {} ;

// FIX / TODO
	// MOVED TO modifiers / modifiers.status
	// Global status bonuses
	//status = options.status || {} ;

// FIX / TODO
	// MOVED TO modifiers
	// Global compound stats bonuses (not formula)
	//compound = options.compound || {} ;

// FIX / TODO
	// MOVED TO modifiers / modifiers/usages
	// Usages/functions of this item, i.e. a per-function stats and bonuses, K/V pairs as function name/bonuses,
	// where bonuses is an object with keys: params, stats, skills, status, compound, adhoc
	//usages = options.usages || {} ;

// FIX / TODO
	// MOVED TO stats
	// Own stats of the item (like its durability, ...)
	//"own-stats" = options['own-stats'] || {} ;
	this.stats =
		! options.stats || typeof options.stats !== 'object' ? new StatsTable() :
		options.stats instanceof StatsTable ? options.stats :
		new StatsTable( options.stats ) ;

// FIX?
	// USELESS or MOVED TO stats / stats.skills
	// ?? Own skills of the item (not sure if its useful, just there for consistency)
	//"own-skills" = options['own-skills'] || {} ;

// FIX / TODO
	// MOVED TO stats / stats.status
	// Own status of the item (like its remaining durability, ...)
	//"own-status" = options['own-status'] || {} ;

	// Type of slots the item will use when equipped on an entity (e.g. armor, hand, neck, ...)
	this["slot-type"] = options['slot-type'] || 'equipment' ;

	// How many slots (of the previous type) it would use
	this["slot-count"] = options['slot-count'] !== undefined ? options['slot-count'] : 1 ;
}

module.exports = Item ;

Item.prototype = Object.create( BaseObject.prototype ) ;
Item.prototype.constructor = Item ;
Item.prototype.__prototypeUID__ = 'spellcast/Item' ;
Item.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

