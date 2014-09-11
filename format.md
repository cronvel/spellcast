
# Still a work in progress!



# Variable substitution

Variables aka *formula* are defined in the *formula* block.

A *formula* only consists of a string, no other type are supported ATM.

Once a formula is defined, it can be used with the syntax `${variableName}`, where 'variableName' is the name
of the variable.

When a variable is encountered, it is substituted by its string value.

TODOC: list formula



# References

## Top level

### formula

* no-overide: if variable definition should not overide pre-existing variables, e.g. variable passed from 
  the command line, or previous formula block, or anything else

This block defines formula, i.e. variables and values used for substitution.



## spell & summon

### sh : shell commands

* parallel: this shell block will execute each command in parallel mode, if a number is passed, this is the maximum
  of commands running in parallel
* ignore: if a command return a non-zero status, it will continue nontheless
* write-formula: this specify a variable name (aka a *formula*) which will be populated by each line of the output
  of this shell block, the formula is used as a list
* splitter: this specify a splitter for the 'write' argument, by default '\n' is the splitter
* silence: dispell all output to stdout
* amnesia: dispell all output to log files

Each child of this block is a shell command to execute.



## foreach <formula>

TODOC: everything about foreach


