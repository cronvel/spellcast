

# Spellcast UI SVG Guide

Spellcast uses SVG extensively for its graphical client.



## Marker

### Origin

To have an origin different than the top-left corner, add an `originX` and `originY` attribute to its `svg` tag.

* The values are expressed in the inner SVG coordinates system (same than the `viewBox` attribute).
* It is possible to provide only `originX` or `originY` attribute, the missing one will default to *left* or *top*
* If the SVG has a specified width and/or height, it will be considered as unitless even if it has a unit.



## Patch SVG files to be Spellcast-ready

You need to install globally the package *svg-kit*: `npm install -g svg-kit`.
Then use the `svgkit` command.

(In the future, it should be achieved with a specific `spellcast` command).

TODO.

