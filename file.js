var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    conf = require('./config');

function getStatus() {
  var deferred = Q.defer();

  deferred.resolve('{foo:"bar"}');

  return deferred.promise;
}

function copyFile(source, target) {
  var deferred = Q.defer();

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    deferred.reject(err);
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    deferred.reject(err);
    done(err);
  });
  wr.on("close", function(ex) {
    deferred.resolve();
    done();
  });
  rd.pipe(wr);

  return deferred.promise;
}
