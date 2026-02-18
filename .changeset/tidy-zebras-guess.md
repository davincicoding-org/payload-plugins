---
"payload-discussions": minor
---

The onComment callback is a new public API addition, making this a minor bump. The refactor also changes the component props (documentId/documentCollectionSlug replaced with documentReference), which is technically breaking — but since the field component is a server-rendered internal detail, a minor bump is reasonable.
