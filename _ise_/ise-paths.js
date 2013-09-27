
require( 'shelljs/global' );
var path = require( 'path' );

var KEY = '_ise_paths_';

module.exports = exports = isePaths;
exports.afterCopy = isePaths;
exports.afterCopy.order = 1;
if ( !module.parent ) {
  isePaths( {}, function( err ) {
    if ( err ) { echo( err ); }
    exit();
  } );
}

function isePaths( options, done ) {
  console.log( 'ise path' );

  options || ( options = {} );
  done || ( done = function(){} );
  makeSeq( [
    initContext,
    doAddISEPaths,
    writeToConfigFile
  ] )( options, done );
}

function initContext( context, next ) {
  context || ( context = {} );
  context.src || ( context.src = path.resolve( __dirname, '..' ) );

  var src = context.src;
  var file = path.resolve( src, 'component.json' );
  context.file = file;

  if ( !context.config ) {
    context.config = JSON.parse( cat( file ) );
  }

  if ( !context.isePaths ) {
    context.isePaths = context.config[KEY];
  }


  if ( !Array.isArray( context.isePaths ) ) {
    if ( context.isePaths === 'default' ) {
      context.isePaths = [ 'lib', 'lib-client' ];
    } else {
      context.isePaths = [];
    }
  }

  next( null, context );
 }

function doAddISEPaths( context, next ) {
  var isePaths = context.isePaths;
  var config = context.config;

  config.paths || ( config.paths = [] );

  isePaths
    .map( function( p ) {
      return path.resolve( process.env.ISE_PATH, p );
    } )
    .forEach( function( p ) {
      addToSet( config.paths, p );
    } );

  if ( config.paths.length === 0 ) {
    delete config.paths;
  }

  next( null, context );
}

function writeToConfigFile( context, next ) {
  var file = context.file, config = context.config;
  JSON.stringify( config, null, 2 ).to( file );
  next( null, context );
}

function addToSet( arr, item ) {
  if ( -1 === arr.indexOf( item ) ) {
    arr.push( item );
    return true;
  }
  return false;
}

function makeSeq() {
  var fns =  Array.prototype.slice.call( arguments );
  var ended = false;
  if ( fns.length ===1 && Array.isArray( fns[0] ) ) {
    fns = fns[0];
  }

  function once( f ) {
    var called = false;
    return function() {
      if ( !called ) {
        called = true;
        return f.apply( null, arguments );
      } else {
        ended = true;
        done( "Called once already" );
      }
    }
  }

  var i = 0, len = fns.length, done = function() {};

  function next() {
    var args = Array.prototype.slice.call( arguments );
    var fn, err = args[0];
    if ( ended === true ) { return; }

    if ( err || i >= len ) {
      done.apply( null, args );
    } else {
      fn = fns[i];
      args.shift();
      args.push( once( next ) );
      i = i + 1;
      fn.apply( null, args );
    }
  }

  return function() {
    var args =  Array.prototype.slice.call( arguments );
    if ( typeof args[args.length -1] === 'function' ) {
      done = args.pop();
    }
    args.unshift( null );
    args.push( once( next ) );
    next.apply( null, args );
  };
}
