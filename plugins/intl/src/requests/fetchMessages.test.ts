import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/const', () => ({
  pluginContext: {
    get: vi.fn(),
  },
}));

vi.mock('@/utils/error-handling', () => ({
  getErrorMessage: vi.fn(),
}));

import { PLUGIN_CONTEXT } from '@/const';

describe('fetchMessagesFromPayload', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('returns data field directly for db strategy', async () => {
    const mockMessages = { common: { hello: 'Hello' } };
    const mockPayload = {
      find: vi.fn().mockResolvedValue({
        docs: [{ locale: 'en', data: mockMessages }],
      }),
      config: {},
    };

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });

    const { fetchMessages: fetchMessagesFromPayload } = await import(
      './fetchMessages'
    );
    const result = await fetchMessagesFromPayload(mockPayload as any, 'en');
    expect(result).toEqual(mockMessages);
  });

  test('returns empty object when no doc found', async () => {
    const mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      config: {},
    };

    vi.mocked(PLUGIN_CONTEXT.get).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });

    const { fetchMessages: fetchMessagesFromPayload } = await import(
      './fetchMessages'
    );
    const result = await fetchMessagesFromPayload(mockPayload as any, 'en');
    expect(result).toEqual({});
  });
});
