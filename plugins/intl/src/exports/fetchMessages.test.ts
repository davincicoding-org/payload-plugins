import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/const', () => ({
  PLUGIN_CONTEXT: {
    get: vi.fn(),
  },
}));

vi.mock('@/utils/error-handling', () => ({
  getErrorMessage: vi.fn(),
}));

import { PLUGIN_CONTEXT } from '@/const';

describe('fetchMessages', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('returns data from findGlobal', async () => {
    const mockMessages = { common: { hello: 'Hello' } };
    const mockPayload = {
      findGlobal: vi.fn().mockResolvedValue({ data: mockMessages }),
      config: {},
    };

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({
      globalSlug: 'messages',
    });

    const { fetchMessages } = await import('./fetchMessages');
    const result = await fetchMessages(mockPayload as any, 'en');

    expect(result).toEqual(mockMessages);
    expect(mockPayload.findGlobal).toHaveBeenCalledWith({
      slug: 'messages',
      locale: 'en',
      fallbackLocale: false,
      select: { data: true },
    });
  });

  test('throws when plugin context is missing', async () => {
    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue(undefined as any);

    const { fetchMessages } = await import('./fetchMessages');

    await expect(fetchMessages({ config: {} } as any, 'en')).rejects.toThrow(
      '[payload-intl] Plugin context not found',
    );
  });

  test('works transparently with file storage (afterRead populates data)', async () => {
    // When uploadCollection is set, findGlobal triggers the afterRead hook
    // which populates doc.data from the file. fetchMessages sees the
    // populated data without needing any code changes.
    const mockMessages = { nav: { home: 'Home' } };
    const mockPayload = {
      findGlobal: vi.fn().mockResolvedValue({ data: mockMessages }),
      config: {},
    };

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({
      globalSlug: 'messages',
    });

    const { fetchMessages } = await import('./fetchMessages');
    const result = await fetchMessages(mockPayload as any, 'en');

    expect(result).toEqual(mockMessages);
    expect(mockPayload.findGlobal).toHaveBeenCalledWith({
      slug: 'messages',
      locale: 'en',
      fallbackLocale: false,
      select: { data: true },
    });
  });

  test('merges missing keys from the fallback locale', async () => {
    const perLocale: Record<string, unknown> = {
      de: { common: { greeting: 'Hallo {name}!' } },
      en: { common: { greeting: 'Hello {name}!', items: 'items' } },
    };
    const mockPayload = {
      findGlobal: vi.fn(({ locale }: { locale: string }) =>
        Promise.resolve({ data: perLocale[locale] }),
      ),
      config: {
        localization: { locales: ['en', 'de'], defaultLocale: 'en' },
      },
    };

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({ globalSlug: 'messages' });

    const { fetchMessages } = await import('./fetchMessages');
    const result = await fetchMessages(mockPayload as any, 'de');

    expect(result).toEqual({
      common: { greeting: 'Hallo {name}!', items: 'items' },
    });
    expect(mockPayload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'de', fallbackLocale: false }),
    );
    expect(mockPayload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', fallbackLocale: false }),
    );
  });

  test('fallbackLocale:false disables the merge', async () => {
    const perLocale: Record<string, unknown> = {
      de: { common: { greeting: 'Hallo {name}!' } },
      en: { common: { greeting: 'Hello {name}!', items: 'items' } },
    };
    const mockPayload = {
      findGlobal: vi.fn(({ locale }: { locale: string }) =>
        Promise.resolve({ data: perLocale[locale] }),
      ),
      config: {
        localization: { locales: ['en', 'de'], defaultLocale: 'en' },
      },
    };

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({ globalSlug: 'messages' });

    const { fetchMessages } = await import('./fetchMessages');
    const result = await fetchMessages(mockPayload as any, 'de', {
      fallbackLocale: false,
    });

    expect(result).toEqual({ common: { greeting: 'Hallo {name}!' } });
    expect(mockPayload.findGlobal).toHaveBeenCalledTimes(1);
  });
});
