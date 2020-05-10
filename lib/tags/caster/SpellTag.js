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
const Promise = require( 'seventh' ) ;
const kungFig = require( 'kung-fig' ) ;
const LabelTag = kungFig.LabelTag ;
const TagContainer = kungFig.TagContainer ;

const fs = require( 'fs' ) ;

const utils = require( '../../utils.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function SpellTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof SpellTag ) ? this : Object.create( SpellTag.prototype ) ;

	if ( content === undefined ) {
		content = new TagContainer( undefined , self ) ;
	}

	LabelTag.call( self , 'spell' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'spell' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'spell' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true }
	} ) ;

	return self ;
}

module.exports = SpellTag ;
SpellTag.prototype = Object.create( LabelTag.prototype ) ;
SpellTag.prototype.constructor = SpellTag ;



SpellTag.prototype.init = function( book ) {
	book.spells[ this.id ] = this ;
	return null ;
} ;



SpellTag.prototype.exec = function( book , options , ctx , callback ) {
	ctx.data.this = {
		summoned: ctx.summoned
	} ;

	this.prepare( book , ctx , ( error ) => {

		if ( error ) { callback( error ) ; return ; }

		book.engine.runCb( this.content , book , ctx , null , ( error_ ) => {

			if ( ctx.parent ) {
				// -Infinity = not set/no dependency, leading to a +Infinity dependency (i.e. force rebuild)
				ctx.parent.dependenciesTime = Math.max(
					ctx.parent.dependenciesTime ,
					ctx.dependenciesTime === -Infinity ? Infinity : ctx.dependenciesTime
				) ;

				log.debug( "Dependencies time for '%s': %s." , ctx.spell , utils.debugDate( ctx.dependenciesTime ) ) ;
			}

			if ( error_ && ! error_.break ) {
				this.fizzled( book , ctx , error_ , callback ) ;
			}
			else {
				// Should we force a rebuild of the parent?
				// Spells are not supposed to build anything...
				//if ( ctx.parent ) { ctx.parent.dependenciesTime = Infinity ; }
				this.casted( book , ctx , callback ) ;
			}
		} ) ;
	} ) ;
} ;

SpellTag.prototype.execAsync = Promise.promisify( SpellTag.prototype.exec ) ;



