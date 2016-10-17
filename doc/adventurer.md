

# Spellcast!

Make: your own adventure!

**Spellcast** is a scripting language, an interpreter/server, plus a terminal and a web clients with powerful capabilities.

It's main purpose is to create scenario with branches, so you can build game in the spirit of old roleplay gamebooks
out of the box.

But Spellcast can also be embedded into your app, to allow users to create content, item, campaign and so on.

This page focus on the *adventure* capabilities of spellcast, but Spellcast is also a task-runner.



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



## Getting started: basic script example

This is an example of a very short script with 3 scenes, featuring the most basic tags.

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
* a top-level container: the `chapter` tag with an identifier (*intro*)
* this chapter contains 3 `scene` tags named *village*, *master* and *rogue*
* the first scene contains 2 `next` tags: those tags tell which scene can follow the current one
* when there are more than one `next` tag in a scene, the player can choose between multiple choice
* the next tag has a scene identifier, e.g. `[next master]` means that if the player choose that, the
  next scene will be the one named `master`
* the `label` tag is simply the text displayed to the user for this choice
* the `message` tag contains text to be displayed to user
* the `win` and `lost` tags causes the game to exit, either with a game win or a game lost
* all text **supports internationalization and localization**

