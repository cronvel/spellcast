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



const Lazyness = require( 'lazyness' ) ;
const tags = {} ;
module.exports = tags ;



function deftag( object , tag , path ) {
	Lazyness.requireProperty( require , object , tag , './' + path + 'Tag.js' ) ;
}



tags.addCommon = ( object ) => {
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
	deftag( object , 'm' , 'io/Message' ) ;			// alias
	deftag( object , 'speech' , 'io/Message' ) ;	// alias
	deftag( object , 'important-message' , 'io/Message' ) ;
	deftag( object , 'fortune' , 'io/Message' ) ;
	deftag( object , 'message-model' , 'io/MessageModel' ) ;
	deftag( object , 'input' , 'io/Input' ) ;

	deftag( object , 'indicators' , 'io/Indicators' ) ;
	deftag( object , 'status' , 'io/Indicators' ) ;
	deftag( object , 'sound' , 'io/Sound' ) ;

	deftag( object , 'command-config' , 'ui/CommandConfig' ) ;

	deftag( object , 'create-g-scene' , 'gfx/GScene' ) ;
	deftag( object , 'clear-g-scene' , 'gfx/GScene' ) ;
	deftag( object , 'update-g-scene' , 'gfx/GScene' ) ;
	deftag( object , 'activate-g-scene' , 'gfx/GScene' ) ;
	deftag( object , 'deactivate-g-scene' , 'gfx/GScene' ) ;
	deftag( object , 'pause-g-scene' , 'gfx/GScene' ) ;

	deftag( object , 'show-sprite' , 'gfx/GEntity' ) ;
	deftag( object , 'update-sprite' , 'gfx/GEntity' ) ;
	deftag( object , 'animate-sprite' , 'gfx/GEntity' ) ;
	deftag( object , 'clear-sprite' , 'gfx/GEntity' ) ;
	deftag( object , 'get-sprite-info' , 'gfx/GetGEntityInfo' ) ;

	deftag( object , 'animation' , 'gfx/Animation' ) ;

	deftag( object , 'show-vg' , 'gfx/GEntity' ) ;
	deftag( object , 'update-vg' , 'gfx/GEntity' ) ;
	deftag( object , 'animate-vg' , 'gfx/GEntity' ) ;
	deftag( object , 'clear-vg' , 'gfx/GEntity' ) ;
	deftag( object , 'get-vg-info' , 'gfx/GetGEntityInfo' ) ;

	deftag( object , 'show-marker' , 'gfx/GEntity' ) ;
	deftag( object , 'update-marker' , 'gfx/GEntity' ) ;
	deftag( object , 'animate-marker' , 'gfx/GEntity' ) ;
	deftag( object , 'clear-marker' , 'gfx/GEntity' ) ;
	deftag( object , 'get-marker-info' , 'gfx/GetGEntityInfo' ) ;

	deftag( object , 'show-card' , 'gfx/GEntity' ) ;
	deftag( object , 'update-card' , 'gfx/GEntity' ) ;
	deftag( object , 'animate-card' , 'gfx/GEntity' ) ;
	deftag( object , 'clear-card' , 'gfx/GEntity' ) ;
	deftag( object , 'get-card-info' , 'gfx/GetGEntityInfo' ) ;

	deftag( object , 'vg' , 'gfx/VG' ) ;
	deftag( object , 'vg-morph' , 'gfx/VGMorph' ) ;
	deftag( object , 'vg-group' , 'gfx/VG' ) ;
	deftag( object , 'vg-rect' , 'gfx/VG' ) ;
	deftag( object , 'vg-rectangle' , 'gfx/VG' ) ;
	deftag( object , 'vg-circle' , 'gfx/VG' ) ;
	deftag( object , 'vg-ellipse' , 'gfx/VG' ) ;
	deftag( object , 'vg-path' , 'gfx/VG' ) ;
	deftag( object , 'vg-text' , 'gfx/VG' ) ;

	deftag( object , 'vg-close' , 'gfx/VG' ) ;
	deftag( object , 'vg-move' , 'gfx/VG' ) ;
	deftag( object , 'vg-move-to' , 'gfx/VG' ) ;
	deftag( object , 'vg-line' , 'gfx/VG' ) ;
	deftag( object , 'vg-line-to' , 'gfx/VG' ) ;
	deftag( object , 'vg-curve' , 'gfx/VG' ) ;
	deftag( object , 'vg-curve-to' , 'gfx/VG' ) ;
	deftag( object , 'vg-smooth-curve' , 'gfx/VG' ) ;
	deftag( object , 'vg-smooth-curve-to' , 'gfx/VG' ) ;
	deftag( object , 'vg-qcurve' , 'gfx/VG' ) ;
	deftag( object , 'vg-qcurve-to' , 'gfx/VG' ) ;
	deftag( object , 'vg-smooth-qcurve' , 'gfx/VG' ) ;
	deftag( object , 'vg-smooth-qcurve-to' , 'gfx/VG' ) ;
	deftag( object , 'vg-arc' , 'gfx/VG' ) ;
	deftag( object , 'vg-arc-to' , 'gfx/VG' ) ;

	deftag( object , 'vg-pen-up' , 'gfx/VG' ) ;
	deftag( object , 'vg-pen-down' , 'gfx/VG' ) ;
	deftag( object , 'vg-forward' , 'gfx/VG' ) ;
	deftag( object , 'vg-backward' , 'gfx/VG' ) ;
	deftag( object , 'vg-turn' , 'gfx/VG' ) ;
	deftag( object , 'vg-left' , 'gfx/VG' ) ;
	deftag( object , 'vg-right' , 'gfx/VG' ) ;
	deftag( object , 'vg-turn-to' , 'gfx/VG' ) ;
	deftag( object , 'vg-forward-turn' , 'gfx/VG' ) ;
	deftag( object , 'vg-forward-left' , 'gfx/VG' ) ;
	deftag( object , 'vg-forward-right' , 'gfx/VG' ) ;

	deftag( object , 'module' , 'misc/Module' ) ;
	deftag( object , 'system' , 'scenario/Chapter' ) ;
	deftag( object , 'pause' , 'misc/Pause' ) ;
	deftag( object , 'js' , 'misc/Js' ) ;

	deftag( object , 'generator' , 'misc/Generator' ) ;
	deftag( object , 'generate' , 'misc/Generate' ) ;

	deftag( object , 'debug' , 'misc/Debug' ) ;
	deftag( object , 'debugf' , 'misc/Debug' ) ;
} ;



