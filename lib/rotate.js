var snapshotCache = require('./snapshot_cache');
var exec = require('child_process').exec;

function limitSnapshotsCmd(snapshotSet, snapLimit){
  var cmds = [];
  if ( snapshotSet.length <= snapLimit ){
    return cmds;
  }
  for ( var i = snapLimit; i < snapshotSet.length; i++ ){
    var deleteCmd = 'zfs destroy ' + snapshotSet[i].snapshotReference();
    cmds.push(deleteCmd);
  }
  return cmds;
}

exports.rotateSnapshotSet = function(snapshots, snapLimit, callback){
  var cb = callback;
  var cmds = limitSnapshotsCmd(snapshots, snapLimit);
  if ( cmds.length == 0 ){
    callback(null);
    return;
  }
  var cmd = cmds.join('; ');
  var endpoint = snapshots[0].endpoint;
  if ( endpoint != null ){
    //remote
    cmd = [
      endpoint.sshCmd().join(' '),
      '\'' + cmd + '\''
    ].join(' ');
  }
  console.log('executing ', cmd);
  exec(cmd, function(error, stdout, stderr){
    cb(error);
  });
}

exports.rotateSnapshotsContainingName = function(name, endpoint, snapLimit,
  callback){
  var snapName = name;
  var cb = callback;
  var snapLim = snapLimit;
  var rEnd = endpoint;
  snapshotCache.snapshotsAtEndpoint(rEnd, true,
    function(err, snaps){
      if ( err != null){
        cb(err);
        return;
      }
      var validSnaps = snaps.filter(function(element){
        return element.fullName().indexOf(snapName) != -1;
      });
      if ( validSnaps.length <= snapLim ){
        cb(null);
        return;
      }
      exports.rotateSnapshotSet(validSnaps, snapLim, cb);
    }
  );
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
