

* [story] tag or [quest] tag:
This is just like an independent book. The execution can run the quest, leave it to the main-line, then resume
to its exact position. [quest] tags constain [scene] tags. 
In the main story line, the [resume-quest] tag is used to resume it.
While [gosub]+[scene] works like a kind of *function*, [quest] works more like a *generator*.

Multiplayer mode:

* [character <id>] tag

Anything in this tag will be played only by this Playing Character, other player do not see that text.
Multiple [character] tag can be used in the same scene.
Each character can even go to its own sub-scene.
However all characters should resolve their own sub-scene in order to proceed to the next scene.


* [next] are activated democratically, some [next] tag appear hidden, the choice is only selectable/visible
by a particular character (e.g. the [next] tag appears in a [character] tag).


* [role-master] tag

One of the connected user is actually a role-master. Some [next] tag can trigger its action (e.g.:
a [next] tag that leads to an input field where the player can explain what he want to do).
When this happens, this tag defines what the role-master can do, either globally, or in the current scene.

