var uuid = require('uuid');
var exec = require('child_process').exec;
var config = require('./config');
var async = require('async');

function VmSpecBackup(options){
  this.vmUuid = options.vmUuid;
  this.remoteEndpoint = options.remoteEndpoint;
  this.remoteSpecPath = options.remoteSpecPath;
  this.log = options.log;
};

VmSpecBackup.prototype.specCommand = function(){
  var sshCmd = [
    this.remoteEndpoint.sshCmd().join(' '),
    '"cat > /' + this.remoteSpecPath + '/' + this.vmUuid + '.vmspec.json"'
  ].join(' ');
  var cmd = [
    'vmadm get ' + this.vmUuid,
    '|',
    sshCmd
  ].join(' ');
  return cmd;
}

VmSpecBackup.prototype.zoneCfgCommand = function(){
  var sshCmd = [
    this.remoteEndpoint.sshCmd().join(' '),
    '"cat > /' + this.remoteSpecPath + '/' + this.vmUuid + '.zonecfg.xml"'
  ].join(' ');
  var cmd = [
    'cat /etc/zones/' + this.vmUuid + '.xml',
    '|',
    sshCmd
  ].join(' ');
  return cmd;
}

VmSpecBackup.prototype.execute = function(callback){
  var self = this;
  this.log.info("Executing VM spec and zonecfg XML backup");
  return async.parallel([
    function(cb){
      var cmd = self.specCommand();
      self.log.trace('Executing ' + cmd);
      return exec(cmd, function(error, stdout, stderr){
        self.log.info("Executed VM spec backup");
        cb(error);
      });
    },
    function(cb){
      var cmd = self.zoneCfgCommand();
      self.log.trace('Executing ' + cmd);
      return exec(cmd, function(error, stdout, stderr){
        self.log.info("Executed zonecfg XML backup");
        cb(error);
      });
    }
  ], function(err, results){
    self.log.info("Executed VM spec and zonecfg XML backup");
    callback(err);
  });
}

module.exports = VmSpecBackup;
