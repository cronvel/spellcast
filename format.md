
# Still a work in progress!



# Variable substitution

Variables aka formula are defined in the 'formula' block.

A formula only consists of a string, no other type are supported ATM.

Once a formula is defined, it can be used with the syntax `${variableName}`, where 'variableName' is the name
of the variable.

When a variable is encountered, it is substituted by its string value.



# References

## Top level

### formula

* no-overide: if variable definition should not overide pre-existing variables, e.g. variable passed from 
  the command line, or previous formula block, or anything else

This block defines formula, i.e. variables and values used for substitution.



## spell 

### sh : shell commands

* parallel: this shell block will execute each command in parallel mode, if a number is passed, this is the maximum
  of commands running in parallel
* ignore: if a command return a non-zero status, it will continue nontheless

Each child of this block is a shell command to execute.



