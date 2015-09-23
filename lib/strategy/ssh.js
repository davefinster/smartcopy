var uuid = require('uuid');
var exec = require('child_process').exec;
var config = require('../config');

function Ssh(options){
  this.childProcess = null;
  this.transfer = null;
  this.log = null;
}

Ssh.prototype.singleCommand = function(){
  var parts = [];
  if ( this.transfer.localToRemote() ){
    //zfs send | ssh remote zfs recv
    parts.push(
      this.transfer.zfsSendCmd(),
      '|'
    );
    var sshCmd = [
      this.transfer.remoteEndpoint().sshCmd().join(' '),
      this.transfer.zfsReceiveCmd()
    ].join(' ');
    parts.push(sshCmd);
  }else{

  }
  return parts.join(' ');
}

Ssh.prototype.execute = function(callback){
  var cmd = this.singleCommand();
  this.log.trace('Executing ' + cmd);
  return exec(cmd, function(error, stdout, stderr){
    callback(error);
  });
}

module.exports = Ssh;
