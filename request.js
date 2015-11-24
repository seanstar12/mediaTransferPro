var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    conf = require('./config');

var router = express.Router();

router.use('/', function (req, res, next) {
  console.log('Lock Check');

  next();
});

router.get('/', function(req,res) {
  getStatus()
  .then ( function (reqStatus) {
    res.send(reqStatus);
  });
});

router.get('/clear', function(req,res) {
  queue = [];
  res.redirect('/');
});

router.get('/movies', function(req,res) {
  res.send(movies);
});

router.get('/clearmovies', function(req,res) {
  movies = [];
  res.send(movies);
});

router.post('/', function(req,res) {
  temp = queue;
  doQueue(req.body)
});

// Lock Middleware

function doQueue(req) {
  var deferred = Q.defer();
  req.media.forEach(function(media) {
    if (!containsObject(movies[media], queue)) {
      // @TODO Doesn't work, the memory is cleared between browser refresh
      queue.push(movies[media]);
    }
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

function containsObject(obj, list) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i] === obj) {
      return true;
    }
  }

  return false;
}

module.exports = router;
