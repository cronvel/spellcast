

# Spellcast!

It's like 'make', but with a touch of Wizardry.

This Scroll is still a work in progress (specs, etc...)

* License: MIT
* Current status: early alpha / unstable / hazardous magical energy / DO NOT USE YET!
* Platform: Node.js only
* Are-we-better-yet: **Maybe.**


Usage: `spellcast [<spellbook>] <spell or summoning> [<options 1>] [<options 2>] [...]`

* *spellbook*: the magical book (i.e. the file, like `Makefile` for make) containing spells and summonings.
  It defaults to `./spellbook`.
* *spell*: a spell to cast (i.e. some actions to perform) existing in the spellbook.
* *summoning*: a file to summon, it's like *spell* but the result should build the file

Options:

* `--eternal`: continously cast or summon (e.g. each time a dependency change).
* `--again`: cast or summon a spell even if it's not needed.
* `--summon-makefile`: summon a Makefile having one rule for each spell and summoning of the spellbook. (TODO)
