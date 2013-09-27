
var uuid = require( 'uuid' );
var Backbone = require( 'backbone' );
var expect = require( 'expect.js' );

describe( 'composable', function() {

  it( '#constructor, from object', function(){

    var MyModel = require( 'composable' )( {
      classMembers: {
        test1: function( a, b ) {
          return a + b;
        },
        create: function() {
          return this.apply( this, arguments );
        }
      },

      instanceMembers: {
        constructor: function MyModel( a, b ) {
          if ( !( this instanceof MyModel ) ) {
            return new MyModel( a, b );
          }
          this.a = a;
          this.b = b;
          return this;
        },
        toJSON: function() {
          return { a: this.a, b: this.b };
        }
      }
    } );

    var m1 = MyModel.create( 3, 4 );
    expect( m1.toJSON() ).to.eql( { a: 3, b: 4 } );
    expect( MyModel.test1( 2, 4 ) ).to.be( 6 );

  } );

  it( '#constructor, from function', function(){
    var M1 = require( 'composable' )( Backbone.Model );
    var M2 = require( 'composable' )( _M2 );

    function _M2( a, b ) {
      this.a = a;
      this.b = b;
      return this;
    }
    M2.prototype.addAB = function() {
      return this.a + this.b;
    };

    var m1 = new M1( { x: 1, y: 2, z:3 } );
    var m2 = new M2( 7, 8 );
    expect( m1.toJSON() ).to.eql( { x: 1, y: 2, z: 3 } );
    expect( m2.addAB() ).to.be( 15 );
  } );

  it( '#constructor, from array', function(){
    var B0 = Backbone.Model;

    var B1 = [ {
      getX: function() { return this.get( 'x' ); }
    }, {
      addX: function( m1, m2 ) {
        return m1.getX() + m2.getX();
      }
    } ];

    var B2 = [ {
      getX: function() { return this.get( 'x' ) + 3; },
      getY: function() { return this.get( 'y' ); }
    }, {
      addX: function( m1, m2 ) {
        return m1.getX()*2 + m2.getX()*2;
      }
    } ];

    var M1 = require( 'composable' )( B0, B1 );
    var M2 = require( 'composable' )( [ B0, B1, B2 ] );
    var M3 = require( 'composable' )( B0, B1, B2 );

    var m1 = new M1( { x: 1, y: 2, z:3 } );
    var m2 = new M2( { x: 1, y: 2, z:3 } );

    expect( m1.getX() ).to.be( 1 );
    expect( m2.getX() ).to.be( 4 );
    expect( m2.getY() ).to.be( 2 );
    expect( M1.addX( m1, m2 ) ).to.be( 5 );
    expect( M2.addX( m1, m2 ) ).to.be( 10 );
    expect( M3.addX( m1, m2 ) ).to.be( 10 );
  } );

  it( '#create', function() {
    var MyModel = require( 'composable' )();
    var m1 = MyModel.create( { x: 1, y: 2, z: 3 } );
    var m2 = MyModel.create( { id: 2, a: 4 } );

    expect( m1.x ).to.be( 1 );
    expect( m1.y ).to.be( 2 );
    expect( m1.z ).to.be( 3 );
    expect( m2.id ).to.be( 2 );
    expect( m2.a ).to.be( 4 );

  } );

  it( '#use', function() {
    var composable = require( 'composable' );

    var M = composable()
      .use( Backbone.Model )
      .use( {
        classMembers: {
          nextId: function() {
            var maxId = 1;
            return function() {
              return maxId++;
            };
          }(),
          create: function( json ) {
            var ret = new this.prototype.constructor( json );
            ret.set( 'id', this.nextId() );
            return ret;
          }
        },
        pre: {
          classMembers: {
            create: function( json ) {
              var args =  Array.prototype.slice.call( arguments );
              if ( args.length > 1 ) {
                json = {};
                json.ndm = args[ 0 ];
                json.ndf = args[ 1 ];
              }
              return json;
            }
          }
        },
        post: {
          classMembers: {
            nextId: function( id ) {
              return id + 20;
            }
          }
        }
      } )
      .getComposed();

    var m1 = M.create();
    var m2 = M.create();
    var m3 = M.create();
    var m4 = M.create( { ndm: 2, ndf: 3 } );
    var m5 = M.create( 3, 6 );

    expect( m1.id ).to.be( 21 );
    expect( m2.id ).to.be( 22 );
    expect( m3.toJSON() ).to.eql( { id: 23 } );
    expect( m4.toJSON() ).to.eql( { id: 24, ndm: 2, ndf:3 } );
    expect( m5.toJSON() ).to.eql( { id: 25, ndm: 3, ndf:6 } );
  } );

  var bbCreate = {
    classMembers: {
      create: function( json ) { return new this( json ); }
    }
  };

  it( '#pre', function() {
    var parseArgs = function( json ) {
      var args =  Array.prototype.slice.call( arguments );
      if ( args.length > 1 ) {
        json = {};
        json.ndm = args[ 0 ];
        json.ndf = args[ 1 ];
      }
      return json;
    };

    var ISEModel = require( 'composable' )()
      .use( Backbone.Model )
      .use( bbCreate )
      .pre( 'create', parseArgs )
      .getComposed();

    var m5 = ISEModel.create( 3, 6 );
    expect( m5.toJSON() ).to.eql( { ndm: 3, ndf:6 } );

    var f1 = function() {
      return require( 'composable' )()
        .use( Backbone.Model )
        .use( bbCreate )
        .pre( 'create', parseArgs, 'instance' )
        .getComposed();
    };

    expect( f1 ).to.throwError( function( e ) {
      expect( e.message ).to.be( 'composable::pre: No such instance method create' );
    } );

  } );

  it( '#post', function() {
    var count = 30;
    var setId = function( model ) {
      model.set( 'id', count++ );
      return model;
    };

    var ISEModel = require( 'composable' )()
      .use( Backbone.Model )
      .use( bbCreate )
      .post( 'create', setId )
      .getComposed();

    var m1 = ISEModel.create();
    var m2 = ISEModel.create();
    expect( m1.toJSON() ).to.eql( { id: 30 } );
    expect( m2.id ).to.eql( 31 );

  } );


} );
