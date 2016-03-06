'use strict';

/**
 * This examples extracts all the users which are part of organization 11 and
 * grants read access to them.
 */
var ShiroExpander = require('../src');

var usersInOrganization = {
    10: [ 20, 30 ],
    11: [ 33, 34 ]
}

var expander = new ShiroExpander();

expander.createRule('user', 'organization', function(rule, ids, cb) {
    var userIds = [];

    ids.forEach(function( organizationId ) {
        userIds = userIds.concat(usersInOrganization[organizationId] || []);
    })

    cb(null, userIds);
});

expander.expand('user:read:{organization:11}', function(err, statements) {
    console.log(statements);
})
