var util = require("util");
var Ssh = require('./ssh');
var config = require('../config');

function SshGzip(options){
  this.childProcess = null;
  this.transfer = null;
  this.log = null;
  this.compressionCmd = config.compressionCmd;
  this.decompressionCmd = config.decompressionCmd;
  if (( this.compressionCmd == null ) || ( this.decompressionCmd == null )){
    this.compressionCmd = 'gzip';
    this.decompressionCmd = 'gunzip';
  }
}

util.inherits(SshGzip, Ssh);

Ssh.prototype.singleCommand = function(){
  var parts = [];
  if ( this.transfer.localToRemote() ){
    //zfs send | ssh remote zfs recv
    parts.push(
      this.transfer.zfsSendCmd(),
      '|',
      this.compressionCmd,
      '|'
    );
    var sshCmd = [
      this.transfer.remoteEndpoint().sshCmd().join(' '),
      '"',
      this.decompressionCmd,
      '|',
      this.transfer.zfsReceiveCmd(),
      '"'
    ].join(' ');
    parts.push(sshCmd);
  }else{

  }
  return parts.join(' ');
}

module.exports = SshGzip;