tags.addStory = object => {
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
	deftag( object , 'on-success' , 'events/OnEmitStatus' ) ;
	deftag( object , 'on-failure' , 'events/OnEmitStatus' ) ;
	deftag( object , 'on' , 'events/On' ) ;
	deftag( object , 'off' , 'events/Off' ) ;
	deftag( object , 'cancel' , 'events/Cancel' ) ;
	deftag( object , 'success' , 'events/Cancel' ) ;
	deftag( object , 'failure' , 'events/Cancel' ) ;
	deftag( object , 'maybe-success' , 'events/Maybe' ) ;
	deftag( object , 'maybe-failure' , 'events/Maybe' ) ;
	deftag( object , 'precondition-success-report' , 'events/Report' ) ;
	deftag( object , 'precondition-failure-report' , 'events/Report' ) ;
	deftag( object , 'persuasion-success-report' , 'events/Report' ) ;
	deftag( object , 'persuasion-failure-report' , 'events/Report' ) ;
	deftag( object , 'success-report' , 'events/Report' ) ;
	deftag( object , 'failure-report' , 'events/Report' ) ;
	deftag( object , 'client-emit' , 'events/ClientEmit' ) ;

	deftag( object , 'create-metric' , 'objects/CreateMetric' ) ;
	deftag( object , 'raise-metric' , 'objects/MetricOp' ) ;
	deftag( object , 'lower-metric' , 'objects/MetricOp' ) ;

	deftag( object , 'create-scheduler' , 'events/CreateScheduler' ) ;
	deftag( object , 'add-to-scheduler' , 'events/SchedulerOp' ) ;
	deftag( object , 'remove-from-scheduler' , 'events/SchedulerOp' ) ;
	deftag( object , 'advance-scheduler' , 'events/SchedulerOp' ) ;
	deftag( object , 'schedule-action' , 'events/SchedulerOp' ) ;

	// Multiplayer
	deftag( object , 'role' , 'multiplayer/Role' ) ;
	deftag( object , 'only-for-roles' , 'multiplayer/OnlyForRoles' ) ;
	deftag( object , 'split-roles' , 'multiplayer/SplitRoles' ) ;

	// Objects
	deftag( object , 'action' , 'objects/Action' ) ;
	deftag( object , 'check' , 'events/On' ) ;	// Those are particular OnTags
	deftag( object , 'effect' , 'flow/Fn' ) ;	// Those are particular FnTags
	deftag( object , 'perform' , 'objects/Perform' ) ;
	deftag( object , 'perform-command' , 'objects/Perform' ) ;
	deftag( object , 'create-place' , 'objects/CreatePlace' ) ;
	deftag( object , 'place' , 'objects/Place' ) ;
	deftag( object , 'entity-class' , 'objects/EntityClass' ) ;
	deftag( object , 'entity-model' , 'objects/EntityModel' ) ;
	deftag( object , 'create-entity' , 'objects/CreateEntity' ) ;
	deftag( object , 'create-main-entity' , 'objects/CreateEntity' ) ;
	deftag( object , 'update-entity' , 'objects/UpdateEntity' ) ;
	deftag( object , 'entity-variant' , 'objects/EntityVariant' ) ;
	deftag( object , 'item-model' , 'objects/ItemModel' ) ;
	deftag( object , 'create-item' , 'objects/CreateItem' ) ;
	deftag( object , 'entity-compound-stats' , 'objects/EntityCompoundStats' ) ;
	deftag( object , 'usage-compound-stats' , 'objects/UsageCompoundStats' ) ;
	deftag( object , 'move-into' , 'objects/MoveInto' ) ;
	deftag( object , 'grab' , 'objects/Grab' ) ;
	deftag( object , 'drop' , 'objects/Drop' ) ;
	deftag( object , 'equip' , 'objects/Equip' ) ;
	deftag( object , 'unequip' , 'objects/Unequip' ) ;
} ;



tags.addInterpreter = object => {
	deftag( object , 'interpreter' , 'interpreter/Interpreter' ) ;
	deftag( object , 'query' , 'interpreter/Query' ) ;
	deftag( object , 'reply' , 'interpreter/Reply' ) ;
	deftag( object , 'sr' , 'interpreter/Sr' ) ;
	deftag( object , 'request' , 'interpreter/Request' ) ;
} ;



tags.story = {} ;
tags.addCommon( tags.story ) ;
tags.addStory( tags.story ) ;
tags.addInterpreter( tags.story ) ;

tags.chatter = {} ;
tags.addCommon( tags.chatter ) ;
tags.addInterpreter( tags.chatter ) ;

