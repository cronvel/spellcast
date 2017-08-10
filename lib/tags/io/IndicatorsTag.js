/*
	Spellcast
	
	Copyright (c) 2014 - 2017 Cédric Ronvel
	
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
var Tag = kungFig.Tag ;

var async = require( 'async-kit' ) ;



function IndicatorsTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof IndicatorsTag ) ? this : Object.create( IndicatorsTag.prototype ) ;
	
	Tag.call( self , tag , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		isStatus: { value: tag === 'status' , enumerable: true }
	} ) ;
	
	return self ;
}

module.exports = IndicatorsTag ;
IndicatorsTag.prototype = Object.create( Tag.prototype ) ;
IndicatorsTag.prototype.constructor = IndicatorsTag ;



IndicatorsTag.prototype.run = function run( book , ctx , callback )
{
	if ( this.isStatus )
	{
		if ( ctx.type === null )
		{
			// No ctx type? probably top-level execution:
			// make it the global [status] tag
			book.statusUpdater = this ;
		}
		else
		{
			throw new Error( 'IndicatorsTag: Not supported yet' ) ;
			//this.ctx.sceneConfig.statusUpdater = this ;
		}
		
		return null ;
	}
	else
	{
		return this.exec( book , null , ctx , callback ) ;
	}
} ;



IndicatorsTag.types = [
	'text' ,
	'hbar' ,
	'vbar'
] ;



IndicatorsTag.prototype.exec = function exec( book , options , ctx , callback )
{
	var thisBackup = ctx.data.this , indicators ;
	var eventName = this.isStatus ? 'status' : 'indicators' ;
	
	// Prepare a per-role indicators/status event, each one has its own 'this'
	book.roles.forEach( role => {
		ctx.data.this = role ;
		
		indicators = this.getRecursiveFinalContent( ctx.data ) ;
		
		if ( ! Array.isArray( indicators ) ) { indicators = [ indicators ] ; }
		
		// Sanitize
		// /!\ Better filters by type needed /!\
		indicators = indicators
			.filter( e =>
				e && typeof e === 'object' &&
				typeof e.label === 'string' &&
				( e.value === null || typeof e.value !== 'object' ) &&
				( e.type === undefined || ( typeof e.type === 'string' && IndicatorsTag.types.indexOf( e.type ) !== -1 ) )
			)
			.map( e => ( {
				label: e.label ,
				value: e.value ,
				type: e.type || 'text'
			} ) ) ;
		
		if ( ! indicators.length ) { return ; }
		
		role.emit( eventName , indicators ) ;
	} ) ;
	
	ctx.data.this = thisBackup ;
	
	return null ;
} ;


