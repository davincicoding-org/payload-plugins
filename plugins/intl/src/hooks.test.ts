import type { FieldHookArgs } from 'payload';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createExtractScopedMessagesHook,
  createPopulateScopedMessagesHook,
} from './hooks';
import type { Messages } from './types';

const mockFindGlobal = vi.fn();
const mockUpdateGlobal = vi.fn();

function fieldHookArgs(
  overrides: Partial<FieldHookArgs<any, Messages, any>>,
): FieldHookArgs<any, Messages, any> {
  return {
    context: {},
    operation: 'read',
    originalDoc: {},
    overrideAccess: false,
    previousValue: undefined,
    req: {
      locale: 'en',
      payload: {
        findGlobal: mockFindGlobal,
        updateGlobal: mockUpdateGlobal,
      },
    },
    value: undefined,
    ...overrides,
  } as unknown as FieldHookArgs<any, Messages, any>;
}

describe('createPopulateScopedMessagesHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return scoped messages from the global for the current locale', async () => {
    mockFindGlobal.mockResolvedValueOnce({
      data: {
        header: { title: 'Hello' },
        footer: { copy: '2024' },
      },
    });

    const hook = createPopulateScopedMessagesHook({
      globalSlug: 'messages',
      scope: 'header',
    });

    const result = await hook(
      fieldHookArgs({
        req: { locale: 'en', payload: { findGlobal: mockFindGlobal } } as any,
      }),
    );

    expect(mockFindGlobal).toHaveBeenCalledWith({
      slug: 'messages',
      locale: 'en',
      select: { data: true },
    });
    expect(result).toEqual({ title: 'Hello' });
  });

  it('should return empty object when no locale is set', async () => {
    const hook = createPopulateScopedMessagesHook({
      globalSlug: 'messages',
      scope: 'header',
    });

    const result = await hook(
      fieldHookArgs({
        req: {
          locale: undefined,
          payload: { findGlobal: mockFindGlobal },
        } as any,
      }),
    );

    expect(mockFindGlobal).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should return undefined when the scope key is missing from messages', async () => {
    mockFindGlobal.mockResolvedValueOnce({
      data: { footer: { copy: '2024' } },
    });

    const hook = createPopulateScopedMessagesHook({
      globalSlug: 'messages',
      scope: 'header',
    });

    const result = await hook(
      fieldHookArgs({
        req: { locale: 'en', payload: { findGlobal: mockFindGlobal } } as any,
      }),
    );

    expect(result).toBeUndefined();
  });
});

describe('createExtractScopedMessagesHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty object when value is falsy', async () => {
    const hook = createExtractScopedMessagesHook({
      globalSlug: 'messages',
      scope: 'header',
    });

    const result = await hook(fieldHookArgs({ value: undefined }));

    expect(mockFindGlobal).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should return value unchanged when it equals previousValue', async () => {
    const value = { title: 'Hello' };

    const hook = createExtractScopedMessagesHook({
      globalSlug: 'messages',
      scope: 'header',
    });

    const result = await hook(
      fieldHookArgs({ value, previousValue: { title: 'Hello' } }),
    );

    expect(mockFindGlobal).not.toHaveBeenCalled();
    expect(result).toBe(value);
  });

  it('should merge scoped messages into the global and return value', async () => {
    mockFindGlobal.mockResolvedValueOnce({
      data: { footer: { copy: '2024' } },
    });

    const hook = createExtractScopedMessagesHook({
      globalSlug: 'messages',
      scope: 'header',
    });

    const value = { title: 'Hello' };
    const result = await hook(
      fieldHookArgs({
        value,
        previousValue: { title: 'Old' },
        req: {
          locale: 'en',
          payload: {
            findGlobal: mockFindGlobal,
            updateGlobal: mockUpdateGlobal,
          },
        } as any,
      }),
    );

    expect(mockFindGlobal).toHaveBeenCalledWith({
      slug: 'messages',
      locale: 'en',
      select: { data: true },
    });

    expect(mockUpdateGlobal).toHaveBeenCalledWith({
      slug: 'messages',
      locale: 'en',
      data: {
        data: {
          footer: { copy: '2024' },
          header: { title: 'Hello' },
        },
      },
    });

    expect(result).toBe(value);
  });

  it('should write to the global even when no prior messages exist', async () => {
    mockFindGlobal.mockResolvedValueOnce({ data: {} });

    const hook = createExtractScopedMessagesHook({
      globalSlug: 'messages',
      scope: 'nav',
    });

    const value = { home: 'Home' };
    await hook(
      fieldHookArgs({
        value,
        previousValue: undefined,
        req: {
          locale: 'en',
          payload: {
            findGlobal: mockFindGlobal,
            updateGlobal: mockUpdateGlobal,
          },
        } as any,
      }),
    );

    expect(mockUpdateGlobal).toHaveBeenCalledWith({
      slug: 'messages',
      locale: 'en',
      data: { data: { nav: { home: 'Home' } } },
    });
  });
});
