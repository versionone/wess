# wess

Invokes the [Less](http://www.lesscss.org) compiler in watch mode, triggering a
recompilation whenever the source file or one of its (possibly indirect) import
dependencies changes.

#### wess(path, [options])

Receives the `path` to the source file and `options` to be passed into
`less.render()`.

Returns an EventEmitter that emits the following events:

* `change(path)` - when one of the watched files changes
* `error(err)` - on compilation or watch error
* `compile(output)` - on successful compilation; `output` is as for `less.render()`.

Call `stop()` on the returned object to stop watching.
