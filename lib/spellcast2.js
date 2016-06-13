/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
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
	TODO:
		* turn arguments using hyphen in spellbooks into camelCase (e.g. write-formula should be writeFormula in code)
		* automatically check date versus the 'spellbook' file (just like if 'spellbook' was added to all 'summon' block)
		* escape formula variable substitution
		* new blocks:
			- spellbook
			- wand
			- zap
			- sscroll : like scroll but remotely (sh->ssh)
		* find the right regexp for split(/,/) because '\,' should not split
	
	BUGS:
		* escape of spaces in arguments
*/



// Load modules
var exec = require( 'child_process' ).exec ;
var fs = require( 'fs' ) ;

var async = require( 'async-kit' ) ;
var string = require( 'string-kit' ) ;
var tree = require( 'tree-kit' ) ;
var term = require( 'terminal-kit' ).terminal ;

var kungFig = require( 'kung-fig' ) ;
var TagContainer = kungFig.TagContainer ;



var spellcast = {} ;
module.exports = spellcast ;



spellcast.load = function load( path )
{
	var script = kungFig.load( path , {
		tags: {
			startup: require( './StartupTag.js' ) ,
			formula: require( './FormulaTag.js' ) ,
			spell: require( './SpellTag.js' ) ,
			summoning: require( './SummoningTag.js' ) ,
			cast: require( './CastTag.js' ) ,
			summon: require( './SummonTag.js' ) ,
			scroll: require( './ScrollTag.js' ) ,
		}
	} ) ;
	
	var book = Book.create( script ) ;
	
	return book ;
} ;



function Book() { throw new Error( "Use Book.create() instead." ) ; }



Book.create = function createBook( script )
{
	if ( ! ( script instanceof TagContainer ) ) { throw new Error( '[spellcast] Book.create() arguments #0 should be a TagContainer' ) ; }
	
	var self = Object.create( Book.prototype , {
		script: { value: script , enumerable: true } ,
		world: { value: {} , enumerable: true } ,
		spells: { value: {} , enumerable: true } ,
		summonings: { value: {} , enumerable: true } ,
		regexSummonings: { value: [] , enumerable: true } ,
	} ) ;
	
	self.init( script ) ;
	/*
	this.formulas = {} ;
	this.spells = {} ;
	this.summons = {} ;
	this.regexSummonings = [] ;
	
	data = tifParser.parse( data , { removeComment: true } ) ;
	//console.log( data ) ;
	this.parseBook( data ) ;
	*/
	
	return self ;
} ;



Book.prototype.init = function init( tagContainer , context )
{
	if ( ! tagContainer.init )
	{
		tagContainer.callEach( 'init' , this , context ) ;
		tagContainer.init = true ;
	}
} ;



Book.prototype.run = function run( tagContainer , context , callback )
{
	this.init( tagContainer ) ;
	tagContainer.asyncCallEach( 'run' , this , context , callback ) ;
} ;



Book.prototype.cast = function cast( spellName , callback )
{
	var error , context = {} ;
	
	if ( ! this.spells[ spellName ] )
	{
		error = new Error( "Spell '" + spellName + "' not found." ) ;
		error.type = 'notFound' ;
		throw error ;
	}
	
	this.world.this = [ spellName ] ;
	
	// /!\ What is that 'index'? /!\
	Object.defineProperty( this.world.this , 'index' , { value: 0 , writable: true } ) ;
	
	this.spells[ spellName ].run( this , context , callback ) ;
} ;



Book.prototype.summon = function summon( summoningName , callback )
{
	var i , iMax , error , matches , context = {} ;
	
	if ( this.summonings[ summoningName ] )
	{
		this.world.this = [ summoningName ] ;
		
		// /!\ What is that 'index'? /!\
		Object.defineProperty( this.world.this , 'index' , { value: 0 , writable: true } ) ;
		
		this.summonings[ summoningName ].run( this , context , callback ) ;
		
		return ;
	}
	
	// If no summoning are found, then try each regex summoning until something is found
	for ( i = 0 , iMax = this.regexSummonings.length ; i < iMax ; i ++ )
	{
		matches = summoningName.match( this.regexSummonings[ i ] ) ;
		
		if ( matches )
		{
			this.world.this = matches.slice( 0 ) ;
			
			// /!\ What is that 'index'? /!\
			Object.defineProperty( this.world.this , 'index' , { value: 0 , writable: true } ) ;
			
			this.regexSummonings[ i ].run( this , context , callback ) ;
			return ;
		}
	}
	
	// Nothing found...
	error = new Error( "Don't know how to summon '" + summoningName + "'." ) ;
	error.type = 'notFound' ;
	throw error ;
} ;



