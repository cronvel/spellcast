

# Events on Book instances

* ready: [state] emitted once the book is init
* exit: [completion] emitted when the the process is about to exit
* idle: [state] emitted when the core of spellcast is idling
* busy: [state] emitted when the core of spellcast is not idling
* undeadRaised (undeadList): emitted when a file or directory watched (undead mode) has changed, usually causing
  the book to reset and to run again the related action
* newClient (client): emitted when a new client is added to the book, once it emitted 'ready'
* newUser (client): emitted when a user has authenticated through a client
* removeClient (client): emitted when a client is removed from the book



# Events on script/API bus

Events emitted here are usually **userland** event, except few standard events:

* command (object): emitted every time a role (a client) send a command, object contains:
	* role (Role instance): the role that sent the command
	* entity (Entity instance): the entity that sent the command, if any (the same than role.entity)
	* command (text): the raw text command



# Events on Client instances

### input

* exit: [completion] emitted when the process hosting the book is about to exit
* end (result, data): [state,completion] emitted once the book is finished, `result` constains the outcome for *that* client.
  It can be: *end* (end, nothing special), *win*, *lost*, *draw* (this spellbook is a game and the client win/lost or
  it was a draw game). `data` contains end of game details, depending on the spellbook (things like score, etc).
* cast (spellName, status, [error]): a spell has been casted or has fizzled (caster mode), where:
	* spellName `string` the name of the spell
	* status `string` is one of:
		* 'ok': the spell was casted successfully
		* 'upToDate': the spell was not casted because all its dependencies are up to date
		* 'error': the spell was not casted because of an error
	* error `object` (optional) when status='error' this contains the error object
* summon (summoning, status, [error]): a summoning has been summoned or has fizzled (caster mode), where:
	* summoning `string` the path of the summoning
	* status `string` is one of:
		* 'ok': the summoning was summoned successfully
		* 'upToDate': the summoning was not summoned because it already exists and all its dependencies are up to date
		* 'noop': everything went fine but nothing was produced
		* 'error': the summoning was not summoned because of an error
	* error `object` (optional) when status='error' this contains the error object
* coreMessage (message, ...): message emitted by the core of spellcast, `message` is the message and may
  contains markup and be formated with variables (printf-like)
* errorMessage (message, ...): error emitted by the core of spellcast or from anywhere else, `message` is the message and may
  contains markup and be formated with variables (printf-like)
* extOutput (raw): an external program raw output (usually on stdout)
* extErrorOutput (raw): an external program raw error output (usually on stderr)

* message (text, options): [completion] message emitted by the book, `text` contains the message and may contains markup,
  if `options` is set, it is an object contains details about the message. They may or may not be implemented, depending
  on the client. Available options:
	* await `boolean` if true the script execution wait for the client ack (e.g. until the spoken voice or the slow-typing is finished)
	* next `boolean` if true, the message wait for the user acknowledgement, force *await*
	* type `string` the message type, which can be:
    	* 'log': (the default) the message is added to the main text box, which is usually scrollable, and have infinite history
    	* 'dialog': the message produces an ephemeral dialog box
    	* 'modal': like 'dialog', but also prevent the user from doing anything until the message send the ack
    	* 'overlay': mostly like 'dialog', but without the box
    	* 'g-entity': the message is attached to a GEntity, e.g.: a character is chatting and the message is inside a bubble attached to the character's sprite
	* special: `object` (optional) client-depended, can be used to tell the client the place of the message, or some cosmetics
	* continue `boolean` if true, this message should be continued by the next message (i.e.: no newline, no new paragraph)
	* important `boolean` if true and if the scene is rendering in the *alternate buffer*, the message should be rendered
	  in the *main buffer* too.
	* slowTyping `boolean` if true, the message is displayed letter by letter
	* wait `number` (optional) if set, the message ends (is discarded) after that number of seconds, also this pause starts only
	  after slowTyping or any special delay have finished
	* style `object` (optional) this is a CSS object to style the message element
	* class `object` or `string` or `array` (optional) CSS class to enable/disable on the message element
	* image `url` if set, the message as an image related to the text, it may be a portrait of the speaker or an image
	  of what is described
	* sound `url` if set, a sound that should be played along with the message
	* speech `boolean` if true, use the client speech synthesis capability (if any)
	* speechOnly `boolean` if set, do not display the message, only use the client speech synthesis
	* speechReplay `boolean` if true, the client add a button to replay the speech
	* speechLang `string` language to use for the speech synthesis
	* speechVoice `string` the voice to use for the speech synthesis
	* speechVolume `number` the volume for the speech synthesis (default: 1)
	* speechRate `number` the speech rate (speed) for the speech synthesis (default: 1)
	* speechPitch `number` the speech pitch for the speech synthesis (default: 1)
	* speechGender `string` the gender for the speech synthesis
