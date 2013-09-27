var str2js = require('string-to-js');
var jade = require('jade');
var path = require('path');
var fs = require('fs');
var read = fs.readFileSync;

module.exports = function(builder){
  builder.hook('before scripts', function(pkg){
    var tmpls = pkg.config.templates;
    if (!tmpls) return;

    tmpls.forEach(function(file){
      var str = read(pkg.path(file), 'utf8');
      var ext = path.extname(file);
      if (ext === '.jade') {
        str = jade.compile(str)({});
      }
      var js = str2js(str);
      var newFile = path.basename(file, ext) + '.js';
      pkg.addFile('scripts', newFile, js);
    });
  });
};
