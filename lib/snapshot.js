var config = require('./config');

function Snapshot(obj){
  this.datasetName = null;
  this.snapshotName = null;
  this.endpoint = null;
  this.creationTimestamp = null;
  this.path = null;
  if ( obj != null ){
    if (typeof obj == 'string'){
      if ( obj != null ){
        //detect if snapshot is local or remote by path appearing in name
        if ( obj.indexOf(config.backupSourceBasePath) == 0 ){
          this.path = config.backupSourceBasePath;
        }else if ( obj.indexOf(config.backupDestinationBasePath) == 0 ){
          this.path = config.backupDestinationBasePath;
        }
        var fullName = obj.replace(this.path, '').split('/').splice(1)
        .join('/');
        var nameParts = fullName.split('@');
        if ( nameParts.length == 2 ){
          this.datasetName = nameParts[0];
          this.snapshotName = nameParts[1];
        }
      }
    }else{
      this.datasetName = obj.datasetName;
      this.snapshotName = obj.snapshotName;
      this.endpoint = obj.endpoint;
      this.creationTimestamp = obj.creationTimestamp;
      this.path = obj.path;
    }
  }
}

Snapshot.prototype.datasetFullName = function(){
  return this.path + '/' + this.datasetName;
}

Snapshot.prototype.fullName = function(){
  return this.datasetName + "@" + this.snapshotName;
}

Snapshot.prototype.snapshotReference = function(){
  return this.path + '/' + this.datasetName + "@" + this.snapshotName;
}

Snapshot.prototype.isLocal = function(){
  if ( this.endpoint == null ){
    return true;
  }
  return false;
}

module.exports = Snapshot;
