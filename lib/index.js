

module.exports = exports = composable;
exports.instanceMembers = instanceMembers;
exports.classMembers = classMembers;

var instanceMembers = {
  constructor: function ctor( json ) {
    if ( !( this instanceof ctor ) ) {
      return new ctor;
    }
    extend( this, json );
    return this;
  }
};

var classMembers = {

  create: function( json ) { return new this( json ); },

  // feature can be:
  // 1) a object contains following fileds:
  // name( optional )
  // instanceMembers
  // classMembers
  // pre: { instanceMembers: { methodA: function(){} }, classMembers: { methodB: function } }
  // post: { instanceMembers: { methodA: function(){} }, classMembers: { methodB: function } }
  // 2) a function represent a class:
  // Backbone.Model

  // _features: [],

  use: function( features ) {
    if ( !this._features ) { this._features = [ this ]; }
    this._features = this._features.concat(
      preProcessFeatures( features )
    );
    return this;
  },

  getComposed: function() {
    var features = this._features;
    delete this._features;

    if ( Array.isArray( features ) && features.length > 1 ) {
      return compose( features );
    } else {
      return this;
    }
  }

};

classMembers.getExtended = classMembers.getComposed;

[ 'pre', 'post' ].forEach( function( type ) {
  classMembers[ type ] = function( methodName, fn, methodType ) {
    var feature = {};
    feature[ type ] = { instanceMembers: {}, classMembers: {} };

    if ( typeof methodName === 'object' ) {
      fn = methodName.handle;
      methodType = methodName.methodType;
      methodName = methodName.name;
    } else if ( typeof methodName === 'string'
                && typeof fn === 'function' ) {
    } else {
      throw new Error( 'composable::' + type + ': input ' +
                       methodName + ' is not string or object' );
    }

    var toBeSearched = [];
    if ( typeof methodType === 'string' ) {
      if ( methodType.match( /instance/ ) ) {
        toBeSearched.push( [
          this.prototype,
          feature[ type ].instanceMembers
        ] );
      } else if ( methodType.match( /class/ ) ) {
        toBeSearched.push( [
          this,
          feature[ type ].classMembers
        ] );
      }
    } else {
      toBeSearched.push( [
        this.prototype,
        feature[ type ].instanceMembers
      ], [
        this,
        feature[ type ].classMembers
      ] );
    }

    var ok = toBeSearched.some( function( c ) {
      if ( typeof c[ 0 ][ methodName ] === 'function' ) {
        c[ 1 ][ methodName ] = fn;
        return true;
      } else {
        return false;
      }
    } );

    if ( !ok ) {
      throw new Error( 'composable::' + type + ': No such ' +
                       methodType + ' method ' + methodName );
    }

    return this.use( feature );
  };
} );

function compose( features ) {
  if ( !Array.isArray( features ) || features.length === 0 ) {
    throw new Error( 'compose: accept only array input' );
  }

  var parent = {};
  if ( typeof features[0] === 'function' ) {
    parent = features.shift();
  }

  var preFns = { instanceMethods: {}, classMethods: {} };
  var postFns = { instanceMethods: {}, classMethods: {} };
  var instanceExtender = {}, classExtender = {};

  // According to the content of the feature object:
  // merge member to preFns/postFns/instanceExtender/classExtender
  // If method occurs in instanceExtender/classExtender, related
  // pre/post should be cleard.

  features.forEach( function( f ) {
    if ( Array.isArray( f ) ) {
      f = { instanceMembers: f[0], classMembers: f[1] };
    }

    // TODO: handle this more carefully
    if ( typeof f === 'function' ) {
      var ctor = f.prototype.constructor;
      f = {
        instanceMembers: f.prototype,
        classMembers: reject( f, 'prototype' )
      };
      extend( f.instanceMembers, {
        constructor: ctor
      } );
    }

    if ( f.instanceMembers ) {
      removePrePost( f.instanceMembers );
      extend( instanceExtender, f.instanceMembers );
    }

    if ( f.classMembers ) {
      removePrePost( f.classMembers );
      extend( classExtender, f.classMembers );
    }

    if ( f.pre ) {
      mergeListForObject( preFns.instanceMethods, f.pre.instanceMembers );
      mergeListForObject( preFns.classMethods, f.pre.classMembers );
    }

    if ( f.post ) {
      mergeListForObject( postFns.instanceMethods, f.post.instanceMembers );
      mergeListForObject( postFns.classMethods, f.post.classMembers );
    }

  } );

  // apply pre/post to instanceExtender/classExtender
  var instanceMethodWrapped = {}, classMethodWrapped = {};

  addToWrapped( preFns.instanceMethods, instanceMethodWrapped, 'pre', instanceExtender, parent.prototype );
  addToWrapped( postFns.instanceMethods, instanceMethodWrapped, 'post', instanceExtender, parent.prototype );
  addToWrapped( preFns.classMethods, classMethodWrapped, 'pre', classExtender, parent );
  addToWrapped( postFns.classMethods, classMethodWrapped, 'post', classExtender, parent );

  extend( instanceExtender, wrapMethods( instanceMethodWrapped ) );
  extend( classExtender, wrapMethods( classMethodWrapped ) );

  // clear the stack;
  return createClass( parent, instanceExtender, classExtender );

  function removePrePost( members ) {
    Object.keys( members ).forEach( function( key ) {
      delete preFns.classMethods[key];
      delete postFns.classMethods[key];
    } );
  }

  function wrapMethods( obj, scope ) {
    return Object
      .keys( obj )
      .map( function( key ) {
        var o = obj[key];
        return [ key, wrapFunction( o.original, o.pre, o.post, scope ) ];
      } )
      .reduce( function( obj, item ) {
        obj[ item[ 0 ] ] = item[ 1 ];
        return obj;
      }, {} );
  }

  function addToWrapped( source, target, name, extender, parent ) {
    Object
      .keys( source )
      .forEach( function( key ) {
        if( !target[key] ) {
          // target[key] = { original: extender[key] || parent[ key ] || scope[key] };
          target[key] = { original: extender[key] || parent[ key ] };
        }
        if ( !target[ key ][ name ] ) {
          target[ key ][ name ] = [];
        }
        target[key][name] = target[key][name].concat( source[key] );
      } );
  }

  function mergeListForObject( a, b ) {
    if ( typeof b !== 'object' ) { return a; }
    Object.keys( b ).forEach( function( key ) {
      if ( typeof a[key] === 'undefined' ) {
        a[key] = [];
      }
      a[key].push( b[key] );
    } );
    return a;
  }

}

