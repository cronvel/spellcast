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

const glob = require( 'glob' ) ;
const kungFig = require( 'kung-fig' ) ;
const Promise = require( 'seventh' ) ;

const fs = require( 'fs' ) ;
const pathModule = require( 'path' ) ;

const LabelTag = kungFig.LabelTag ;
const TagContainer = kungFig.TagContainer ;
const SummoningTag = require( './SummoningTag' ) ;
const SummonTag = require( './SummonTag' ) ;

const utils = require( '../../utils.js' ) ;

const log = require( 'logfella' ).global.use( 'spellcast' ) ;



function ReverseSummoningTag( tag , attributes , content , shouldParse ) {
	var self = ( this instanceof ReverseSummoningTag ) ? this : Object.create( ReverseSummoningTag.prototype ) ;

	if ( content === undefined ) {
		content = new TagContainer( undefined , self ) ;
	}

	// Do not call SummoningTag constructor, only call the LabelTag one
	LabelTag.call( self , 'reverse-summoning' , attributes , content , shouldParse ) ;

	if ( ! ( content instanceof TagContainer ) ) {
		throw new SyntaxError( "The 'reverse-summoning' tag's content should be a TagContainer." ) ;
	}

	if ( ! self.attributes ) {
		throw new SyntaxError( "The 'spell' tag's id should be non-empty string." ) ;
	}

	Object.defineProperties( self , {
		id: { value: self.attributes , enumerable: true } ,
		targetToSourceMapping: { value: {} , writable: true , enumerable: true } ,
		sourceToTargetMapping: { value: {} , writable: true , enumerable: true } ,
		undeadDirectoriesMap: { value: {} , writable: true , enumerable: true }
	} ) ;

	return self ;
}

module.exports = ReverseSummoningTag ;

ReverseSummoningTag.prototype = Object.create( SummoningTag.prototype ) ;
ReverseSummoningTag.prototype.constructor = ReverseSummoningTag ;



ReverseSummoningTag.prototype.init = function( book , callback ) {
	// Reverse summonings are both spells and summonings
	book.spells[ this.id ] = this ;
	book.reverseSummonings.push( this ) ;

	Promise.resolve( this.solveReverse( book ) ).callback( callback ) ;
} ;



ReverseSummoningTag.prototype.exec = function( book , options , ctx , callback ) {
	if ( ctx.summoning ) {
		// This is a regular summoning
		SummoningTag.prototype.exec.call( this , book , options , ctx , callback ) ;
	}
	else if ( ctx.spell ) {
		// This is a spell-like reverse summoning: it summons everything!
		Object.keys( this.undeadDirectoriesMap )
			.forEach( dir => book.castUndead( dir , this.undeadDirectoriesMap[ dir ] ) ) ;

		SummonTag.execMulti( book , Object.keys( this.targetToSourceMapping ) , options , ctx )
			.then( () => Promise.resolve( this.deleteOrphans( book , ctx ) ).callback( callback ) )
			.catch( error => { callback( error ) ; } ) ;
	}
	else {
		throw new Error( "Reverse-summoning is neither exec as spell nor as summoning..." ) ;
	}
} ;

ReverseSummoningTag.prototype.execAsync = Promise.promisify( ReverseSummoningTag.prototype.exec ) ;



ReverseSummoningTag.prototype.reset = function( book ) {
	this.undeadDirectoriesMap = {} ;
	return this.solveReverse( book ) ;
} ;



