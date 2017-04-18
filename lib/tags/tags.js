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
	deftag( object , 'set' , 'ops/Set' ) ;
	deftag( object , 'define' , 'ops/Set' ) ;
	deftag( object , 'unset' , 'ops/Set' ) ;
	deftag( object , 'swap' , 'ops/Swap' ) ;
	deftag( object , 'apply' , 'ops/Apply' ) ;
	deftag( object , 'clone' , 'ops/Clone' ) ;
	deftag( object , 'append' , 'ops/Append' ) ;
	deftag( object , 'prepend' , 'ops/Prepend' ) ;
	
	deftag( object , 'concat' , 'ops/ArrayOp' ) ;
	deftag( object , 'slice' , 'ops/ArrayOp' ) ;
	deftag( object , 'splice' , 'ops/ArrayOp' ) ;
	deftag( object , 'filter' , 'ops/ArrayOp' ) ;
	deftag( object , 'map' , 'ops/ArrayOp' ) ;
	deftag( object , 'reduce' , 'ops/ArrayOp' ) ;
	deftag( object , 'reverse' , 'ops/ArrayOp' ) ;
	deftag( object , 'sort' , 'ops/ArrayOp' ) ;
	deftag( object , 'copy-within' , 'ops/ArrayOp' ) ;
	deftag( object , 'fill' , 'ops/ArrayOp' ) ;
	
	deftag( object , 'inc' , 'ops/OpAssignment' ) ;
	deftag( object , 'dec' , 'ops/OpAssignment' ) ;
	deftag( object , 'add' , 'ops/OpAssignment' ) ;
	deftag( object , 'sub' , 'ops/OpAssignment' ) ;
	deftag( object , 'mul' , 'ops/OpAssignment' ) ;
	deftag( object , 'div' , 'ops/OpAssignment' ) ;
	
	deftag( object , 'merge' , 'ops/Merge' ) ;
	
	deftag( object , 'if' , 'flow/If' ) ;
	deftag( object , 'elsif' , 'flow/Elsif' ) ;
	deftag( object , 'elseif' , 'flow/Elsif' ) ;
	deftag( object , 'else' , 'flow/Else' ) ;
	deftag( object , 'while' , 'flow/While' ) ;
	deftag( object , 'foreach' , 'flow/Foreach' ) ;
	deftag( object , 'break' , 'flow/Break' ) ;
	deftag( object , 'continue' , 'flow/Continue' ) ;
	
	deftag( object , 'fn' , 'flow/Fn' ) ;
	deftag( object , 'call' , 'flow/Call' ) ;
	deftag( object , 'return' , 'flow/Return' ) ;
	
	deftag( object , 'message' , 'io/Message' ) ;
	deftag( object , 'fortune' , 'io/Message' ) ;
	deftag( object , 'input' , 'io/Input' ) ;
	deftag( object , 'sound' , 'io/Sound' ) ;
	
	deftag( object , 'animation' , 'io/Animation' ) ;
	deftag( object , 'show-sprite' , 'io/Sprite' ) ;
	deftag( object , 'update-sprite' , 'io/Sprite' ) ;
	deftag( object , 'animate-sprite' , 'io/Sprite' ) ;
	deftag( object , 'clear-sprite' , 'io/Sprite' ) ;

	deftag( object , 'module' , 'misc/Module' ) ;
	deftag( object , 'system' , 'scenario/Chapter' ) ;
	deftag( object , 'pause' , 'misc/Pause' ) ;
	deftag( object , 'js' , 'misc/Js' ) ;
	deftag( object , 'debug' , 'misc/Debug' ) ;
	deftag( object , 'debugf' , 'misc/Debug' ) ;
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
	deftag( object , 'chapter' , 'scenario/Chapter' ) ;
	deftag( object , 'scene' , 'scenario/Scene' ) ;
	deftag( object , 'starting-scene' , 'scenario/Scene' ) ;
	deftag( object , 'next' , 'scenario/Next' ) ;
	deftag( object , 'fake-next' , 'scenario/Next' ) ;
	deftag( object , 'include' , 'scenario/Include' ) ;
	deftag( object , 'gosub' , 'scenario/Gosub' ) ;
	deftag( object , 'goto' , 'scenario/Goto' ) ;
	deftag( object , 'here' , 'scenario/Here' ) ;

	deftag( object , 'end' , 'scenario/End' ) ;
	deftag( object , 'win' , 'scenario/End' ) ;
	deftag( object , 'lost' , 'scenario/End' ) ;
	deftag( object , 'draw' , 'scenario/End' ) ;

	deftag( object , 'action' , 'scenario/Action' ) ;

	deftag( object , 'emit' , 'events/Emit' ) ;
	deftag( object , 'on' , 'events/On' ) ;
	deftag( object , 'once' , 'events/On' ) ;
	deftag( object , 'on-global' , 'events/On' ) ;
	deftag( object , 'once-global' , 'events/On' ) ;
	
	// Multiplayer
	deftag( object , 'role' , 'multiplayer/Role' ) ;
	deftag( object , 'split' , 'multiplayer/Split' ) ;
	
	// RPG
	deftag( object , 'entity-class' , 'rpg/EntityClass' ) ;
	deftag( object , 'entity-model' , 'rpg/EntityModel' ) ;
	deftag( object , 'create-entity' , 'rpg/CreateEntity' ) ;
	deftag( object , 'create-main-entity' , 'rpg/CreateEntity' ) ;
	deftag( object , 'update-entity' , 'rpg/UpdateEntity' ) ;
	deftag( object , 'item-model' , 'rpg/ItemModel' ) ;
	deftag( object , 'create-item' , 'rpg/CreateItem' ) ;
	deftag( object , 'entity-compound-stats' , 'rpg/EntityCompoundStats' ) ;
	deftag( object , 'usage-compound-stats' , 'rpg/UsageCompoundStats' ) ;
	deftag( object , 'equip' , 'rpg/Equip' ) ;
	deftag( object , 'unequip' , 'rpg/Unequip' ) ;
	deftag( object , 'grab' , 'rpg/Grab' ) ;
	deftag( object , 'drop' , 'rpg/Drop' ) ;
}


