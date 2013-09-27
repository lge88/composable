

require( 'shelljs/global' );
var path = require( 'path' );

var KEY = '_rename_';

var rename = makeSeq( [ initContext, doRename ] );
module.exports = exports = rename;
exports.afterCopy = function( context ) {
  // This is crucial! Set up different context when called by T
  rename( { src: context.dest, pkgName: context.pkgName } );
};
exports.afterCopy.order = 2;

if ( !module.parent ) {
  var context = {};
  context.pkgName = process.argv[2] || path.basename( path.resolve( __dirname, '..' ) );
  context.src = path.resolve( __dirname, '..' );
  rename( context, function( err ) {
    if ( err ) { echo( err ); }
    exit();
  } );
}

function doRename( context, next ) {
  var newPkgName = context.pkgName, src = context.src;
  var files = context.files, config = context.config;
  var oldName, re;

  oldName = config.name;
  console.log( 'Rename from project from ' + oldName + ' to ' + newPkgName );

  re = RegExp( '\\b' + oldName + '\\b', 'g' );
  console.log("re = ", re);

  files
    .map( function( f ) {
      return path.resolve( src, f );
    } )
    .filter( function( f ) {
      return test( '-f', f );
    } )
    .forEach( function( f ) {
      sed( '-i', re, newPkgName, f );
    } );

  next( null, context );
}

function initContext( context, next ) {
  console.log( 'rename ' );

  if ( arguments.length === 1 ) {
    next = context;
    context = {};
  }

  context || ( context = {} );
  context.src || ( context.src = path.resolve( __dirname, '..' ) );

  var src = context.src;
  var file = path.resolve( src, 'component.json' );
  context.file = file;

  if ( !context.config ) {
    context.config = JSON.parse( cat( file ) );
  }

  if ( !context.pkgName ) {
    context.pkgName = path.basename( path.resolve( __dirname, '..' ) );
  }

  if ( !context.files ) {
    context.files = context.config[KEY];
  }

  if ( !Array.isArray( context.files ) ) {
    context.files = [ context.files ];
  }

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
    };
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
