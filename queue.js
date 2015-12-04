var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    sqlite3 = require('sqlite3').verbose(),
    conf = require('./config');

var router = express.Router();

router.get('/', function(req,res) {
  getQueue()
  .then ( function (reqStatus) {
    res.send(reqStatus);
  });
});

router.get('/clear', function(req,res) {
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  db.run("DELETE FROM queue");
  db.close();
  res.redirect('/');
});

function getMoviesFromQueue(queue) {
  console.log('get movies from queue');
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  var movies = [];

  var stmt = db.prepare("INSERT INTO queue VALUES (?,?,?,?,?)");
  queue.media.forEach(function(el) {
    db.all("SELECT * from queue where inode="+el,function(err, row) {
      if (row[0]) {
        console.log(row[0].inode + " already in queue");
      } else {
        db.all("SELECT * from movies where inode="+el,function(err, row) {
          movies.push(row[0]);
          stmt.run(row[0].title, row[0].size, row[0].humanSize, row[0].path, row[0].inode);
        });
      }
    });
  });

  deferred.resolve(movies);
  return deferred.promise;  
}

function getQueue() {
  console.log('get queue');
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);

  db.all("SELECT * from queue",function(err, rows) {
    deferred.resolve(rows);
  });

  return deferred.promise;
}

module.exports = router;
