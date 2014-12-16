var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var extend = require('extend');
var async = require('async');
var less = require('less');
var chokidar = require('chokidar');

module.exports = function(path, opts) {

  // Pass the original filename to less.render() for import path resolution.
  opts = extend({ filename: path }, opts || {});

  // Create a new EventEmitter to be returned.
  var emitter = new EventEmitter();

  // The list of watched files.
  // When adding a new file, check in here first to avoid watching it twice.
  var watchList = [ path ];

  // Create the file system watcher.
  // Do not emit event when a file is added to the list, only when it changes.
  var watcher = chokidar.watch(watchList, { ignoreInitial: true });

  // Read the source file.
  function read(done) {
    fs.readFile(path, 'utf8', done);
  }

  // Compile the source.
  // Use the less.render() promise interface because the regular one appears
  // to occasionally call the callback multiple times.
  function compile(source, done) {
    less.render(source, opts)
      .then(function(output) { done(null, output); },
            function(err) { done(err); });
  }

  // Iterate all dependencies and add any new ones to the watch list.
  // We ought to also remove any files on the watch list that are no longer
  // imported, but unfortunately chokidar does not provide an API to do so.
  // See: https://github.com/paulmillr/chokidar/issues/78
  // This will cause spurious recompilations to occur if any files cease to be
  // imported while we are running.
  function watch(output, done) {
    for (var i = 0; i < output.imports.length; i++) {
      var file = output.imports[i];
      if (watchList.indexOf(file) < 0) {
        watcher.add(file);
        watchList.push(file);
      }
    }
    done(null, output);
  }

  // Recompile the source and update the watch list.
  // Emit an event to signal the compilation result.
  function update() {
    async.waterfall([ read, compile, watch ], function(err, output) {
      if (err) {
        emitter.emit('error', err);
      } else {
        emitter.emit('compile', output);
      }
    });
  }

  // Stop watching.
  function close() {
    watcher.close();
  }

  // Recompile whenever a dependency changes.
  // Also emit an event signalling which file triggered the recompilation.
  watcher.on('all', function(event, path) {
    emitter.emit('change', path);
    update();
  });

  // Relay watch errors to the caller.
  watcher.on('error', function(err) {
    emitter.emit('error', err);
  });

  // Schedule the initial compilation to run right after we return.
  setTimeout(update, 0);

  return extend(emitter, {
    close: close
  });

};
