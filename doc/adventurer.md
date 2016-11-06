

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
## Conditional Tags: [if], [elsif]/[elseif] and [else]

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
## [if *expression*]

* types: run
* attribute style: expression

The *if* tag runs its content if the expression (as its attribute) is true (or *truthy*).
Otherwise, it passes controle to the eventual following *elseif* or *else* sibling tag.



<a name="ref.flow.elseif"></a>
## [elseif *expression*] / [elsif *expression*]

* types: run
* attribute style: expression

The *elseif* tag **MUST HAVE** an *if* tag or another *elseif* as its immediate previous sibling.
If that previous tag hasn't passed controle to it, nothing happens.
If it has, then *elseif* tag runs its content if the expression in its attribute is true (or *truthy*).
Otherwise, it passes controle to an eventual following *elseif* or *else* sibling tag.

The *elsif* tag is simply an alias of the *elseif* tag.



<a name="ref.flow.else"></a>
## [else]

* types: run
* attribute style: none

The *else* tag **MUST HAVE** an *if* tag or an *elseif* as its immediate previous sibling.
If that previous tag hasn't pass controle to it, nothing happens.
If it has, the *else* tag runs its content.



<a name="ref.flow.loop"></a>
## Loop Tags: [while], [foreach], [continue], [break]



<a name="ref.flow.while"></a>
## [while *expression*]

* types: run
* attribute style: expression

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
## [foreach *$var* => *$value*] / [foreach *$var* => *$key* : *$value*]

* types: run
* attribute style: foreach syntax

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
## [continue]

The *continue* tag terminates the current iteration of the current loop, and continues with the next iteration of the current loop.



<a name="ref.flow.break"></a>
## [break]

The *break* tag exit from the current loop immediately.



<a name="ref.flow.functions"></a>
## Functions Tags: [fn], [call], [return]



<a name="ref.flow.fn"></a>
## [fn *id*] / [fn *$fn*]

The *break* tag exit from the current loop immediately.



