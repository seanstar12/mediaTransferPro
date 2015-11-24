var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    Q = require('q'),
    conf = require('./config');

GLOBAL.movies = [];

var router = express.Router();

router.get('/', function(req,res) {
  getMovies()
  .then( function() {
    res.send(movies);
  });
});


function getMovies() {
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
           var _url = '';
           _list.push({
             name:files[i],
             type:'movie',
             num:i, 
             path: conf.movieDir + '/' + files[i]});
         }
         movies = _list;
         deferred.resolve();
       });
     }
  });
  return deferred.promise;
}

module.exports = router;