// From Bacbone.Model.extend
function createClass( parent, protoProps, staticProps ) {
  if ( typeof parent !== 'function' ) { parent = extend( function() {}, parent ); }

  var child;

  if ( protoProps && has( protoProps, 'constructor' ) ) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply( this, arguments ); };
  }

  extend( child, parent, staticProps );

  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate;

  if ( protoProps ) extend( child.prototype, protoProps );
  child.__super__ = parent.prototype;
  return child;
}

function ensureArray( x ) {
  if ( !Array.isArray( x ) ) { return [x]; }
  return x;
}

function wrapFunction( originalFn, preFns, postFns, scope ) {
  if ( typeof preFns === 'undefined' ) {
    preFns = [];
  }

  if ( typeof postFns === 'undefined' ) {
    postFns = [];
  }

  preFns = ensureArray( preFns );
  postFns = ensureArray( postFns );

  if ( preFns.length === 0 && postFns.length === 0 ) {
    return originalFn;
  }

  return makeSeq(
    preFns
      .concat( [originalFn] )
      .concat( postFns ),
    scope
  );
}

function makeSeq( funcs, scope ) {
  var fns = funcs.slice(), len = fns.length;
  return function() {
    if ( typeof scope === 'undefined' ) {
      scope = this;
    }
    var i, fn, args =  Array.prototype.slice.call( arguments );
    for ( i = 0; i < len, fn = funcs[i]; i += 1 ) {
      args = [ fn.apply( scope, args ) ];
    }
    return args[0];
  };
}

function extend( object ) {
  var args = Array.prototype.slice.call( arguments, 1 );
  for ( var i = 0, source; source = args[i]; ++i ) {
    if ( !source ) continue;
    for ( var property in source ) {
      object[ property ] = source[ property ];
    }
  }
  return object;
};

function has( obj, key ) { return Object.prototype.hasOwnProperty.call( obj, key ); };

function preProcessFeatures( features ) {
  features = ensureArray( features );
  if ( features.length === 1 && Array.isArray( features[0] ) ) {
    features = features[0];
  }
  return features;
}

function composable() {
  var features =  Array.prototype.slice.call( arguments );

  if ( features.length === 0 ) {
    features = [ {
      instanceMembers: instanceMembers,
      classMembers: classMembers
    } ];
  } else {
    features = preProcessFeatures( features );
  }

  return compose( features );
}

function flatten( tree, list ) {
  list || ( list = [] );
  tree.forEach( function( el ) {
    if ( Array.isArray( el ) ) {
      flatten( el, list );
    } else {
      list.push( el );
    }
  } );
  return list;
}

function reject( obj, keys ) {
  var mask = ensureArray( keys )
    .reduce( function( obj, item ) {
      obj[ item ] = true;
      return obj;
    }, {} );

  return Object
    .keys( obj )
    .filter( function( k ) {
      return !mask[k];
    } )
    .reduce( function( ret, key ) {
      ret[ key ] = obj[ key ];
      return ret;
    }, {} );
}

module.exports = exports = composable;
exports.instanceMembers = instanceMembers;
exports.classMembers = classMembers;
