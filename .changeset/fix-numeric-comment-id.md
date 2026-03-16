---
"payload-discussions": patch
---

Fix 500 error when creating comments on collections with numeric IDs by using `documentIdSchema` instead of `z.string()` for the comment `id` field in `populatedCommentSchema`.
