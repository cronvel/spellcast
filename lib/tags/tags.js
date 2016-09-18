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



var defineLazyProperty = require( 'tree-kit' ).defineLazyProperty ;



exports.spellcaster = {} ;
addCommon( exports.spellcaster ) ;
addSpellcaster( exports.spellcaster ) ;
addAdventurer( exports.spellcaster ) ;

exports.adventurer = {} ;
addCommon( exports.adventurer ) ;
addAdventurer( exports.adventurer ) ;



function deftag( object , tag , path )
{
	defineLazyProperty( object , tag , function() { return require( './' + path + 'Tag.js' ) ; } ) ;
}



function addCommon( object )
{
	deftag( object , 'set' , 'core/Set' ) ;
	deftag( object , 'clone' , 'core/Clone' ) ;
	deftag( object , 'append' , 'core/Append' ) ;
	deftag( object , 'concat' , 'core/Concat' ) ;
	deftag( object , 'apply-to' , 'core/ApplyTo' ) ;
	
	deftag( object , 'foreach' , 'core/Foreach' ) ;
	deftag( object , 'if' , 'core/If' ) ;
	deftag( object , 'elsif' , 'core/Elsif' ) ;
	deftag( object , 'elseif' , 'core/Elsif' ) ;
	deftag( object , 'else' , 'core/Else' ) ;
	
	deftag( object , 'pause' , 'core/Pause' ) ;
	
	deftag( object , 'js' , 'core/Js' ) ;

	deftag( object , 'message' , 'io/Message' ) ;
	deftag( object , 'fortune' , 'io/Message' ) ;
	deftag( object , 'input' , 'io/Input' ) ;
	deftag( object , 'sound' , 'io/Sound' ) ;

	deftag( object , 'debug' , 'misc/Debug' ) ;
}



function addSpellcaster( object )
{
	deftag( object , 'formula' , 'spellcaster/Formula' ) ;
	deftag( object , 'spell' , 'spellcaster/Spell' ) ;
	deftag( object , 'summoning' , 'spellcaster/Summoning' ) ;
	deftag( object , 'reverse-summoning' , 'spellcaster/ReverseSummoning' ) ;
	deftag( object , 'cast' , 'spellcaster/Cast' ) ;
	deftag( object , 'summon' , 'spellcaster/Summon' ) ;
	deftag( object , 'scroll' , 'spellcaster/Scroll' ) ;
	deftag( object , 'wand' , 'spellcaster/Wand' ) ;
	deftag( object , 'zap' , 'spellcaster/Zap' ) ;
	deftag( object , 'epilogue' , 'spellcaster/Epilogue' ) ;
	deftag( object , 'prologue' , 'spellcaster/Prologue' ) ;
	deftag( object , 'glob' , 'spellcaster/Glob' ) ;
	deftag( object , 'chant' , 'io/Message' ) ;
}



function addAdventurer( object )
{
	// Adventurer
	deftag( object , 'chapter' , 'adventurer/Chapter' ) ;
	deftag( object , 'scene' , 'adventurer/Scene' ) ;
	deftag( object , 'next' , 'adventurer/Next' ) ;
	deftag( object , 'include' , 'adventurer/Include' ) ;
	deftag( object , 'subscene' , 'adventurer/Subscene' ) ;
	deftag( object , 'gosub' , 'adventurer/Subscene' ) ;
	deftag( object , 'goto' , 'adventurer/Goto' ) ;

	deftag( object , 'end' , 'adventurer/End' ) ;
	deftag( object , 'win' , 'adventurer/End' ) ;
	deftag( object , 'lost' , 'adventurer/End' ) ;
	deftag( object , 'draw' , 'adventurer/End' ) ;

	deftag( object , 'emit' , 'adventurer/Emit' ) ;
	deftag( object , 'on' , 'adventurer/On' ) ;
	deftag( object , 'once' , 'adventurer/On' ) ;
	deftag( object , 'on-global' , 'adventurer/On' ) ;
	deftag( object , 'once-global' , 'adventurer/On' ) ;
	
	deftag( object , 'action' , 'adventurer/Action' ) ;

	// Multiplayer
	deftag( object , 'role' , 'multiplayer/Role' ) ;
	deftag( object , 'split' , 'multiplayer/Split' ) ;
	
	// RPG
	deftag( object , 'entity-model' , 'rpg/EntityModel' ) ;
	deftag( object , 'create-entity' , 'rpg/CreateEntity' ) ;
	deftag( object , 'item' , 'rpg/Item' ) ;
}



