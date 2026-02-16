# v2: `set_null` + `restrict`

## Direction difference

`cascade` hooks go on the **source** collection (the one with the relationship field).
`set_null` and `restrict` require hooks on the **target** collection (the one being
related to). This is because the trigger is the deletion of the referenced document,
not the referencing one.

Example: A `cars` collection has `owner: relationship to users` with `set_null`. When a
User is deleted, the plugin must add an `afterDelete` hook to the **users** collection
that finds all Cars pointing to that User and sets `owner` to `null`.

## `set_null` implementation

- At config time: scan all collections for `set_null` fields. For each, add an
  `afterDelete` hook on the **target** collection.
- The hook queries all collections that have a `set_null` relationship field pointing
  to the target, finds docs referencing the deleted ID, and sets the field to `null`.
- For `hasMany: true` fields, the deleted ID is removed from the array rather than
  setting the whole field to `null`.
- Trash behavior: when the target is trashed (not hard-deleted), no action is taken
  since the document still exists. Only hard deletes trigger nullification.

## `restrict` implementation

- At config time: scan all collections for `restrict` fields. For each, add a
  `beforeDelete` hook on the **target** collection.
- The hook queries all collections that have a `restrict` relationship field pointing
  to the target, checking if any document references the about-to-be-deleted ID.
- If references exist, the hook throws an error preventing the deletion.
- Trash behavior: restrict should also prevent trashing if references exist.
  This requires an additional `beforeChange` hook on the target collection to detect
  trash attempts.

## Cross-collection hook registry

Both `set_null` and `restrict` need the plugin to build a reverse index at config time:

```
targetCollection -> [
  { sourceCollection, fieldName, action, hasMany }
]
```

This allows a single hook on the target collection to handle all referencing collections
efficiently.
