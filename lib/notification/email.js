var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var config = require('../config');
var common = require('../common');

function EmailNotifier(options){
  var mergedOptions = common.mergeOptions([options, config]);
  this.host = mergedOptions.smtpHostname;
  this.port = mergedOptions.smtpPort;
  this.username = mergedOptions.smtpUsername;
  this.password = mergedOptions.smtpPassword;
  var transporterConfig = {
    host: this.host,
    port: this.port
  };
  if (( this.username != null ) && ( this.password != null )){
    transporterConfig.auth = {
      user: this.username,
      pass: this.password
    }
  }
  this.transporter = nodemailer.createTransport(smtpTransport(
    transporterConfig));
  this.successSubject = mergedOptions.successSubject;
  this.failedSubject = mergedOptions.failedSubject;
  console.log('[', mergedOptions, ']');
  this.snapshots = mergedOptions.snapshots;
  this.vm = mergedOptions.vm;
  this.errors = mergedOptions.errors;
}

//string can contain [vm.alias] and/or [vm.uuid] and/or [vm.brand]
EmailNotifier.prototype.messageSubject = function(){
  var baseSubject = null;
  if (( this.errors == null ) || ( this.errors.length == 0 )){
    if ( this.successSubject != null ){
      baseSubject = this.successSubject;
    }else{
      baseSubject = "✔ Backup Successful for [vm.alias]";
    }
  }else{
    if ( this.failedSubject != null ){
      baseSubject = this.failedSubject;
    }else{
      baseSubject = "✘ Backup Failed for [vm.alias]";
    }
  }
  var substSubject = baseSubject.replace('[vm.alias]', this.vm.alias).
  replace('[vm.uuid]', this.vm.uuid).replace('[vm.brand]', this.vm.brand);
  return substSubject;
}

EmailNotifier.prototype.dispatch = function(callback){
  var subject = this.messageSubject();
  var body = '';
  var items = [];
  if ( this.snapshots.length > 0 ){
    for ( var i = 0; i < this.snapshots.length; i++ ){
      items.push(this.snapshots[i].snapshotReference());
    }
    body = 'Backup and transfer completed for ' + items.join(', ');
  }else{
    body = 'No snapshots included in result set.';
  }
  if ( this.errors != null ){
    for ( var i = 0; i < this.errors.length; i++ ){
      body += ' ' + this.errors[i];
    }
  }
  var mail = {
    from: config.smtpFromAddress,
    to: config.smtpToAddress,
    subject: subject,
    text:body
  };
  this.transporter.sendMail(mail, function(error, info){
    callback(error);
  });
}

module.exports = EmailNotifier;
