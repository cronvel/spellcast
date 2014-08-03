/*
	The Cedric's Swiss Knife (CSK) - CSK Spellcast lib
	
	The MIT License (MIT)
	
	Copyright (c) 2014 Cédric Ronvel 
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

/*
	TODO:
		* automatically check versus the 'spellbook' file (just like if 'spellbook' was added to all 'summon' block)
		* escape formula variable substitution
		* new blocks:
			- spellbook
			- wand
			- zap
*/



// Load modules
var exec = require( 'child_process' ).exec ;
var fs = require( 'fs' ) ;

var tifParser = require( 'tif-parser' ) ;
var async = require( 'async-kit' ) ;
var tree = require( 'tree-kit' ) ;



var spellcast = {} ;
module.exports = spellcast ;





			/* CLI */



spellcast.cli = function cli( args )
{
	var buffer , book ;
	
	if ( args.length < 3 )
	{
		console.log( "Usage is: spellcast <spell>." ) ;
		return ;
	}
	
	try {
		buffer = fs.readFileSync( 'spellbook' ) ;
	}
	catch ( error ) {
		console.log( "Cannot find the 'spellbook' file." ) ;
		return ;
	}
	
	book = new spellcast.Book( buffer.toString() ) ;
	
	book.cast( args[ 2 ] , function( error ) {
		
		if ( error )
		{
			if ( error instanceof Error )
			{
				console.log( 'The spell fizzled:' , error.message ) ;
				process.exit( 1 ) ;
			}
			else if ( typeof error === 'string' )
			{
				console.log( 'The spell fizzled:' , error ) ;
				process.exit( 1 ) ;
			}
			else if ( typeof error === 'number' )
			{
				console.log( 'The spell fizzled: #' + error ) ;
				process.exit( error ) ;
			}
			else
			{
				process.exit( 1 ) ;
			}
		}
		
		process.exit( 0 ) ;
	} ) ;
} ;





			/* Book class */



spellcast.Book = function Book( data )
{
	if ( typeof data !== 'string' ) { throw new Error( '[spellcast] Book() need a string as its argument #0' ) ; }
	
	this.formula = {} ;
	this.spells = {} ;
	this.summons = {} ;
	
	data = tifParser.parse( data , { removeComment: true } ) ;
	//console.log( data ) ;
	this.parseBook( data ) ;
} ;





			/* Parser */



spellcast.Book.prototype.parseBook = function parseBook( tif )
{
	var i , item , command , length = tif.children.length ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		item = tif.children[ i ] ;
		
		command = this.parseCommand( item.content ) ;
		
		switch ( command.type )
		{
			case 'formula' :
				tree.extend( null , this.formula , this.parseFormula( item.children ) ) ;
				break ;
			
			case 'spell' :
				this.spells[ command.name ] = command ;
				command.casting = this.parseCasting( item.children ) ;
				break ;
			
			case 'summon' :
				this.summons[ command.name ] = command ;
				command.casting = this.parseCasting( item.children ) ;
				break ;
			
			default :
				console.log( 'Warning -- Unknown top-level type:' , command.type ) ;
		}
	}
} ;



spellcast.Book.prototype.parseCommand = function parseCommand( content )
{
	var parsed = {} ;
	var splited = content.split( /\s+/ ) ;
	
	switch( splited[ 0 ][ 0 ] )
	{
		case '.' :
			parsed.type = 'spell' ;
			parsed.name = splited[ 0 ].slice( 1 ) ;
			break ;
		
		case ':' :
			parsed.type = 'summon' ;
			parsed.name = splited[ 0 ].slice( 1 ) ;
			break ;
		
		default :
			parsed.type = splited[ 0 ] ;
	}
	
	parsed.args = this.parseArguments( splited.slice( 1 ) ) ;
	
	return parsed ;
} ;



spellcast.Book.prototype.parseFormula = function parseFormula( tifArray )
{
	var i , item , key , value , splited , formula = {} , length = tifArray.length ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		item = tifArray[ i ] ;
		
		splited = item.content.split( ':' ) ;
		key = splited[ 0 ] ;
		value = splited.slice( 1 ).join( ':' ) ;
		
		formula[ key ] = value ;
	}
	
	return formula ;
} ;



spellcast.Book.prototype.parseCasting = function parseCasting( tifArray )
{
	var i , item , child , command , casting = [] , length = tifArray.length ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		item = tifArray[ i ] ;
		
		command = this.parseCommand( item.content ) ;
		
		switch ( command.type )
		{
			case 'sh' :
				child = {
					type: command.type ,
					args: command.args ,
					shellCommands: this.parseShellCommands( item.children )
				} ;
				break ;
			
			case 'cast' :
				child = {
					type: command.type ,
					args: command.args ,
					spells: this.parseSpells( item.children )
				} ;
				break ;
			
			case 'summon' :
				child = {
					type: command.type ,
					args: command.args ,
					files: this.parseFiles( item.children )
				} ;
				break ;
			
			default :
				console.log( 'Warning -- Unknown cast-level type:' , command.type ) ;
				child = null ;
		}
		
		if ( ! child ) { continue ; }
		
		casting.push( child ) ;
	}
	
	return casting ;
} ;



