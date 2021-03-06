var express = require('express'),
    hbs = require('express-hbs'),
    app = express(),
    Q = require('q'),
    fs = require('fs'),
    exec = require('child_process').exec,
    chokidar = require('chokidar'),
    Rsync = require('rsync'),
    sqlite3 = require('sqlite3').verbose(),
    bodyParser = require('body-parser');

// Custom routes for API
var settings = require('./settings'),
    queuejs = require('./queue'),
    drivejs = require('./drive'),
    request = require('./request');

var conf = require('./config');

GLOBAL.movies = [];
GLOBAL.externalMovies = [];
GLOBAL.queue = [];
GLOBAL.tv = {};
GLOBAL.lock = false;
GLOBAL.progress = {};
GLOBAL.sudo = false;

checkRoot();

var file = "movies.db";
var exists = fs.existsSync(__dirname + file);
var db = new sqlite3.Database(file);

db.serialize(function() {
    console.log('create table');
    db.run("CREATE TABLE if not exists movies (title TEXT, size INT, path TEXT)");
});
console.log(db);

var rsync = new Rsync()
            .flags('avP')
            .source('/nana/Movies/Brave\ \(2012\)')
            .destination('/home/sean/Documents/test/');
rsync.output(
  function(data){
    console.log(data);
  }, function(data) {
    console.log('rysnc error');
    console.log(data);
  }
);



var drive = chokidar.watch('/dev/sdc1', {ignored: /[\/\\]\./});
//var mountPoint = chokidar.watch(conf.externalMount, {ignored: /[\/\\]\./});

drive.on('add', function(path) {
  console.log('drive ' + path + ' has been attached');
  console.log('trying mount');
  run('mount ' + conf.external + ' ' + conf.externalMount)
  .then(getExternalMovies());
  
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



app.get('/hi', function(req,res) {
  getMoviesDb()
  .then (function(rows) {
  console.log(rows);
res.send(rows)});
});

app.get('/', function(req,res) {
  getMovies()
  .then ( getTV())
  .then ( getExternalMovies())
  .then ( function () {
  var stmt = db.prepare("INSERT INTO movies VALUES (?,?,?)");
  for (var i=0; i<movies.length; i++) {
    stmt.run(movies[i].name, movies[i].movieSize, movies[i].path);
  } 
  stmt.finalize();
  db.close();
  var page = {
    title: conf.title,
    movies: movies,
    externalMovies: externalMovies,
    queue: queue,
  };
  res.render('index', page);
  });
});

function saveToDb() {
 console.log('savetodb');
  var deferred = Q.defer();

  return deferred.promise;  
}

function getMoviesDb() {
  console.log('getmoviesdb');
  var deferred = Q.defer();
var file = "movies.db";
var db = new sqlite3.Database(file);

  db.run('SELECT * from movies', function(err, rows) {
    console.log(rows);
    deferred.resolve( rows);
  });

  return deferred.promise;
}

function getMovies() {
  console.log('getMovies');
  var deferred = Q.defer();
  if (movies.length) {
    //prevent disk access
    console.log('already have movies');
    deferred.resolve();
  }
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
             movieSize: dirSize,
             path: conf.movieDir + '/' + files[i]});
            

         }
         movies = _list;
         deferred.resolve(movies);
       });
     }
  });
  return deferred.promise;
}

function getExternalMovies() {
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
           var _url = '';
           _list.push({
             name:files[i],
             type:'movie',
             num:i, 
             path: conf.movieDir + '/' + files[i]});
         }
         externalMovies = _list;

         deferred.resolve();
       });
     }
  });
  return deferred.promise;
}

function getTV() {
  var deferred = Q.defer();
  fs.stat(conf.tvDir, function(err, stats) {
    if (err) {
      console.log('Cannot Find Library');
    } else if (stats.isDirectory()) {
      fs.readdir(conf.tvDir, function(err, files) {
         var _list = [];
         files = files.sort();
         for (var i = 0; i < files.length; i++){
           var _url = '';
           _list.push({name:files[i],type:'tv',size:0});
         }
         tv = _list;
         deferred.resolve();
       });
     }
  });
  return deferred.promise;
}

// For Queue Watching // file checking
//Array.observe(queue, function(changes) {
//  
//  // handle changes... in this case, we'll just log them 
//  changes.forEach(function(change) {
//    console.log(Object.keys(change).reduce(function(p, c) {
//      if (c !== "object" && c in change) {
//        p.push(c + ": " + JSON.stringify(change[c]));
//      }
//      return p;
//    }, []).join(", "));
//  });
//  
//});
function checkRoot() {
  exec('sudo -n true', function (error, stdout, stderr) {
    if (!error) {
      sudo = true;
    } else {
      console.log('Unable to sudo; Cannot mount drive.');
    }
  });
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
