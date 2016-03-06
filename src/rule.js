'use strict';

function ShiroRule(parent, child, resolver) {
    this._parent = parent;
    this._child = child;
    this._resolver = resolver;
}

ShiroRule.prototype.execute = function(ids, cb) {
    this._resolver(this, ids, cb);
}

ShiroRule.prototype.isGenerated = function() {
    return this._resolver.isGenerated || false;
}

module.exports = ShiroRule;
