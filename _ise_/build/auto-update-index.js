
require( 'shelljs/global' );
var path = require( 'path' );

var KEY = '_auto_index_files_'
var defaults = {
  src: path.resolve( __dirname, '../..' )
};

module.exports = exports = function( builder ) {
  var context = initContext( builder.config );
  updateIndexFiles( context );
};

if ( !module.parent ) {
  var run = module.exports;
  var file = path.resolve( defaults.src, 'component.json' );
  var config = JSON.parse( cat( file ) );
  run( { config: config } );
}

function initContext( options ) {
  var context = merge( {}, defaults );
  return merge( context, options );
}

function updateIndexFiles( context ) {
  var src = context.src, config = context.config;
  var indexFiles = context[KEY];
  // return;
  if ( !Array.isArray( indexFiles ) ) {
    return;
  }

  indexFiles
    .map( function( f ) {
      var dir = path.resolve( src, path.dirname( f ) );
      var base = path.basename( f );
      // echo( base );
      var files = ls( dir )
        .filter( function( f ) {
          return /\.js$/.test( f ) || test( '-d', f );
        } )
        .filter( function( f ) {
          return f !== base;
        } )
        .map( function( f ) {
          return './' + f;
        } );

      return {
        index: path.resolve( src, f ),
        files: files
      };
    } )
    .forEach( function( item ) {
      var index = item.index, files = item.files;
      var code = 'module.exports = exports = [\n';
      code += files
        .map( function( f ) {
          return '  require( \'' + f + '\' )'
        } )
        .join( ',\n' );

      code += '\n];'
      code.to( index );
    } );

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
