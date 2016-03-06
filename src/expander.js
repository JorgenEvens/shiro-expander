'use strict';

var ShiroRule = require('./rule');

var EXPRESSION_REPLACEMENT = '-';

function ShiroExpander(options) {
    options = options || {};

    this._options = options;
    this.constants = options.constants || {};

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
        var executeParent = function(err, resultingIds) {
            if( err ) return cb(err);

            if( !Array.isArray(resultingIds) )
                resultingIds = [ resultingIds ];

            parentRule.execute(resultingIds, cb);
        }

        childRule.execute(ids, executeParent);
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

ShiroExpander.prototype._replaceConstants = function(constant) {
    var mapper = this.constants;

    if( typeof mapper === 'function' )
        return mapper(constant);

    if( typeof mapper === 'object' )
        return mapper[constant] || constant;

    return constant;
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

    var replacer = function(m, k1, v1, base, k2, v2) {
        var key = k1 || k2;
        var value = v1 || v2;

        /**
         * If `base` is set it means we have a rule in the form of
         * `object:action:(id|constant|-)`.
         *
         * If value does not translate to a constant we set it as an id,
         * which needs not further processing.
         *
         * If value is a constant or EXPRESSION_REPLACEMENT we need to do
         * one more processing step. Afterwards we are `done`.
         */
        if( base && value != EXPRESSION_REPLACEMENT &&
            self._replaceConstants(value) == value ) {
            return m;
        } else if( base ) {
            next = done;
        }

        if( child == null && parent == null ) {
            ids = [ self._replaceConstants(value) ];
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

        return (base || '') + EXPRESSION_REPLACEMENT;
    };

    var done = function() {
        var regex = new RegExp(EXPRESSION_REPLACEMENT + '$');

        if( !regex.test(rule) )
            return cb(null, [ rule ]);

        var result = [];
        var i = ids.length;

        while( i-- ) {
            result.unshift(rule.replace(regex, ids[i]));
        }

        cb(null, result);
    }

    var next = function() {
        var temp = rule;

        /**
         *
         * Matches expressions such as {user:me} and {user:10}
         * \{([^:]+):([^\{\}]+)\}
         *
         * Matches expressions at root such as file:write:me
         * ^([^:]+):[^:]+:([^:]+)$
         */

        rule = rule.replace(/\{([^:]+):([^\{\}]+)\}|^(([^:]+):[^:]+:)([^:]+)$/, replacer);

        if( temp == rule )
            done();
    }

    next();
}

module.exports = ShiroExpander;
