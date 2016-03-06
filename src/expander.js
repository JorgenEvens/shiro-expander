'use strict';

var ShiroRule = require('./rule');

function ShiroExpander(options) {

    this._options = options || {};

    this._reverseIndex = {};
    this._index = {};

}

ShiroExpander.prototype.createRule = function(parent, child, resolver) {
    var rule = new ShiroRule(parent, child, resolver);

    this._createIndex(parent, child, rule);
    this._expandGraph(parent, child, rule);
    this._createReverseIndex(parent, child, rule);
}

ShiroExpander.prototype._createIndex = function(parent, child, rule) {
    var index = this._index;
    var oldRule = index[parent] && index[parent][child];

    if( oldRule && (!oldRule.isGenerated() || rule.isGenerated()) )
        throw new Error('Rule already exists');

    if( !index[parent] )
        index[parent] = {};

    index[parent][child] = rule;
}

ShiroExpander.prototype._createReverseIndex = function(parent, child, rule) {
    var index = this._reverseIndex;

    if( !index[child] )
        index[child] = [];

    index[child].push({
        parent: parent,
        rule: rule
    });
}

ShiroExpander.prototype._combineRules = function(parentRule, childRule) {
    var resolver =  function(rule, ids, cb) {
        var executeChild = function(err, resultingIds) {
            if( err ) return cb(err);

            if( !Array.isArray(resultingIds) )
                resultingIds = [ resultingIds ];

            childRule.execute(resultingIds, cb);
        }

        parentRule.execute(ids, executeChild);
    };

    resolver.isGenerated = true;
    return resolver;
}

ShiroExpander.prototype._expandGraph = function(parent, child, newRule) {
    var matches = this._reverseIndex[parent];
    var i = matches ? matches.length : 0;
    var match = null;
    var source = null;
    var rule = null;

    while( i-- ) {
        match = matches[i];
        source = match.parent;
        rule = match.rule;

        if( this._index[source][child] ) continue;

        this.createRule(source, child, this._combineRules(rule, newRule));
    }
}

ShiroExpander.prototype._fromIndex = function(parent, child) {
    var index = this._index;

    if( !index[parent] )
        return null;

    return index[parent][child] || null;
}

ShiroExpander.prototype.expand = function(rule, cb) {
    var self = this;
    var ids = null;
    var parent = null;
    var child = null;

    var resolveResult = function(err, resultingIds) {
        if( err ) return cb(err);

        if( !Array.isArray(resultingIds) )
            resultingIds = [ resultingIds ];

        ids = resultingIds;
        setTimeout(next, 0);
    }

    var replacer = function(m, key, value) {
        if( m == 'me' ) {
            ids = 10;
            parent = 'me';
            child = 'me';
        } else if( child == null && parent == null ) {
            ids = value;
            parent = key;
            child = value;
        } else {
            child = parent;
            parent = key;
        }

        var shiroRule = self._fromIndex(parent, child);

        if(!shiroRule)
            return cb(new Error('Could not find relation map for "' + parent + '" -> "' + child + '"'));

        shiroRule.execute(ids, resolveResult);

        return '-';
    };

    var done = function() {
        var result = [];
        var i = ids.length;

        while( i-- ) {
            result.unshift(rule.replace(/-$/, ids[i]));
        }

        cb(null, result);
    }

    var next = function() {
        var temp = rule;

        rule = rule.replace(/\{([^:]+):([^\{\}]+)\}|me/, replacer);

        if( temp == rule )
            done();
    }

    next();
}

module.exports = ShiroExpander;
