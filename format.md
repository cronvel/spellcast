
# Still a work in progress!



# Formula/Variable substitution

Variables aka *formula* are defined in the *formula* block.

A *formula* only consists of a string, no other type are supported ATM.

Once a formula is defined, it can be used with the syntax `${variableName}`, where 'variableName' is the name
of the variable.

When a variable is encountered, it is substituted by its string value.

List of blocks that supports formula:
* *scroll*'s command, when: at execution of each command
* *scroll*'s *write-formula* argument
* *scroll*'s *only-index* argument

TODOC: list formula
TODOC: coupled formula using ${some-formula:some-index-formula} notation



## Filter

We can use builtin filter at substitution time, using the `${formula/filter}` syntax.

Valid filters:
* uppercase
* lowercase
* regexp: escape for regexp pattern
* shellarg: escape for a shell argument



## The special formula *${this}*

It represents the matching rule.

When in regexp summoning context, it contains all capturing parentheses too, see *regexp summoning*.



# References

## Top level

### formula

This block defines formula, i.e. variables and values used for substitution.



### *Spell declaration*

The syntax of a spell is `.<spellname>`.

A spell is a set of actions and conditions that are executed when running `spellcast <spellname>` on the command line.



### *Summoning declaration*

The syntax of a summoning is `:<filename>`.

A summoning is a set of actions and conditions that must be done in order to build or rebuild (=summon) a file.

Summoning block are executed:
* when another spell or summoning explicitly summon a file and a summoning declaration exist for this file
* when running `spellcast <filename>`, and no spell exists for this name (spell have priorities over summmoning)

Files that does not need to be built or rebuilt should never have a summoning declaration for them,
e.g. all sources files (.c, .js, ...).



### *Regexp summoning declaration*

The syntax of a regexp summoning is `/<pattern>/<flags>`.

This works exactly the same way as regular summoning, except that this block will be executed if the filename
of the file that should be summoned match the regexp. So many file can trigger the same regexp summoning block.

Also, when a file is summoned, only one summoning block will be triggered: *Spellcast* will start searching
for regular summoning block, if nothing was found, then it will try all the regexp summoning in the order
they appear in the spellbook, if it match the matching block will be executed and no other regexp summoning
will be tried... if nothing is found, then the file is treated as a source, it should exist or an error is raised.

The special formula `${this}` contains the matching file.
However, if the regexp contains capturing parentheses, `${this:1}` contains the first one, `${this:2}` the second,
and so on...

This is really a powerful feature.



## spell & summon

### scroll : shell commands

* parallel: this scroll block will execute each command in parallel mode, if a number is passed, this is the maximum
  of commands running in parallel
* ignore: if a command return a non-zero status, it will continue nonetheless
* write-formula: this specify a variable name (aka a *formula*) which will be populated by each line of the output
  of this scroll block, the formula is used as a list
* splitter: this specify a splitter for the 'write-formula' argument, by default '\n' is the splitter
* only-index: when used in conjunction with write-formula, this get only the first part of the splitted output
  and put it in this formula's index, it can be a number or a third party formula
* silence: dispell all output to stdout
* amnesia: dispell all output to log files

Each child of this block is a scroll command to execute.



### transmute <formula> : regular expression (replace)

TODOC: everything about transmute



## foreach <formula>

TODOC: everything about foreach



