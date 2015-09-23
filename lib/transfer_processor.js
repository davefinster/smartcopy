var async = require('async');
var SnapMatch = require('./snapshot_match');
var Snapshot = require('./snapshot');
var Transfer = require('./transfer');

function TransferProcessor(options){
  this.strategy = options.strategy;
  this.strategyClass = null;
  try{
    this.strategyClass = require('./strategy/' + this.strategy);
  }catch(e){
    throw new Error('Transfer strategy ' + this.strategy + ' doesnt exist')
  }
  this.snapshot = options.snapshot;
  this.remoteEndpoint = options.remoteEndpoint;
  this.remoteSnapshotPath = options.remoteSnapshotPath;
  if (( this.snapshot != null ) && ( this.remoteEndpoint != null )){
    var remoteSnapshot = new Snapshot();
    remoteSnapshot.path = this.remoteSnapshotPath;
    remoteSnapshot.datasetName = this.snapshot.datasetName;
    remoteSnapshot.snapshotName = this.snapshot.snapshotName;
    remoteSnapshot.endpoint = this.remoteEndpoint;
    var transfer = new Transfer();
    transfer.sourceSnapshot = this.snapshot;
    transfer.destinationSnapshot = remoteSnapshot;
    this.transfer = transfer;
  }
  this.log = options.log;
  this.cloneTransferProcessor = null;
  this.strategyMover = null;
}

TransferProcessor.prototype.validateCloneRequirements = function(callback){
  var self = this;
  return async.waterfall([
    function(cb){
      return SnapMatch.snapshotOrigin(self.transfer.sourceSnapshot, cb);
    },
    function(origin, cb){
      if ( origin == null ){
        return cb(null, null, null);
      }
      return SnapMatch.originExistsRemotely(origin,
        self.transfer.remoteEndpoint(), function(err, exists){
        return cb(err, origin, exists);
      });
    }
  ], function(err, origin, existsRemotely){
    return callback(err, origin, existsRemotely);
  });
}

/*
  general strategy:
    - determine the best common snapshot between source and destination
    - if no common snapshot exists, check if the source is a clone
    - if its a clone, ensure the remote side has the base
    - if not, transfer the base and then the cloned dataset
*/
TransferProcessor.prototype.execute = function(callback){
  var self = this;
  self.log.trace('Starting transfer execution');
  return async.waterfall([
    function(cb){
      self.log.debug('Determining common snapshots');
      SnapMatch.bestCommonSnapshotForTransfer(self.transfer, function(err, res){
        cb(err, res);
      });
    },
    function(commonSnapshot, cb){
      //if a snapshot has been returned, its ready to be used
      if ( commonSnapshot != null ){
        self.log.debug('Determined common snapshot as ' +
        JSON.stringify(commonSnapshot));
        return cb(null, commonSnapshot);
      }
      //if there is no common snapshot, check origin and
      //setup another processor
      self.log.debug('No common snapshot - determining clone requirements');
      return self.validateCloneRequirements(function(err, origin, exists){
        if ( err != null ){
          self.log.fatal('Error determining clone requirements');
          return cb(err, null);
        }
        if ( origin == null ){
          self.log.debug('No origin found for snapshot - continuing');
          return cb(null, null);
        }
        if ( exists === true ){
          //the clone base already exists remotely - clear to proceed
          self.log.debug('Clone base exists remotely - continuing');
          return cb(null, origin);
        }
        //the clone base doesn't exist remotely
        self.log.debug('Clone base not found remotely - staging transfer');
        self.cloneTransferProcessor = new TransferProcessor({
          log:self.log.child({cloneTransfer: origin.fullName()}),
          strategy: self.strategy,
          snapshot: origin,
          remoteEndpoint: self.transfer.remoteEndpoint(),
          remoteSnapshotPath: self.remoteSnapshotPath
        });
        return self.cloneTransferProcessor.execute(function(err){
          self.log.debug("Clone base transfer complete");
          return cb(err, commonSnapshot);
        });
      });
    },
    function(commonSnapshot, cb){
      //if commonSnapshot is populated, then it can be used since it either
      //exists or has been moved for us
      self.log.info('Staging snapshot transfer');
      self.transfer.commonSnapshot = commonSnapshot;
      self.strategyMover = new self.strategyClass();
      self.strategyMover.log = self.log;
      self.strategyMover.transfer = self.transfer;
      self.strategyMover.execute(function(err){
        cb(err);
      });
    }
  ], function(err){
    if ( err != null ){
      self.log.fatal(err, 'Transfer Failure');
    }
    return callback(err);
  });
}

module.exports = TransferProcessor;
