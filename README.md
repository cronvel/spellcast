

# Spellcast

Better 'make' for node.js.

It is still a work in progress (specs, etc...)

So nothing to play with right now (ETA: probably 2 months).

undefined
{ type: 'spell',
  name: 'fireball',
  args: {},
  casting: [ { type: 'sh', args: [Object], shellCommands: [Object] } ] }
{ type: 'sh',
  args: { parallel: '2' },
  shellCommands: 
   [ 'echo Zap Boum',
     'echo Zashhhh && sleep 1 && echo Crash',
     'echo Fizz' ] }
Zap Boum
Zashhhh
Fizz
Crash
Grrrrjjjjj grrrrrjjjjj grrrrjjjj
flash
bob blihblih
bob blihblih
# TOC
   - [Sample file](#sample-file)
<a name=""></a>
 
<a name="sample-file"></a>
# Sample file
1.

```js
var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
console.log( book.ingredients ) ;
console.log( book.spells.fireball ) ;
console.log( book.spells.fireball.casting[ 0 ] ) ;
```

2.

```js
var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
book.cast( 'fireball' , done ) ;
```

3.

```js
var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
book.cast( 'nova' , done ) ;
```

4.

```js
var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
book.cast( 'blah' , done ) ;
```

5.

```js
var book = new spellcast.Book( fs.readFileSync( 'spellcast-sample1.txt' ).toString() ) ;
book.cast( 'depend' , done ) ;
```