return ;













			/* CLI */








			/* Book class */



spellcast.Book = function Book( data )
{
	if ( typeof data !== 'string' ) { throw new Error( '[spellcast] Book() need a string as its argument #0' ) ; }
	
	this.formulas = {} ;
	this.spells = {} ;
	this.summons = {} ;
	this.regexSummonings = [] ;
	
	data = tifParser.parse( data , { removeComment: true } ) ;
	//console.log( data ) ;
	this.parseBook( data ) ;
} ;










			/* Init */






			/* Caster / Summoner */



spellcast.Book.prototype.cast = function cast()
{
	var args = Array.prototype.slice.call( arguments ) ;
	args.unshift( 'cast' ) ;
	return this.genericCast.apply( this , args ) ;
} ;

spellcast.Book.prototype.summon = function summon()
{
	var args = Array.prototype.slice.call( arguments ) ;
	args.unshift( 'summon' ) ;
	return this.genericCast.apply( this , args ) ;
} ;



// genericCast( type , genericSpellName , [args] , [inheritedExecution] , callback )
// callback( error , somethingHasBeenCasted )
spellcast.Book.prototype.genericCast = function genericCast( type , genericSpellName , args , inheritedExecution , callback )
{
	var i , genericSpell , matches , self = this ;
	
	
	// Arguments management
	if ( arguments.length < 3 || arguments.length > 5 ) { throw new Error( '[spellcast] cast() should be called with 3 to 5 arguments' ) ; }
	
	if ( typeof genericSpellName !== 'string' ) { throw new Error( '[spellcast] argument #0 of cast() should be a string' ) ; }
	
	if ( arguments.length === 3 ) { callback = args ; args = {} ; inheritedExecution = undefined ; }
	else if ( arguments.length === 4 ) { callback = inheritedExecution ; inheritedExecution = undefined ; }
	
	if ( ! args || typeof args !== 'object' ) { args = {} ; }
	
	
	// Init things
	switch ( type )
	{
		case 'cast' :
			genericSpell = this.spells[ genericSpellName ] ;
			
			if ( ! genericSpell )
			{
				callback( new Error( '[spellcast] cast() : Cannot found spell ' + genericSpellName ) ) ;
				return ;
			}
			
			this.formulas['this'] = [ genericSpellName ] ;
			Object.defineProperty( this.formulas['this'] , 'index' , { value: 0 , writable: true } ) ;
			
			break ;
		
		case 'summon' :
			genericSpell = this.summons[ genericSpellName ] ;
			
			if ( genericSpell )
			{
				this.formulas['this'] = [ genericSpellName ] ;
				Object.defineProperty( this.formulas['this'] , 'index' , { value: 0 , writable: true } ) ;
			}
			else
			{
				// If no summoning are found, then try each regexp summoning until something is found
				for ( i = 0 ; i < this.regexSummonings.length ; i ++ )
				{
					matches = genericSpellName.match( new RegExp( this.regexSummonings[ i ].pattern , this.regexSummonings[ i ].flags ) ) ;
					
					if ( matches )
					{
						type = 'regexp-summon' ;
						genericSpell = this.regexSummonings[ i ] ;
						
						this.formulas['this'] = matches.slice( 0 ) ;
						Object.defineProperty( this.formulas['this'] , 'index' , { value: 0 , writable: true } ) ;
						
						break ;
					}
				}
				
				if ( ! genericSpell )
				{
					callback( new Error( '[spellcast] summon() : Cannot found summonable ' + genericSpellName ) ) ;
					return ;
				}
			}
			
			break ;
		
		default :
			throw new Error( '[spellcast] genericCast() : Cannot found spell ' + genericSpellName ) ;
	}
	
	var castExecution = {
		type: type ,
		genericSpell: genericSpellName ,
		lastCastedTime: 0 ,
		outputFile: null ,
		outputFilename: null ,
		somethingHasBeenCasted: false
	} ;
	
	if ( inheritedExecution && typeof inheritedExecution === 'object' ) { castExecution.root = inheritedExecution ; }
	else { castExecution.root = castExecution ; }
	
	// Here we go... 
	this.init( castExecution , function( error ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		self.castExec( castExecution , genericSpell.casting , args , true , callback ) ;
	} ) ;
} ;



