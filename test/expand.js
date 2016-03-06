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

    it('should parse a rule correctly', function(done) {
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

        expander.expand('file:write:{user:{organization:me}}', function(err, result) {
            if( err ) go(err);

            assert.deepEqual(result, [
                'file:write:26',
                'file:write:27',
                'file:write:28'
            ]);
            go();
        });

        expander.expand('file:write:{user:me}', function(err, result) {
            if( err ) go(err);

            assert.deepEqual(result, [
                'file:write:29',
                'file:write:30'
            ]);
            go();
        });

        expander.expand('file:write:{organization:me}', function(err, result) {
            if( err ) go(err);

            assert.deepEqual(result, [
                'file:write:29',
                'file:write:30'
            ]);
            go();
        })

        expander.expand('file:write:me', function(err, result) {
            if( err ) go(err);
            assert.deepEqual(result, [
                'file:write:31'
            ]);

            go();
        })
    })

})
