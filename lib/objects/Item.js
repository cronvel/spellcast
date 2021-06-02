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

	Object.defineProperties( this , {
		// Global statistics of this item, bonus given to stats out of any usages (e.g. ring & necklace bonuses)
		stats: { value: options.stats || {} , writable: true , enumerable: true } ,

		// Global skills of this item, bonus given to skills out of any usages (e.g. ring & necklace bonuses)
		skills: { value: options.skills || {} , writable: true , enumerable: true } ,

		// Global status bonuses
		status: { value: options.status || {} , writable: true , enumerable: true } ,

		// Global compound stats bonuses (not formula)
		compound: { value: options.compound || {} , writable: true , enumerable: true } ,

		// Own stats of the item (like its durability, ...)
		"own-stats": { value: options['own-stats'] || {} , writable: true , enumerable: true } ,

		// ?? Own skills of the item (not sure if its useful, just there for consistency)
		"own-skills": { value: options['own-skills'] || {} , writable: true , enumerable: true } ,

		// Own status of the item (like its remaining durability, ...)
		"own-status": { value: options['own-status'] || {} , writable: true , enumerable: true } ,

		// Type of slots the item will use when equipped on an entity (e.g. armor, hand, neck, ...)
		"slot-type": { value: options['slot-type'] || 'equipment' , writable: true , enumerable: true } ,

		// How many slots (of the previous type) it would use
		"slot-count": { value: options['slot-count'] !== undefined ? options['slot-count'] : 1 , writable: true , enumerable: true } ,

		// Usages/functions of this item, i.e. a per-function stats and bonuses, K/V pairs as function name/bonuses,
		// where bonuses is an object with keys: params, stats, skills, status, compound, adhoc
		usages: { value: options.usages || {} , writable: true , enumerable: true }
	} ) ;
}

module.exports = Item ;

Item.prototype = Object.create( BaseObject.prototype ) ;
Item.prototype.constructor = Item ;
Item.prototype.__prototypeUID__ = 'spellcast/Item' ;
Item.prototype.__prototypeVersion__ = require( '../../package.json' ).version ;

