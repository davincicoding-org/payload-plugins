import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/const', () => ({
  PLUGIN_CONTEXT: {
    get: vi.fn(),
  },
}));

vi.mock('@/exports/fetchMessages', () => ({
  fetchMessages: vi.fn(),
}));

vi.mock('@/config', () => ({
  getSupportedLocales: vi.fn(),
}));

import { getSupportedLocales } from '@/config';
import { PLUGIN_CONTEXT } from '@/const';
import { fetchMessages } from '@/exports/fetchMessages';
import {
  createExtractScopedMessagesHook,
  populateMessagesField,
} from './hooks';

describe('createAfterReadHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should populate _intlMessages with scoped translations for each locale', async () => {
    vi.mocked(getSupportedLocales).mockReturnValue(['en', 'de']);
    vi.mocked(fetchMessages)
      .mockResolvedValueOnce({
        header: { title: 'Hello' },
        footer: { copy: '2024' },
      })
      .mockResolvedValueOnce({
        header: { title: 'Hallo' },
        footer: { copy: '2024' },
      });

    const hook = populateMessagesField('header');
    const doc = { slug: 'header', title: 'test' };
    const req = {
      payload: {
        config: {
          localization: { locales: ['en', 'de'], defaultLocale: 'en' },
        },
      },
    };

    const result = await hook({
      doc,
      req: req as any,
      context: {},
      global: {} as any,
      findMany: false,
      query: {},
    });

    expect(result).toEqual({
      slug: 'header',
      title: 'test',
      _intlMessages: {
        en: { title: 'Hello' },
        de: { title: 'Hallo' },
      },
    });
  });

  it('should return empty objects for locales missing the scope key', async () => {
    vi.mocked(getSupportedLocales).mockReturnValue(['en']);
    vi.mocked(fetchMessages).mockResolvedValueOnce({
      footer: { copy: '2024' },
    });

    const hook = populateMessagesField('header');
    const result = await hook({
      doc: {},
      req: { payload: { config: { localization: {} } } } as any,
      context: {},
      global: {} as any,
      findMany: false,
      query: {},
    });

    expect(result._intlMessages).toEqual({ en: {} });
  });

  it('should return empty _intlMessages when no locales are configured', async () => {
    vi.mocked(getSupportedLocales).mockReturnValue([]);

    const hook = populateMessagesField('header');
    const result = await hook({
      doc: { existing: true },
      req: { payload: { config: { localization: null } } } as any,
      context: {},
      global: {} as any,
      findMany: false,
      query: {},
    });

    expect(result).toEqual({ existing: true, _intlMessages: {} });
    expect(fetchMessages).not.toHaveBeenCalled();
  });
});

describe('createBeforeChangeHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return data unchanged when _intlMessages is undefined', async () => {
    const hook = createExtractScopedMessagesHook('header');
    const data = { title: 'test' };

    const result = await hook({
      data,
      req: {} as any,
      context: {},
      global: {} as any,
      originalDoc: {},
    });

    expect(result).toBe(data);
  });

  it('should return data unchanged when plugin context is missing', async () => {
    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue(undefined as any);

    const hook = createExtractScopedMessagesHook('header');
    const data = { title: 'test', _intlMessages: { en: { title: 'Hello' } } };

    const result = await hook({
      data,
      req: { payload: { config: {} } } as any,
      context: {},
      global: {} as any,
      originalDoc: {},
    });

    expect(result).toBe(data);
  });

  it('should merge scoped messages into existing doc and strip _intlMessages', async () => {
    const mockUpdate = vi.fn();
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 'doc-1', data: { footer: { copy: '2024' } } }],
    });

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
      scopes: new Map(),
    });

    const hook = createExtractScopedMessagesHook('header');
    const data = {
      title: 'test',
      _intlMessages: { en: { title: 'Hello' } },
    };

    const req = {
      payload: {
        config: {},
        find: mockFind,
        update: mockUpdate,
        create: vi.fn(),
      },
    };

    const result = await hook({
      data,
      req: req as any,
      context: {},
      global: {} as any,
      originalDoc: {},
    });

    expect(mockFind).toHaveBeenCalledWith({
      collection: 'messages',
      where: { locale: { equals: 'en' } },
      limit: 1,
      req,
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      collection: 'messages',
      id: 'doc-1',
      data: { data: { footer: { copy: '2024' }, header: { title: 'Hello' } } },
      req,
    });

    expect(result).toEqual({ title: 'test' });
    expect(result).not.toHaveProperty('_intlMessages');
  });

  it('should create a new doc when no existing doc is found for a locale', async () => {
    const mockCreate = vi.fn();
    const mockFind = vi.fn().mockResolvedValue({ docs: [] });

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
      scopes: new Map(),
    });

    const hook = createExtractScopedMessagesHook('header');
    const data = {
      _intlMessages: { de: { title: 'Hallo' } },
    };

    const req = {
      payload: {
        config: {},
        find: mockFind,
        create: mockCreate,
        update: vi.fn(),
      },
    };

    const result = await hook({
      data,
      req: req as any,
      context: {},
      global: {} as any,
      originalDoc: {},
    });

    expect(mockCreate).toHaveBeenCalledWith({
      collection: 'messages',
      data: { locale: 'de', data: { header: { title: 'Hallo' } } },
      req,
    });

    expect(result).toEqual({});
  });

  it('should handle multiple locales in a single save', async () => {
    const mockUpdate = vi.fn();
    const mockCreate = vi.fn();
    const mockFind = vi
      .fn()
      .mockResolvedValueOnce({
        docs: [{ id: 'en-doc', data: { existing: 'data' } }],
      })
      .mockResolvedValueOnce({ docs: [] });

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
      scopes: new Map(),
    });

    const hook = createExtractScopedMessagesHook('nav');
    const data = {
      _intlMessages: {
        en: { home: 'Home' },
        fr: { home: 'Accueil' },
      },
    };

    const req = {
      payload: {
        config: {},
        find: mockFind,
        update: mockUpdate,
        create: mockCreate,
      },
    };

    await hook({
      data,
      req: req as any,
      context: {},
      global: {} as any,
      originalDoc: {},
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledOnce();
  });
});
