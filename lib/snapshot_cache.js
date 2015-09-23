var exec = require('child_process').exec;
var Snapshot = require('./snapshot');
var snapshotCommand = 'zfs list -Hrpo name,creation -t snapshot -s creation';
var cache = {};
var pending = {};

function splitByLineAndTab(text){
  return text.split('\n').map(function(line){
    var splitLine = line.split('\t');
    if ( splitLine.length <= 1 ){
      return null;
    }else{
      return splitLine;
    }
  });
}

function parseSnapshots(stdout){
  var snapshots = splitByLineAndTab(stdout).map(function(line){
    if ( line == null ){
      return null;
    }
    var snap = new Snapshot(line[0]);
    snap.creationTimestamp = new Date(0);
    snap.creationTimestamp.setUTCSeconds(parseInt(line[1]));
    return snap;
  }).filter(function(element){
    return element != null;
  });
  return snapshots;
}

function execAndParseSnapshots(cmd, callback){
  var cb = callback;
  var execution = exec(cmd, function(error, stdout, stderr){
    if ( error ){
      cb(error, null);
      return;
    }
    cb(null, parseSnapshots(stdout).reverse());
  });
}

exports.localSnapshots = function(callback){
  var cb = callback;
  execAndParseSnapshots(snapshotCommand, callback);
}

exports.remoteSnapshots = function(remoteEndpoint, callback){
  var cb = callback;
  var remoteCmd = [
    remoteEndpoint.sshCmd().join(' '),
    snapshotCommand
  ].join(' ');
  execAndParseSnapshots(remoteCmd, callback);
}

exports.fetchSnapshotsAtEndpoint = function(endpoint, callback){
  if ( endpoint == null ){
    exports.localSnapshots(callback);
  }else{
    exports.remoteSnapshots(endpoint, callback);
  }
}

exports.snapshotsAtEndpoint = function(endpoint, reloadCache, cb){
  var cacheKey = null;
  var rEnd = endpoint;
  if ( endpoint == null ){
    //they want local
    cacheKey = 'local';
  }else{
    //remote
    cacheKey = endpoint.hostname.slice(0, endpoint.hostname.length);
  }
  if ( reloadCache ){
    cache[cacheKey] = null;
  }else if (cache[cacheKey] != null ){
    cb(null, cache[cacheKey]);
    return;
  }
  if ( pending[cacheKey] != null ){
    //we're already waiting
    pending[cacheKey].push(cb);
    return;
  }else{
    pending[cacheKey] = [cb];
  }
  //at this point we have to load
  exports.fetchSnapshotsAtEndpoint(endpoint, function(err, snaps){
    if ( err == null ){
      cache[cacheKey] = snaps;
    }else{
      cache[cacheKey] = null;
    }
    if ( snaps != null ){
      for ( var i = 0; i < snaps.length; i++ ){
        snaps[i].endpoint = rEnd;
      }
    }
    for ( var i = 0; i < pending[cacheKey].length; i++ ){
      var callback = pending[cacheKey][i];
      callback(err, cache[cacheKey]);
    }
    pending[cacheKey] = null;
  });
}
