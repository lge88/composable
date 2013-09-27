
require( 'shelljs/global' );
var path = require( 'path' );

var KEY = '_auto_update_file_list_';
var NOOP = {};

var defaults = {
  src: path.resolve( __dirname, '../..' ),
  ignore: [
      /^\.git$/, /^components$/, /^node_modules$/, /backup/,
      /\.bak$/, /autosaves/, /elpa/, /legacy/, /~$/, /^\.#/,
      /^_.*_$/, /^bin$/, /^build$/,
      /main.js/, /main.css/
  ],
  config: null,
  filter: null,
  folders: null,
  patterns: {
    scripts: /\.js$/,
    styles: /\.(css|styl)$/
  }
};

var update = makeSeq( [
  initContext,
  initConfig,
  initPatterns,
  initFolders,
  autoUpdateFileList,
  writeToComponentJSONFile
] );

function debug( builder, next ) {
  echo( 'here' );
  next( null, builder );
}

function cb( err, next ) {
  if ( err === NOOP ) {
    console.log( "No _auto_update_file_list_ field found. Do nothing." );
  } else if ( err ) {
    console.log( err );
  } else {
    console.log( 'File list updated' );
    if ( typeof next === 'function' ) {
      next();
    }
  }
}

module.exports = exports = function( builder, next ) {
  update( builder, function(err) {
    echo( err )
    echo( 'File list updated' );
  } );
};

if ( !module.parent ) {
  update( {}, cb );
}

function initContext( options, next ) {
  var context = merge( {}, defaults );

  next( null, merge( context, options ) );
}

function initConfig( context, next ) {
  if ( !context.config ) {
    var src = context.src, file = path.resolve( src, 'component.json' );
    try {
      context.config = JSON.parse( cat( file ) );
    } catch( err ) {
      echo( 'The ' + file + ' is not a valid JSON file!' );
      throw err;
    }
  }
  next( null, context );
}

function initFolders( context, next ) {
  var config = context.config[KEY];
  if ( config && config.folders && Array.isArray( config.folders ) ) {
    context.folders = config.folders;
    next( null, context );
  } else {
    next( NOOP );
  }
}

function initPatterns( context, next ) {
  var patterns = context.patterns;
  // TODO:
  next( null, context );
}

function addToSet( arr, item ) {
  if ( -1 === arr.indexOf( item ) ) {
    arr.push( item );
    return true;
  }
  return false;
}


function autoUpdateFileList( context, next ) {
  var src = context.src, config = context.config;
  var patterns = context.patterns, filterFn;
  var ignoredPattern = context.ignore;
  var files, folders = context.folders;

  folders
    .map( function( f ) {
      return path.resolve( src, f );
    } )
    .forEach( function( folder ) {
      Object
        .keys( patterns )
        .map( function( key ) {
          return [ key, patterns[key] ];
        } )
        .forEach( function( tuple ) {
          var type = tuple[0], pattern = tuple[1];
          config[type] = [];
          walk( folder )
            .map( function( f ) {
              return path.relative( src, f );
            } )
            .filter( function( f ) {
              return pattern.test( f );
            } )
            .forEach( function( f ) {
              addToSet( config[type], f );
            } );
        } );
    } );
  next( null, context );
}

function writeToComponentJSONFile( context, next ) {
  var src = context.src, config = context.config;
  var file = path.resolve( src, 'component.json' );
  // var backupFolder = path.resolve( __dirname, 'backup' );
  // var backup = path.resolve( backupFolder, 'component.json.' + now().join( '-' ) + '.bak' );

  // mkdir( '-p', backupFolder );
  // cp( '-f', file, backup );
  JSON.stringify( config, null, 2 ).to( file );

  next( null, context );
}

function now() {
  var d = new Date();
  var out = [
    1 + d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds()
  ].map( function( num ) {
    return ( '0' + num ).slice( -2 );
  } );
  out.unshift( '' + d.getFullYear() );
  return out;
}


function walk( dir, filterFn, list ) {
  filterFn || ( filterFn = function( file, fullpath ) { return true; } );
  list || ( list = [] );
  ls( '-A', dir )
    .map( function( f ) {
      return [ f, path.join( dir, f) ];
    } )
    .filter( function( paths ) {
      return filterFn.apply( null, paths );
    } )
    .map( function( paths ) { return paths[1]; } )
    .forEach( function( f ) {
      if ( test( '-d', f ) ) {
        walk( f, filterFn, list );
      } else {
        list.push( f );
      }
    } );
  return list;
}

function merge( a, b ) {
  var key, val_a, val_b;
  for ( key in b ) {
    val_a = a[key];
    val_b = b[key];
    if ( val_b && b.hasOwnProperty( key ) ) {
      if ( val_a && typeof val_a === 'object' ) {
        merge( val_a, val_b );
      } else {
        a[key] = val_b;
      }
    }
  }
  return a;
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
