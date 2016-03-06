'use strict';

var assert = require('assert');
var ShiroExpander = require('../src');

describe('expand', function() {

    var expander = null;

    beforeEach(function() {
        expander = new ShiroExpander();
    })

    it('Should expand rules correctly', function() {

        expander.createRule('file', 'user', function() {});
        expander.createRule('user', 'organization', function() {});

        var expanderIndex = expander._index;
        assert(expanderIndex['file'], 'Index knows about file');
        assert(expanderIndex['file']['organization'], 'Index knows about the relation between file and organization');
    })

    it('should expand an expression correctly', function(done) {
        var callbacks = 3;
        var go = function(err) {
            if( err ) {
                go = function() {};
                done(err);
                return;
            }

            if( --callbacks == 0 )
                done();
        };

        expander.createRule('file', 'user', function(rule, ids, cb) {
            cb(null, [23, 24, 25]);
        });
        expander.createRule('user', 'organization', function(rule, ids, cb) {
            cb(null, [26, 27, 28]);
        });
        expander.createRule('organization', 'me', function(rule, ids, cb) {
            cb(null, [29, 30]);
        });
        expander.createRule('me', 'me', function(rule, ids, cb) {
            cb(null, 31);
        })

        expander.constants['me'] = 99;

        expander.expand('file:write:{user:{organization:me}}', function(err, result) {
            if( err ) go(err);

            assert.deepEqual(result, [
                'file:write:23',
                'file:write:24',
                'file:write:25'
            ], 'file:write:{user:{organization:me}}');
            go();
        });

        expander.expand('file:write:{user:me}', function(err, result) {
            if( err ) go(err);

            assert.deepEqual(result, [
                'file:write:23',
                'file:write:24',
                'file:write:25'
            ], 'file:write:{user:me}');
            go();
        });

        expander.expand('file:write:{organization:me}', function(err, result) {
            if( err ) go(err);

            assert.deepEqual(result, [
                'file:write:23',
                'file:write:24',
                'file:write:25'
            ], 'file:write:{organization:me}');
            go();
        })
    })

    it('should expand a basic expression correctly', function(done) {
        var callbacks = 2;
        var go = function(err) {
            if( err ) {
                go = function() {};
                done(err);
                return;
            }

            if( --callbacks == 0 )
                done();
        };

        expander.createRule('file', 'user', function(rule, ids, cb) {
            cb(null, [23, 24, 25]);
        });
        expander.createRule('user', 'organization', function(rule, ids, cb) {
            cb(null, [26, 27, 28]);
        });
        expander.createRule('organization', 'me', function(rule, ids, cb) {
            cb(null, [29, 30]);
        });

        expander.constants['me'] = 99;

        expander.expand('file:write:me', function(err, result) {
            if( err ) return go(err);

            assert.deepEqual(result, [
                'file:write:23',
                'file:write:24',
                'file:write:25'
            ], 'file:write:me');
            go();
        })

        expander.expand('file:write:10', function(err, result) {
            if( err ) return go(err);

            assert.deepEqual(result, [
                'file:write:10'
            ], 'file:write:10');

            go();
        })

    })

    it('should overwrite infered rule', function(done) {
        expander.createRule('file', 'user', function(rule, ids, cb) {
            cb(null, [23, 24, 25]);
        });
        expander.createRule('user', 'organization', function(rule, ids, cb) {
            cb(null, [26, 27, 28]);
        });
        expander.createRule('organization', 'me', function(rule, ids, cb) {
            cb(null, [29, 30]);
        });
        expander.createRule('file', 'me', function(rule, ids, cb) {
            cb(null, [10, 20]);
        })

        expander.constants['me'] = 99;

        expander.expand('file:write:me', function(err, result) {
            if( err ) return done(err);

            assert.deepEqual(result, [
                'file:write:10',
                'file:write:20'
            ], 'file:write:me');
            done();
        })

    })

    it('should not overwrite existing rule', function(done) {
        expander.createRule('file', 'user', function(rule, ids, cb) {
            cb(null, [23, 24, 25]);
        });
        expander.createRule('user', 'organization', function(rule, ids, cb) {
            cb(null, [26, 27, 28]);
        });

        try {
            expander.createRule('file', 'user', function(rule, ids, cb) {
                cb(null, [10, 20]);
            })
        } catch( e ) {
            return done();
        }

        done(new Error('Should have failed.'));
    })

    it('should forward errors', function(done) {
        expander.createRule('file', 'me', function(rule, ids, cb) {
            cb(new Error('yes!'));
        });

        expander.constants['me'] = 10;

        expander.expand('file:write:me', function(err, result) {
            assert(err, 'Should forward the error');
            done();
        })
    })

    it('should map constants from object', function(done) {
        expander.createRule('file', 'me', function(rule, ids, cb) {
            assert.deepEqual(ids, [10]);
            cb(null, [15]);
        });

        expander.constants['me'] = 10;

        expander.expand('file:write:me', function(err, result) {
            assert.deepEqual(result, ['file:write:15']);
            done();
        })
    })

    it('should map constants from function', function(done) {
        expander.createRule('file', 'me', function(rule, ids, cb) {
            assert.deepEqual(ids, [10]);
            cb(null, [15]);
        });

        expander.constants = function(constant) {
            return 10;
        }

        expander.expand('file:write:me', function(err, result) {
            assert.deepEqual(result, ['file:write:15']);
            done();
        })
    })

    it('should return value when no constants mapper', function(done) {
        expander.constants = 'empty';

        expander.expand('file:write:10', function(err, result) {
            assert.deepEqual(result, ['file:write:10']);
            done();
        })
    })

    it('should converted scalar resultingIds to arrays', function(done) {
        expander.createRule('file', 'me', function(rule, ids, cb) {
            assert.deepEqual(ids, [10]);
            cb(null, 15);
        });

        expander.constants['me'] = 10;

        expander.expand('file:write:me', function(err, result) {
            assert.deepEqual(result, ['file:write:15']);
            done();
        })
    })

    it('should converted scalar resultingIds to arrays for combined rules', function(done) {
        expander.createRule('file', 'organization', function(rule, ids, cb) {
            cb(null, 15);
        });
        expander.createRule('organization', 'me', function(rule, ids, cb) {
            cb(null, 15);
        });

        expander.constants['me'] = 10;

        expander.expand('file:write:me', function(err, result) {
            assert.deepEqual(result, ['file:write:15']);
            done();
        })
    })

    it('should throw on invalid type on left side of relation', function(done) {
        expander.constants['me'] = 10;

        expander.expand('file:write:me', function(err, result) {
            assert(err);
            done();
        })
    })

    it('should throw on invalid type on right side of relation', function(done) {
        expander.createRule('file', 'organization', function(rule, ids, cb) {
            cb(null, 15);
        });

        expander.constants['me'] = 10;

        expander.expand('file:write:me', function(err, result) {
            assert(err);
            done();
        })
    })

    it('should forward errors in combined rules', function(done) {
        expander.createRule('file', 'organization', function(rule, ids, cb) {
            cb(null, 15);
        });
        expander.createRule('organization', 'me', function(rule, ids, cb) {
            cb(new Error('yes!'));
        });

        expander.constants['me'] = 10;

        expander.expand('file:write:me', function(err, result) {
            assert(err);
            done();
        })
    })

});
