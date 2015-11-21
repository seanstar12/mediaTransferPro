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
  res.send(JSON.stringify(req.body));
});

function getStatus() {
  var deferred = Q.defer();

  deferred.resolve('{foo:"bar"}');

  return deferred.promise;
}

module.exports = router;