* textInput (label, grantedRoleIds, historyGroup): the book requires that the user enter a text, `label` is the text describing what is required,
  the client response should emit a `textSubmit` event, `grantedRoleIds` is an array of role's ID, roles that can respond, and finally
  `historyGroup` is a string, an identifier used for populating the history lines, or is null if there isn't history lines.

* indicators (data): intended to display indicators in the message area flow (i.e. mixed with *message* events).
  An indicator is a data-representation visual-element, like bars.
  Argument `data` is an array of *indicators*, objects where:
	* type: the type of indicator, i.e. its data representation and appearance (e.g.: text, bar, etc)
	* label: the label/title of the indicator
	* value: the value for that indicator
	* code: (optional) an internal codename for the indicator
	* color: (optional) the color of that indicator, when that makes sense
	* image: (optional) the url of an image that will be used instead of/in conjunction with the label,
	  if supported by the client
  Existing types:
	* text: nothing special, the value is a text that will be displayed
	* hbar: horizontal bar, the value is expressed in percent, from 0 to 100, the bar is filled accordingly
	* vbar: vertical bar, same than hbar but vertically, usually suited for smaller area

* status (data): works just like the 'indicators' event, but should be displayed in the status area of the client

* panel (data , reset): declare a new panel (if *reset* is on), or add new buttons to the existing panel
  (if *reset* is off).
  A panel is a place in the client's UI where a set of button is placed,
  that can invoke a *next* action.
  I.e.: if a *next item* has a *panel* property linking to an existing button, then this *next item* is not added
  to the *next list*, instead, clicking on that button trigger the *next item's action*. If no *next item* link
  a button, this button is disabled.
  The `data` argument is an array of *buttons*, objects where:
	* id: the panel button's identifier, a *next item* should match it to link it
	* image: the icon for the button
	* label: the label for the button, if the client support image, it is not used, except as a tooltip

* user (userObject): this contains the user related to the client. Argument `userObject` is an object containing
  at least those properties:
	* id `string` it's the client ID for THIS SESSION
	* name `string` if set, this is the role that is currently taken by this user

* userList (users): this contains the  list of connected users. Argument `users` is an array of object
  containing those users, where:
	* id `string` it's the client ID for THIS SESSION
	* name `string` if set, this is the role that is currently taken by this user

* roleList (roles, unassignedClients , assigned): this give the list of roles that should be chosen by each client.
  Argument `assigned` is a boolean. If false, some clients still need to choose a role, sending a `selectRole` event.
  If true, all clients have chosen their role, the game is about to start, and further `selectRole` events are ignored.
  Argument `unassignedUsers` is an array of client ID names that hasn't chosen a role yet.
  Argument `roles` is an array of object containing those roles, where:
	* id `string` contains the unique ID of this role
	* name `string` contains the text describing the role
	* clientId `null` or `string` if not null, it's the client ID of the user holding this role

* enterScene (isGosub, toAltBuffer): the book enter a new scene
  `isGosub` is true if we are gosub'ing from the previous scene (without leaving it)
  `toAltBuffer` is true if the new scene should be rendered inside the *alternate buffer*
