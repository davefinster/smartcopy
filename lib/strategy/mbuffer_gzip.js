var util = require("util");
var Mbuffer = require('./mbuffer');
var config = require('../config');

function MbufferGzip(options){
  this.remoteEnd = null;
  this.localEnd = null;
  this.transfer = null;
  this.aborting = false;
  this.err = null;
  this.localCloseCode = null;
  this.remoteCloseCode = null;
  this.callbackDone = false;
  this.log = null;
  this.compressionCmd = config.compressionCmd;
  this.decompressionCmd = config.decompressionCmd;
  if (( this.compressionCmd == null ) || ( this.decompressionCmd == null )){
    this.compressionCmd = 'gzip';
    this.decompressionCmd = 'gunzip';
  }
}

util.inherits(MbufferGzip, Mbuffer);

MbufferGzip.prototype.mBufferReceiveCmd = function(portNumber){
  var baseCmd = MbufferGzip.super_.prototype.mBufferReceiveCmd.call(this,
     portNumber);
  return baseCmd += "| " + this.decompressionCmd;
}

MbufferGzip.prototype.mBufferSendCmd = function(portNumber){
  var baseCmd = MbufferGzip.super_.prototype.mBufferSendCmd.call(this,
     portNumber);
  return this.compressionCmd + " |" + baseCmd;
}

module.exports = MbufferGzip;
