
var uglifyjs = require('uglify-js');
var path = require('path');
var fs = require('fs');
var read = fs.readFileSync;

module.exports = function(builder){
  builder.hook('before scripts', function(pkg){
    var scripts = pkg.config.scripts;
    if (!scripts) return;

    for (var i = 0; i < scripts.length; i++) {
      var file = scripts[i];
      var js = compile(read(pkg.path(file), 'utf8').replace(/\r/g, ''));
      pkg.removeFile('scripts', file);
      pkg.addFile('scripts', file, js);
    }
  });
};

function compile(js) {
  var code = uglifyjs.minify(js, { fromString: true }).code;
  return code;
}
