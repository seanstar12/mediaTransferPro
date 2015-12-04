var express = require('express'),
    hbs = require('express-hbs'),
    app = express(),
    Q = require('q'),
    fs = require('fs'),
    exec = require('child_process').exec,
    chokidar = require('chokidar'),
    Rsync = require('rsync'),
    filesize = require('filesize'),
    sqlite3 = require('sqlite3').verbose(),
    bodyParser = require('body-parser');

// Custom routes for API
var settings = require('./settings'),
    queuejs = require('./queue'),
    drivejs = require('./drive'),
    request = require('./request');

var conf = require('./config');

GLOBAL.externalMovies = [];

loadDb()
.then(getMoviesDb)
.then(function(obj) {
  console.log('Checking if Movies Exist');
  if (!obj.movies ||obj.movies.length == 0) {
    console.log('need movies');
    getMovies()
    .then(saveMoviesToDb)
  } else {
    console.log('have movies');
  }
});




app.listen(conf.port || 8093);
app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.engine('hbs', hbs.express4({  
  defaultLayout: __dirname + '/views/layouts/default.hbs',
  partialsDir: __dirname + '/views/partials',
  layoutsDir: __dirname + '/views/layouts'
}));
app.use('/settings', settings);
app.use('/api/request', request);
app.use('/api/drive', drivejs);
app.use('/api/queue', queuejs);


app.get('/', function(req,res) {
  getMoviesDb()
  .then ( getQueue)
  .then ( getExternal)
  .then ( function (obj) {
  if (!obj.movies) obj.movies = [{name: 'Cannot Find Library', type: 'error', num: 0, path: '/'}];

  var queueSize = 0;
  for(var i =0; i< obj.queue.length; i++) {
    queueSize += obj.queue[i].size;
  }  
  queueSize = filesize(queueSize);
  var page = {
    title: conf.title,
    movies: obj.movies,
    externalMovies: obj.external,
    queue: obj.queue,
    queueSize: queueSize,
  };
  res.render('index', page);
  });
});

app.get('/movies/clear', function(req,res) {
  console.log('oh shit, movies getting deleted');
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  db.run("DELETE FROM movies");
  db.close();
  res.redirect('/');
});

function loadDb() {
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  db.serialize(function() {
    db.run("CREATE TABLE if not exists movies (title TEXT, size INT, humanSize TEXT, path TEXT, inode INT)");
    db.run("CREATE TABLE if not exists queue (title TEXT, size INT, humanSize TEXT, path TEXT, inode INT)");
    db.run("CREATE TABLE if not exists external (title TEXT, size INT, humanSize TEXT, path TEXT, inode INT)");
    db.close();
    deferred.resolve();
  });
  return deferred.promise;  
}

function saveMoviesToDb(movies) {
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  console.log('save movies to db');
  var stmt = db.prepare("INSERT INTO movies VALUES (?,?,?,?,?)");
  for (var i=0; i<movies.length; i++) {
    stmt.run(movies[i].name, movies[i].movieSize, movies[i].hSize, movies[i].path, movies[i].inode);
  } 
  stmt.finalize();
  db.close();
  deferred.resolve();

  return deferred.promise;  
}

function saveExternalToDb(movies) {
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);
  console.log('save external to db');
  var stmt = db.prepare("INSERT INTO external VALUES (?,?,?,?,?)");
  for (var i=0; i<movies.length; i++) {
    stmt.run(movies[i].name, movies[i].movieSize, movies[i].hSize, movies[i].path, movies[i].inode);
  } 
  stmt.finalize();
  db.close();
  deferred.resolve();

  return deferred.promise;  
}

function getMoviesDb() {
  console.log('getmoviesdb');
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);

  db.all('SELECT * from movies', function(err, rows) {
    deferred.resolve({movies:rows});
  });

  return deferred.promise;
}

function getQueue(obj) {
  console.log('gitqueue');
  obj.rows = [];
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);

  db.all('SELECT * from queue', function(err, rows) {
    obj.queue = rows;
    deferred.resolve(obj);
  });

  return deferred.promise;
}

function getExternal(obj) {
  console.log('getExternal');
  obj.rows = [];
  var deferred = Q.defer();
  var file = "movies.db";
  var db = new sqlite3.Database(file);

  db.all('SELECT * from external', function(err, rows) {
    obj.external = rows;
    deferred.resolve(obj);
  });

  return deferred.promise;
}

function getMovies() {
  console.log('getMovies2');
  var deferred = Q.defer();
  fs.stat(conf.movieDir, function(err, stats) {
    if (err) {
      console.log('Cannot Find Library');
      movies = [{name: 'Cannot Find Library', type: 'error', num: 0, path: '/'}];
      deferred.resolve();
    } else if (stats.isDirectory()) {
      fs.readdir(conf.movieDir, function(err, files) {
         var _list = [];
         files = files.sort();
         for (var i = 0; i < files.length; i++){
           var array = fs.readdirSync(conf.movieDir + '/' + files[i]);
           var dirSize = 0;
           for (var j =0; j < array.length; j++) {
             dirSize += fs.lstatSync(conf.movieDir + '/'+ files[i] +'/'+ array[j]).size; 
           }
           var _url = '';
           _list.push({
             name:files[i],
             type:'movie',
             num:i, 
             inode: fs.lstatSync(conf.movieDir + '/' + files[i]).ino, 
             movieSize: dirSize,
             hSize: filesize(dirSize),
             path: conf.movieDir + '/' + files[i]});
            
         }  
         var obj = {
           movies: _list
         }
         deferred.resolve(_list);
       });
     }
  });
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
      console.log('no error');
      deferred.resolve();
    } else {
      deferred.reject(error);
      console.error("exec error: " + error);
    }
  });
  return deferred.promise;
}
