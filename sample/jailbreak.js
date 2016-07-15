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

