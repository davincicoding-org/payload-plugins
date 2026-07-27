---
"payload-intl": minor
---

Add missing-translation fallback to a default locale. `fetchMessages` now fills keys absent in a locale from the resolved fallback locale (derived from Payload's own localization config, single-hop like `sanitizeFallbackLocale`; override or disable via the new `fallbackLocale` option). The messages editor shows the fallback locale's value as a greyed placeholder on untranslated fields.
