---
"payload-intl": minor
---

Add dual storage strategy (`db` and `upload`) for message persistence. Default is `db` which stores translations as JSON in the database, avoiding HTTP fetches during `next build`. Auto-migrates existing documents when switching strategies.
