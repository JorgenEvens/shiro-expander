# Shiro expander [![Circle CI](https://circleci.com/gh/JorgenEvens/shiro-expander.svg?style=svg)](https://circleci.com/gh/JorgenEvens/shiro-expander)

Summarize Apache Shiro statements by expressing them using relations between different entities.

## Syntax

This library allows statements to be summarized into a single statement, the syntax for such a summarized statement is
as follows:

```
file:write:{user:me}
```

You can then define rules which dictate how this expression is expanded, to expand this statement we create 2 rules.

Expand the relation `user -> me` into user ids.

```javascript
expander.createRule('user', 'me', function(rule, ids, cb) {
    // Find the user associated with the current user
    someDatabase.query('a-query', function(err, result) {
        cb(null, result.id);
    })
})
```

Expand the relation `file -> user` into file ids.

```javascript
expander.createRule('file', 'user', function(rule, ids, cb) {
    // Find the files owned by the users in `ids`.

    someDatabase.query('select files where userId in ids', function( err, result) {
        var fileIds = result.map(result, function(f) { return f.id; });
        cb(err, fileIds);
    })
})
```

Finally expand the rule using the created `expander`:

```javascript
expander.expand('file:write:{user:me}', function(err, statements) {
    // Statements will contain a rule for each `fileId` in `fileIds`.
    // Statements is an array with values in the following format `file:write:<fileId>`
})
```

## Rule generation

Some rules will be inferred from the rules already generated.

From the rules below we will be able to infer other rules:

```
file -> user
user -> organization
organization -> me
```

The library will automatically generate the following rules:

```
file -> organization
file -> me
user -> me
```

These will chain the rules such that there is a path between each relation.
```
file -> me
equals
file -> user -> organization -> me
```
