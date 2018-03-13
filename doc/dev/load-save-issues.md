
### Known issues with the loading/saving feature:

* many internal events:
	* client/role events are not restored on the Ctx
* all kung-fig's dynamic types are not restored properly
* non-top-level scenes resume to their top-level scene
* script events
* event at init time (top-level)
* schedulers
* maybe: functions assigned to a ref
* role's selectedNext
* clients should be able to restore current scene messages
* clients should be able to restore sprites
* multiple roles
* [split] tags
* clients should be able to restore the full message history



Book property todo:

* functions
* initEvents



Ctx/StoryCtx property todo:

* roles (so role event failed after being loaded)
* events
* localListener
