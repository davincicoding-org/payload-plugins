import type { Config } from 'payload';
import { getSupportedLocales } from '@/config';
import type { Locale } from '@/types';

/**
 * Resolve the fallback locale(s) for a given locale, mirroring Payload's own
 * `sanitizeFallbackLocale`: a single hop to the locale's configured
 * `fallbackLocale` if present, otherwise the `defaultLocale`. Returns an empty
 * list when Payload's localization fallback is disabled or no valid fallback
 * applies.
 */
export function resolveFallbackLocales(options: {
  localization: Config['localization'];
  locale: Locale;
}): Locale[] {
  const { localization, locale } = options;

  if (!localization || localization.fallback === false) return [];

  const knownLocales = getSupportedLocales(localization);

  const foundEntry = localization.locales.find(
    (entry) => typeof entry !== 'string' && entry.code === locale,
  );

  const localeConfig =
    foundEntry && typeof foundEntry !== 'string' ? foundEntry : undefined;

  const configuredFallback = localeConfig?.fallbackLocale;

  const candidates =
    configuredFallback == null
      ? [localization.defaultLocale]
      : Array.isArray(configuredFallback)
        ? configuredFallback
        : [configuredFallback];

  return candidates.filter(
    (code) => code !== locale && knownLocales.includes(code),
  );
}
