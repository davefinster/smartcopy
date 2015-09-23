var uuid = require('uuid');
var windowSize = 128;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var config = require('../config');

function Mbuffer(options){
  this.remoteEnd = null;
  this.localEnd = null;
  this.transfer = null;
  this.aborting = false;
  this.err = null;
  this.localCloseCode = null;
  this.remoteCloseCode = null;
  this.callbackDone = false;
  this.log = null;
}

Mbuffer.prototype.executablePath = function(localOrRemote){
  if ( localOrRemote == 'local' ){
    if ( config.mBufferLocalPath != null ){
      return config.mBufferLocalPath;
    }
  }else{
    if ( config.mBufferRemotePath != null ){
      return config.mBufferRemotePath;
    }
  }
  return 'mbuffer';
}

Mbuffer.prototype.bufferSize = function(localOrRemote){
  if ( localOrRemote == 'local' ){
    if ( config.mBufferLocalBufferSize != null ){
      return config.mBufferLocalBufferSize;
    }
  }else{
    if ( config.mBufferRemoteBufferSize != null ){
      return config.mBufferRemoteBufferSize;
    }
  }
  return '1G';
}

Mbuffer.prototype.mBufferReceiveCmd = function(portNumber){
  var localOrRemote = null;
  if ( this.transfer.localToRemote() ){
    localOrRemote = 'remote';
  }else{
    localOrRemote = 'local';
  }
  return this.executablePath(localOrRemote) + " -v 4 -W 60 -s 128k -m " + this.bufferSize(localOrRemote) + " -I " + portNumber.toString();
}

Mbuffer.prototype.mBufferSendCmd = function(portNumber){
  var localOrRemote = null;
  if ( this.transfer.localToRemote() ){
    localOrRemote = 'local';
  }else{
    localOrRemote = 'remote';
  }
  return this.executablePath(localOrRemote) + " -s 128k -m " + this.bufferSize(localOrRemote) + " -W 60 -O " + this.transfer.remoteEndpoint().hostname + ":" + portNumber.toString();
}

Mbuffer.prototype.initiateRemote = function(transfer, portNumber){
  var cmd = null;
  if ( transfer.localToRemote() ){
    cmd = [
      this.mBufferReceiveCmd(portNumber),
      "|",
      transfer.zfsReceiveCmd()
    ].join(' ');
  }
  var sshCmd = transfer.remoteEndpoint().sshCmd();
  sshCmd.splice(0, 1);
  sshCmd.push(cmd);
  this.log.trace('Initiating remote end with ssh ' + sshCmd.join(' '));
  var setupRemote = spawn('ssh', sshCmd);
  return setupRemote;
}

Mbuffer.prototype.initiateLocal = function(transfer, portNumber){
  var cmd = null;
  var destinationHost = transfer.remoteEndpoint().hostname;
  if ( transfer.localToRemote() ){
    //will be getting called second and the remote side is already setup
    //just need to run zfs send piped into mbuffer linked to the remote side
    cmd = [
      transfer.zfsSendCmd(),
      "|",
      this.mBufferSendCmd(portNumber)
    ].join(' ');
  }
  this.log.trace('Initiating local end with ' + cmd);
  var setupLocal = spawn('/bin/sh', ['-c', cmd]);
  return setupLocal;
}

Mbuffer.prototype.findMatchingPids = function(processList, portNumber){
  var lines = processList.split('\n');
  var local = this.transfer.remoteEndpoint().hostname + ':' + portNumber.toString();
  var remote = '-I ' + portNumber.toString();
  var pids = [];
  for ( var i = 0; i < lines.length; i++ ){
    var line = lines[i];
    if (( line.indexOf(local) != -1 ) || ( line.indexOf(remote) != -1)){
      var parts = line.split(' ');
      var cleanParts = [];
      for ( var j = 0; j < parts.length; j++ ){
        if ( parts[j].length != 0 ){
          cleanParts.push(parts[j]);
        }
      }
      pids.push(cleanParts[1]);
    }
  }
  return pids;
}

Mbuffer.prototype.cleanupMbuffer = function(portNumber, remote, callback){
  var cb = callback;
  var self = this;
  var pn = portNumber;
  var grep = 'ps auwwwx | grep mbuffer';
  var ssh = self.transfer.remoteEndpoint().sshCmd().join(' ');
  var cmd = null;
  if ( remote === true ){
    cmd = ssh + ' ' + grep;
  }else{
    cmd = grep;
  }
  var getPid = exec(cmd, function(error, stdout, stderr){
    var pids = self.findMatchingPids(stdout, pn);
    if ( pids.length == 0 ){
      cb(null);
      return;
    }
    var killCmd = null;
    if ( remote === true ){
      killCmd = ssh + ' kill ' + pids.join(' ');
    }else{
      killCmd = 'kill ' + pids.join(' ');
    }
    var killPid = exec(killCmd, function(error, stdout, stderr){
      cb(null);
    });
  });
}

