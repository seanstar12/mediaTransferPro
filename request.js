var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    conf = require('./config');

var router = express.Router();

router.get('/', function(req,res) {
  getStatus()
  .then ( function (reqStatus) {
    res.send(reqStatus);
  });
});

router.post('/', function(req,res) {
  doQueue(req.body)
  .then( function (resol) {
    res.send(JSON.stringify(resol));
  });
});

// Lock Middleware
//router.use('/', function (req, res, next) {
//  console.log('Lock Check');
//
//  next();
//});

function doQueue(req) {
  console.log(req);
  var deferred = Q.defer();
  req.media.forEach(function(media) {
    queue.push(movies[media]);
  }); 
  deferred.resolve();
  return deferred.promise;
}

function getStatus() {
  var deferred = Q.defer();
  deferred.resolve(queue);
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

module.exports = router;
