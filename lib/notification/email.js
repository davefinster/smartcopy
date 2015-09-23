var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var config = require('../config');

var transporter = nodemailer.createTransport(smtpTransport({
    host: config.smtpHostname,
    port: config.smtpPort,
    auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword
    }
}));

exports.notify = function(snapshots, vmAlias, errors, cb){
  var callback = cb;
  var subject = "✔ Backup Successful for " + vmAlias;
  if (( errors != null ) && ( errors.length > 0 )){
    subject = "✘ Backup Failed for " + vmAlias;
  }
  var body = '';
  var items = [];
  if ( snapshots.length > 0 ){
    for ( var i = 0; i < snapshots.length; i++ ){
      items.push(snapshots[i].snapshotReference());
    }
    body = 'Backup and transfer completed for ' + items.join(', ');
  }
  if ( errors != null ){
    for ( var i = 0; i < errors.length; i++ ){
      body += ' ' + errors[i];
    }
  }
  var mail = {
    from: config.smtpFromAddress,
    to: config.smtpToAddress,
    subject: subject,
    text:body
  };
  transporter.sendMail(mail, function(error, info){
    callback(error);
  });
}