* leaveScene (isReturn, backToMainBuffer): the book is leaving the current scene
  `isReturn` is true if we are returning from a gosub
  `backToMainBuffer` is true if the sub-scene return to the *main buffer*
* nextList (nexts, undecidedRoleIds, options, isUpdate): users should make a choice between multiple
  alternatives, `nexts` is an array of objects containing those alternatives (aka *next items*), where:
	* id `number` the *next item* ID that should be returned by client upon selection
	* label `string` contains the text describing the choice
	* groupBreak `boolean` true if the item start a new group
	* style `object` (optional) this is a CSS object to style the next element
	* class `object` or `string` or `array` (optional) CSS class to enable/disable on the next element
	* image `url` if set, the choice as an image that would usually be displayed as an icon
	* button `string` if set to a panel button's ID, it binds this *next item* the that button
	* roleIds `array` of role's IDs, if not null, it's the client ID of the user holding this role
  Once the user has selected a choice, the client should emit a `selectNext` event.
  Argument `isUpdate` is a boolean, it is true if the provided *next list* is an update of the previous one (i.e. it is not a new
  choice to make, but an update of the values of the current choice, e.g. when a choice get a vote, etc).
  `undecidedRoleIds` is a array of role's IDs that hasn't chosen anything yet.
  `grantedRoleIds` is an array of role's ID, roles that can select a response (TODO).
  `options` is an object containing various optional values for the next list, where:
	* timeout `number` the time in ms before the vote finish.
	* nextStyle `object`, where:
		* *format* `string` next-list display style, if supported by the client. One of:
			* *auto*: (default) let the client decide how to style it
			* *list*: one choice per line
			* *smallList*: same than list, with smaller buttons
			* *inline*: all choices are on the same line, if possible
			* *smallInline*: same than inline, with smaller buttons
			* *table*: display button as a table, using [group-break] parameter tag to create a new row
		* *position* `string` next-list display position, e.g.: top, bottom, etc...
* nextTriggered (nextId, roleIds, special): a next action was triggered, `nextId` is the ID of the *next item* in the
  `nextList` event's argument `nexts`, and `roleIds`, if not null, is an array of IDs of roles that activated it (if relevant),
  provided in the last `roleList` event, in the `roles` argument. If the last argument `special` is set, it contains a
  special trigger conditions code:
	* auto: next was triggered automatically (e.g. by an [auto] tag timeout)

* splitRoles: roles/players are split in 2 or more groups
* rejoinRoles: roles/players are joined again after they have been split (see the `splitRoles` event)

* wait (what): currently waiting for something to happen, `what` is the code (`string`), where:
	* otherBranches: roles were split into multiple branches, and the client must wait for other branches to finish,
	  roles are done waiting once the 'join' event is received.

* pause (duration): it instructs the client that the script execution will pause for some time.
  Usually the client has nothing to worry about, but it can be usefull for some unusual use-cases.
  Arguments:
	* duration: the time in seconds
* unpause: it instructs the client that the script execution is resuming after a pause.
  Usually the client has nothing to worry about, but it can be usefull for some unusual use-cases.

* clientConfig (config): configure various things, like assets URL, etc.
  This event is sent only once at the begining of the execution.
  Argument `config` is an object, where:
	* assetBaseUrl `string` (optional) the root URL for all assets
	* theme `object` (optional) the default theme, see the *theme* event data

* controls (config): configure controls (key bindings).
  This event is sent only once at the begining of the execution.
  Argument `config` is an object, where:
	* keys `object` where key is the key name and value is an `array` of `string` which are action/command
	* gauges `object` (TO BE DEFINED)
	* gauges2d `object` (TO BE DEFINED)

* theme (data): instructs the client (if it is capable) to set a theme (CSS) as the scene theme. Argument `data`
  is an object, where:
	* url `string` (optional) if set this is the URL of the theme (CSS), else the client *MAY* use a default theme if any

