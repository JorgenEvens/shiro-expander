'use strict';

/**
 * This example uses the generated rule for repository -> organization to grant
 * read access to all the repositories contained within the organization.
 */
var ShiroExpander = require('../src');

var usersInOrganization = {
    10: [ 20, 30 ],
    11: [ 33, 34 ]
}

var repositoryOwnership = {
    20: [ 5, 6, 12 ],
    30: [],
    33: [],
    34: [ 12 ]
}

var expander = new ShiroExpander();

expander.createRule('repository', 'user', function(rule, ids, cb) {
    var repositoryIds = [];

    ids.forEach(function( userId ) {
        repositoryIds = repositoryIds.concat(repositoryOwnership[userId] || []);
    })

    cb(null, repositoryIds);

})

expander.createRule('user', 'organization', function(rule, ids, cb) {
    var userIds = [];

    ids.forEach(function( organizationId ) {
        userIds = userIds.concat(usersInOrganization[organizationId] || []);
    })

    cb(null, userIds);
});

expander.expand('repository:read:{organization:10}', function(err, statements) {
    if( err ) console.error(err);
    console.log(statements);
})