spellcast.Book.prototype.parseArguments = function parseArguments( list )
{
	var i , key , value , splited , args = {} ;
	
	for ( i = 0 ; i < list.length ; i ++ )
	{
		splited = list[ i ].split( ':' ) ;
		key = splited[ 0 ] ;
		
		if ( splited.length <= 1 ) { value = true ; }
		else { value = splited[ 1 ] ; }
		
		args[ key ] = value ;
	}
	
	return args ;
} ;



spellcast.Book.prototype.parseShellCommands = function parseShellCommands( tifArray )
{
	var i , commands = [] , length = tifArray.length ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		commands.push( tifArray[ i ].content ) ;
	}
	
	return commands ;
} ;



spellcast.Book.prototype.parseSpells = function parseSpells( tifArray )
{
	var i , spells = [] , length = tifArray.length ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		spells.push( tifArray[ i ].content ) ;
	}
	
	return spells ;
} ;



spellcast.Book.prototype.parseFiles = function parseFiles( tifArray )
{
	var i , files = [] , length = tifArray.length ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		files.push( tifArray[ i ].content ) ;
	}
	
	return files ;
} ;





			/* Init */



spellcast.Book.prototype.initDirectories = function initDirectories( callback )
{
	var directories = [ '.spellcast' , '.spellcast/casted' , '.spellcast/fizzled' , '.spellcast/tmp' ] ;
	
	async.foreach( directories , function( path , foreachCallback ) {
		fs.exists( path , function( exists ) {
			if ( exists ) { foreachCallback() ; }
			else { fs.mkdir( path , foreachCallback ) ; }
		} ) ;
	} )
	.exec( callback ) ;
} ;



spellcast.Book.prototype.init = function init( castExecution , callback )
{
	var openListener , errorListener , statPath ;
	
	this.initDirectories( function( initError ) {
	
		if ( initError ) { callback( initError ) ; return ; }
		
		if ( castExecution.type === 'summon' )
		{
			castExecution.outputFilename = '~' + castExecution.genericSpell ;
			statPath = castExecution.genericSpell ;
		}
		else
		{
			castExecution.outputFilename = castExecution.genericSpell ;
			statPath = '.spellcast/casted/' + castExecution.genericSpell ;
		}
		
		fs.stat( statPath , function( statError , stats ) {
			
			if ( ! statError ) { castExecution.lastCastedTime = stats.mtime.getTime() ; }
			
			castExecution.outputFile = fs.createWriteStream( '.spellcast/tmp/' + castExecution.outputFilename ) ;
			
			// Define listeners
			openListener = function( fd ) {
				castExecution.outputFile.removeListener( 'error' , errorListener ) ;
				castExecution.outputFileFd = fd ;
				callback() ;
			} ;
			
			errorListener = function( error ) {
				castExecution.outputFile.removeListener( 'open' , openListener ) ;
				callback( error ) ;
			} ;
			
			// Bind them
			castExecution.outputFile.once( 'open' , openListener ) ;
			castExecution.outputFile.once( 'error' , errorListener ) ;
		} ) ;
		
	} ) ;
} ;





			/* Finalize: casted() and fizzled() */



spellcast.Book.prototype.casted = function casted( castExecution , callback )
{
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/casted/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; return ; }
				callback() ;
			} ) ;
		} ) ;
	} ) ;
} ;



spellcast.Book.prototype.fizzled = function fizzled( castExecution , fizzledError , callback )
{
	if ( ! fizzledError ) { fizzledError = new Error( 'The spell fizzled' ) ; }
	
	castExecution.outputFile.end( function() {
		fs.close( castExecution.outputFileFd , function() {
			fs.rename( '.spellcast/tmp/' + castExecution.outputFilename , '.spellcast/fizzled/' + castExecution.outputFilename , function( error ) {
				if ( error ) { callback( error ) ; }
				callback( fizzledError ) ;
			} ) ;
		} ) ;
	} ) ;
} ;





			/* Caster / Summoner */



spellcast.Book.prototype.cast = function cast( spellName , args , callback )
{
	return this.genericCast( 'cast' , spellName , args , callback ) ;
} ;

spellcast.Book.prototype.summon = function summon( filename , args , callback )
{
	return this.genericCast( 'summon' , filename , args , callback ) ;
} ;



