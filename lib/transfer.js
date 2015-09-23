function Transfer(options){
  this.sourceSnapshot = null;
  this.destinationSnapshot = null;
  this.commonSnapshot = null;
}

Transfer.prototype.zfsSendCmd = function(){
  var cmd = "zfs send ";
  if ( this.commonSnapshot != null ){
    console.log(this.commonSnapshot);
    cmd += "-i " + this.commonSnapshot.snapshotReference() + " ";
  }
  cmd += "-R ";
  cmd += this.sourceSnapshot.snapshotReference();
  return cmd;
}

Transfer.prototype.zfsReceiveCmd = function(){
  return "zfs receive -Fduv " + this.destinationSnapshot.path;
}

Transfer.prototype.remoteEndpoint = function(){
  if ( this.localToRemote() ){
    return this.destinationSnapshot.endpoint;
  }else{
    return this.sourceSnapshot.endpoint;
  }
}

Transfer.prototype.localToRemote = function(){
  if (( this.sourceSnapshot.endpoint == null ) &&
      ( this.destinationSnapshot.endpoint != null )){
        return true;
  }
  return false;
}

Transfer.prototype.remoteToLocal = function(){
  return !this.localToRemote();
}

module.exports = Transfer;
