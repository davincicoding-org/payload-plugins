import { describe, expect, test } from 'vitest';

import { getSupportedLocales } from './config';

describe('getSupportedLocales', () => {
  test('returns empty array for no localization', () => {
    expect(getSupportedLocales(false)).toEqual([]);
  });

  test('returns defaultLocale for empty locales array', () => {
    const result = getSupportedLocales({
      defaultLocale: 'en',
      locales: [],
    } as any);
    expect(result).toEqual(['en']);
  });

  test('extracts string locales', () => {
    const result = getSupportedLocales({
      defaultLocale: 'en',
      locales: ['en', 'de', 'fr'],
    } as any);
    expect(result).toEqual(['en', 'de', 'fr']);
  });

  test('extracts locale codes from objects', () => {
    const result = getSupportedLocales({
      defaultLocale: 'en',
      locales: [
        { code: 'en', label: 'English' },
        { code: 'de', label: 'German' },
      ],
    } as any);
    expect(result).toEqual(['en', 'de']);
  });
});