SpellTag.prototype.prepare = function( book , ctx , callback ) {
	var openListener , errorListener , statPath ;

	if ( ctx.summoning ) {
		ctx.outputFilename = '%' + ctx.summoning.replace( /\//g , '%' ) ;
		statPath = book.cwd + '/' + ctx.summoning ;
	}
	else {
		ctx.outputFilename = ctx.spell ;
		statPath = book.cwd + '/.spellcast/casted/' + ctx.spell ;
	}

	fs.stat( statPath , ( statError , stats ) => {

		if ( statError ) {
			if ( statError.code === 'ENOENT' ) {
				log.debug( "Never casted before. Stat: %E" , statError ) ;
			}
			else {
				log.debug( "Can't access file. %E" , statError ) ;
				callback( new Error( "Can't access file '" + ctx.summoning + "'." ) ) ;
				return ;
			}
		}
		else {
			ctx.lastCastedTime = stats.mtime.getTime() ;

			if ( ctx.summoning ) {
				log.debug( "File '%s' last-modified time: %s" , ctx.summoning , utils.debugDate( ctx.lastCastedTime ) ) ;
			}
			else {
				log.debug( "Last time '%s' was casted: %s." , ctx.spell , utils.debugDate( ctx.lastCastedTime ) ) ;
			}
		}

		ctx.outputFile = fs.createWriteStream( book.cwd + '/.spellcast/tmp/' + ctx.outputFilename ) ;

		var triggered = false ;

		var triggerCallback = error => {
			if ( triggered ) { return ; }
			ctx.outputFile.removeListener( 'open' , openListener ) ;
			//ctx.outputFile.removeListener( 'error' , errorListener ) ;
			triggered = true ;
			callback( error ) ;
		} ;

		// Define listeners
		openListener = fd => {
			ctx.outputFileFd = fd ;
			triggerCallback() ;
		} ;

		errorListener = error => {
			log.error( "SpellTag#prepare(): write stream error on file %S: %E" , ctx.outputFile.path , error ) ;
			triggerCallback( error ) ;
		} ;

		// Bind them
		//ctx.outputFile.once( 'error' , errorListener ) ;
		ctx.outputFile.on( 'error' , errorListener ) ;
		ctx.outputFile.once( 'open' , openListener ) ;
	} ) ;
} ;



SpellTag.prototype.casted = function( book , ctx , callback ) {
	log.verbose( "The %s '%s' was successfully casted." ,
		ctx.summoning ? 'summoning of' : 'spell' ,
		ctx.summoning || ctx.spell
	) ;

	if ( ctx.summoning ) {
		Ngev.groupEmit( ctx.roles , 'summon' , ctx.summoning , 'ok' ) ;
		Ngev.groupEmit( ctx.roles , 'coreMessage' , "^g^/%s^:^G was successfully summoned!^:\n" , ctx.summoning ) ;
	}
	else {
		Ngev.groupEmit( ctx.roles , 'cast' , ctx.spell , 'ok' ) ;
		Ngev.groupEmit( ctx.roles , 'coreMessage' , "^g^/%s^:^G was successfully casted!^:\n" , ctx.spell ) ;
	}

	ctx.outputFile.end( () => {
		// Just to be sure that the file descriptor is released by the OS...
		// (older Node version does not release it soon enough, and fs.rename() fails)
		setTimeout( () => {

			fs.rename(
				book.cwd + '/.spellcast/tmp/' + ctx.outputFilename ,
				book.cwd + '/.spellcast/casted/' + ctx.outputFilename ,
				( error ) => {

					if ( error ) {
						log.error( "fs.rename() %E" , error ) ;
						callback( error ) ;
						return ;
					}

					callback() ;
				}
			) ;
		} , 0 ) ;
	} ) ;
} ;



// callback( error )
SpellTag.prototype.fizzled = function( book , ctx , fizzledError , callback ) {
	if ( ! fizzledError ) { fizzledError = new Error( 'The spell fizzled' ) ; }

	log.verbose( "The %s '%s' fizzled: %s" ,
		ctx.summoning ? 'summoning of' : 'spell' ,
		ctx.summoning || ctx.spell , fizzledError
	) ;

	if ( ctx.summoning ) {
		if ( fizzledError.type === 'upToDate' ) {
			Ngev.groupEmit( ctx.roles , 'summon' , ctx.summoning , 'upToDate' ) ;
			Ngev.groupEmit( ctx.roles , 'coreMessage' , "^b^/%s^:^B is not ready yet.^:\n" , ctx.summoning ) ;
		}
		else if ( fizzledError.type === 'noop' ) {
			Ngev.groupEmit( ctx.roles , 'summon' , ctx.summoning , 'noop' ) ;
			Ngev.groupEmit( ctx.roles , 'coreMessage' , "^y^/%s^:^Y 's ritual was successful, yet nothing happened.^:\n" , ctx.summoning ) ;
		}
		else {
			Ngev.groupEmit( ctx.roles , 'summon' , ctx.summoning , 'error' , fizzledError ) ;
			Ngev.groupEmit( ctx.roles , 'errorMessage' , "^r^/%s^:^R fizzled: %s^:\n" , ctx.summoning , fizzledError ) ;
		}
	}
	else if ( fizzledError.type === 'upToDate' ) {
		Ngev.groupEmit( ctx.roles , 'cast' , ctx.spell , 'upToDate' ) ;
		Ngev.groupEmit( ctx.roles , 'coreMessage' , "^b^/%s^:^B is not ready yet.^:\n" , ctx.spell ) ;
	}
	else {
		Ngev.groupEmit( ctx.roles , 'cast' , ctx.spell , 'error' , fizzledError ) ;
		Ngev.groupEmit( ctx.roles , 'errorMessage' , "^r^/%s^:^R fizzled: %s^:\n" , ctx.spell , fizzledError ) ;
	}

	ctx.outputFile.end( () => {
		// Just to be sure that the file descriptor is released by the OS...
		// (older Node version does not release it soon enough, and fs.rename() fails)
		setTimeout( () => {

			fs.rename(
				book.cwd + '/.spellcast/tmp/' + ctx.outputFilename ,
				book.cwd + '/.spellcast/fizzled/' + ctx.outputFilename ,
				( error ) => {

					if ( error ) {
						log.error( "fs.rename() %E" , error ) ;
						callback( error ) ;
						return ;
					}

					callback( ! fizzledError.continue && fizzledError ) ;
				}
			) ;
		} , 0 ) ;
	} ) ;
} ;


