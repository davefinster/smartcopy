var config = require('./config');
var async = require('async');

function Notifier(options){
  var notificationOrder = [];
  if ( options.notificationOrder != null ){
    if ( typeof options.notificationOrder == 'string' ){
      //expect a comma separated string
      var parts = options.notificationOrder.split(',');
      parts.forEach(function(part){
        notificationOrder.push(part.trim());
      });
    }
  }else{
    notificationOrder = options.notificationOrder;
  }
  this.notificationOrder = notificationOrder;
  this.notificationContent = options.notificationContent;
  this.log = options.log;
}

Notifier.prototype.dispatchOne = function(method, callback){
  var dispatcherClass = null;
  try{
    dispatcherClass = require('./notification/' + method);
  }catch(e){
    throw new Error('Notification method ' + method + ' doesnt exist')
  }
  var dispatcher = new dispatcherClass(this.notificationContent);
  dispatcher.dispatch(callback)
}

Notifier.prototype.dispatchAll = function(callback){
  var self = this;
  async.each(self.notificationOrder, function(dispatcherClass, callback){
    self.dispatchOne(dispatcherClass, callback);
  }, function(err){
    callback(err);
  });
}

module.exports = Notifier;
