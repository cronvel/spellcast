

# Spellcast! Adventurer Mode

Make: your own adventure!

**Spellcast** is a scripting language, an interpreter/server, plus a terminal and a web clients with powerful capabilities.

The *adventurer mode* allows one to create scenario with branches, so building game in the spirit of old roleplay gamebooks
is possible out of the box.

But Spellcast can also be embedded into app, allowing users to create contents, items, campaigns and more...



## Table of Contents

* [Command line usage](#usage)
* [Getting started](#getting-started)
* [The KFG format](#kfg)
* [Tag Reference](#ref)
	* [Input/Output Tags](#ref.io)
		* [Message Tag](#ref.io.message)
		* [Fortune Tag](#ref.io.fortune)
		* [Input Tag](#ref.io.input)
		* [Sound Tag](#ref.io.sound)
	* [Control Flow Tags](#ref.flow)
		* [Conditional Tags](#ref.flow.conditional)
			* [If Tag](#ref.flow.if)
			* [Elseif/elsif Tag](#ref.flow.elseif)
			* [Else Tag](#ref.flow.else)
		* [Loop Tags](#ref.flow.loop)
			* [While Tag](#ref.flow.while)
			* [Foreach Tag](#ref.flow.foreach)
			* [Continue Tag](#ref.flow.continue)
			* [Break Tag](#ref.flow.break)
		* [Function Tags](#ref.flow.function)
			* [Fn Tag](#ref.flow.fn)
			* [Call Tag](#ref.flow.call)
			* [Return Tag](#ref.flow.return)
	* [Operation Tags](#ref.ops)
		* [Set Tag](#ref.ops.set)
		* [Inc Tag](#ref.ops.inc)
		* [Dec Tag](#ref.ops.dec)
		* [Add Tag](#ref.ops.add)
		* [Sub Tag](#ref.ops.sub)
		* [Mul Tag](#ref.ops.mul)
		* [Div Tag](#ref.ops.div)
		* [Swap Tag](#ref.ops.swap)
		* [Clone Tag](#ref.ops.clone)
		* [Apply-to Tag](#ref.ops.apply-to)
		* [Array Operators Tags](#ref.ops.array-ops)
			* [Append Tag](#ref.ops.append)
			* [Prepend Tag](#ref.ops.prepend)
			* [Concat Tag](#ref.ops.concat)
			* [Slice Tag](#ref.ops.slice)
			* [Splice Tag](#ref.ops.splice)
			* [Filter Tag](#ref.ops.filter)
			* [Map Tag](#ref.ops.map)
			* [Reduce Tag](#ref.ops.reduce)
			* [Reverse Tag](#ref.ops.reverse)
			* [Sort Tag](#ref.ops.sort)
			* [Fill Tag](#ref.ops.fill)
			* [Copy-within Tag](#ref.ops.copy-within)



<a name="usage"></a>
## Usage

Usage: `adventure <book> [<options 1>] [<options 2>] [...]`

Options:

* `--ui <name>`: Set the UI to use
* `--locale <locale>`: Set the locale for the script
* `--locale-list`: List the available locales
* `--ws-server [<port>]`: Create a web socket server (default to port 57311)
* `--token <token>`: Add a token to server accepted token list (can be used multiple times)
* `--browser , - B <exe>`: Open the browser <exe>, force --ws-server
* `--client-ui <name>`: Set the UI for the local client (use with --browser)
* `--client-name <name>`: Set the name of the local client user
* `--script-debug`: Activate debug-level logs for scripts ([debug] tag)
* `--script-verbose`: Activate verbose-level logs for scripts ([debug verbose] tag)



<a name="getting-started"></a>
## Getting started: basic script example

This is an example of a very short script with 3 scenes, featuring the most basic tags.
Copy-paste this script into a file named `test.kfg`, then run `adventure test.kfg`.

```
[[doctype adventurer]]

[chapter intro]
	[scene village]
		[message]
			$> You lived in a small village of few hundred peoples.
			$> You started learning how to forge horseshoe since the age of 12
			$> with your father, the local smith.
			$> At the age of 15, you leave your village.
			$> What do you do?

		[next master]
			[label] $> You seek for a master at forgery.
			
		[next rogue]
			[label] $> You are a rogue living in the wood.

	[scene master]
		[message]
			$> You found the master and learn everything he taught to you.
			$> You became famous in the entire country.
		
		[win]

	[scene rogue]
		[message]
			$> You lived in the forest and becomes an highwayman.
			$> That's really bad!
		
		[lost]
```

In this example, the story in the first message tag is displayed to the player.
Then the player has 2 choices:

* either he seeks for a master at forgery, and it will trigger the scene named `master`,
  therefore winning the game by becoming famous
* either he becames a rogue (triggering the `rogue` scene) and lost by becoming an highwayman

The syntax of Spellcast books is really simple.
The main component of Spellcast is tag.
A tag start with an opening bracket and finish with a closing bracket.
The content of a tag is indented using tabs.

So here we have:
* The `[[doctype adventurer]]` is a meta-tag, it tell spellcast that the current file is a *spellcast adventurer* file.
  Meta-tags have two opening and two closing brackets, they **MUST** be placed before any other tags, because they are headers.
* A top-level container tag: the `[chapter]` tag with an identifier (*intro*).
* This chapter contains 3 `[scene]` tags named *village*, *master* and *rogue*.
* The first scene contains 2 `[next]` tags: those tags tell which scene will follow the current one.
* When there are more than one `[next]` tag in a scene, the player can choose between multiple choice.
* The `[next]` tag has a scene identifier, e.g. `[next master]` means that if the player choose that option, the
  next scene will be the one named `master`.
* The `[label]` tag is simply the text displayed to the user for this choice.
* The `[message]` tag contains text to be displayed to user.
* The `[win]` and `[lost]` tags causes the game to exit, either with a game win or a game lost.



<a name="kfg"></a>
## The KFG Format

The Spellcast scripting language is built on top of the KFG format (i.e. the Kung-FiG format).

You should definitively [follow that link](https://github.com/cronvel/kung-fig/blob/master/doc/KFG.md)
and read carefully. All the syntax is explained in details.

The Spellcast scripting language just defines tags on top of KFG.

This doc will details all of those tags.



<a name="ref"></a>
# Tag Reference

In the following tag description, the *types* refer to one of those:
* init: the tag performs some configuration at init-time only
* run: the tag performs action at run-time, i.e. when its parent tag container is run
* exec: the tag can be executed, if it hasn't the *run* flag, it doesn't do anything when its parent tag container is run
* param: the tag is passive: it contains some parameters for its parent

The attribute style refers to one of those:
* none: the tag has no attribute
* label: the tag has an identifier as attribute
* var: the tag has a *ref* (i.e.: a variable) as attribute
* expression: the tag as an *expression* as attribute
* specific: the tag has its own specific syntax



<a name="ref.io"></a>
## Input/Output Tags



<a name="ref.io.message"></a>
### [message]

* types: run
* attribute style: none
* content type: string, template, object or array of: string, template or object.

The *message* tag is used to display a message in the client user interface.

For simple message, the content can be either a simple string, or a template.

If some particular options are needed, the content should be formated as an object, where:
* text `string` or `Template` the message to display
* next `boolean` if true, the message wait for the user acknowledgement
* slowTyping `boolean` if true, the message is diplayed letter by letter (not all the clients supports it)
* image `url` if set, the message as an image related to the text, it may be a portrait of the speaker or an image
  of what is described (not all the clients supports it)
* sound `url` if set, a sound that should be played along with the message (not all the clients supports it)

The *hello world* example:

```
[message] Hello world!
```

... will display `Hello world!` in the client UI.

Example using a template:

```
[set $name] Joe
[message] $> Hello ${name}!
```

... will display `Hello Joe!` in the client UI.

Example with an object:

```
[set $name] Joe
[message]
	text: $> Hello ${name}!
	next: true
```

... will display `Hello Joe!` in the client UI, the execution of the script is paused until the user confirms.

Finally, the content can be an array, in that case each element is a message to send.



<a name="ref.io.fortune"></a>
### [fortune]

* types: run
* attribute style: none
* content type: array of: string, template or object

The *fortune* tag is used to display a random message in the client user interface.

It works almost like the *message* tag, but the content should be an array of string, template or object,
and rather than creating one message per element, it picks only one random element from the array.

See [the *message* tag](#ref.io.message) for details.

Example:

```
[set $name] Joe
[fortune]
	- $> Hello ${name}!
	- $> Hi ${name}!
	- Howdy!
```

... will display `Hello Joe!` or `Hi Joe!` or `Howdy!` in the client UI.



<a name="ref.io.input"></a>
### [input *$var*]

* types: run
* attribute style: var
* content type: none, string, template or object

The *input* tag is used to display an input field in the client UI, to get a text from the user and put it
into the *$var* variable.

If there is a content, and this is a string or a template, this will be used as a label to display alongside the input field.

If some particular options are needed, the content should be formated as an object, where:
* label `string` or `Template` the label to display alongside the input field
* roles `array` of `Role`, if set, the input field is only active for thoses roles, other cannot respond (this is useful
  for multiplayer scripts)



<a name="ref.io.sound"></a>
### [sound]

* types: run
* attribute style: none
* content type: string, template or object

The *sound* tag is used to play a sound on the client-side.

If the content is a string or a template, this will be the URL of the sound to play.

If some particular options are needed, the content should be formated as an object, where:
* url `string` or `Template` the URL of the sound to play



<a name="ref.flow"></a>
## Flow Control Tags



<a name="ref.flow.conditional"></a>
### Conditional Tags: [if], [elsif]/[elseif] and [else]

Those tags works like every other if/elseif/else construct in any programming language.
[See the MDN doc](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else).

Example:

```
[set $value] 3

[if $value > 4]
	[message] Greater than 4
[elsif $value > 2]
	[message] Greater than 2, lesser than or equal to 4
[else]
	[message] Lesser than or equal to 2
```

... this would ouput: *"Greater than 2, lesser than or equal to 4"*, because `$value` is not `> 4` but is `> 2`.



<a name="ref.flow.if"></a>
### [if *expression*]

* types: run
* attribute style: expression
* content type: tags

The *if* tag runs its content if the expression (as its attribute) is true (or *truthy*).
Otherwise, it passes controle to the eventual following *elseif* or *else* sibling tag.



<a name="ref.flow.elseif"></a>
### [elseif *expression*] / [elsif *expression*]

* types: run
* attribute style: expression
* content type: tags

The *elseif* tag **MUST HAVE** an *if* tag or another *elseif* as its immediate previous sibling.
If that previous tag hasn't passed controle to it, nothing happens.
If it has, then *elseif* tag runs its content if the expression in its attribute is true (or *truthy*).
Otherwise, it passes controle to an eventual following *elseif* or *else* sibling tag.

The *elsif* tag is simply an alias of the *elseif* tag.



<a name="ref.flow.else"></a>
### [else]

* types: run
* attribute style: none
* content type: tags

The *else* tag **MUST HAVE** an *if* tag or an *elseif* as its immediate previous sibling.
If that previous tag hasn't pass controle to it, nothing happens.
If it has, the *else* tag runs its content.



<a name="ref.flow.loop"></a>
### Loop Tags: [while], [foreach], [continue], [break]



<a name="ref.flow.while"></a>
### [while *expression*]

* types: run
* attribute style: expression
* content type: tags

The *while* tag run its content multiple times as long as the expression (as its attribute) is true (or *truthy*).
I.e. it tests its expression, if true it runs its content and check again the expression, if still true 
it runs its content and check again the expression, and so on...
Once the expression is false (or *falsy*), it stops.
If the expression is already false at the first time, the tag content is never run.

This code:

```
[set $count] 5
[while $count > 0]
	[message] $> Count: ${count}
	[set $count] $= $count - 1
```

... will output:

```
Count: 5
Count: 4
Count: 3
Count: 2
Count: 1
```



<a name="ref.flow.foreach"></a>
### [foreach *$var* => *$value*] / [foreach *$var* => *$key* : *$value*]

* types: run
* attribute style: foreach syntax
* content type: tags

Like most Spellcast Scripting syntax, the spaces are mandatory:
at least one space should be placed before and after `=>`, as well as before and after `:`.

The *foreach* construct provides an easy way to iterate over arrays or objects.
It doesn't work on other variable type.

This is a loop, so the content can be run 0, 1 or multiple times.
The content is run as many time as the *$var* array/object has elements/properties.

On each iteration, the *$value* variable is set to the current element/property value,
and the *$key* variable is set to the the current index/property key (when the second foreach syntax is used).

Example with an array:

```
[set $array]
	- one
	- two
	- three

[foreach $array => $element]
    [message] $> Value: ${element}
```

... this will output:

```
Value: one
Value: two
Value: three
```

Example with an array, using the second foreach syntax:

```
[set $array]
	- one
	- two
	- three

[foreach $array => $index : $element]
    [message] $> ${index}: ${element}
```

... this will output:

```
0: one
1: two
2: three
```

Example with an object, using the second foreach syntax:

```
[set $object]
	first-name: Joe
	last-name: Doe
	job: designer

[foreach $object => $key : $value]
    [message] $> ${key}: ${value}
```

... this will output:

```
first-name: Joe
last-name: Doe
job: designer
```

<a name="ref.flow.continue"></a>
### [continue]

* types: run
* attribute style: none
* content type: none

The *continue* tag terminates the current iteration of the current loop, and continues with the next iteration of the current loop.



<a name="ref.flow.break"></a>
### [break]

* types: run
* attribute style: none
* content type: none

The *break* tag exit from the current loop immediately.



<a name="ref.flow.function"></a>
### Function Tags: [fn], [call], [return]



<a name="ref.flow.fn"></a>
### [fn *$var*] / [fn *label*]

* types: run or init, exec
* attribute style: var or label
* content type: tags

The *fn* tag is used to create a Spellcast Scripting function.
The content of the tag **MUST** contain tags, they will be run at exec time (i.e. when the function is *called*).

If the `[fn $var]` syntax is used, the function is created **at run time** and stored inside the variable.
This syntax has **no init time**.

If the `[fn label]` syntax is used, the function is created globally **at init time**.
This means that even if the function is declared inside some dead code (code that is never reached),
the function will be present globally anyway at the starting of the script.
This syntax has **no run time**.



<a name="ref.flow.call"></a>
### [call *$var*] / [call *label*] / [call *$var* => *$into*] / [call *label* => *$into*]

* types: run or init, exec
* attribute style: var or label or call syntax
* content type: anything

The *call* tag is used to *call* (i.e. *execute*) a Spellcast Scripting function previously declared using the *fn* tag.

The content of the tag will be solved **at run time** and will be stored into the **$args** variable during the *fn* tag execution.
The **$args** variable is restored after the *fn* tag execution.

If the `[call $var]` or the `[call $var => $into]` syntax is used, it will call the function stored inside the *$var* variable.

If the `[call label]` or the `[call label => $into]` syntax is used, it will call the global function with that *label*,
see the [*fn* tag](#ref.flow.fn) for details.

If the `[call $var => $into]` or the `[call label => $into]` syntax is used, the return value of the *fn* tag will be stored
into the *$into* variable, see the [*return* tag](#ref.flow.return) for details.

It is also possible to call a native JS function or object method, if it is stored inside a Spellcast Scripting variable.



<a name="ref.flow.return"></a>
### [return]

* types: run
* attribute style: none
* content type: anything

The *return* tag exit from the current *fn* tag (i.e. *fn* tag executed by a [*call* tag](#ref.flow.call)) immediately.

If inside the *fn* tag and the `[call $var => $into]` or the `[call label => $into]` syntax was used,
the content of the *return* tag is solved **at run time** and stored into the *$into* variable.

The *return* tag can also exit from the current sub *scene* tag (i.e. *scene* tag executed by a [*gosub* tag](#ref.adventurer.gosub))
immediately.



<a name="ref.ops"></a>
## Operation Tags



<a name="ref.ops.set"></a>
### [set *$var*]

* types: run
* attribute style: var
* content type: anything

It stores the content of the *set* tag, solved **at run time**, into the *$var* variable.



<a name="ref.ops.inc"></a>
### [inc *$var*]

* types: run
* attribute style: var
* content type: none

The *inc* tag increments the *$var* number by one.



<a name="ref.ops.dec"></a>
### [dec *$var*]

* types: run
* attribute style: var
* content type: none

The *dec* tag decrements the *$var* number by one.



<a name="ref.ops.add"></a>
### [add *$var*]

* types: run
* attribute style: var
* content type: number

The *add* tag adds its content's number to the *$var* number.



<a name="ref.ops.sub"></a>
### [sub *$var*]

* types: run
* attribute style: var
* content type: number

The *sub* tag subtracts its content's number from the *$var* number.



<a name="ref.ops.mul"></a>
### [mul *$var*]

* types: run
* attribute style: var
* content type: number

The *mul* tag multiplies *$var* number by its content's number.



<a name="ref.ops.div"></a>
### [div *$var*]

* types: run
* attribute style: var
* content type: number

The *div* tag divides the *$var* number by its content's number.



<a name="ref.ops.swap"></a>
### [swap *$var1* *$var2*]

* types: run
* attribute style: swap syntax
* content type: none

It swaps the content of two variables, i.e. *$var1* will contain *$var2* and *$var2* will contain *$var1*.

Example:

```
[set $a] One
[set $b] Two

[swap $a $b]

[message] $> a: ${a} --- b: ${b}
```

... it outputs `a: Two --- b: One`.

Without the *swap* tag, we would have to use a temporary variable:

```
[set $a] One
[set $b] Two

[set $tmp $a]
[set $a $b]
[set $b $tmp]

[message] $> a: ${a} --- b: ${b}
```

So thanks to the *swap* tag, three lines become one, and there is no trash variable creation.



<a name="ref.ops.clone"></a>
### [clone *$var*]

* types: run
* attribute style: var
* content type: anything

The *clone* tag clones its content into the *$var* variable, i.e. it performs a deep copy of objects.

Read [this article](http://blog.soulserv.net/tag/cloning/) if you don't know what object cloning or deep copy is.



<a name="ref.ops.apply-to"></a>
### [apply-to *$var*]

* types: run
* attribute style: var
* content type: an applicable object

The *apply-to* tag apply its content, that should be an
[applicable object](https://github.com/cronvel/kung-fig/blob/master/doc/lib.md#ref.Dynamic.apply),
and put the result into the *$var* variable.



<a name="ref.ops.array-ops"></a>
### Array Operators Tag



<a name="ref.ops.append"></a>
### [append *$var*]

* types: run
* attribute style: var
* content type: anything

The *append* tag appends its content to the *$var* array.



<a name="ref.ops.prepend"></a>
### [prepend *$var*]

* types: run
* attribute style: var
* content type: anything

The *prepend* tag prepends its content to the *$var* array.



<a name="ref.ops.concat"></a>
### [concat *$var*] / [concat *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: array (any other value is replaced as an array of the value as its single element)

The *concat* tag is used to merge the tag's content array and the *$var* variable.

If the first syntax `[concat *$var*]` is used, it merges in-place into the *$var* array.

If the second syntax `[concat *$var* => *$into*]` is used, the *$var* array is preserved,
instead the merge result is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat).



<a name="ref.ops.slice"></a>
### [slice *$var*] / [slice *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: integer (start index) or array of one or two integers (start index and end index)

The *slice* tag extracts a portion of the *$var* array.
The content should be an array of one or two integers (or just one integer out of any array),
the first integer is the *start* index, the last (if any) is the *end* index (end not included).

If the first syntax `[slice *$var*]` is used, the extraction replaces the original *$var* array.

If the second syntax `[slice *$var* => *$into*]` is used, the *$var* array is preserved,
instead the extraction is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice).



<a name="ref.ops.splice"></a>
### [splice *$var*] / [splice *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: array (or integer)

The *splice* tag changes the *$var* array by removing existing elements and/or adding new elements.
The content should be an array of integers (or just one integer out of any array),
the first integer is the *start* index, the second integer (if any) is the number of element to remove,
other elements (if any) are new elements to add at the *start* index after the delete.

If the first syntax `[splice *$var*]` is used, it is performed in-place, changing the *$var* array.

If the second syntax `[splice *$var* => *$into*]` is used, the *$var* array is preserved,
instead the result is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice).



<a name="ref.ops.filter"></a>
### [filter *$var*] / [filter *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: expression

The *filter* tag creates a new array from the *$var* array with all elements that pass the test of the content's expression.
The expression is solved for each element, the special variable **$this** containing the current element.

If the first syntax `[filter *$var*]` is used, the filtering is performed in-place, changing the *$var* array.

If the second syntax `[filter *$var* => *$into*]` is used, the *$var* array is preserved,
instead the result is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).

Example:

```
[set $array]
	-	type: fruit
		name: orange
	-	type: fruit
		name: apple
	-	type: vegetable
		name: cabbage
	-	type: fruit
		name: ananas

[filter $array => $filtered] $= $this.type = "fruit"

[message] $> Filtered length: ${filtered.length}
[message] $> Filtered: ${filtered[0].name} ${filtered[1].name} ${filtered[2].name}
```

... will produce the output:

```
Filtered length: 3
Filtered: orange apple ananas
```



<a name="ref.ops.map"></a>
### [map *$var*] / [map *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: expression

The *map* tag creates a new array from the *$var* array whose elements are the content's expression solved
for every element in this array, the special variable **$this** containing the current element.

If the first syntax `[map *$var*]` is used, the mapping is performed in-place, changing the *$var* array.

If the second syntax `[map *$var* => *$into*]` is used, the *$var* array is preserved,
instead the result is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map).

Example:

```
[set $array]
	-	type: fruit
		name: orange
	-	type: fruit
		name: apple
	-	type: vegetable
		name: cabbage
	-	type: fruit
		name: ananas

[map $array => $map] $this.name

[message] $> Map: ${map}[enum]
```

... will produce the output: `Map: orange apple cabbage ananas`.



<a name="ref.ops.reduce"></a>
### [reduce *$var*] / [reduce *$var* => *$into*] / [reduce *$var* , *init expression*] / [reduce *$var* , *init expression* => *$into*]

* types: run
* attribute style: array operators
* content type: expression

The *reduce* tag solves the content's expression for each element of the *$var* array, reducing it to a single value:
the accumulator.
The special variable **$this.current** containing the current element, and **$this.previous** containing the result
of the previous solved expression, i.e. the current value of the accumulator.
At the end of all iteration, the accumulator is returned.

Note that **$this.left** is an alias of **$this.previous** and **$this.right** an alias of **$this.current**.

If the syntax `[reduce *$var*]` or `[reduce *$var* , *init expression*]` is used, the reduce operation is performed in-place,
setting the *$var* variable to the accumulator value.

If the syntax `[reduce *$var* => *$into*]` or `[reduce *$var* , *init expression* => *$into*]` is used,
the *$var* array is preserved, instead the resulting accumulator is stored into the *$into* variable.

If the syntax `[reduce *$var* , *init expression*]` or `[reduce *$var* , *init expression* => *$into*]` is used,
then the *init expression* is an expression that is used to set the initial value of the accumulator.

If there is no *init expression* the accumulator's initial value is set to `null`.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce).

Example:

```
[set $array]
	-	a: 12
		b: 7
	-	a: 2
		b: 3
	-	a: 1
		b: 9

[reduce $array , 0 => $reduced] $= $this.previous + $this.current.a

[message] $> Reduce: ${reduced}
```

... will produce the output: `Reduce: 15`.



<a name="ref.ops.reverse"></a>
### [reverse *$var*] / [reverse *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: none

The *reverse* tag reverses the elements order of the *$var* array.

If the first syntax `[reverse *$var*]` is used, it reverses the *$var* array in-place.

If the second syntax `[reverse *$var* => *$into*]` is used, the *$var* array is preserved,
instead a new reversed array is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse).



<a name="ref.ops.sort"></a>
### [sort *$var*] / [sort *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: expression

The *sort* tag sorts the elements of the *$var* array according to the content's expression.

The algorithm used to sort compare different elements to produce the sort, hence the special variables **$this.left**
and **$this.right** contain the two element to compare, the former being the element that has a lower index,
the later the element that has the higher index.

Once the expression is solved, if the result is:
* lesser than 0: the **$this.left** element will be sorted to a lower index than **$this.right**
* greater than 0: the **$this.right** element will be sorted to a lower index than **$this.left**
* equal to 0: the order of those elements with respect to each other doesn't matter

Note that **$this.previous** is an alias of **$this.left** and **$this.current** an alias of **$this.right**.

If the first syntax `[sort *$var*]` is used, it sorts the *$var* array in-place.

If the second syntax `[sort *$var* => *$into*]` is used, the *$var* array is preserved,
instead the new sorted array is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort).



<a name="ref.ops.fill"></a>
### [fill *$var*] / [fill *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: array (or single value) of the *fill value*, eventually a *start index*, and eventually a *end index*

The *fill* tag fills all the elements of the *$var* array with a *fill value* (the content or the content array's first element),
eventually from a *start index* (the content array's second element if any) to an excluded *end index*
(the content array's second element if any).

If the first syntax `[fill *$var*]` is used, it is performed in-place, changing the *$var* array.

If the second syntax `[fill *$var* => *$into*]` is used, the *$var* array is preserved,
instead the new array is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill).

Example:

```
[set $array]
	- zero
	- one
	- two
	- three
	- four
	- five
	- six

[fill $array] three

[message] $> Array: ${array}[enum]
```
... will produce the output: `Array: three three three three three three three`.



<a name="ref.ops.copy-within"></a>
### [copy-within *$var*] / [copy-within *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: integer or array of integers (*target index*, *start index*, *end index*)

The *copy-within* tag copies part of the *$var* array to another location in the same *$var* array, without modifying its size.
The content array's first element is the *target index* at which to copy the sequence to.
The content array's second element is the *start index* at which to start copying elements from.
The content array's third element is the *end index* at which to end copying elements from.

If the first syntax `[copy-within *$var*]` is used, the copy is performed in-place, changing the *$var* array.

If the second syntax `[copy-within *$var* => *$into*]` is used, the *$var* array is preserved,
instead the result is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/copyWithin).


