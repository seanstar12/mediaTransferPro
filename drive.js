var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    exec = require('child_process').exec,
    conf = require('./config');

var router = express.Router();

router.get('/umount', function(req,res) {
  run('umount ' + conf.externalMount);
  externalMovies = [];
});

router.get('/mount', function(req,res) {
  run('mount ' + conf.external + ' ' + conf.externalMount);
});

function run(cmd) {
  var deferred = Q.defer();
  exec(cmd, function (error, stdout, stderr) {
    if(stdout) { console.log("stdout: " + stdout); }
    if (stderr) { console.log("stderr: " + stderr); }

    if (!error) {
      deferred.resolve();
    } else {
      deferred.reject(error);
      console.error("exec error: " + error);
    }
  });
  return deferred.promise;
}

module.exports = router;
