import type { Config } from 'payload';
import type { Locale } from './types';

export const getSupportedLocales = (
  localization: Config['localization'],
): Locale[] => {
  if (!localization) {
    return [];
  }
  if (localization.locales.length === 0) {
    return [localization.defaultLocale];
  }
  return localization.locales.map((locale) => {
    if (typeof locale === 'string') {
      return locale;
    }
    return locale.code;
  });
};