// callback( error , somethingHasBeenCasted ) (except for non-toplevel like foreach, etc...)
spellcast.Book.prototype.castExec = function castExec( castExecution , casting , args , toplevel , callback )
{
	var self = this ;
	
	async.foreach( casting , function( element , foreachCallback ) {
		
		var jobContext = this ;
		
		
		switch ( element.type )
		{
			case 'formula' :
				self.castFormula( element , castExecution , foreachCallback ) ;
				break ;
			
			case 'cast' :
				self.castCast( element , castExecution , foreachCallback ) ;
				break ;
			
			case 'summon' :
				
				self.castSummon( element , castExecution , function( error , upToDate ) {
					
					if ( error ) { foreachCallback( error ) ; }
					else if ( upToDate ) { jobContext.abort( undefined ) ; }
					else { foreachCallback() ; }
				} ) ;
				
				break ;
			
			case 'scroll' :
				castExecution.somethingHasBeenCasted = true ;
				castExecution.root.somethingHasBeenCasted = true ;
				self.castScroll( element , castExecution , foreachCallback ) ;
				break ;
			
			case 'foreach' :
				var list = self.formulas[ Object.keys( element.args )[ 0 ] ] ;
				
				if ( ! list ) { foreachCallback() ; return ; }
				
				async.foreach( list , function( value , index , foreachCallback2 ) {
					
					list.index = index ;
					self.castExec( castExecution , element.casting , args , false , foreachCallback2 ) ;
				} )
				.exec( function( error ) {
					list.index = 0 ;
					if ( error ) { foreachCallback( error ) ; return ; }
					foreachCallback() ;
				} ) ;
				
				break ;
			
			case 'transmute' :
				self.castTransmute( element , castExecution , foreachCallback ) ;
				break ;
			
			case 'transmute-file' :
				self.castTransmuteFile( element , castExecution , foreachCallback ) ;
				break ;
			
			default :
				foreachCallback( new Error( 'Unknown element type: ' + element.type ) ) ;
				break ;
		}
	} )
	.nice( 0 )
	.fatal()
	.exec( function( error ) {
		
		if ( toplevel )
		{
			// We should report that only once
			if ( castExecution.root === castExecution && ! castExecution.root.somethingHasBeenCasted )
			{
				term.green( 'This spell is not ready yet.\n' ) ;
			}
			
			if ( error ) { self.fizzled.call( self , castExecution , error , callback ) ; }
			else { self.casted.call( self , castExecution , callback ) ; }
		}
		else
		{
			if ( error ) { callback( error ) ; }
			else { callback() ; }
			//else { callback( undefined , castExecution.somethingHasBeenCasted ) ; }
		}
	} ) ;
} ;



spellcast.Book.prototype.castCast = function castCast( cast , castExecution , callback )
{
	var self = this ;
	
	async.map( cast.spells , function( spell , foreachCallback ) {
		
		if ( ! self.spells[ spell ] ) { foreachCallback( new Error( 'Cannot find spell: ' + spell ) ) ; return ; }
		//console.log( 'About to subcast' , spell ) ;
		self.cast( spell , cast.args , castExecution.root , foreachCallback ) ;
	} )
	.nice( 0 )
	.parallel( 1 )
	.fatal()
	.exec( callback ) ;
} ;



// callback( error , upToDate )
spellcast.Book.prototype.castSummon = function castSummon( summon , castExecution , callback )
{
	var self = this ;
	
	async.map( summon.files , function( file , foreachCallback ) {
		
		if ( self.summons[ file ] )
		{
			//console.log( 'About to summon' , file ) ;
			
			self.summon( file , summon.args , castExecution.root , function( error , somethingHasBeenCasted ) {
				
				if ( error ) { foreachCallback( error ) ; return ; }
				
				//console.log( "cast summon callback somethingHasBeenCasted" , somethingHasBeenCasted ) ;
				
				// if nothing has been casted, we are up to date
				foreachCallback( undefined , ! somethingHasBeenCasted ) ;
				//foreachCallback( undefined , false ) ;	// false: don't abort the spellcast
			} ) ;
		}
		else
		{
			fs.stat( file , function( error , stats ) {
				
				if ( error ) { foreachCallback( error ) ; return ; }
				
				// abort the spellcast only if the lastCastedTime is newer
				foreachCallback( undefined , castExecution.lastCastedTime >= stats.mtime.getTime() ) ;
			} ) ;
		}
	} )
	.nice( 0 )
	.parallel( 1 )
	.fatal()
	.exec( function( error , results ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		//console.log( "castExecution" , castExecution ) ;
		//console.log( castExecution.genericSpell , "somethingHasBeenCasted:" , castExecution.somethingHasBeenCasted ) ;
		//console.log( "root" , castExecution.root.genericSpell , "somethingHasBeenCasted:" , castExecution.root.somethingHasBeenCasted ) ;
		//callback( undefined , args.rootCastExecution.somethingHasBeenCasted ? false : true ) ;
		
		
		//*
		callback( undefined , results.every(
			function( element ) { return element ; }
		) ) ;
		//*/
	} ) ;
} ;


			/* Finalize: casted() and fizzled() */



