var config = require('./config');

function Endpoint(options){
  this.username = null;
  this.hostname = null;
  this.privateKeyPath = null;
}

Endpoint.defaultEndpoint = function(){
  var end = new Endpoint();
  end.username = config.backupDestinationUsername;
  end.hostname = config.backupDestination;
  end.privateKeyPath = config.backupDestinationPrivateKeyPath;
  return end;
}

Endpoint.prototype.sshCmd = function(){
  var cmdParts = ['ssh'];
  if ( this.privateKeyPath != null ){
    cmdParts.push('-i');
    cmdParts.push(this.privateKeyPath);
  }
  if ( config.disableHostKeyChecking === true){
    cmdParts.push(
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'StrictHostKeyChecking=no'
    );
  }
  var destination = '';
  if ( this.username != null ){
    destination += this.username + "@";
  }
  destination += this.hostname;
  cmdParts.push(destination);
  return cmdParts;
}

module.exports = Endpoint;
