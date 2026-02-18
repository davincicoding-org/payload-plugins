---
"payload-discussions": minor
---

Rewrite comment UI with new component architecture (CommentCard, CommentComposer, CommentThread, CommentsPanel, CommentProvider, CommentContext). Add onComment callback with thread context resolution, collapsible reply threads, auto-growing textarea, sticky reply button, relative timestamps, and single-reply enforcement. Simplify endpoints, remove old component implementations, and use string type for collectionSlug.