// callback( error , somethingHasBeenCasted )
spellcast.Book.prototype.casted = function casted( castExecution , callback )
{
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/casted/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; return ; }
				callback( undefined , castExecution.somethingHasBeenCasted ) ;
				//callback() ;
			} ) ;
		} ) ;
	} ) ;
} ;



// callback( error )
spellcast.Book.prototype.fizzled = function fizzled( castExecution , fizzledError , callback )
{
	if ( ! fizzledError ) { fizzledError = new Error( 'The spell fizzled' ) ; }
	
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/fizzled/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; }
				//callback( fizzledError , castExecution.somethingHasBeenCasted ) ;
				callback( fizzledError ) ;
			} ) ;
		} ) ;
	} ) ;
} ;






spellcast.Book.prototype.castFormula = function castFormula( formula , castExecution , callback )
{
	var i , oneFormula , values ;
	
	for ( i = 0 ; i < formula.formulas.length ; i ++ )
	{
		oneFormula = formula.formulas[ i ] ;
		
		values = this.variableSubstitution( oneFormula.values ) ;
		
		// Split values with ',' not following a single '\'
		values = values.split( /,/ ) ;	// Find the right regexp here
		
		// Set the index to 0
		Object.defineProperty( values , 'index' , { value: 0 , writable: true } ) ;
		
		this.formulas[ oneFormula.id ] = values ;
	}
	
	callback() ;
} ;



spellcast.Book.prototype.castTransmute = function castTransmute( transmute , castExecution , callback )
{
	var i , j , pattern , replace , formula = Object.keys( transmute.args )[ 0 ] ;
	
	if ( ! this.formulas[ formula ] )
	{
		callback( new Error( 'Undefined formula: ' + formula ) ) ;
		return ;
	}
	
	for ( i = 0 ; i < this.formulas[ formula ].length ; i ++ )
	{
		for ( j = 0 ; j < transmute.regexp.length ; j ++ )
		{
			//console.log( 'regexp:' , transmute.regexp[ j ].pattern , transmute.regexp[ j ].flags , transmute.regexp[ j ].replace ) ;
			//console.log( 'before:' , this.formulas[ formula ][ i ] ) ;
			
			pattern = this.variableSubstitution( transmute.regexp[ j ].pattern ) ;
			replace = this.variableSubstitution( transmute.regexp[ j ].replace ) ;
			
			this.formulas[ formula ][ i ] = this.formulas[ formula ][ i ].replace(
				new RegExp( pattern , transmute.regexp[ j ].flags ) ,
				replace
			) ;
			//console.log( 'after:' , this.formulas[ formula ][ i ] ) ;
		}
	}
	
	callback() ;
} ;



spellcast.Book.prototype.castTransmuteFile = function castTransmuteFile( transmuteFile , castExecution , callback )
{
	var j , content , pattern , replace , file = this.variableSubstitution( Object.keys( transmuteFile.args )[ 0 ] ) ;
	
	try {
		content = fs.readFileSync( file ).toString() ;
	}
	catch ( error ) {
		callback( error ) ;
		return ;
	}
	
	//console.log( 'content:' , content ) ;
	
	for ( j = 0 ; j < transmuteFile.regexp.length ; j ++ )
	{
		//console.log( 'regexp:' , transmuteFile.regexp[ j ].pattern , transmuteFile.regexp[ j ].flags , transmuteFile.regexp[ j ].replace ) ;
		//console.log( 'before:' , this.formulas[ formula ][ i ] ) ;
		
		pattern = this.variableSubstitution( transmuteFile.regexp[ j ].pattern ) ;
		replace = this.variableSubstitution( transmuteFile.regexp[ j ].replace ) ;
		
		content = content.replace(
			new RegExp( pattern , transmuteFile.regexp[ j ].flags ) ,
			replace
		) ;
	}
	
	try {
		fs.writeFileSync( file , content ) ;
	}
	catch ( error ) {
		callback( error ) ;
		return ;
	}
	
	callback() ;
} ;





			/* Variables */



