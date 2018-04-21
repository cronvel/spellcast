

# Spellcast! Story Mode

Make: your own adventure!

**Spellcast** is a scripting language, an interpreter/server, plus a terminal and a web clients with powerful capabilities.

The *story mode* allows one to create scenario with branches, so building game in the spirit of old roleplay gamebooks
is possible out of the box.

But Spellcast can also be embedded into app, allowing users to create contents, items, campaigns and more...



## Table of Contents

* [Command line usage](#usage)
* [Getting started](#getting-started)
* [The KFG format](#kfg)
* [Tag Reference](#ref)
	* [Scenario Tags](#ref.scenario)
		* [Chapter Tag](#ref.scenario.chapter)
		* [Scene Tag](#ref.scenario.scene)
			* [Theme Tag](#ref.scenario.scene.theme)
			* [Image Tag](#ref.scenario.scene.image)
			* [Music Tag](#ref.scenario.scene.music)
			* [Next-style Tag](#ref.scenario.scene.next-style)
			* [Vote-time Tag](#ref.scenario.scene.vote-time)
			* [Vote-style Tag](#ref.scenario.scene.vote-style)
			* [Hurry-time Tag](#ref.scenario.scene.hurry-time)
			* [Show-timer Tag](#ref.scenario.scene.show-timer)
			* [Init-sub Tag](#ref.scenario.scene.init-sub)
		* [Starting Scene Tag](#ref.scenario.starting-scene)
		* [Next Tag](#ref.scenario.next)
			* [Label Tag](#ref.scenario.next.label)
			* [Style Tag](#ref.scenario.next.style)
			* [Class Tag](#ref.scenario.next.class)
			* [Image Tag](#ref.scenario.next.image)
			* [Vote-style Tag](#ref.scenario.next.vote-style)
			* [Auto Tag](#ref.scenario.next.auto)
			* [Group-break Tag](#ref.scenario.next.group-break)
			* [On-trigger Tag](#ref.scenario.next.on-trigger)
				* [Cancel Tag](#ref.scenario.next.on-trigger.cancel)
			* [Args Tag](#ref.scenario.next.args)
			* [Button Tag](#ref.scenario.next.button)
		* [Fake Next Tag](#ref.scenario.fake-next)
		* [Next-group-break Tag](#ref.scenario.next-group-break)
		* [End Tag](#ref.scenario.end)
		* [Win Tag](#ref.scenario.win)
		* [Lost Tag](#ref.scenario.lost)
		* [Draw Tag](#ref.scenario.draw)
		* [Goto Tag](#ref.scenario.goto)
		* [Gosub Tag](#ref.scenario.gosub)
			* [Args Tag](#ref.scenario.gosub.args)
			* [Roles Tag](#ref.scenario.gosub.roles)
			* [Alt Tag](#ref.scenario.gosub.alt)
		* [Include Tag](#ref.scenario.include)
		* [Here Tag](#ref.scenario.here)
		* [Here-actions Tag](#ref.scenario.here-actions)
		* [Reset-here-actions Tag](#ref.scenario.reset-here-actions)
	* [Input/Output Tags](#ref.io)
		* [Message Tag](#ref.io.message)
		* [Important-message Tag](#ref.io.important-message)
		* [Fortune Tag](#ref.io.fortune)
		* [Message-model Tag](#ref.io.message-model)
		* [Indicators Tag](#ref.io.indicators)
		* [Input Tag](#ref.io.input)
		* [Sound Tag](#ref.io.sound)
		* [Show-sprite Tag](#ref.io.show-sprite)
		* [Update-sprite Tag](#ref.io.update-sprite)
		* [Clear-sprite Tag](#ref.io.clear-sprite)
		* [Animate-sprite Tag](#ref.io.animate-sprite)
		* [Show-ui Tag](#ref.io.show-ui)
		* [Update-ui Tag](#ref.io.update-ui)
		* [Clear-ui Tag](#ref.io.clear-ui)
		* [Animate-ui Tag](#ref.io.animate-ui)
		* [Animation Tag](#ref.io.animation)
	* [Control Flow Tags](#ref.flow)
		* [Conditional Tags](#ref.flow.conditional)
			* [If Tag](#ref.flow.if)
			* [Elseif/elsif Tag](#ref.flow.elseif)
			* [Else Tag](#ref.flow.else)
		* [Loop Tags](#ref.flow.loop)
			* [While Tag](#ref.flow.while)
			* [Loop Tag](#ref.flow.loop)
			* [Foreach Tag](#ref.flow.foreach)
			* [Continue Tag](#ref.flow.continue)
			* [Break Tag](#ref.flow.break)
		* [Function Tags](#ref.flow.function)
			* [Fn Tag](#ref.flow.fn)
			* [Call Tag](#ref.flow.call)
			* [Return Tag](#ref.flow.return)
	* [Operation Tags](#ref.ops)
		* [Set Tag](#ref.ops.set)
		* [Define Tag](#ref.ops.define)
		* [Unset Tag](#ref.ops.unset)
		* [Inc Tag](#ref.ops.inc)
		* [Dec Tag](#ref.ops.dec)
		* [Add Tag](#ref.ops.add)
		* [Sub Tag](#ref.ops.sub)
		* [Mul Tag](#ref.ops.mul)
		* [Div Tag](#ref.ops.div)
		* [Swap Tag](#ref.ops.swap)
		* [Clone Tag](#ref.ops.clone)
		* [Apply Tag](#ref.ops.apply)
		* [Merge Tag](#ref.ops.merge)
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
	* [Event Tags](#ref.event)
		* [Emit Tag](#ref.event.emit)
		* [On Tag](#ref.event.on)
			* [Global Tag](#ref.event.on.global)
			* [Default Tag](#ref.event.on.default)
			* [Id Tag](#ref.event.on.id)
		* [Off Tag](#ref.event.off)
		* [Cancel Tag](#ref.event.cancel)
		* [Client-emit Tag](#ref.event.client-emit)
	* [Multiplayer Tags](#ref.multiplayer)
		* [Role Tag](#ref.multiplayer.role)
			* [Name Tag](#ref.multiplayer.role.name)
			* [Entity Tag](#ref.multiplayer.role.entity)
		* [Split Tag](#ref.multiplayer.split)
	* [RPG Tags](#ref.rpg)
		* [Entity-class Tag](#ref.rpg.entity-class)
		* [Entity-model Tag](#ref.rpg.entity-model)
		* [Create-entity Tag](#ref.rpg.create-entity)
		* [Create-main-entity Tag](#ref.rpg.create-main-entity)
		* [Update-entity Tag](#ref.rpg.update-entity)
		* [Entity-compound-stats Tag](#ref.rpg.entity-compound-stats)
		* [Usage-compound-stats Tag](#ref.rpg.usage-compound-stats)
		* [Item-model Tag](#ref.rpg.item-model)
		* [Create-item Tag](#ref.rpg.create-item)
		* [Equip Tag](#ref.rpg.equip)
		* [Unequip Tag](#ref.rpg.unequip)
		* [Grab Tag](#ref.rpg.grab)
		* [Drop Tag](#ref.rpg.drop)
		* [Create-metric Tag](#ref.rpg.create-metric)
		* [Raise-metric Tag](#ref.rpg.raise-metric)
		* [Lower-metric Tag](#ref.rpg.lower-metric)
	* [UI tags](#ref.ui)
		* [Status Tag](#ref.ui.status)
		* [Panel Tag](#ref.ui.panel)
		* [Add to panel Tag](#ref.ui.add-to-panel)
	* [Chatbot/Interpreter tags](#ref.chatbot)
		* [Interpreter Tag](#ref.chatbot.interpreter)
			* [Query Tag](#ref.chatbot.query)
				* [Pattern Tag](#ref.chatbot.pattern)
				* [Reply Tag](#ref.chatbot.reply)
		* [Request Tag](#ref.chatbot.request)
	* [Misc Tags](#ref.misc)
		* [Module Tag](#ref.misc.module)
		* [System Tag](#ref.misc.system)
		* [Pause Tag](#ref.misc.pause)
		* [Js Tag](#ref.misc.js)
		* [Generator Tag](#ref.misc.generator)
		* [Generate Tag](#ref.misc.generate)
		* [Debug Tag](#ref.misc.debug)
		* [Debugf Tag](#ref.misc.debugf)



<a name="usage"></a>
## Usage

Usage: `spellcast story [<book>] [<options 1>] [<options 2>] [...]`

Options:

* `--ui <name>`: Set the UI to use
* `--locale <locale>`: Set the locale for the script
* `--locale-list`: List the available locales
* `--assets <URL>`: Set the asset base URL (default: main book directory)
* `--ws-server [<port>]`: Create a web socket server (default to port 57311)
* `--http`: Create a HTTP server for content, sharing the port of the web socket server
* `--token <token>`: Add a token to server accepted token list (can be used multiple times)
* `--browser , -B <exe>`: Open a client browser <exe>, force --ws-server and --http
* `--electron , -E`: Open Electron client, force --ws-server and --http
* `--client-ui <name>`: Set the UI for the local client (use with --browser)
* `--client-name <name>`: Set the name of the local client user
* `--script-debug`: Activate debug-level logs for scripts ([debug] tag)
* `--script-verbose`: Activate verbose-level logs for scripts ([debug verbose] tag)
* `--max-ticks`: Max ticks between two user interactions (prevent from infinite loop, default: Infinity)
* `--js`/`--no-js`: Turn on/off the [js] tags



<a name="getting-started"></a>
## Getting started: basic script example

This is an example of a very short script with 3 scenes, featuring the most basic tags.
Copy-paste this script into a file named `test.kfg`, then run `spellcast story test.kfg`.

```
[[doctype spellcast/book]]

[chapter intro]
	[scene village]
		[message]
			$> You lived in a small village of few hundred peoples.
			$> You started learning how to forge horseshoe since the age of 12
			$> with your father, the local smith.
			$> At the age of 15, you leave your village.
			$> What do you do?

		[next master] $> You seek for a master at forgery.
		[next rogue] $> You are a rogue living in the wood.

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
* The `[[doctype spellcast/book]]` is a meta-tag, it tell spellcast that the current file is a *spellcast story* file.
  Meta-tags have two opening and two closing brackets, they **MUST** be placed before any other tags, because they are headers.
* A top-level container tag: the `[chapter]` tag with an identifier (*intro*).
* This chapter contains 3 `[scene]` tags named *village*, *master* and *rogue*.
* The first scene contains 2 `[next]` tags: those tags tell which scene will follow the current one.
* When there are more than one `[next]` tag in a scene, the player can choose between multiple choice.
* The `[next]` tag has a scene identifier, e.g. `[next master]` means that if the player choose that option, the
  next scene will be the one named `master`. The tag is followed by the text displayed to the user for this choice.
* The `[message]` tag contains text to be displayed to user.
* The `[win]` and `[lost]` tags causes the game to exit, either with a game win or a game lost.

You may want syntax highlighting to develop in Spellcast Scripting more easily.
There are two official packages for the [Atom editor](https://atom.io):
* [KFG and Spellcast! language package](https://atom.io/packages/language-kfg)
* [Syntax theme dedicated to KFG and Spellcast!](https://atom.io/packages/kfg-dark-syntax) (more suitable colors, and it colorizes
  specific KFG *scopes*)



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
* parameter: the tag is passive: it contains some parameters for its parent

The attribute style refers to one of those:
* none: the tag has no attribute
* label: the tag has an identifier as attribute
* var: the tag has a *ref* (i.e.: a variable) as attribute
* expression: the tag as an *expression* as attribute
* specific: the tag has its own specific syntax



<a name="ref.scenario"></a>
# Scenario Tags



<a name="ref.scenario.chapter"></a>
## [chapter *label*]

* types: init
* attribute style: label
* content type: tags

The *chapter* tag is used to organize *scene* tags in groups.
It also acts as a namespace, to ease management of big Spellcast projects.

It also supports some parameter tags of the *scene* tag, if present they will act as default for all its *scene* children:
* [theme](#ref.scenario.scene.theme)
* [image](#ref.scenario.scene.image)
* [music](#ref.scenario.scene.music)



<a name="ref.scenario.scene"></a>
## [scene *label*]

* types: init, exec
* attribute style: label
* content type: tags

The *scene* tag is the most important tag of Spellcast Scripting in *Story mode*.

A scenario is basically a lot of scenes, jumping from scene to scene through the [*next* tag](#ref.scenario.next).

A *scene* tag *MUST* be inside a *chapter* tag.

At *init time*, the scene is globally registrered using the parent *chapter label* and its own *label*.

Once init is done, the *starting scene* is *exec*.
The *starting scene* is either the [*starting-scene* tag](#ref.scenario.starting-scene), or the first registered *scene* tag.

When the scene is executed, it simply runs all its inner tags.
**Once the scene is executed, it sends all registered choices** (i.e. [*next* tags](#ref.scenerio.next)) to the client.

A *scene* has the following parameters tags:



<a name="ref.scenario.scene.theme"></a>
### [theme]

* types: parameter
* attribute style: none
* content type: string (URL) or object

This paremeter configures the theme (CSS) related to the scene.

The content is an object where:
* url `string` (optional) if set this is the URL of the theme (CSS), else the client *MAY* display a default theme if any

If the content is a string, it contains the *url* of the theme (CSS).



<a name="ref.scenario.scene.image"></a>
### [image]

* types: parameter
* attribute style: none
* content type: string (URL) or object

This paremeter configures the image related to the scene.
In most clients/themes, this is displayed as the background image.

The content is an object where:
* url `string` (optional) if set this is the URL of the image, else the client *MAY* display a default image if any
* position `string` (optional) is one of 'left' or 'right', indicating if the image should be on the left or on the right
  of the text. The exact result depends on the theme, some themes don't care about the position at all.
* origin `string` (optional) indicating how the image should be centered. One of 'center', 'top', 'bottom', 'left', right', ...

If the content is a string, it contains the *url* of the image.



<a name="ref.scenario.scene.music"></a>
### [music]

* types: parameter
* attribute style: none
* content type: string (URL) or object

This paremeter configurew the music related to the scene.

The music is played immediately when entering the scene:
* if the new music to play has the same URL than the old one, nothing happens at all: it simply **continues to play**
* if the URL is different, the new music replaces the old one and it starts playing **at the begining of the soundtrack**

The content is an object where:
* url `string` (optional) if set this is the URL of the music to play, else the client should stop playing music

If the content is a string, it contains the *url* of the music.



<a name="ref.scenario.scene.next-style"></a>
### [next-style]

* types: parameter
* attribute style: none
* content type: string

It is used to style the next-list, i.e. display buttons inline, or one per line, compact, etc...

Its content is a string, where:
* *auto*: (default) let the client decide how to style it
* *inline*: all choices are on the same line, if possible
* *smallInline*: same than inline, with smaller buttons
* *list*: one choice per line
* *smallList*: same than list, with smaller buttons
* *table*: display button as a table, using [[group-break]](#ref.scenario.next.group-break) parameter tag to create a new row



<a name="ref.scenario.scene.vote-time"></a>
### [vote-time]

* types: parameter
* attribute style: none
* content type: number, time in seconds

This parameter tag is used to set up the time to make a choice, or timeout for votes for multiplayer games.
Once the timeout is reached, the behaviour depends on the *vote style*.



<a name="ref.scenario.scene.vote-style"></a>
### [vote-style]

* types: parameter
* attribute style: none
* content type: string

Used in multiplayer game only.
This parameter tag is used to set up the vote behaviour.
Its content is a string, where:
* *unanimity*: it validates the choice if all players have chosen it
* *absolute* or *absolute-majority*: it validates the choice if it has more than 50% of the votes
* *relative* or *relative-majority* or *majority*: it validates the choice if it has the most voters
* *immediate*: it validates the choice immediately once anyone choose it

The *vote timeout* is very important:
* before timeout, undecided players are counted in
* after timeout, they are counted out



<a name="ref.scenario.scene.hurry-time"></a>
### [hurry-time]

* types: parameter
* attribute style: none
* content type: number, time in seconds

Used in multiplayer game only.
This parameter tag is used to set up the hurry time.
Once the first player made a choice, the vote timeout is reduced to this time.



<a name="ref.scenario.scene.show-timer"></a>
### [show-timer]

* types: parameter
* attribute style: none
* content type: boolean

Whether the vote timer should be displayed or be held secret.



<a name="ref.scenario.scene.init-sub"></a>
## [init-sub]

* types: parameter
* attribute style: none
* content type: tags

If present, the *init-sub* contents is executed immediately at the beginning of the scene before any other tags,
**and only if the scene was reached using a [[gosub] tag](ref.scenario.gosub).**

It is recommended to use this tag only for arguments management.



<a name="ref.scenario.starting-scene"></a>
## [starting-scene *label*]

* types: init, exec
* attribute style: label
* content type: tags

This tag works exactly like the [*scene* tag](#ref.scenario.scene), except that it is automatically used as the *starting scene*,
e.g. the first scene to be *executed*, the entry point.

If there is no *starting-scene* tag in a scenario, the first *scene* tag will be used for this purpose.



<a name="ref.scenario.next"></a>
## [next *scene-label*]

* types: run, exec
* attribute style: scene label
* content type: tags or string/template (the label)

The *next* tag is one of the most important tag of Spellcast Scripting in *Story mode*.

A scenario is basically a lot of scenes, jumping from scene to scene through the *next* tag.

Each *next* tag is a choice the user can make.
Once done, the script jumps to the *scene* tag whose id is the one of the *next* tag attribute.

At *run time*, the choice is added to the current *scene* list of choices.

Once init is done, the *starting scene* is *exec*.
The *starting scene* is either the [*starting-scene* tag](#ref.scenario.starting-scene), or the first registered *scene* tag.

When the scene is executed, it simply runs all its inner tags.

There is also a shorthand syntax where the content is only a string or a template containing the label.
So `[next scene2] $> Tell him the truth` is the same than:

```
[next scene2]
	[label] $> Tell him the truth
```

However, a *scene* has the following parameters tags:



<a name="ref.scenario.next.label"></a>
### [label]

* types: parameter
* attribute style: none
* content type: string

The label of the choice, i.e. the text used as the description.



<a name="ref.scenario.scene.style"></a>
### [style]

* types: parameter
* attribute style: none
* content type: object

If supported by the client, this is used to style the *next item* with a CSS object.



<a name="ref.scenario.scene.class"></a>
### [class]

* types: parameter
* attribute style: none
* content type: string or array or object

If supported by the client, this is used to add one or many CSS classes to the *next item*.



<a name="ref.scenario.scene.image"></a>
### [image]

* types: parameter
* attribute style: none
* content type: string (URL)

If supported by the client, this associate an image/icon with the current *next tag*.
In most clients/themes, this is displayed as an icon for a button.

The content is the URL of the image.



<a name="ref.scenario.next.vote-style"></a>
### [vote-style]

* types: parameter
* attribute style: none
* content type: string

This is a particular *vote style* just for this choice, see
[the *scene* tag's *vote-style* parameter tag](#ref.scenario.scene.vote-style) for details.



<a name="ref.scenario.next.auto"></a>
### [auto]

* types: parameter
* attribute style: none
* content type: number (in seconds)

The *auto* tag is used to automatically select the current choice once the time set in the content is elapsed.



<a name="ref.scenario.next.group-break"></a>
### [group-break]

* types: parameter
* attribute style: none
* content type: boolean (default to true)

Create a new group of next-tag, if supported by the client.
For exemple if the [*next-style*](#ref.scenario.scene.next-style) tag is set to table, this indicates to the client
that this *next item* should start a new column.



<a name="ref.scenario.next.on-trigger"></a>
### [on-trigger]

* types: parameter, exec
* attribute style: none
* content type: tags

The *on-trigger* tag contains code that should be executed once the current *next* tag (i.e. the current choice) is chosen,
but before jumping to the next scene.

Since it will jump immediately after running the *on-trigger* code, this should generally not be used for things
involving the user (like message), but for pure internal usage (like setting some variables).

**This tag has its own scope/context per choice instance** (e.g. if the *next* tag is in a loop, each created choice
has its own scope).



<a name="ref.scenario.next.on-trigger.cancel"></a>
#### [cancel]

It interrupts a *next* tag validation sequence, e.g. placed inside a *on-trigger* tag, or inside a function called by
the *on-trigger* tag.
See [*[cancel]*](#ref.event.cancel) (event) for details.



<a name="ref.scenario.next.args"></a>
### [args]

* types: parameter
* attribute style: none
* content type: anything

Used in conjunction with the *on-trigger* tag, it set the **$args** special variable for the
[*on-trigger*](ref.scenario.next.on-trigger) context.

There is only one use-case for that tag, when one want to nest the *next* tag inside a loop.
Since the values in the *args* tag are solved *at the run time* (of the *next* tag), and since each choice instance
(of the same *next* tag) has its own scope/context, is used to discriminate in which choice we are in.

Here an example of a *next* tag nested inside a loop, this is fragment of the RPG script lib, used for attack targeting:

```
[message] Target?

[foreach $local.enemies => $local.index : $local.entity]
	
	[next]
		[args]
			index: $local.index
		[label] $> ${local.entity.label//uc1}
		[on-trigger]
			[set $fight.target] $local.enemies[$args.index]
```

The *on-trigger* tag receives an argument **$args** variable solved during the loop.
All other variable have the same values since the *on-trigger* content is always run *after* the loop.

In fact, the *args* tag here works just like *args* tag of *gosub* and *call* tags, but target the *on-trigger* tag.



<a name="ref.scenario.next.button"></a>
### [button]

* types: parameter
* attribute style: none
* content type: string (ID)

Create a new group of next-tag, if supported by the client.
For exemple if the [*next-style*](#ref.scenario.scene.next-style) tag is set to table, this indicates to the client
that this *next item* should start a new column.



<a name="ref.scenario.fake-next"></a>
## [fake-next] / [fake-next *mode*]

* types: run, exec
* attribute style: none or specific: the mode
* content type: tags or string/template (the label)

The *fake-next* tag works like a [*next*](ref.scenario.next) tag, except it does not switch to another scene.

Typically, a *fake-next* tag has a *on-trigger* tag that display some text and eventually adjust few variables,
but the scene remain the same, and is not rendered again.

If present, the mode can be:
* normal: nothing special (the default)
* once: the *fake-next* option is removed once selected, but would be enabled if the scene is rendered again



<a name="ref.scenario.next-group-break"></a>
## [next-group-break]

* types: parameter
* attribute style: none
* content type: boolean (default to true)

Create a new group of *next tags*, if supported by the client.
This is equivalent to add a [*group-break* Tag](#ref.scenario.next.group-break) to the next *next tag*
(e.g.: this is useful when the next *next tag* is not easily predictable).

For exemple if the [*next-style*](#ref.scenario.scene.next-style) tag is set to table, this indicates to the client
that this *next item* should start a new column.



<a name="ref.scenario.end"></a>
## [end]

* types: run
* attribute style: none
* content type: none

The *end* tag is used to explicitly end the scenario.

It's worth noting that a scenario will end if the top-level execution layer has nothing more to do
(i.e. the current scene is fully rendered but there is no more user interaction possible that would jump somewhere else).

This is a *neutral end*, mostly useful for non-game scenario.

Game scenario would want to use the [*win* tag](#ref.scenario.win), the [*lost* tag](#ref.scenario.win),
or the [*draw* tag](#ref.scenario.win).



<a name="ref.scenario.win"></a>
## [win]

* types: run
* attribute style: none
* content type: none

The *win* tag is used to explicitly end the scenario, like the [*end* tag](#ref.scenario.end) does,
but instead being a *neutral end* it means the player *wins* the game.



<a name="ref.scenario.lost"></a>
## [lost]

* types: run
* attribute style: none
* content type: none

The *lost* tag is used to explicitly end the scenario, like the [*end* tag](#ref.scenario.end) does,
but instead being a *neutral end* it means the player *loses* the game.



<a name="ref.scenario.draw"></a>
## [draw]

* types: run
* attribute style: none
* content type: none

The *draw* tag is used to explicitly end the scenario, like the [*end* tag](#ref.scenario.end) does,
but instead being a *neutral end* (a non-game end) it is a *draw game*.



<a name="ref.scenario.goto"></a>
## [goto *scene-label*]

* types: run
* attribute style: scene label
* content type: none

The *goto* tag immediately jumps to a new scene.
Unlike the *next* tag, it does not need any user interaction to do that.



<a name="ref.scenario.gosub"></a>
## [gosub *scene-label*]

* types: run
* attribute style: scene label
* content type: none

The *gosub* tag works mostly like function calls in programming language.

The *gosub* tag immediately executes the target scene as a *sub scene*.

The target scene is run, and all *next* tags, *goto* are followed as usual, but once
a [*return* tag](#ref.flow.return) is reached, the script execution is *restored* just where it lefts,
so it continues just after the *gosub* tag.

Think of it as a new execution layer.

If there is no *return* tag, there are implicit *returns* when a scene without any *next* tags is executed entirely:
i.e. there is nothing more to do, so it returns.

There is also a shorthand syntax where the content is an object containing the arguments. E.g.:

```
[gosub scene2]
	a: 5
	b: 7
```

... is the same than:

```
[gosub scene2]
	[args]
		a: 5
		b: 7
```



<a name="ref.scenario.gosub.args"></a>
### [args]

* types: parameter
* attribute style: none
* content type: anything

Since *gosub* creates a new context to run the target sub-scene, this tag is used to set the **$args** special variable
for that sub-scene.



<a name="ref.scenario.gosub.roles"></a>
### [roles]

* types: parameter
* attribute style: none
* content type: array of string (role ID)

The *roles* tag is used when the *gosub* tag is inside a [*split* tag](#ref.multiplayer.split) (used in multiplayer books).

Its content is an array of *role ID*: the role list that will go to the *sub-scene*.



<a name="ref.scenario.gosub.alt"></a>
### [alt]

* types: parameter
* attribute style: none
* content type: none or boolean (default to true)

The *alt* tag is used to indicate to the client that the sub-scene and all its descendant should be rendered
inside the *alternate buffer*.

If the client supports it, the *alternate buffer* behaves like a separated buffer without history.
When the sub-scene returns, the *alt buffer* is cleared and turned off, and the *main buffer* becomes active again
in the same state it was before entering the *alternate buffer*.
Usually, capable clients should display the *alternate buffer* aside the *main buffer*.

E.g.: the *alternate buffer* can be used for things like inventory, or menus that are not directly related to the
story-telling.



<a name="ref.scenario.here"></a>
## [here]

TODO: documentation



<a name="ref.scenario.here-actions"></a>
## [here-actions]

TODO: documentation



<a name="ref.scenario.reset-here-actions"></a>
## [reset-here-actions]

TODO: documentation



<a name="ref.io"></a>
# Input/Output Tags



<a name="ref.io.message"></a>
## [message] / [m *model*]

* types: run
* attribute style: label
* content type: string, template, object or array of: string, template or object.

The *message* tag is used to display a message in the client user interface.

For simple message, the content can be either a simple string, or a template.

If some particular options are needed, the content should be formated as an object, where:
* text `string` or `Template` the message to display
* continue `boolean` if true, this message should be continued by the next message (i.e.: no newline)
* next `boolean` or `number` if true or positive number, the message wait for the user acknowledgement, if it's a number,
  it's used as a timeout in seconds
* important `boolean` if true and if the scene is rendering in the *alternate buffer*, the message should be rendered
  in the *main buffer* too
* slowTyping `boolean` if true, the message is diplayed letter by letter (not all the clients supports it)
* style `object` (optional) this is a CSS object to style the message element (not all the clients supports it)
* class `object` or `string` or `array` (optional) CSS class to enable/disable the message element (not all the clients supports it)
* image `url` if set, the message as an image related to the text, it may be a portrait of the speaker or an image
  of what is described (not all the clients supports it)
* sound `url` if set, a sound that should be played along with the message (not all the clients supports it)
* before `string` if set, this is inserted before the text (useful for models)
* after `string` if set, this is appended after the text (useful for models)
* text-style `string` or `array` of `string`, a list of style to apply to the text (useful for models), supported styles:
    red, green, blue, yellow, brown, cyan, magenta, white, black, grey,
    bright-red, bright-green, bright-blue, bright-yellow, bright-brown, bright-cyan, bright-magenta, bright-white,
    underline, italic, bold, dim, inverse

If the [m *model*] syntax is used, everything in the *model* is used as default, see [the *message-model* tag](#ref.io.message-model).

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



<a name="ref.io.important-message"></a>
## [important-message]

* types: run
* attribute style: none
* content type: string, template, object or array of: string, template or object.

This is exactly the same than the [message tag](#ref.io.message), with the *important* option on.



<a name="ref.io.fortune"></a>
## [fortune]

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



<a name="ref.io.message-model"></a>
## [message-model *model*]

* types: run
* attribute style: label
* content type: object

The content of this tag contains the same options than the [*message* tag](#ref.io.message),
see [the *message* tag documentation](#ref.io.message) for the list.

This tag stores a template / default values for further usage with the `[m model]` variant of the [*message* tag](#ref.io.message).
and it is used to avoid repeating the same [message tag](#ref.io.message)'s options over and over.

This tag could be placed at top-level, like other definitions, or in any place, to replace the actual definition.

Example:

```
[message-model bob]
	before: "Bob says: "
	style:
		- blue
		- italic

[chapter intro]
	[scene intro]
		[m bob] Hello world!
```

... will display `Bob says: Hello world!` using blue-italic letters in the client UI.

Also compare this:

```
[message-model bob]
	before: "Bob says: "
	style:
		- blue
		- italic

[message-model alice]
	before: "Alice says: "
	style:
		- magenta
		- italic

[chapter intro]
	[scene intro]
		[m alice] Hi there!
		[m bob] Hey! Alice!
		[m alice] How are you doing?
		[m bob] Fine, thanks!
```

... to this:

```
[chapter intro]
	[scene intro]
		[message]
		    style:
		        - magenta
		        - italic
		    text: > Alice says: Hi there!
		[message]
		    style:
		        - blue
		        - italic
		    text: > Bob says: Hey! Alice!
		[message]
		    style:
		        - magenta
		        - italic
		    text: > Alice says: How are you doing?
		[message]
		    style:
		        - blue
		        - italic
		    text: > Bob says: Fine, thanks!
```



<a name="ref.io.indicators"></a>
## [indicators]

TODO: documentation



<a name="ref.io.input"></a>
## [input *$var*]

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
## [sound]

* types: run
* attribute style: none
* content type: string, template or object

The *sound* tag is used to play a sound on the client-side.

If the content is a string or a template, this will be the URL of the sound to play.

If some particular options are needed, the content should be formated as an object, where:
* url `string` or `Template` the URL of the sound to play



<a name="ref.io.show-sprite"></a>
## [show-sprite *id*] / [show-sprite *$var*]

* types: run
* attribute style: label or var
* content type: object

TODO: documentation



<a name="ref.io.update-sprite"></a>
## [update-sprite *id*] / [update-sprite *$var*]

* types: run
* attribute style: label or var
* content type: object

TODO: documentation



<a name="ref.io.clear-sprite"></a>
## [clear-sprite *id*] / [clear-sprite *$var*]

* types: run
* attribute style: label or var
* content type: none

TODO: documentation



<a name="ref.io.animate-sprite"></a>
## [animate-sprite *id*] / [animate-sprite *$var*]

* types: run
* attribute style: label or var
* content type: string (the id of the animation)

TODO: documentation



<a name="ref.io.show-ui"></a>
## [show-ui *id*] / [show-ui *$var*]

* types: run
* attribute style: label or var
* content type: object

TODO: documentation



<a name="ref.io.update-ui"></a>
## [update-ui *id*] / [update-ui *$var*]

* types: run
* attribute style: label or var
* content type: object

TODO: documentation



<a name="ref.io.clear-ui"></a>
## [clear-ui *id*] / [clear-ui *$var*]

* types: run
* attribute style: label or var
* content type: none

TODO: documentation



<a name="ref.io.animate-ui"></a>
## [animate-ui *id*] / [animate-ui *$var*]

* types: run
* attribute style: label or var
* content type: string (the id of the animation)

TODO: documentation



<a name="ref.io.animation"></a>
## [animation *id*] / [animation *$var*]

* types: run
* attribute style: label or var
* content type: object

TODO: documentation



<a name="ref.flow"></a>
# Flow Control Tags



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
* content type: tags

The *if* tag runs its content if the expression (as its attribute) is true (or *truthy*).
Otherwise, it passes controle to the eventual following *elseif* or *else* sibling tag.



<a name="ref.flow.elseif"></a>
## [elseif *expression*] / [elsif *expression*]

* types: run
* attribute style: expression
* content type: tags

The *elseif* tag **MUST HAVE** an *if* tag or another *elseif* as its immediate previous sibling.
If that previous tag hasn't passed controle to it, nothing happens.
If it has, then *elseif* tag runs its content if the expression in its attribute is true (or *truthy*).
Otherwise, it passes controle to an eventual following *elseif* or *else* sibling tag.

The *elsif* tag is simply an alias of the *elseif* tag.



<a name="ref.flow.else"></a>
## [else]

* types: run
* attribute style: none
* content type: tags

The *else* tag **MUST HAVE** an *if* tag or an *elseif* as its immediate previous sibling.
If that previous tag hasn't pass controle to it, nothing happens.
If it has, the *else* tag runs its content.



<a name="ref.flow.loop"></a>
## Loop Tags: [while], [loop], [foreach], [continue], [break]



<a name="ref.flow.while"></a>
## [while *expression*]

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



<a name="ref.flow.loop"></a>
## [loop]

* types: run
* attribute style: none
* content type: tags

The loop tag create an infinite loop.
In fact `[loop]` is equivalent too `[while true]`.
The loop should contain a `break` or `return` tag to exit.



<a name="ref.flow.foreach"></a>
## [foreach *$var* => *$value*] / [foreach *$var* => *$key* : *$value*]

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
## [continue]

* types: run
* attribute style: none
* content type: none

The *continue* tag terminates the current iteration of the current loop, and continues with the next iteration of the current loop.



<a name="ref.flow.break"></a>
## [break]

* types: run
* attribute style: none
* content type: none

The *break* tag exit from the current loop immediately.



<a name="ref.flow.function"></a>
## Function Tags: [fn], [call], [return]



<a name="ref.flow.fn"></a>
## [fn *$var*] / [fn *label*]

* types: run or init, exec
* attribute style: var or label
* content type: tags

The *fn* tag is used to create a Spellcast Scripting function.
The content of the tag **MUST** contain tags, they will be run at exec time (i.e. when the function is *called*).

If the `[fn $var]` syntax is used, the function is created **at run time** and stored inside the variable.
This syntax has **no init time**.

If the `[fn label]` syntax is used, the function is created globally **at init time**.
This means that even if the function is declared inside some dead code (code that is never reached),
the function will still be present globally anyway at the starting of the script.
This syntax has **no run time**.

Also is worth noting that a *global* function is namespaced if it has a
[*chapter*](#ref.scenario.chapter) or [*system*](#ref.misc.system) tag in its ancestor line,
using the *chapter* or *system* tag's ID as its namespace.
Calling that function from another namespace require to prefix it with the namespace, e.g.: `[call namespace/label]`.



<a name="ref.flow.call"></a>
## [call *$var*] / [call *label*] / [call *$var* => *$into*] / [call *label* => *$into*]

* types: run or init, exec
* attribute style: var or label or call syntax
* content type: anything

The *call* tag is used to *call* (i.e. *execute*) a Spellcast Scripting function previously declared using the *fn* tag.

The content of the tag will be solved **at run time** and will be stored into the **$args** variable during the *fn* tag execution.
The **$args** variable is restored after the *fn* tag execution.

If the `[call $var]` or the `[call $var => $into]` syntax is used, it will call the function stored inside the *$var* variable:
* if it is a string, that string will be used as the label of a Spellcast function
* if the value stored is a Spellcast function, this function will be called
* if it is a Native function, that function will be called (only synchronous function ATM)

The purpose of the `[call $var]` syntax is to use dynamic function, when the correct function is only known during runtime.

If the `[call label]` or the `[call label => $into]` syntax is used, it will call the global function with that *label*,
see the [*fn* tag](#ref.flow.fn) for details.

If the `[call $var => $into]` or the `[call label => $into]` syntax is used, the return value of the *fn* tag will be stored
into the *$into* variable, see the [*return* tag](#ref.flow.return) for details.

Also, when calling for a *global* function without any namespace, the function is first searched into the current namespace,
then on the *default* namespace.

Calling using the namespace is simply done by prepending the namespace before the function label, with the `/` separator,
e.g. `[call namespace/label]`.

It is also possible to call a native JS function or object method, if it is stored inside a Spellcast Scripting variable.



<a name="ref.flow.return"></a>
## [return]

* types: run
* attribute style: none
* content type: anything

The *return* tag exit from the current *fn* tag (i.e. *fn* tag executed by a [*call* tag](#ref.flow.call)) immediately.

If inside the *fn* tag and the `[call $var => $into]` or the `[call label => $into]` syntax was used,
the content of the *return* tag is solved **at run time** and stored into the *$into* variable.

The *return* tag can also exit from the current sub *scene* tag (i.e. *scene* tag executed by a [*gosub* tag](#ref.scenario.gosub))
immediately, or exit from a [*on* tag](#ref.event.on).



<a name="ref.ops"></a>
# Operation Tags



<a name="ref.ops.set"></a>
## [set *$var*]

* types: run
* attribute style: var
* content type: anything

It stores the content of the *set* tag, solved **at run time**, into the *$var* variable.

Example:

```
[set $a] something
[set $b] $a
[set $person]
	first-name: Joe
	last-name: Doe

[message] $> a: ${a}
[message] $> b: ${b}
[message] $> Hello ${person.first-name} ${person.last-name}!
```

... this would output:

```
a: something
b: something
Hello Joe Doe!
```



<a name="ref.ops.define"></a>
## [define *$var*]

* types: run
* attribute style: var
* content type: anything

The *define* tag works like the [*set* tag](#ref.ops.set), except that it only set if the *$var* variable does not exist yet
**OR** if its value is `undefined`.



<a name="ref.ops.unset"></a>
## [unset *$var*]

* types: run
* attribute style: var
* content type: anything

The *unset* tag delete the *$var* variable.
If it is part of an object, the property itself is destroyed.



<a name="ref.ops.inc"></a>
## [inc *$var*]

* types: run
* attribute style: var
* content type: none

The *inc* tag increments the *$var* number by one.



<a name="ref.ops.dec"></a>
## [dec *$var*]

* types: run
* attribute style: var
* content type: none

The *dec* tag decrements the *$var* number by one.



<a name="ref.ops.add"></a>
## [add *$var*]

* types: run
* attribute style: var
* content type: number

The *add* tag adds its content's number to the *$var* number.



<a name="ref.ops.sub"></a>
## [sub *$var*]

* types: run
* attribute style: var
* content type: number

The *sub* tag subtracts its content's number from the *$var* number.



<a name="ref.ops.mul"></a>
## [mul *$var*]

* types: run
* attribute style: var
* content type: number

The *mul* tag multiplies *$var* number by its content's number.



<a name="ref.ops.div"></a>
## [div *$var*]

* types: run
* attribute style: var
* content type: number

The *div* tag divides the *$var* number by its content's number.



<a name="ref.ops.swap"></a>
## [swap *$var1* *$var2*]

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
## [clone *$var*]

* types: run
* attribute style: var
* content type: anything

The *clone* tag clones its content into the *$var* variable, i.e. it performs a deep copy of objects.

Read [this article](http://blog.soulserv.net/tag/cloning/) if you don't know what object cloning or deep copy is.



<a name="ref.ops.apply"></a>
## [apply *$applicable-var* => *$target-var*]

* types: run
* attribute style: apply syntax
* content type: a context object

The *apply* tag uses its content as a context to *render* a template or any
[applicable object](https://github.com/cronvel/kung-fig/blob/master/doc/lib.md#ref.Dynamic.apply)
stored into the *$applicable-var*, and put the result into the *$target-var* variable.

Example:

```
[set $template] $$> Hello ${first-name} ${last-name}!
[apply $template => $text]
	first-name: Joe
	last-name: Doe
[message] $text
```

... will output: `Hello Joe Doe!`.



<a name="ref.ops.merge"></a>
## [merge *$source-var*] , [merge *$source-var* => *$target-var*] , [merge *$source-var1* , *$source-var2*] , [merge *$source-var1* , *$source-var2* => *$target-var*] 

* types: run
* attribute style: merge syntax
* content type: none

The *merge* tag is used to perform
[Kung Fig's tree operations](https://github.com/cronvel/kung-fig/blob/master/doc/KFG.md#ref.treeops).

Multiple *$source-var* can be specified, separated by comma (surrounded by at least one space on each side),
that will be merged together.

The syntax without a *$target-var* uses the
[Kung Fig's .autoReduce() method](https://github.com/cronvel/kung-fig/blob/master/doc/lib.md#ref.treeops.autoReduce),
so it merges and reduces into the first *$source-var*.

The syntax with a *$target-var* uses the
[Kung Fig's .reduce()](https://github.com/cronvel/kung-fig/blob/master/doc/lib.md#ref.treeops.reduce)
so it doesn't modify any *$source-var*, but instead it puts the result into the *$target-var* variable.

Example:

```
[set $character]
	name: Jörgl, the Barbarian
	hp: 8
	attack: 5
	defense: 4

[set $amulet-of-protection]
	defense: (+) 1
	hp: (+) 2

[merge $character , $amulet-of-protection => $final]
```

The *$character* and *$amulet-of-protection* variables will be merged in the *$final* variable
to produce `{ "name": "Jörgl, the Barbarian", "hp": 10 , "attack": 5 , "defense": 5 }`.



<a name="ref.ops.array-ops"></a>
## Array Operators Tag



<a name="ref.ops.append"></a>
## [append *$var*]

* types: run
* attribute style: var
* content type: anything

The *append* tag appends its content to the *$var* array.



<a name="ref.ops.prepend"></a>
## [prepend *$var*]

* types: run
* attribute style: var
* content type: anything

The *prepend* tag prepends its content to the *$var* array.



<a name="ref.ops.concat"></a>
## [concat *$var*] / [concat *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: array (any other value is replaced as an array of the value as its single element)

The *concat* tag is used to merge the tag's content array and the *$var* variable.

If the first syntax `[concat *$var*]` is used, it merges in-place into the *$var* array.

If the second syntax `[concat *$var* => *$into*]` is used, the *$var* array is preserved,
instead the merge result is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat).



<a name="ref.ops.slice"></a>
## [slice *$var*] / [slice *$var* => *$into*]

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
## [splice *$var*] / [splice *$var* => *$into*]

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
## [filter *$var*] / [filter *$var* => *$into*]

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
## [map *$var*] / [map *$var* => *$into*]

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
## [reduce *$var*] / [reduce *$var* => *$into*] / [reduce *$var* , *init expression*] / [reduce *$var* , *init expression* => *$into*]

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
## [reverse *$var*] / [reverse *$var* => *$into*]

* types: run
* attribute style: array operators
* content type: none

The *reverse* tag reverses the elements order of the *$var* array.

If the first syntax `[reverse *$var*]` is used, it reverses the *$var* array in-place.

If the second syntax `[reverse *$var* => *$into*]` is used, the *$var* array is preserved,
instead a new reversed array is stored into the *$into* variable.

See more [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse).



<a name="ref.ops.sort"></a>
## [sort *$var*] / [sort *$var* => *$into*]

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
## [fill *$var*] / [fill *$var* => *$into*]

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
## [copy-within *$var*] / [copy-within *$var* => *$into*]

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



<a name="ref.event"></a>
# Event Tags



<a name="ref.event.emit"></a>
## [emit *event-label*] / [emit *event-label* => $cancelReason]

* types: run
* attribute style: label or emit syntax
* content type: anything

The *emit* tag emits the *event-label* event.

The event is emitted with the whole solved content as its data.

If the syntax `[emit *event-label* => $cancelReason]` is used, the variable `$cancelReason` will receive a truthy
value if one of its listener has aborted the event propagation.
The value can be of any type, and is produced by the listener.



<a name="ref.event.on"></a>
## [on *event-label*]

* types: run, exec
* attribute style: label
* content type: tags

The *on* tag listen for the *event-label* event: whenever the event is fired, it executes its content.

The content of the *on* tag is called a **listener**.

Inside the listener, the special **$args** variable will contain the data of the event, e.g. the solved content
of the *emit* tag that fired the event.
The context inside the listener is **NOT** the context of the parent tag, **INSTEAD** the context of the emitter is used.
In fact, listeners work almost like functions defined by the *fn* tag.

Except if the listener has the *global* parameter on, the listener is destroyed once the script execution leaves
the current scene (*goto*, *next*).
But it still apply for any nested level of sub-scene (*gosub*).

Parameters tags can modify many things about the listener mechanism, but there are **NOT** dynamic,
i.e. they do not contain variable but direct constant data.



<a name="ref.event.on.global"></a>
### [global]

* types: parameter (init)
* attribute style: none
* content type: boolean or none (none=true)

With the *global* parameter, the *on* tag will listen for that event **globally**, implying that the listener
is not destroyed when the script execution leaves the current scene (*goto*, *next*), it can be triggered
by event emitted from any other scenes.



<a name="ref.event.on.default"></a>
### [default]

* types: parameter (init)
* attribute style: none
* content type: boolean or none (none=true)

With the *default* parameter, the *on* tag will be activated **only** if it is the only one listening that event.



<a name="ref.event.on.id"></a>
### [id]

* types: parameter (init)
* attribute style: none
* content type: string

Set the content of this tag as the listener ID.
The ID is useful if the listener should be removed.



<a name="ref.event.off"></a>
## [off]

* types: run
* attribute style: none
* content type: string or none

The *off* tag unregister (*remove*, *turn off*) a listener.
The content of this tag is the ID of the listener to unregister.

If the tag has no content, then the *off* tag must be inside a *on* tag, the listener to unregister.



<a name="ref.event.cancel"></a>
## [cancel]

* types: run
* attribute style: none
* content type: anything

The *cancel* tag is meant to cancel something in progress.

When used inside a *on*-family tag (*on, once, on-global, once-global* tags), it immediately exit (like *return*).
**Furthermore it aborts the event propagation:** listeners that haven't been triggered yet will never receive the event.

If the *emit* tag has used the `[emit event => $cancelReason]` syntax,
the content of the *cancel* tag is solved **at run time** and stored into the *$cancelReason* variable.

The emitter is responsible for actually cancelling the action it is about to perform, or undo it.

If the content value is any *falsy* value, it will be replaced by `true`.

It can be used to aborts the *next* tag validation sequence, e.g. placed inside a *on-trigger* tag,
or inside a function called by the *on-trigger* tag.
Doing so abort the *next* tag execution: the scene remains the same, just as if a the *[next]* tag was a *[fake-next]* tag.



<a name="ref.event.client-emit"></a>
## [client-emit *event-label*]

* types: run
* attribute style: label
* content type: anything

The *client-emit* tag emits the *event-label* event on the client-side of the application.
It does nothing for vanilla clients, but custom clients can use them for anything they want, when non-standard features
are required.

The event is emitted with the whole solved content as its data.

To be more precise, a *custom* event is emitted and sent through the wire, with the *event-label* as the first argument
and the solved content as the second argument.



<a name="ref.multiplayer"></a>
# Multiplayer Tags



<a name="ref.multiplayer.role"></a>
## [role *role-label*]

* types: init
* attribute style: label
* content type: tags

The *role* tag creates a role.
A role is a player slot.

When no *role* tag exists, one default role is automatically created.

Usually, a script uses *role* tags only if it features multiplayer: it is the link between a player and its role
in the game/scenario.

It has some parameter tags.



<a name="ref.multiplayer.role.name"></a>
### [name]

* types: parameter
* attribute style: none
* content type: string

The *name* tag contains the name of the role, as displayed to users.



<a name="ref.multiplayer.role.entity"></a>
### [entity]

* types: parameter
* attribute style: none
* content type: object

The *entity* tag creates and assigns an entity to the current role.
It works like the [*create-entity* tag](#ref.rpg.create-entity).



<a name="ref.multiplayer.split"></a>
## [split]

* types: run
* attribute style: none
* content type: tags (only *gosub* tags)

The *split* tag is used to split players in two or more scenario branches.
Instead of playing together the same scene, groups of players can play different scenes.

Inside a *split* tag, there must be at least two [*gosub* tags](#ref.flow.gosub), those *gosub* tags must have
a [*roles* parameter tags](#ref.flow.gosub.roles).

Roles are reunited once all groups have returned from their respective *gosub* tags.

Example of *split* tag in action:

```
[split]
	[gosub alice-branch]
		[roles]
			- alice
	[gosub bob-branch]
		[roles]
			- bob
```

In this example, there are two roles whose ID are `alice` and `bob`.
When the *split* tag is run, Alice and Bob's player are splitted in two branches.
Alice will play on the `alice-branch` sub-scene and Bob will play on the `bob-branch` sub-scene,
until they finished their respective sub-scenario.

When a split occurs, **branches run in parallel mode**.
Therefore it should receive special care: **they should not act on the same variables**, or a lot of concurrency issues
may arise.

Furthermore, events are somewhat splitted too:
* new listeners defined by the *on* tag inside a branch does not exist inside other branches
* listener removed by the *off* tag inside a branch are not removed inside other branches

Once all branches have reunited, listeners are merged:
* all listeners created and still existing at the end of any branch are created (but those with duplicated ID are removed)
* all listeners defined **BEFORE** the split and removed by any branch are removed



<a name="ref.rpg"></a>
# RPG Tags



<a name="ref.rpg.entity-class"></a>
## [entity-class *class-label*]

* types: init
* attribute style: label
* content type: object

The *entity-class* tag defines a class of entity, i.e. a global kind of *things* that can perform some actions in the scenario,
that may (or may not) be human controled.

Some example of entity types:
* a character
* a battalion
* a city
* a kingdom
* ...

At *init time*, the class is registered globally.

Its content is an object containing some or all of the *Entity* properties.

TODO: documentation



<a name="ref.rpg.entity-model"></a>
## [entity-model *model-label*]

* types: init
* attribute style: label
* content type: object

The *entity-model* tag defines a model for futur entity creation.

At *init time*, the model is registered globally.

Its content is an object containing some or all of the *Entity* properties.

It may inherit from an entity class.

TODO: documentation



<a name="ref.rpg.create-entity"></a>
## [create-entity *$var*]

* types: run
* attribute style: var
* content type: string (the model to create) or object

The *create-entity* tag is used to create an entity and store it into a variable.

Its content content can be either a simple string containing the model ID to create, or a whole object containing
some or all of the *Entity* properties, that may inherit from an entity model.

TODO: documentation



<a name="ref.rpg.create-main-entity"></a>
## [create-main-entity]

* types: run
* attribute style: none
* content type: string (the model to create) or object

The *create-main-entity* tag is used to create the main entity.

It works like the [*create-entity* tag](#ref.rpg.create-entity), except that the entity is stored inside
the first role (created if unexistant) and inside the $player global variable.

Using this tag is the **recommended** way to create the main character in **single player book**.

Since it creates a default role if none exist when executed, this is **not recommended** to use this tag in **multiplayer book**.

TODO: documentation



<a name="ref.rpg.update-entity"></a>
## [update-entity *$var*]

* types: run
* attribute style: var
* content type: none

The *update-entity* tag is used to update the entity stored the variable: it computes again compound stats.

It should be used whenever the script has modified a stat, a skill or a status that is involved in compound stats.

Some tags do it automatically, e.g. the [*equip*](#ref.rpg.equip) and [*unequip*](#ref.rpg.unequip) tags.



<a name="ref.rpg.entity-compound-stats"></a>
## [entity-compound-stats *entity-class-label*]

* types: init
* attribute style: label
* content type: object

The *entity-compound-stats* tag defines compound stats for for an *entity-class-label* entity class.

The content should be an object where the key is a stat name and the value is usually an *expression*.
The *expression* usually contains *ref* (variable) relative to the entity object.

Example:

```
[entity-compound-stats character]
	fighting: $= ( $stats.dexterity + $stats.strength ) / 2
```

This will define a compound stat *fighting*, computed using the entity *dexterity* stat and *strength* stat,
that will exist for all *character* type entity.



<a name="ref.rpg.usage-compound-stats"></a>
## [usage-compound-stats *usage-label*] / [usage-compound-stats *usage-label* *variation-label*]

* types: init
* attribute style: usage-compound-stats syntax
* content type: object

The *usage-compound-stats* tag defines compound stats for a particular *usage-label* usage,
eventually for the *variation-label* variation.

The content should be an object where the key is a stat name and the value is usually an *expression*.
The *expression* usually contains *ref* (variable) relative to the entity object.

Example without variation:

```
[usage-compound-stats ranged-fighting]
	attack: $= $stats.shooting
	damages: $= $stats.strength
```

This will define a compound stat *attack*, computed using the entity *shooting* stat, and a *damages* stat computed
with the entity *strength* stat, that will be active for the *ranged-fighting* usage.

Example with variation:

```
[usage-compound-stats ranged-fighting firearm]
	damages: $= $stats.shooting / 4
```

This will define a compound stat *damages* computed with the entity *shooting* stat, 
that will be active for the *ranged-fighting* usage when the item has the *firearm* type.

The variation usage inherits from the standard usage (the one without variation), hence the *attack* stat is computed
using the code in the previous example.

Variations are useful when the same usage has different stats depending on the item performing it.
Here the entity has a *firearm* type of weapon (guns, etc), the damages caused by that weapon rely more on
the item stats than on the entity stats, and so the *strength* of the character does not affect the damages.



<a name="ref.rpg.item-model"></a>
## [item-model *model-label*]

* types: init
* attribute style: label
* content type: object

The *item-model* tag defines a model for futur item creation.

At *init time*, the model is registered globally.

Its content is an object containing some or all of the *Item* properties.

It may inherit from an item class.

TODO: documentation



<a name="ref.rpg.create-item"></a>
## [create-item *$var*]

* types: run
* attribute style: var
* content type: string (the model to create) or object

The *create-item* tag is used to create an item and store it into a variable.

Its content content can be either a simple string containing the model ID to create, or a whole object containing
some or all of the *Item* properties, that may inherit from an item model.

TODO: documentation



<a name="ref.rpg.equip"></a>
## [equip *$var*]

* types: run
* attribute style: var
* content type: object

The *equip* tag is used to equip an item on the entity stored in the *$var*.

The content is an object describing what to equip and how, properties are:
* item `ref` the variable containing the item to equip
* owned `boolean` true if the item is already owned by the entity (default: true)
* primary `string` or `array` of `string`: this is the list of usages for what this item is the primary item

The equipment slot used will be the item's *$item.slotType*.

This will equip *$hero* with the *$sword*, and set it as the primary item for the *melee-fighting* usage:

```
[equip $hero]
	item: $sword
	primary: melee-fighting
```

**It automatically [update the entity](#ref.rpg.update-entity)**.



<a name="ref.rpg.unequip"></a>
## [unequip *$var*]

* types: run
* attribute style: var
* content type: object

The *unequip* tag is used to unequip an item off the entity stored in the *$var*.

The content is an object describing what to unequip, properties are:
* item `ref` the variable containing the item to unequip
* slot `string` the equipment slot ID to unequip

If **no content** (or a *falsy* content) is provided, it will unequip **ALL** items.

An item is unequipped using **either** the item ref itself **or** the equipment slot.

This will unequip all items in the hands of the *$hero*:

```
[unequip $hero]
	slot: hand
```

This will unequip the item *$sword* in the hands of the *$hero*:

```
[unequip $hero]
	item: $sword
```

**It automatically [update the entity](#ref.rpg.update-entity)**.



<a name="ref.rpg.grab"></a>
## [grab *$var*]

* types: run
* attribute style: var
* content type: object

The *grab* tag is used to grab an item: the entity stored in the *$var* collect the item in its inventory.
The item is not equipped.

The content is an object describing what to drop, properties are:
* item `ref` the variable containing the item to grab
* stack `array` (optional) if present, the item to grab should be present in the stack, and it will be removed from it



<a name="ref.rpg.drop"></a>
## [drop *$var*]

* types: run
* attribute style: var
* content type: object

The *drop* tag is used to drop an item off the entity stored in the *$var*.
The item should not be equipped.

The content is an object describing what to drop, properties are:
* item `ref` the variable containing the item to drop
* all `boolean` (optional, default: false) drop all unequipped items
* unequip `boolean` (optional, default: false) in conjunction with the *all* option, it first unequip all items,
  so all items will be dropped, included equiped items
* stack `array` (optional) if present, dropped items are appended to the stack



<a name="ref.rpg.create-metric"></a>
## [create-metric *$var*]

* types: run
* attribute style: var
* content type: object

TODO: documentation



<a name="ref.rpg.raise-metric"></a>
## [raise-metric *$var*]

* types: run
* attribute style: var
* content type: string or object

TODO: documentation



<a name="ref.rpg.lower-metric"></a>
## [lower-metric *$var*]

* types: run
* attribute style: var
* content type: string or object

TODO: documentation



<a name="ref.ui"></a>
# UI Tags



<a name="ref.ui.status"></a>
## [status]

TODO: documentation



<a name="ref.ui.panel"></a>
## [panel]

TODO: documentation



<a name="ref.ui.add-to-panel"></a>
## [add-to-panel]

TODO: documentation



<a name="ref.chatbot"></a>
# Chatbot/Interpreter Tags

Spellcast supports chatbot/interpreter features.

TODO: documentation



<a name="ref.chatbot.interpreter"></a>
## [interpreter *label*]

* types: init
* attribute style: label
* content type: tags

TODO: documentation



<a name="ref.chatbot.query"></a>
### [query]

* types: init
* attribute style: none
* content type: tags

TODO: documentation



<a name="ref.chatbot.pattern"></a>
#### [pattern]

* types: init
* attribute style: none
* content type: string

TODO: documentation



<a name="ref.chatbot.reply"></a>
#### [reply]

* types: init
* attribute style: none
* content type: tags

TODO: documentation



<a name="ref.chatbot.request"></a>
## [request]

* types: run
* attribute style: request syntax
* content type: string

TODO: documentation



<a name="ref.misc"></a>
# Misc Tags



<a name="ref.misc.module"></a>
## [module]

* types: init
* attribute style: none
* content type: tags

The *module* tag replaces itself by its content (tags).

Its purposes is to be used in conjunction with
[KFG includes](https://github.com/cronvel/kung-fig/blob/master/doc/KFG.md#ref.includes).

Example:

```
[module] @@path/to/my-spellcast-module.kfg
```



<a name="ref.misc.system"></a>
## [system *label*]

At the moment, this is an alias of the [*chapter* tag](#ref.scenario.chapter).

It is used to encapsulate *fn* tags into a namespace.



<a name="ref.misc.pause"></a>
## [pause]

* types: run
* attribute style: none
* content type: number (float, pause time in seconds)

The *pause* tag suspends the script execution for its content's number in seconds.

Example:

```
[message] Before pause
[pause] 2.5
[message] After pause
```

... this will display `Before pause`, then wait for 2.5 seconds, then display `After pause`.



<a name="ref.misc.js"></a>
## [js]

* types: run
* attribute style: none
* content type: string (Javascript code)

The *js* tag provides a way to execute embedded Javascript code directly.

The Javascript code runs in a different VM.

**Warning:** Running third-party Javascript code can be unsafe, **so this feature can be turned off by the host!**

Example:

```
[set $wizard] Zang'dar
[message] $> Hello ${wizard}!

[js]
	> wizard = "Oz" ;

[message] $> Hello ${wizard}!
```

... this will output:

```
Hello Zang'dar!
Hello Oz!
```



<a name="ref.misc.generator"></a>
## [generator *label*]

* types: init
* attribute style: label
* content type: object

This creates a text/name generator.

TODO: documentation



<a name="ref.misc.generate"></a>
## [generate *$var*]

* types: run
* attribute style: var
* content type: string (the name/id of the generator)

This generate a random text/name using the generator provided in the tag content, and put it inside a variable.

TODO: documentation



<a name="ref.misc.debug"></a>
## [debug *level*]

* types: run
* attribute style: label
* content type: anything (the content to debug)

The *debug* tag produces a debug log at level *level*, that inspects its content.

Available log levels:
* debug
* verbose
* info
* warning
* error
* fatal

Example:

```
[debug info] Script loaded!

[set $var]
	a: one
	b: two

[debug] $var
```

... this would output (in the command line, or any configured log transporter) something similar to:

```
[INFO.] 09:41:19 <script> -- Script loaded!
[DEBUG] 09:41:19 <script> -- Object object {
		a: one number
		b: two number
	}
```



<a name="ref.misc.debugf"></a>
## [debugf *level*]

* types: run
* attribute style: label
* content type: an array of one format string followed by variable to inspect

The *debugf* tag is similar too the *debug* tag, but provides a way to format what should be debugged.

The first element of the array is the format string, it should follow
[the string-kit's format](https://github.com/cronvel/string-kit#ref.format).

Other elements are formated according to the format string.

Example:

```
[set $var]
	a: one
	b: two

[debugf]
	- "This is $var.a: '%s', $var.b: '%s', and $var: \n%Y"
	- $var.a
	- $var.b
	- $var
```

... this would output (in the command line, or any configured log transporter) something similar to:

```
[DEBUG] 09:57:38 <script> -- This is $var.a: 'one', $var.b: 'two', and $var: 
	Object object {
		a: "one" string(3)
		b: "two" string(3)
	}
```


