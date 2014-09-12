echo
delayed-echo
bob blihblih one
scroll line: one
scroll line: three
scroll line: two
scroll line: one
scroll line: three
scroll line: two
[32mThis spell is not ready yet.
[39mone more time: one
one more time: two
one more time: three
end: one
# TOC
   - [Formula](#formula)
   - ['scroll' block](#scroll-block)
   - ['summon' block and dependencies](#summon-block-and-dependencies)
   - ['foreach' block](#foreach-block)
<a name=""></a>
 
<a name="formula"></a>
# Formula
should be parsed into list of string, with an additionnal property 'index' equals to 0.

```js
var book = new spellcast.Book( fs.readFileSync( 'spellbook' ).toString() ) ;

expect( book.formula.alert ).to.be.eql( [ 'bob' ] ) ;
expect( book.formula.list ).to.be.eql( [ 'one' , 'two' , 'three' ] ) ;
```

<a name="scroll-block"></a>
# 'scroll' block
should echoing echo.

```js
cleanup( function() {
	
	var book = new spellcast.Book( fs.readFileSync( 'spellbook' ).toString() ) ;
	
	book.cast( 'echo' , function( error )
	{
		expect( error ).not.ok() ;
		expect( getCastedLog( 'echo' ) ).to.be( 'echo\n' ) ;
		done() ;
	} ) ;
} ) ;
```

should echoing delayed-echo after one second.

```js
cleanup( function() {
	
	var book = new spellcast.Book( fs.readFileSync( 'spellbook' ).toString() ) ;
	
	book.cast( 'delayed-echo' , function( error )
	{
		expect( error ).not.ok() ;
		expect( getCastedLog( 'delayed-echo' ) ).to.be( 'delayed-echo\n' ) ;
		done() ;
	} ) ;
} ) ;
```

should substitute variable (aka formula) accordingly in 'scroll' block.

```js
cleanup( function() {
	
	var book = new spellcast.Book( fs.readFileSync( 'spellbook' ).toString() ) ;
	
	book.cast( 'kawarimi' , function( error )
	{
		expect( error ).not.ok() ;
		expect( getCastedLog( 'kawarimi' ) ).to.be( 'bob blihblih one\n' ) ;
		done() ;
	} ) ;
} ) ;
```

should write a new formula with the output of an 'scroll' block.

```js
cleanup( function() {
	
	var book = new spellcast.Book( fs.readFileSync( 'spellbook' ).toString() ) ;
	
	book.cast( 'write-formula' , function( error )
	{
		expect( error ).not.ok() ;
		expect( getCastedLog( 'write-formula' ) ).to.be( 'scroll line: one\nscroll line: three\nscroll line: two\nscroll line: one\nscroll line: three\nscroll line: two\n' ) ;
		done() ;
	} ) ;
} ) ;
```

<a name="summon-block-and-dependencies"></a>
# 'summon' block and dependencies
should consider up to date a summon on a file that have a rule but that does nothing.

```js
cleanup( function() {
	
	var book = new spellcast.Book( fs.readFileSync( 'spellbook' ).toString() ) ;
	
	book.cast( 'summon-top' , function( error )
	{
		expect( error ).not.ok() ;
		expect( getCastedLog( 'summon-top' ) ).to.be( '' ) ;
		done() ;
	} ) ;
} ) ;
```

<a name="foreach-block"></a>
# 'foreach' block
should .

```js
cleanup( function() {
	
	var book = new spellcast.Book( fs.readFileSync( 'spellbook' ).toString() ) ;
	
	book.cast( 'foreach' , function( error )
	{
		expect( error ).not.ok() ;
		expect( getCastedLog( 'foreach' ) ).to.be( 'one more time: one\none more time: two\none more time: three\nend: one\n' ) ;
		done() ;
	} ) ;
} ) ;
```