spellcast.Book.prototype.genericCast = function genericCast( type , genericSpellName , args , callback )
{
	if ( typeof genericSpellName !== 'string' ) { throw new Error( '[spellcast] argument #0 of cast() should be a string' ) ; }
	
	if ( typeof args === 'function' ) { callback = args ; args = {} ; }
	else if ( ! args || typeof args !== 'object' ) { args = {} ; }
	
	var genericSpell , self = this ;
	
	
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
			break ;
		
		case 'summon' :
			genericSpell = this.summons[ genericSpellName ] ;
			if ( ! genericSpell )
			{
				callback( new Error( '[spellcast] summon() : Cannot found summonable ' + genericSpellName ) ) ;
				return ;
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
		outputFilename: null
	} ;
	
	
	// Here we go... 
	this.init( castExecution , function( error ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		async.foreach( genericSpell.casting , function( element , foreachCallback ) {
			
			var jobContext = this ;
			
			//console.log( element ) ;
			
			switch ( element.type )
			{
				case 'cast' :
					self.castCast( element , castExecution , foreachCallback ) ;
					break ;
				
				case 'summon' :
					
					self.castSummon( element , castExecution , function( error , upToDate ) {
						
						if ( error ) { foreachCallback( error ) ; }
						else if ( upToDate )
						{
							console.log( 'This spell is not ready yet.' ) ;
							jobContext.abort( undefined ) ;
						}
						else { foreachCallback() ; }
					} ) ;
					
					break ;
				
				case 'sh' :
					self.castShell( element , castExecution , foreachCallback ) ;
					break ;
			}
		} )
		.nice( 0 )
		.fatal()
		.exec( function( error ) {
			if ( error ) { self.fizzled.call( self , castExecution , error , callback ) ; }
			else { self.casted.call( self , castExecution , callback ) ; }
		} ) ;
	} ) ;
} ;



spellcast.Book.prototype.castCast = function castCast( cast , castExecution , callback )
{
	var self = this ;
	
	async.map( cast.spells , function( spell , foreachCallback ) {
		
		if ( ! self.spells[ spell ] ) { foreachCallback( new Error( 'Cannot find spell: ' + spell ) ) ; return ; }
		//console.log( 'About to subcast' , spell ) ;
		self.cast( spell , foreachCallback ) ;
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
			
			self.summon( file , function( error ) {
				
				if ( error ) { foreachCallback( error ) ; }
				else { foreachCallback( undefined , false ) ; }	// false: don't abort the spellcast
			} ) ;
		}
		else
		{
			fs.stat( file , function( error , stats ) {
				
				if ( error ) { foreachCallback( error ) ; return ; }
				foreachCallback( undefined , castExecution.lastCastedTime >= stats.mtime.getTime() ) ;	// abort the spellcast only if the lastCastedTime is newer
			} ) ;
		}
	} )
	.nice( 0 )
	.parallel( 1 )
	.fatal()
	.exec( function( error , results ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		callback( undefined , results.every(
			function( element ) { return element ; }
		) ) ;
	} ) ;
} ;



spellcast.Book.prototype.castShell = function castShell( shell , castExecution , callback )
{
	var plan ;
	
	plan = async
		.foreach( shell.shellCommands , this.execShellCommand.bind( this , castExecution ) )
		.nice( 0 ) ;
	
	//console.log( shell ) ;
	
	if ( shell.args.parallel )
	{
		if ( shell.args.parallel === true ) { plan.parallel( shell.args.parallel ) ; }
		else { plan.parallel( parseInt( shell.args.parallel ) ) ; }
	}
	
	if ( ! shell.args.ignore ) { plan.fatal( true ) ; }
	
	plan.exec( callback ) ;
	//plan.exec( function() { console.log( 'castShell: Done!' ) ; callback() ; } ) ;
} ;



spellcast.Book.prototype.execShellCommand = function execShellCommand( castExecution , shellCommand , callback )
{
	//console.log( 'Exec command: ' , shellCommand ) ;
	
	shellCommand = this.variableSubstitution( shellCommand ) ;
	
	var child = exec( shellCommand ) ;
	
	child.on( 'error' , callback ) ;
	
	//child.on( 'exit' , callback ) ;
	child.on( 'exit' , function( status ) {
		//console.log( 'EXIT:' , status ) ;
		callback( status ) ;
	} ) ;
	
	child.stdout.on( 'data' , function( chunk ) {
		// Send the command's stdout to the process stdout and the output file
		process.stdout.write( chunk ) ;
		castExecution.outputFile.write( chunk ) ;
	} ) ;
	
	child.stderr.on( 'data' , function( chunk ) {
		// Send the command's stderr to the process stderr and the output file
		process.stderr.write( chunk ) ;
		castExecution.outputFile.write( chunk ) ;
	} ) ;
} ;





			/* Variables */



spellcast.Book.prototype.variableSubstitution = function variableSubstitution( input )
{
	var output , self = this ;
	
	output = input.replace( /\$\{([^\s\}]+)\}/g , function() {
		var substitute = self.formula[ arguments[ 1 ] ] ;
		if ( substitute === undefined ) { return '' ; }
		return substitute ;
	} ) ;
	
	return output ;
} ;





			/* Utilities */



//function noop() {}




