/*
  performs snaphot matching between local and remote
*/

var exec = require('child_process').exec;
var async = require('async');
var config = require('./config');
var originCmd = 'zfs get -H origin ';
var snapshotCache = require('./snapshot_cache');
var Snapshot = require('./snapshot');

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

exports.snapshotOrigin = function(snapshot, callback){
  var cb = callback;
  var cmd = originCmd + snapshot.path + '/' + snapshot.datasetName;
  config.logger.trace("Executing " + cmd + " to determine local origin for "
  + snapshot.fullName());
  var execution = exec(cmd, function(error, stdout, stderr){
    if ( error ){
      cb(error, null);
      return;
    }
    var lines = splitByLineAndTab(stdout).filter(function(element){
      return element != null;
    });
    if (( lines.length != 1 ) || ( lines[0].length != 4 )){
      //no idea what state we're in - should only have one line with 4
      //elements
      config.logger.fatal('Unknown output from zfs get ' + stdout);
      cb(new Error('Unknown output from zfs get ' + stdout), null);
      return;
    }
    if ( lines[0][2] == '-' ){
      //not a clone
      config.logger.trace(snapshot.fullName() + " is not a clone");
      cb(null, null);
    }else{
      var origin = new Snapshot(lines[0][2]);
      config.logger.trace(snapshot + " is a clone of " + origin.fullName());
      cb(null, origin);
    }
  });
}

exports.originExistsRemotely = function(localOrigin, remoteEndpoint, callback){
  var cb = callback;
  var path = null;
  config.logger.trace("Verifying if " + localOrigin.fullName() +
  " exists remotely");
  if ( config.backupDestinationBasePath != null ){
    path = config.backupDestinationBasePath;
    path += "/" + localOrigin.datasetName;
  }else{
    path = localOrigin.path + "/" + localOrigin.datasetName;
  }
  var remoteCmd = [
    remoteEndpoint.sshCmd().join(' '),
    originCmd + path
  ].join(' ');
  config.logger.trace("Executing " + remoteCmd);
  var execution = exec(remoteCmd, function(error, stdout, stderr){
    if (( stdout.indexOf('dataset does not exist') != -1 ) ||
      (stderr.indexOf('dataset does not exist') != -1)){
      config.logger.trace("Origin does not exist remotely");
      cb(null, false);
    }else{
      if ( error != null ){
        config.logger.fatal(error, "Error while checking origin remotely");
        cb(error, null);
        return;
      }
      config.logger.trace("Origin exists remotely");
      cb(null, true);
    }
  });
}

exports.bestCommonSnapshot = function(snapshot, remoteEndpoint, callback){
  var cb = callback;
  var snap = snapshot;
  var dName = snapshot.datasetName;
  var rEnd = remoteEndpoint;
  var datasetName = snapshot.datasetName;
  async.parallel([
    function(callback){
      snapshotCache.snapshotsAtEndpoint(null, false, callback);
    },
    function(callback){
      snapshotCache.snapshotsAtEndpoint(rEnd, false, callback);
    }
  ], function(err, results){
    if ( err ){
      cb(err, null);
      return;
    }
    var allRemote = results[1];
    var validLocal = results[0].filter(function(element){
      return element.datasetName == dName;
    });
    var validRemote = results[1].filter(function(element){
      element.endpoint = rEnd;
      return element.datasetName == dName
    });
    //we want to find the latest snapshot that we have locally that the remote
    //side also has
    var commonSnapshot = null;
    for ( var i = 0; i < validLocal.length; i++ ){
      var localSnap = validLocal[i];
      for (var j = 0; j < validRemote.length; j++ ){
        var remoteSnap = validRemote[j];
        if ( localSnap.snapshotName == remoteSnap.snapshotName ){
          commonSnapshot = localSnap;
          break;
        }
      }
      if ( commonSnapshot != null ){
        break;
      }
    }
    cb(null, commonSnapshot);
  });
}

exports.bestCommonSnapshotForTransfer = function(transfer, callback){
  exports.bestCommonSnapshot(transfer.sourceSnapshot,
    transfer.remoteEndpoint(), callback);
}
