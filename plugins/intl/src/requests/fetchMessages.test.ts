import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/utils/config', () => ({
  getPluginContext: vi.fn(),
}));

vi.mock('@/utils/error-handling', () => ({
  getErrorMessage: vi.fn(),
}));

import { getPluginContext } from '@/utils/config';

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

    vi.mocked(getPluginContext).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });

    const { fetchMessagesFromPayload } = await import(
      './fetchMessageFromPayload'
    );
    const result = await fetchMessagesFromPayload(mockPayload as any, 'en');
    expect(result).toEqual(mockMessages);
  });

  test('returns empty object when no doc found', async () => {
    const mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      config: {},
    };

    vi.mocked(getPluginContext).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });

    const { fetchMessagesFromPayload } = await import(
      './fetchMessageFromPayload'
    );
    const result = await fetchMessagesFromPayload(mockPayload as any, 'en');
    expect(result).toEqual({});
  });
});
