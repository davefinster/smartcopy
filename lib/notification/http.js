var config = require('../config');
var common = require('../common');
var http = require('http');
var url = require('url');

function HttpNotifier(options){
  var mergedOptions = common.mergeOptions([options, config]);
  this.httpHost = mergedOptions.httpHost;
  var rawPostData = {
    snapshots: mergedOptions.snapshots,
    vm: mergedOptions.vm,
    errors: mergedOptions.errors
  };
  this.postData = JSON.stringify(rawPostData);
  this.responseBody = '';
}

HttpNotifier.prototype.dispatch = function(callback){
  console.log('starting http dispatch');
  var cb = callback;
  var self = this;
  var options = url.parse(this.httpHost);
  options.method = "POST";
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': this.postData.length
  };
  console.log(options);
  console.log('posting ', this.postData);
  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      self.responseBody += chunk;
    });
    res.on('end', function() {
      var err = null;
      if ( res.statusCode >= 400 ){
        //request has failed
        err = new Error('Remote request returned an error code');
        err.responseBody = self.responseBody;
        console.log(err);
      }
      cb(err);
    });
  });
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  // write data to request body
  req.write(this.postData);
  req.end();
}

module.exports = HttpNotifier;
