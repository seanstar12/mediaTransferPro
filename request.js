var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    sqlite3 = require('sqlite3').verbose(),
    conf = require('./config');

var router = express.Router();

router.use('/', function (req, res, next) {
  console.log('Lock Check');

  next();
});

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

router.get('/movies', function(req,res) {
  res.send(movies);
});

router.post('/', function(req,res) {
  getMoviesFromQueue(req.body);
});

// Lock Middleware

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
