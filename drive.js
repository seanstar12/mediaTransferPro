var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    Rsync = require('rsync'),
    filesize = require('filesize'),
    sqlite3 = require('sqlite3').verbose(),
    exec = require('child_process').exec,
    chokidar = require('chokidar'),
    conf = require('./config');

var router = express.Router();

var drive = chokidar.watch(conf.external, {ignored: /[\/\\]\./});
//var mountPoint = chokidar.watch(conf.externalMount, {ignored: /[\/\\]\./});

drive.on('add', function(path) {
  console.log('drive ' + path + ' has been attached');
  console.log('trying mount');
  run('mount ' + conf.external + ' ' + conf.externalMount)
  .then (getExternalContents)
  .then (saveExternalToDb)
  
});

drive.on('unlink', function(path) {
  console.log('drive ' + path + ' has been removed');
});

//mountPoint.on('add', function(path, stats) {
//  console.log(stats);
//  console.log('files have been added ' + path);
//});
//mountPoint.on('change', function(path,stats) {
//  console.log(stats);
//  console.log('files have been changed ' + path);
//});

router.get('/umount', function(req,res) {
  run('umount ' + conf.externalMount);
  externalMovies = [];
  console.log('unmounted');
});

router.get('/mount', function(req,res) {
  run('mount ' + conf.external + ' ' + conf.externalMount);
  console.log('mounted');
});

router.get('/clear', function(req,res) {
  console.log('clear drive');

  var file = "movies.db";
  var db = new sqlite3.Database(file);
  db.run("DELETE FROM external");
  db.close();
  res.redirect('/');

});

router.get('/transfer', function(req,res) {
  console.log('transfer files');
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  db.all("SELECT * from queue", function(err, row) {
    for (var i=0; i< row.length; i++) {
      var rsync = new Rsync()
              .flags('avP')
              .source(row[i].path)
              .destination(conf.externalMount);
      rsync.execute(function(error, code, cmd) {
      });
      db.all("DELETE from queue where inode="+row[i].inode, function(err, item) {
        console.log('removed from queue ' + row[i]);
      })
    }
  });
  
  res.redirect('/');
});

router.get('/scan', function(req,res) {
  console.log('scan drive');
  getExternalContents()
  .then (saveExternalToDb)
  .then(function() {
    res.redirect('/');
  });
});

function saveExternalToDb(movies) {
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  console.log('save external to db');
  db.run("DELETE FROM external");
  var stmt = db.prepare("INSERT INTO external VALUES (?,?,?,?,?)");
  console.log(movies);
  for (var i=0; i<movies.length; i++) {
    stmt.run(movies[i].name, movies[i].movieSize, movies[i].hSize, movies[i].path, movies[i].inode);
  } 
  stmt.finalize();
  db.close();
  deferred.resolve();

  return deferred.promise;  
}

function getExternalContents() {
  console.log('get external movies');
  var deferred = Q.defer();
  fs.stat(conf.externalMount, function(err, stats) {
    if (err) {
      console.log('Cannot Find Library');
      externalMovies = [{name: 'Cannot Find Library', type: 'error', num: 0, path: '/'}];
      deferred.resolve();
    } else if (stats.isDirectory()) {
      fs.readdir(conf.externalMount, function(err, files) {
         var _list = [];
         files = files.sort();
         for (var i = 0; i < files.length; i++){
           var array = fs.readdirSync(conf.externalMount + '/' + files[i]);
           var dirSize = 0;
           for (var j =0; j < array.length; j++) {
             dirSize += fs.lstatSync(conf.externalMount + '/'+ files[i] +'/'+ array[j]).size; 
           }
           var _url = '';
           _list.push({
             name:files[i],
             type:'movie',
             num:i, 
             inode: fs.lstatSync(conf.externalMount + '/' + files[i]).ino, 
             movieSize: dirSize,
             hSize: filesize(dirSize),
             path: conf.movieDir + '/' + files[i]});
         }

         deferred.resolve(_list);
       });
     }
  });
  return deferred.promise;
}

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
