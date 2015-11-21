var express = require('express'),
    fs = require('fs'),
    util = require('util'),
    conf = require('./config');

var router = express.Router();

router.get('/', function(req,res) {
  var page = {
    title:"Settings",
    conf: conf,
  };

  res.render('settings', page);
});

router.post('/', function(req,res) {
  var objCount = Object.keys(req.body).length;
  var count = 0;
  var format = "";
  for (var attr in req.body) {
    count ++;
    format += "\t" + attr + " : '" + req.body[attr];
    if (count != objCount) {
      format += "',\n";
    } else {
      format += "'\n";
    }
  }
  var str = "var config = module.exports = {\n" +
            format + "}";

  fs.writeFile('config', str, function(err) {
    if (err) throw err;
  });
  setTimeout(function() {
    // @TODO THIS IS BAD. And I dont feel bad.
    process.exit('1');
  }, 500);
  
  res.redirect(conf.saveRedirect);
});

module.exports = router;
