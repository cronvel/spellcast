

# Spellcast UI SVG Guide

Spellcast uses SVG extensively for its graphical client.
By editing manually a SVG file with a text editor, you can turn it into a functionnal UI.

This guide assume that you understand the XML format, and know a bit of SVG.



## UI

### Hint

If you want to attach a *hint* on some part of your SVG, just add a `hint` attribute to that part,
and set it to the text to be displayed.

Anytime the mouse will enter that part of the SVG, the hint will show.



### Button

To turn a specific part of the SVG into a button, you just need to add a `button` attribute and set it
to some button ID.

When your UI will be displayed on screen, every time a *next* item will declare a button ID matching this ID,
the *next* item will be removed from the *next list* and instead the action will be performed by clicking
on that part of the SVG.



### Area

Any part of the SVG can become an area.
An area is a specific part of the SVG that can receive status.
Usually the SVG should contains a `style` tag containing the CSS to modify the area appearance when
the status changed.

Furthermore, an area can is a place where *markers* can be put on.

As usual, just add an `area` attribute to that part of the SVG and set it to an ID.
A button automatically creates an `area` attribute based on the `button` attribute value if no `area`
attribute exists on this element.



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

