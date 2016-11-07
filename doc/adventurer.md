

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
		* [Set Tag](#ref.flow.set)



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





