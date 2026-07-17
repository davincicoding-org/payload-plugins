import type { Config } from 'payload';
import { describe, expect, test } from 'vitest';
import { resolveFallbackLocales } from './fallback-locales';

const stringLocales: Config['localization'] = {
  locales: ['en', 'de', 'fr'],
  defaultLocale: 'en',
};

describe('resolveFallbackLocales', () => {
  test('returns [] when fallback is disabled', () => {
    expect(
      resolveFallbackLocales({
        localization: { ...stringLocales, fallback: false },
        locale: 'de',
      }),
    ).toEqual([]);
  });

  test('falls back to defaultLocale when no per-locale fallback', () => {
    expect(
      resolveFallbackLocales({ localization: stringLocales, locale: 'de' }),
    ).toEqual(['en']);
  });

  test('excludes the requested locale itself', () => {
    expect(
      resolveFallbackLocales({ localization: stringLocales, locale: 'en' }),
    ).toEqual([]);
  });

  test('uses a per-locale fallbackLocale string', () => {
    const localization: Config['localization'] = {
      locales: [
        { code: 'en' },
        { code: 'de' },
        { code: 'ch', fallbackLocale: 'de' },
      ],
      defaultLocale: 'en',
    } as any;
    expect(resolveFallbackLocales({ localization, locale: 'ch' })).toEqual([
      'de',
    ]);
  });

  test('uses a per-locale fallbackLocale array in order', () => {
    const localization: Config['localization'] = {
      locales: [
        { code: 'en' },
        { code: 'de' },
        { code: 'ch', fallbackLocale: ['de', 'en'] },
      ],
      defaultLocale: 'en',
    } as any;
    expect(resolveFallbackLocales({ localization, locale: 'ch' })).toEqual([
      'de',
      'en',
    ]);
  });

  test('filters unknown fallback codes', () => {
    const localization: Config['localization'] = {
      locales: [{ code: 'en' }, { code: 'ch', fallbackLocale: 'xx' }],
      defaultLocale: 'en',
    } as any;
    expect(resolveFallbackLocales({ localization, locale: 'ch' })).toEqual([]);
  });

  test('returns [] when localization is undefined', () => {
    expect(
      resolveFallbackLocales({ localization: undefined, locale: 'de' }),
    ).toEqual([]);
  });
});