* image (data): instructs the client (if it is capable) to set an image as the scene image. Argument `data` is an object, where:
	* url `string` (optional) if set this is the URL of the image, else the client *MAY* display a default image if any
	* position `string` (optional) is one of 'left' or 'right', indicating if the image should be on the left or on the right
	* origin `string` (optional) indicating how the image should be centered. One of 'center', 'top', 'bottom', 'left', right', ...

* music (data): instructs the client (if it is capable) to play a music as the scene music. Argument `data` is an object, where:
	* url `string` (optional) if set this is the URL of the music to play, else the client should stop playing music
  There is only one music that must be played at any time, so a music replace another.

* sound (data): instructs the client (if it is capable) to play a sound right now. Argument `data` is an object, where:
	* url `string` this is the URL of the sound to play
  Multiple sounds may be played at any time. If the client supports sounds, it is recommended to support at least 2 channels.

* texturePack (gSceneId, textureUid, data): defines a texture pack (if the client is capable) to be used later (e.g. on a sprite), where:
	* textureUid `string` the texture pack unique ID to use (a combination of the ID and the theme)
	* data `object` the texture pack data, where:
	!SHOULD BE DOCUMENTED!

* defineAnimation (id, data): defines an animation (if the client is capable) to be used later (e.g. on a sprite), where:
	* id `string` the animation ID to use
	* data `object` data related to the animation, where:
		* frames `array` of `object` the list of animation frame, where:
			* duration `number` the duration time of the frame in seconds
			* style `object` (optional) this is a CSS object to style the element

* createGEntity (id, data): instructs the client (if it is capable) to show a GEntity (graphic entity, like sprite, vector graphics)
  or replace an existing one, where:
	* id `string` the GEntity ID
	* data `object` data related to the GEntity, where: (TODOC)

* updateGEntity (id, updatedData): instructs the client (if it is capable) to update a currently displayed GEntity,
  i.e. all current sprite *data* properties will be deeply extended, where:
	* id `string` the sprite ID
	* updatedData `object` the data extension related to the sprite, where: (TODOC)

* animateGEntity (spriteId, animationId): instructs the client (if it is capable) to animate a currently displayed GEntity, 
  using a previously recorded animation, where:
	* spriteId `string` the sprite ID to animate
	* animationId `string` the animation ID to use

* clearGEntity (id): instructs the client (if it is capable) to clear a currently displayed GEntity, the GEntity will be
  totally deleted, where:
	* id `string` the sprite ID to delete

* diceRoller (grantedRoleIds, data): instructs the client (if it is capable) to make the user roll the dice.
	* grantedRoleIds `array` of role's ID, roles that can throw the dice
	* data `object` where:
		* label `string` label/title to present the dice roll to the user
		* dice `number` of dice
		* faces `number` of faces
		* type `string` type of dice
		* values `array` of `number` or `string` (optional), the value of each face is stored here
		* timeout `number` (optional) the timeout, the user should roll the dice before this timeout, or auto-rolling will happen
		* skinUrl `string` (optional) the URL for the skin of the dice
  The client should emit a `diceRollerSubmit` event in response.

* custom (event, data): this is a custom event. This event is typically sent by the engine when the `[client-emit]`
  tag is encountered in a spellcast script.
  Since this is a custom event, there is no global meaning for it.
	* event `string` the custom event name
	* data `anything` the custom event data, can be anything



### output

* ready: [state] emitted once the client is init
* textSubmit (text): the text the user submit in response of a `textInput` event

* command (text): a text command sent by a player/role, can be sent at any time.

* chat (text): the text sent by a client as a chat message when player are still in the role assignement phase.

* selectRole (id): in response of a `roleList` event, it contains the ID of the role the current client want
  to be assigned to, if `id` is `null`, the client has just unselected the role it was assigned to

* selectNext (id): in response of a `nextList` event, it contains the ID of the *next item* selected by the user,
  if `id` is `null`, the client has just unselected the *next item* it had chosen so far

* authenticate (data): authenticate a user. (WIP API).

* diceRollerSubmit (data): the data of the user's dice roll in response of a `diceRoller` event
	* data `object`, where:
		* dice `array` of face index

