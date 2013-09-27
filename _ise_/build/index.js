
require( 'shelljs/global' );
var path = require( 'path' );
var uglifyjs = require( 'uglify-js' );
var Builder = require( 'component-builder' );

module.exports = exports = build;
exports.writeToFile = writeToFile;

var defaults = {
  src: path.resolve( __dirname, '../..' ),
  dest: path.resolve( __dirname, '../../build' ),
  development: true,
  uglify: false,
  sourceURLs: true
};

if ( !module.parent ) {
  build( {
    uglify: false,
    sourceURLs: false
  }, function( err, context ) {
    if ( err ) {
      console.log( err );
      exit();
    }
    writeToFile( context );
    exit();
  } );
}

function build( options, done ) {

  var context = merge( {}, defaults );
  context = merge( context, options );

  var src = context.src, sourceURLs = context.sourceURLs;
  var uglify = context.uglify, development = context.development;
  var middlewares = context.middlewares;

  var builder = new Builder( src );
  var pkgName = builder.config.name;

  sourceURLs && builder.addSourceURLs();
  development && builder.development();

  builder.use( require( './build-stylus' ) );
  builder.use( require( './build-template' ) );
  uglify && builder.use( require( './build-uglify' ) );

  builder.use( requireForce( './auto-update-file-list.js' ) );
  builder.use( requireForce( './auto-update-index.js' ) );

  context.pkgName = pkgName;

  builder.build( function( err, res ) {
    if ( typeof done === 'function' ) {
      context.builder = builder;
      context.result = res;
      done( err, context );
    }
  } );
}

function writeToFile( context ) {
  var res = context.result, pkgName = context.pkgName;
  var code = res.require + res.js + 'require(\'' + pkgName + '\');';
  var uglify = context.uglify;
  var dest = context.dest;
  var jsFile = path.resolve( dest, 'build.js' );
  var cssFile = path.resolve( dest, 'build.css' );

  if ( uglify === true ) {
    code = uglifyjs.minify( code, { fromString: true } ).code;
  }

  mkdir( '-p', dest );
  code.to( jsFile );
  res.css.to( cssFile );
}

function merge( a, b ) {
  if ( typeof a !== 'object' && typeof a !== 'function' ) {
    throw "Can't merge things of type other than object";
  }
  var key, val_a, val_b;
  for ( key in b ) {
    val_a = a[key], val_b = b[key];
    if ( val_b && b.hasOwnProperty( key ) ) {
      if ( val_a && typeof val_a === 'object' ) {
        merge( val_a, val_b );
      } else {
        a[key] = val_b;
      }
    }
  }
  return a;
};

function requireForce( id ) {
  var resolved = require.resolve( id );
  var old = require.cache[ resolved ];
  delete require.cache[ resolved ];
  result = require( resolved );
  require.cache[ resolved ] = old;
  return result;
}
