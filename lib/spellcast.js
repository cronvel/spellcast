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
		* turn arguments using hyphen in spellbooks into camelCase (e.g. write-formula should be writeFormula in code)
		* automatically check versus the 'spellbook' file (just like if 'spellbook' was added to all 'summon' block)
		* escape formula variable substitution
		* new blocks:
			- spellbook
			- wand
			- zap
			- ssh : like sh but remotely
		* find the right regexp for split(/,/) because '\,' should not split
	
	BUGS:
		* current summoning rule ':README.md' always rebuild its source
			-> it's probably good enough to check for rootCastExecution.somethingHasBeenCasted
			   to ensure summoning dependecies
		  Line 717
*/



// Load modules
var exec = require( 'child_process' ).exec ;
var fs = require( 'fs' ) ;

var tifParser = require( 'tif-parser' ) ;
var async = require( 'async-kit' ) ;
var tree = require( 'tree-kit' ) ;
var term = require( 'terminal-kit' ) ;



var spellcast = {} ;
module.exports = spellcast ;





			/* CLI */



spellcast.cli = function cli( args )
{
	var buffer , book ;
	
	if ( args.length < 3 )
	{
		term.yellow( 'Usage is: ' ).cyan( 'spellcast <spell>\n' ) ;
		return ;
	}
	
	var toCast = args[ 2 ] ;
	
	try {
		buffer = fs.readFileSync( 'spellbook' ) ;
	}
	catch ( error ) {
		term.red( "Cannot find the " )
			.italic.bold.brightRed( "spellbook" )
			.red( " file into the current working directory.\n" ) ;
		return ;
	}
	
	book = new spellcast.Book( buffer.toString() ) ;
	
	if ( book.spells[ toCast ] )
	{
		book.cast( toCast , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					term.red( 'The spell fizzled: ' ).italic.brightRed( '%s\n' , error.message ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'string' )
				{
					term.red( 'The spell fizzled: ' ).italic.brightRed( '%s\n' , error ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'number' )
				{
					term.red( 'The spell fizzled: ' ).italic.brightRed( '#%d\n' , error ) ;
					process.exit( error ) ;
				}
				else
				{
					term.red( 'The spell fizzled...\n' ) ;
					process.exit( 1 ) ;
				}
			}
			
			process.exit( 0 ) ;
		} ) ;
	}
	else if ( book.summons[ toCast ] )
	{
		book.summon( toCast , function( error ) {
			
			if ( error )
			{
				if ( error instanceof Error )
				{
					term.red( 'The summoning has failed: ' ).italic.brightRed( '%s\n' , error.message ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'string' )
				{
					term.red( 'The summoning has failed: ' ).italic.brightRed( '%s\n' , error ) ;
					process.exit( 1 ) ;
				}
				else if ( typeof error === 'number' )
				{
					term.red( 'The summoning has failed: ' ).italic.brightRed( '#%d\n' , error ) ;
					process.exit( error ) ;
				}
				else
				{
					term.red( 'The summoning has failed...\n' ) ;
					process.exit( 1 ) ;
				}
			}
			
			process.exit( 0 ) ;
		} ) ;
	}
	else
	{
		term.red( "No such spell (" )
			.italic.bold.brightRed( toCast )
			.red( ") in this spellbook.\n" ) ;
		process.exit( 1 ) ;
	}
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
				term.red( 'Warning -- Unknown top-level type: %s\n' , command.type ) ;
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
	var i , item , key , values , splited , formula = {} , length = tifArray.length ;
	
	// Variable in spellcast are string or list of string,
	// but internally, they are always list of string
	
	for ( i = 0 ; i < length ; i ++ )
	{
		item = tifArray[ i ] ;
		
		// Split key/values with the first ':'
		splited = item.content.split( ':' ) ;
		key = splited[ 0 ] ;
		values = splited.slice( 1 ).join( ':' ) ;
		
		// Split values with ',' not following a single '\'
		values = values.split( /,/ ) ;	// Find the right regexp here
		
		// Set the index to 0
		Object.defineProperty( values , 'index' , { value: 0 , writable: true } ) ;
		
		formula[ key ] = values ;
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
			case 'scroll' :
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
			
			case 'foreach' :
				child = {
					type: command.type ,
					args: command.args ,
					casting: this.parseCasting( item.children )
				} ;
				break ;
			
			default :
				term.red( 'Warning -- Unknown cast-level type: %s\n' , command.type ) ;
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
			castExecution.outputFilename = '~' + castExecution.genericSpell.replace( '/' , '~' ) ;
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
	var genericSpell , self = this ;
	
	
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
		
		//console.log( element ) ;
		
		switch ( element.type )
		{
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
				var list = self.formula[ Object.keys( element.args )[ 0 ] ] ;
				
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



spellcast.Book.prototype.castScroll = function castScroll( scroll , castExecution , callback )
{
	var plan , splitter , self = this ;
	
	plan = async
		.map( scroll.shellCommands , this.execShellCommand.bind( this , castExecution , scroll.args ) )
		.nice( 0 ) ;
	
	//console.log( scroll ) ;
	
	if ( ! scroll.args.parallel ) { plan.parallel( false ) ; }
	else if ( scroll.args.parallel === true ) { plan.parallel() ; }
	else { plan.parallel( parseInt( scroll.args.parallel ) ) ; }
	
	if ( ! scroll.args.ignore ) { plan.fatal( true ) ; }
	
	if ( scroll.args['write-formula'] && typeof scroll.args['write-formula'] !== 'string' ) { delete scroll.args['write-formula'] ; }
	
	
	// Let's exec the plan and process the final outcome!
	
	plan.exec( function( error , outputMap ) {
		
		if ( error ) { callback( error ) ; return ; }
		
		if ( scroll.args['write-formula'] )
		{
			splitter = scroll.args.splitter || '\n' ;
			self.formula[ scroll.args['write-formula'] ] = outputMap.join( '' ).trim().split( splitter ) ;
			
			/*
			console.log( "outputMap:" , outputMap[0] ) ;
			console.log( "full output:" , output ) ;
			*/
		}
		
		callback() ;
	} ) ;
	//plan.exec( function() { console.log( 'castScroll: Done!' ) ; callback() ; } ) ;
} ;



spellcast.Book.prototype.execShellCommand = function execShellCommand( castExecution , args , shellCommand , callback )
{
	var child , onStdout , onStderr , onStdin , onceExit , onIgnoredError , output = '' ;
	
	//console.log( 'Exec command: ' , shellCommand ) ;
	
	shellCommand = this.variableSubstitution( shellCommand ) ;
	
	child = exec( shellCommand ) ;
	
	child.on( 'error' , callback ) ;
	
	// ignore some errors
	onIgnoredError = function() {} ;
	
	onceExit = function( status ) {
		//console.log( 'EXIT:' , status ) ;
		
		process.stdin.removeListener( 'data' , onStdin ) ;
		
		// For some reason, 'exit' can be triggered before some 'data' event, so we have to delay removeListener() a bit
		setTimeout( function() {
			
			child.stdout.removeListener( 'data' , onStdout ) ;
			child.stderr.removeListener( 'data' , onStderr ) ;
			
			// If there is an 'write-formula' arguments, we must trigger the callback in this timeout event,
			// if not we take the risk that we will miss some output and we don't want that
			if ( args['write-formula'] ) { callback( status , output ) ; }
			
		} , 0 ) ;
		
		// If there isn't an 'write-formula' arguments, then we can trigger the callback now
		if ( ! args['write-formula'] ) { callback( status ) ; }
	} ;
	
	onStdout = function( chunk ) {
		// Send the command's stdout to the process stdout and the output file
		if ( ! args.silence ) { process.stdout.write( chunk ) ; }
		if ( ! args.amnesia ) { castExecution.outputFile.write( chunk ) ; }
		if ( args['write-formula'] ) { output += chunk ; }
	} ;
	
	onStderr = function( chunk ) {
		// Send the command's stderr to the process stderr and the output file
		if ( ! args.silence ) { process.stderr.write( chunk ) ; }
		if ( ! args.amnesia ) { castExecution.outputFile.write( chunk ) ; }
	} ;
	
	onStdin = function( chunk ) {
		// Send the process stdin to the command's stdin
		child.stdin.write( chunk ) ;
	} ;
	
	// Prevent message sent to command that ignore them, then emit ECONNRESET when finished
	//child.stdin.on( 'error' , onIgnoredError ) ;
	
	child.stdout.on( 'data' , onStdout ) ;
	child.stderr.on( 'data' , onStderr ) ;
	process.stdin.on( 'data' , onStdin ) ;
	
	child.once( 'exit' , onceExit ) ;
} ;





			/* Variables */



spellcast.Book.prototype.variableSubstitution = function variableSubstitution( input )
{
	var output , self = this ;
	
	output = input.replace( /\$\{([^\s\}]+)\}/g , function() {
		var substitute = self.formula[ arguments[ 1 ] ] ;
		if ( substitute === undefined ) { return '' ; }
		return substitute[ substitute.index ] ;
	} ) ;
	
	return output ;
} ;





			/* Utilities */



//function noop() {}




