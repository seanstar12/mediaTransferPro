var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    conf = require('./config');

var router = express.Router();

router.get('/', function(req,res) {
  res.send(queue);
});

router.get('/clear', function(req,res) {
  queue = [];
  res.send(queue);
});

module.exports = router;
