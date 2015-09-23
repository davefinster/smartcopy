var fs = require('fs');
//assumes the configuration file is one level higher and is called
//configuration.json
var configurationData = fs.readFileSync(__dirname + "/../configuration.json",
 'utf8');

var config = JSON.parse(configurationData);

var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'smartcopy'
});

config.mergeValues = function(args){
  var keys = Object.keys(args);
  keys.forEach(function(key){
    config[key] = args[key];
  });
}

config.logger = log;

module.exports = config
