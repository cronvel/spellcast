

With this module, it will be possible to make board games.



## [board *$var*] tag

Describe a board.



### [map]


This is the svg that will be used for the map.
It **must** be accessible both server-side and client-side.
The server parse it to produces *buttons* for the board UI and *squares*.

```
[map] path/to/file.svg
```



### [button]

Declare a button.

```
[button $my-button]
	id: svg-id
	command: my-command-string
```



### [square]

Declare a square, a place where *pieces* can be placed.
The *paths* property contains a list of squares IDs where it is possible for the *pieces* to move.

```
[square $my-square]
	id: svg-id
	paths:
		- square-id1
		- square-id2
		- square-id3
		- ...
```



### [square-sequence] / [square-cycle] / [square-grid] / [square-octogrid] / [square-hexagrid] / [square-network]

Declare multiple squares and automatically build a network (populate the *paths* property).

* sequence: create an array of squares, the first has a path to the second, the second to the third,
  and so on until the last square of the array
* cycle: like sequence, but the last square links the first one
* grid: create a bi-dimensional array of square, with 4-directions paths
* octogrid: like grid, but with 8-directions paths
* hexagrid: create a bi-dimensional array of square, with hexagonal paths
* network: create an array of squares, extract complexes paths from the SVG file



### [piece]

Declare a piece.
It is an entity that can be placed to a square.

```
[piece $my-piece]
	url: image-url
	name: piece-name
	class: piece-class
```



### [card]

Declare a card.
Useful for card-based games.

```
[card $my-card]
	url: image-url
	name: card-name
```
