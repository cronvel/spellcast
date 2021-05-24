/*
	Spellcast

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const Ngev = require( 'nextgen-events' ) ;
const kungFig = require( 'kung-fig' ) ;
const VarTag = kungFig.VarTag ;
const camel = require( '../../camel.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function DiceRollerTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof DiceRollerTag ) ? this : Object.create( DiceRollerTag.prototype ) ;

	VarTag.call( self , 'input' , attributes , content , shouldParse ) ;

	Object.defineProperties( self , {
		ref: { value: self.attributes , writable: true , enumerable: true }
	} ) ;

	//log.debug( "Set tag: %I" , self ) ;

	return self ;
}

module.exports = DiceRollerTag ;
DiceRollerTag.prototype = Object.create( VarTag.prototype ) ;
DiceRollerTag.prototype.constructor = DiceRollerTag ;



DiceRollerTag.prototype.run = function( book , ctx , callback ) {
	var content , grantedRoles , data = {} ;

	content = this.getRecursiveFinalContent( ctx.data ) ;
	if ( ! content || typeof content !== 'object' ) { return new TypeError( 'Content should be an object.' ) ; }
	content = camel.inPlaceDashToCamelProps( content , true ) ;

	grantedRoles =
		Array.isArray( content.roles ) ? ctx.roles.filter( e => content.roles.indexOf( e.id ) !== -1 ) :
		ctx.roles ;

	// If no one is granted, skip it now!
	if ( ! grantedRoles ) { callback() ; return ; }

	// Label to present to the user for this roll
	data.label = typeof content.label === 'string' ? content.label : '' ;

	// Number of dice
	data.dice = Math.max( 1 , Math.min( 20 , + content.dice || 0 ) ) ;

	// Number of faces
	data.faces = Math.max( 2 , Math.min( 100 , + content.faces || 0 ) ) ;

	// Type of dice, 'default' are dice with faces from 1 to number of face, could be used for values,
	// and client could use it to set a default die skin
	data.type = '' + content.type || 'default' ;

	// The URL of a die skin
	data.skinUrl = content.skinUrl && typeof content.skinUrl === 'string' ? content.skinUrl : null ;

	// If present, this is the values of each faces, if not present, the values comes for 1 to number of faces
	if ( Array.isArray( content.values ) && content.values.length === data.faces ) {
		data.values = content.values.map( v => typeof v === 'string' ? + v : 0 ) ;
	}
	else if ( diceValues[ data.type ] ) {
		data.values = diceValues[ data.type ]( data.faces ) ;
	}

	// Dice roller timeout, if the user didn't roll in time, auto-rolling will occur
	data.timeout = Number.isFinite( content.timeout ) && content.timeout > 0 ? content.timeout : null ;

	var onSubmit = ( role , submitData ) => {
		if ( ! Array.isArray( submitData.dice ) || submitData.dice.length !== data.dice ) {
			// Auto-roll needed
		}

		// /!\ Should perform anti-cheat here

		var result = {} ;
		result.sum = 0 ;
		result.dice = submitData.dice.map( faceId => {
			var v = data.values[ faceId ] ;
			if ( typeof v === 'number' ) { result.sum += v || 0 ; }
			else if ( typeof v !== 'string' ) { v = null ; }
			return v ;
		} ) ;

		this.ref.set( ctx.data , result ) ;
		Ngev.groupOff( grantedRoles , 'diceRollerSubmit' , onSubmit ) ;
		callback() ;
	} ;

	Ngev.groupOn( grantedRoles , 'diceRollerSubmit' , onSubmit ) ;

	Ngev.groupEmit( ctx.roles , 'diceRoller' , grantedRoles.map( e => e.id ) , data ) ;
} ;



const diceValues = {} ;

diceValues.default = faces => {
	var index , values = [] ;
	for ( index = 0 ; index < faces ; index ++ ) { values[ index ] = index + 1 ; }
	return values ;
} ;



diceValues.fudge = faces => {
	var values = [] ,
		index = 0 ,
		neutralIndex = Math.floor( faces / 3 ) ,
		positiveIndex = 2 * neutralIndex + faces % 3 ;

	for ( ; index < neutralIndex ; index ++ ) { values[ index ] = -1 ; }
	for ( ; index < positiveIndex ; index ++ ) { values[ index ] = 0 ; }
	for ( ; index < faces ; index ++ ) { values[ index ] = 1 ; }

	return values ;
} ;



diceValues.relative = faces => {
	var value ,
		values = [] ,
		index = 0 ,
		maxAbsValue = Math.ceil( faces / 2 ) - 1 ,
		neutralIndexEnd = maxAbsValue + 2 - faces % 2 ;

	for ( value = - maxAbsValue ; value < 0 ; index ++ , value ++ ) { values[ index ] = value ; }
	for ( ; index < neutralIndexEnd ; index ++ ) { values[ index ] = 0 ; }
	for ( value = 1 ; value <= maxAbsValue ; index ++ , value ++ ) { values[ index ] = value ; }

	return values ;
} ;

