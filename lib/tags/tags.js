/*
	Spellcast

	Copyright (c) 2014 - 2018 Cédric Ronvel

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



exports.caster = {} ;
addCommon( exports.caster ) ;
addCaster( exports.caster ) ;
addStory( exports.caster ) ;
addChatter( exports.caster ) ;

exports.story = {} ;
addCommon( exports.story ) ;
addStory( exports.story ) ;
addChatter( exports.story ) ;

exports.chatter = {} ;
addCommon( exports.chatter ) ;
addChatter( exports.chatter ) ;



function deftag( object , tag , path ) {
	defineLazyProperty( object , tag , () => { return require( './' + path + 'Tag.js' ) ; } ) ;
}



function addCommon( object ) {
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
	deftag( object , 'loop' , 'flow/Loop' ) ;
	deftag( object , 'foreach' , 'flow/Foreach' ) ;
	deftag( object , 'break' , 'flow/Break' ) ;
	deftag( object , 'continue' , 'flow/Continue' ) ;

	deftag( object , 'fn' , 'flow/Fn' ) ;
	deftag( object , 'call' , 'flow/Call' ) ;
	deftag( object , 'return' , 'flow/Return' ) ;

	deftag( object , 'message' , 'io/Message' ) ;
	deftag( object , 'm' , 'io/Message' ) ;		// alias
	deftag( object , 'important-message' , 'io/Message' ) ;
	deftag( object , 'fortune' , 'io/Message' ) ;
	deftag( object , 'message-model' , 'io/MessageModel' ) ;
	deftag( object , 'input' , 'io/Input' ) ;

	deftag( object , 'indicators' , 'io/Indicators' ) ;
	deftag( object , 'status' , 'io/Indicators' ) ;
	deftag( object , 'sound' , 'io/Sound' ) ;

	deftag( object , 'animation' , 'ui/Animation' ) ;

	deftag( object , 'show-sprite' , 'ui/Ui' ) ;
	deftag( object , 'update-sprite' , 'ui/Ui' ) ;
	deftag( object , 'animate-sprite' , 'ui/Ui' ) ;
	deftag( object , 'clear-sprite' , 'ui/Ui' ) ;

	deftag( object , 'show-ui' , 'ui/Ui' ) ;
	deftag( object , 'update-ui' , 'ui/Ui' ) ;
	deftag( object , 'animate-ui' , 'ui/Ui' ) ;
	deftag( object , 'clear-ui' , 'ui/Ui' ) ;

	deftag( object , 'show-marker' , 'ui/Ui' ) ;
	deftag( object , 'update-marker' , 'ui/Ui' ) ;
	deftag( object , 'animate-marker' , 'ui/Ui' ) ;
	deftag( object , 'clear-marker' , 'ui/Ui' ) ;

	deftag( object , 'show-card' , 'ui/Ui' ) ;
	deftag( object , 'update-card' , 'ui/Ui' ) ;
	deftag( object , 'animate-card' , 'ui/Ui' ) ;
	deftag( object , 'clear-card' , 'ui/Ui' ) ;

	deftag( object , 'module' , 'misc/Module' ) ;
	deftag( object , 'system' , 'scenario/Chapter' ) ;
	deftag( object , 'pause' , 'misc/Pause' ) ;
	deftag( object , 'js' , 'misc/Js' ) ;

	deftag( object , 'generator' , 'misc/Generator' ) ;
	deftag( object , 'generate' , 'misc/Generate' ) ;

	deftag( object , 'debug' , 'misc/Debug' ) ;
	deftag( object , 'debugf' , 'misc/Debug' ) ;
}



function addCaster( object ) {
	deftag( object , 'formula' , 'caster/Formula' ) ;
	deftag( object , 'spell' , 'caster/Spell' ) ;
	deftag( object , 'summoning' , 'caster/Summoning' ) ;
	deftag( object , 'reverse-summoning' , 'caster/ReverseSummoning' ) ;
	deftag( object , 'cast' , 'caster/Cast' ) ;
	deftag( object , 'summon' , 'caster/Summon' ) ;
	deftag( object , 'scroll' , 'caster/Scroll' ) ;
	deftag( object , 'wand' , 'caster/Wand' ) ;
	deftag( object , 'zap' , 'caster/Zap' ) ;
	deftag( object , 'epilogue' , 'caster/Epilogue' ) ;
	deftag( object , 'prologue' , 'caster/Prologue' ) ;
	deftag( object , 'glob' , 'caster/Glob' ) ;
	deftag( object , 'chant' , 'io/Message' ) ;
}



function addStory( object ) {
	// Story
	deftag( object , 'chapter' , 'scenario/Chapter' ) ;
	deftag( object , 'scene' , 'scenario/Scene' ) ;
	deftag( object , 'starting-scene' , 'scenario/Scene' ) ;
	deftag( object , 'next' , 'scenario/Next' ) ;
	deftag( object , 'fake-next' , 'scenario/Next' ) ;
	deftag( object , 'next-group-break' , 'scenario/NextGroupBreak' ) ;
	deftag( object , 'include' , 'scenario/Include' ) ;
	deftag( object , 'goto' , 'scenario/Goto' ) ;
	deftag( object , 'gosub' , 'scenario/Gosub' ) ;

	deftag( object , 'here' , 'scenario/Here' ) ;
	deftag( object , 'here-actions' , 'scenario/HereActions' ) ;
	deftag( object , 'reset-here-actions' , 'scenario/ResetHereActions' ) ;
	deftag( object , 'status' , 'io/Indicators' ) ;
	deftag( object , 'panel' , 'ui/Panel' ) ;
	deftag( object , 'add-to-panel' , 'ui/Panel' ) ;

	deftag( object , 'end' , 'scenario/End' ) ;
	deftag( object , 'win' , 'scenario/End' ) ;
	deftag( object , 'lost' , 'scenario/End' ) ;
	deftag( object , 'draw' , 'scenario/End' ) ;

	deftag( object , 'emit' , 'events/Emit' ) ;
	deftag( object , 'on' , 'events/On' ) ;
	deftag( object , 'off' , 'events/Off' ) ;
	deftag( object , 'cancel' , 'events/Cancel' ) ;
	deftag( object , 'client-emit' , 'events/ClientEmit' ) ;

	deftag( object , 'create-metric' , 'rpg/CreateMetric' ) ;
	deftag( object , 'raise-metric' , 'rpg/MetricOp' ) ;
	deftag( object , 'lower-metric' , 'rpg/MetricOp' ) ;

	deftag( object , 'create-scheduler' , 'events/CreateScheduler' ) ;
	deftag( object , 'add-to-scheduler' , 'events/SchedulerOp' ) ;
	deftag( object , 'remove-from-scheduler' , 'events/SchedulerOp' ) ;
	deftag( object , 'advance-scheduler' , 'events/SchedulerOp' ) ;
	deftag( object , 'schedule-action' , 'events/SchedulerOp' ) ;

	// Multiplayer
	deftag( object , 'role' , 'multiplayer/Role' ) ;
	deftag( object , 'only-for-roles' , 'multiplayer/OnlyForRoles' ) ;
	deftag( object , 'split-roles' , 'multiplayer/SplitRoles' ) ;

	// RPG
	deftag( object , 'entity-class' , 'rpg/EntityClass' ) ;
	deftag( object , 'entity-model' , 'rpg/EntityModel' ) ;
	deftag( object , 'create-entity' , 'rpg/CreateEntity' ) ;
	deftag( object , 'create-main-entity' , 'rpg/CreateEntity' ) ;
	deftag( object , 'update-entity' , 'rpg/UpdateEntity' ) ;
	deftag( object , 'entity-variant' , 'rpg/EntityVariant' ) ;
	deftag( object , 'item-model' , 'rpg/ItemModel' ) ;
	deftag( object , 'create-item' , 'rpg/CreateItem' ) ;
	deftag( object , 'entity-compound-stats' , 'rpg/EntityCompoundStats' ) ;
	deftag( object , 'usage-compound-stats' , 'rpg/UsageCompoundStats' ) ;
	deftag( object , 'equip' , 'rpg/Equip' ) ;
	deftag( object , 'unequip' , 'rpg/Unequip' ) ;
	deftag( object , 'grab' , 'rpg/Grab' ) ;
	deftag( object , 'drop' , 'rpg/Drop' ) ;
}



function addChatter( object ) {
	deftag( object , 'interpreter' , 'chatbot/Interpreter' ) ;
	deftag( object , 'query' , 'chatbot/Query' ) ;
	deftag( object , 'reply' , 'chatbot/Reply' ) ;
	deftag( object , 'request' , 'chatbot/Request' ) ;
}