spellcast.Book.prototype.variableSubstitution = function variableSubstitution( input )
{
	var output , self = this ;
	
	output = input.replace( /\$\{([0-9a-zA-Z_-]+)(:([*0-9a-zA-Z_-]+))?([\\\/0-9a-zA-Z_-]*)?\}/g , function() {
		
		//console.log( 'arguments:' , arguments ) ;
		
		var i , filters , index , value , thirdParty , substitute = self.formulas[ arguments[ 1 ] ] ;
		
		if ( substitute === undefined ) { return '' ; }
		
		if ( arguments[ 3 ] )
		{
			// Find a specific index
			
			if ( arguments[ 3 ] === '*' )
			{
				// This will substitute with the whole formula list, separated by comma
				
				value = [] ;
				for ( i = 0 ; i < substitute.length ; i ++ )
				{
					// Protect comma with a backslash
					value[ i ] = substitute[ i ].replace( ',' , '\\,' ) ;
				}
				
				value = value.join( ',' ) ;
			}
			else if ( arguments[ 3 ].match( /^[0-9]+$/ ) )
			{
				// This is a fixed numeric index
				index = parseInt( arguments[ 3 ] ) ;
			}
			else
			{
				// Get the numeric index of a third party formula
				thirdParty = self.formulas[ arguments[ 3 ] ] ;
				if ( thirdParty === undefined ) { return '' ; }
				index = thirdParty.index ;
			}
		}
		else
		{
			// Normal substitution mode: replace by the variable current index
			index = substitute.index ;
		}
		
		if ( ! value ) { value = substitute[ index ] ; }
		
		// Filters
		if ( arguments[ 4 ] )
		{
			filters = arguments[ 4 ].split( '/' ) ;
			filters.shift() ;
			
			for ( i = 0 ; i < filters.length ; i ++ )
			{
				//console.log( "filter #" + i + ":" , filters[ i ] ) ;
				
				if ( spellcast.filter[ filters[ i ] ] )
				{
					value = spellcast.filter[ filters[ i ] ]( value ) ;
				}
			}
		}
		
		return value ;
	} ) ;
	
	return output ;
} ;



spellcast.filter = {
	'uppercase': function uppercase( str ) { return str.toUpperCase() ; } ,
	'lowercase': function lowercase( str ) { return str.toLowerCase() ; } ,
	'regexp': string.escape.regExp ,
	'shellarg' : string.escape.shellArg
} ;



spellcast.Book.prototype.argsVariableSubstitution = function argsVariableSubstitution( inArgs )
{
	var key , args = {} ;
	
	for ( key in inArgs )
	{
		if ( typeof inArgs[ key ] !== 'string' ) { args[ key ] = inArgs[ key ] ; }
		else { args[ key ] = this.variableSubstitution( inArgs[ key ] ) ; }
	}
	
	return args ;
} ;





			/* Makefile builder */



spellcast.Book.prototype.buildMakefile = function buildMakefile( spellcastBin )
{
	var i , key , ruleList = [] , file , npmInstall , makefile = '' ;
	
	file = 'Makefile' ;
	
	if ( typeof spellcastBin !== 'string' )
	{
		npmInstall = true ;
		spellcastBin = './node_modules/spellcast/bin/spellcast' ;
	}
	
	
	// Advertise
	makefile += '\n# This Makefile has been automatically generated by Spellcast.\n# See: https://www.npmjs.org/package/spellcast\n\n' ;
	
	// Get all rules
	for ( key in this.spells ) { ruleList.push( key ) ; }
	
	for ( key in this.summons )
	{
		// Do not copy summoning that share the same key as a spellcasting
		if ( ! this.spells[ key ] && key !== file ) { ruleList.push( key ) ; }
	}
	
	// Build all rules
	for ( i = 0 ; i < ruleList.length ; i ++ )
	{
		makefile += ruleList[ i ] + ':' ;
		if ( npmInstall ) { makefile +=	' ' + spellcastBin ; }
		makefile += '\n\t' + spellcastBin + ' ' + ruleList[ i ] + '\n\n' ;
	}
	
	// If necessary, add the rule to install spellcast locally
	if ( npmInstall )
	{
		makefile +=	spellcastBin + ':\n\tnpm install spellcast\n\n' ;
	}
	
	// Make every rules 'PHONY' rules
	if ( ruleList.length )
	{
		makefile +=
			"# Make every rules 'PHONY' rules, let Spellcast handle dependencies and everything else.\n" +
			'.PHONY: ' + ruleList.join( ' ' ) ;
	}
	
	makefile += '\n\n' ;
	
	try {
		fs.writeFileSync( file , makefile ) ;
	}
	catch ( error ) {
		term.red( 'Cannot create the file ' ).italic.bold.red( file + '\n' ) ;
	}
	
	//term.magenta( 'Not coded yet.\n' ) ;
} ;





			/* Utilities */



//function noop() {}




