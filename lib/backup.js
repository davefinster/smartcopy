var Transfer = require('./transfer');
var Snapshot = require('./snapshot');
var SnapshotMatch = require('./snapshot_match');
var Smartos = require('smartos-tools');
var exec = require('child_process').exec;
var config = require('./config');

exports.snapshotVm = function(vm, snapshotName, callback){
  var id = vm.uuid;
  var wrapper = new Smartos.Endpoint.Local();
  var zfs = new Smartos.Wrapper.Zfs(wrapper);
  zfs.list(null, null, null, function(err, list){
    var relevant = list.filter(function(element){
      if ( element.name.indexOf(id) != -1 ){
        if ( element.name.indexOf('cores') == -1 ){
          return true;
        }
      }
      return false;
    });
    var snapshots = [];
    for ( var i = 0; i < relevant.length; i++ ){
      var item = relevant[i];
      if (( vm.internal_metadata != null ) &&
      (vm.internal_metadata['smartcopy_exclude'])){
        var parts = vm.internal_metadata['smartcopy_exclude'].split(',');
        if ( parts.indexOf(item.name) != -1 ){
          console.log('skipping ', item);
          continue;
        }
      }
      var reference = relevant[i].name + '@' + snapshotName;
      var snap = new Snapshot(reference);
      snapshots.push(snap);
    }
    exports.createSnapshots(snapshots, function(err){
      callback(err, snapshots);
    });
  });
}

exports.createSnapshots = function(snapshots, callback){
  var cmds = [];
  var cb = callback;
  for ( var i = 0; i < snapshots.length; i++ ){
    cmds.push('zfs snapshot ' + snapshots[i].snapshotReference());
  }
  var combined = cmds.join('; ');
  exec(combined, function(err, stdout, stderr){
    cb(err);
  });
}
