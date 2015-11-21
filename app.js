var express = require('express'),
    hbs = require('express-hbs'),
    app = express(),
    Q = require('q'),
    fs = require('fs'),
    bodyParser = require('body-parser'),
    settings = require('./settings');

var conf = require('./config');

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

var movies = {};
var tv = {};


app.get('/', function(req,res) {
  
  getMovies()
  .then ( getTV())
  .then ( function () {
  
  var page = {
    title: conf.title,
    movies: movies,
    tv: tv
  };
  console.log(page);
  res.render('index', page);
  });
});

function getMovies() {
  var deferred = Q.defer();
  fs.stat(conf.movieDir, function(err, stats) {
    if (err) {
      if (err.code == 'ENOENT') res.send(['Doesn\'t Exist']);
      else throw err;
    } else if (stats.isDirectory()) {
      fs.readdir(conf.movieDir, function(err, files) {
         var _list = [];
         files = files.sort();
         for (var i = 0; i < files.length; i++){
           var _url = '';
           _list.push({name:files[i],type:'movie',num:i});
         }
         movies = _list;
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
      if (err.code == 'ENOENT') res.send(['Doesn\'t Exist']);
      else throw err;
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