ReverseSummoningTag.prototype.deleteOrphans = async function( book , ctx ) {
	var map = {} , reverseMap = {} , mappingTag , orphans = [] ;

	mappingTag = this.content.getFirstTag( 'mapping' ) ;

	if ( ! mappingTag ) {
		throw new SyntaxError( 'The [reverse-summoning] tag needs one [mapping] tag inside it' ) ;
	}

	// Use kungFig.toObject() because path can start with reserved operators, like *
	map = kungFig.toObject( mappingTag.getRecursiveFinalContent( ctx.data ) ) ;

	Object.keys( map ).forEach( k => reverseMap[ map[ k ] ] = true ) ;

	//log.error( "map: %I\nreverse-map: %I" , map , reverseMap ) ;

	await Promise.forEach( Object.keys( reverseMap ) , async ( sourceGlob ) => {

		var targetGlob = reverseMap[ sourceGlob ] ;

		//log.error( "\n##### %s\n" , targetGlob ) ;

		//targetGlob = pathModule.normalize( targetGlob ) ;

		var cwdTargetList = await glob.async( book.cwd + '/' + targetGlob ) ;

		cwdTargetList.forEach( cwdTarget => {
			//log.error( ">>> %s" , target ) ;
			var target = pathModule.relative( book.cwd , cwdTarget ) ;
			//log.error( "one cwd target: %I\ntarget: %I" , cwdTarget , target ) ;

			if ( ! this.targetToSourceMapping[ target ] ) {
				//log.error( "--- %s" , target ) ;
				orphans.push( target ) ;
			}
		} ) ;
	} ) ;

	if ( ! orphans.length ) { return ; }

	if ( ctx.parent ) { ctx.parent.dependenciesTime = Infinity ; }
	else { log.debug( "Deleting orphan, but no parent" ) ; }

	return Promise.forEach( orphans , ( path ) => {
		//log.error( "Unlink '%s'" , path ) ;
		Ngev.groupEmit( ctx.roles , 'coreMessage' , '^r^/%s^:^R was unsummoned.^:\n' , path ) ;

		if ( book.persistent.summonMap.spell[ this.id ] ) { delete book.persistent.summonMap.spell[ this.id ][ path ] ; }
		delete book.persistent.summonMap.summoning[ path ]  ;

		return fs.unlinkAsync( book.cwd + '/' + path ) ;
	} ) ;
} ;



ReverseSummoningTag.prototype.solveReverse = async function( book ) {
	var map , mappingTag ;

	this.targetToSourceMapping = {} ;
	this.sourceToTargetMapping = {} ;

	//log.debug( "Solve reverse summoning %s" , this.globPattern ) ;

	mappingTag = this.content.getFirstTag( 'mapping' ) ;

	if ( ! mappingTag ) {
		throw new SyntaxError( 'The [reverse-summoning] tag needs one [mapping] tag inside it' ) ;
	}

	// Use kungFig.toObject() because path can start with reserved operators, like *
	map = kungFig.toObject( mappingTag.getRecursiveFinalContent( book.data ) ) ;

	//log.debug( "Sources: %I" , sourcesList ) ;

	await Promise.forEach( Object.keys( map ) , async ( sourceGlob ) => {
		var targetGlob = map[ sourceGlob ] ;

		var oneMap = await utils.glob.map( book.cwd , sourceGlob , targetGlob ) ;

		//log.error( "%I" , oneMap ) ;
		//Object.keys( oneMap ).forEach( ( k ) => this.sourceToTargetMapping[ k ] = oneMap[ k ] ) ;
		Object.keys( oneMap ).forEach( k => this.targetToSourceMapping[ oneMap[ k ] ] = k ) ;

		var dirMap = await utils.glob.getUndeadDirectoriesMap( book.cwd + '/' + sourceGlob ) ;

		Object.keys( dirMap ).forEach( dir => {
			if ( ! this.undeadDirectoriesMap[ dir ] ) { this.undeadDirectoriesMap[ dir ] = {} ; }
			Object.keys( dirMap[ dir ] ).forEach( globPattern => this.undeadDirectoriesMap[ dir ][ globPattern ] = true ) ;
		} ) ;
	} ) ;

	// Should be done at the end, because it should verify one to one relationship.
	var keys = Object.keys( this.targetToSourceMapping ) ;
	keys.forEach( ( k ) => this.sourceToTargetMapping[ this.targetToSourceMapping[ k ] ] = k ) ;

	log.debug( "targetToSourceMapping: %I" , this.targetToSourceMapping ) ;
	log.debug( "sourceToTargetMapping: %I" , this.sourceToTargetMapping ) ;

	if ( keys.length !== Object.keys( this.sourceToTargetMapping ).length ) {
		throw new Error( "[mapping] error, it should produce a one to one relationship" ) ;
	}
} ;