Mbuffer.prototype.callbackIfDone = function(callback){;
  if ( this.callbackDone ){
    return;
  }
  if (( this.localEnd == null ) && ( this.remoteEnd == null )){
    //both ends are closed
    if (( this.localCloseCode == 0 ) && ( this.remoteCloseCode == 0 )){
      //everything went well
      this.callbackDone = true;
      callback(null);
    }else{
      this.callbackDone = true;
      if ( this.err ){
        //we hit an error somewhere, pass it back
        callback(this.err);
      }else{
        //we're in some odd state
        callback(new Error('Unknown error condition - refer to logs. Local close code:', this.localCloseCode, ' Remote close code:', this.remoteCloseCode));
      }
    }
  }else{

  }
  return false;
}

Mbuffer.prototype.extractStatus = function(statusText){
  if ( statusText == null ){
    return null;
  }
  if (( statusText.indexOf('in @') != -1 ) && ( statusText.indexOf('out @') != -1)){
    var parts = statusText.split(',').map(function(element){
      return element.trim();
    });
    var status = {};
    for ( var i = 0; i < parts.length; i++ ){
      var part = parts[i];
      var partSections = part.split(' ').filter(function(element){
        return element.length > 0;
      });
      if ( partSections[0] == 'in' ){
        status.in = [partSections[2], partSections[3]].join(' ');
      }else if ( partSections[0] == 'out' ){
        status.out = [partSections[2], partSections[3]].join(' ');
      }else if ( partSections[0] == 'buffer' ){
        status.buffer = [partSections[1]].join(' ');
      }else{
        status.total = [partSections[0], partSections[1]].join(' ');
      }
    }
    return status;
  }
  return null;
}

/*
execute will first use SSH to start the mbuffer/zfs on the remote side
it uses the verbose setting of 4 to get an indication of when mbuffer is
ready and if it encounters an issue listening

if the remote side is okay, it starts the local side

because we're using mbuffer in direct/network mode, it will tend to continue
executing rather than dying and watchdog timers don't work

so if either side exits for some reason, the other side is examined for rouge
mbuffer processes that are terminated via 'kill'. sending a signal to the
ssh or /bin/sh process is not enough to kill it. explicitly terminating
the mbuffer process allows the ssh or /bin/sh process to exit with an error
code
*/

Mbuffer.prototype.execute = function(callback){
  this.log.info('Executing transfer');
  var self = this;
  var cb = callback;
  //generate a port number for mbuffer
  var portNumber = Math.floor(Math.random() * (60000 - 1025) + 1025);
  self.remoteEnd = self.initiateRemote(self.transfer, portNumber);
  self.remoteEnd.stderr.on('data', function (data) {
    var str = data.toString();
    var statusObj = self.extractStatus(str);
    if ( statusObj != null ){
      this.remoteStatus = statusObj;
      self.log.info('Remote total currently ' + this.remoteStatus.total);
    }
    if ( data.toString().indexOf('Address already in use') != -1){
      self.aborting = true;
      self.err = new Error('Random port selection failed - picked one that was in use');
      self.remoteEnd.kill('SIGINT');
      return;
    }
    if ( data.toString().indexOf('listening on') != -1 ){
      //start local
      self.localEnd = self.initiateLocal(self.transfer, portNumber);
      self.localEnd.stderr.on('data', function (data) {
        var str = data.toString();
        var statusObj = self.extractStatus(str);
        if ( statusObj != null ){
          this.localStatus = statusObj;
          self.log.info('Local total currently ' + this.localStatus.total);
        }
      });
      self.localEnd.on('close', function (code) {
        self.localCloseCode = code;
        self.log.trace('Local child process exited with code ' + code);
        self.localEnd = null;
        if (( code != null ) && ( code > 0 )){
          //the local side has errored - clean up remote if its still around
          self.aborting = true;
          //mbuffer on the remote side will hang around if we just kill SSH
          self.cleanupMbuffer(portNumber, true, function(err){
            //remote side will die on its own
          });
        }
        self.callbackIfDone(cb);
      });
      self.localEnd.on('error', function(err){

      });
    }
    if ( data.toString().indexOf('cannot receive') != -1){
      //abort
      self.err = new Error(data.toString());
      self.aborting = true;
      self.remoteEnd.kill('SIGINT');
      if ( self.localEnd != null ){
        //instead of killing the child process that was created
        //we need to go after the mBuffer process directly. killing the child
        //process causes mBuffer to hang around and madly consume CPU. Even
        //the watchdog timer can't kill it
        self.cleanupMbuffer(portNumber, false, function(err){
          //should all come crashing down at this point
        });
      }
      return;
    }
  });
  self.remoteEnd.on('close', function (code) {
    self.remoteCloseCode = code;
    self.remoteEnd = null;
    self.log.trace('Remote child process exited with code ' + code);
    self.callbackIfDone(cb);
  });
}

module.exports = Mbuffer;
