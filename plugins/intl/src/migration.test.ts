import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { migrateStorageStrategy } from './migration';

vi.mock('./const', () => ({
  pluginContext: {
    get: vi.fn(),
  },
}));

import { pluginContext } from './const';

const mockedGet = vi.mocked(pluginContext.get);

function createMockPayload(docs: Record<string, unknown>[]) {
  return {
    config: { custom: {} },
    find: vi.fn().mockResolvedValue({ docs }),
    update: vi.fn().mockResolvedValue({}),
  } as unknown as Parameters<typeof migrateStorageStrategy>[0];
}

describe('migrateStorageStrategy', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ greeting: 'hello' }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should skip when no documents exist', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });
    const payload = createMockPayload([]);

    await migrateStorageStrategy(payload);

    expect(payload.update).not.toHaveBeenCalled();
  });

  test('should skip documents that already match the current strategy (db with data)', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });
    const payload = createMockPayload([
      { id: '1', locale: 'en', data: { greeting: 'hello' } },
    ]);

    await migrateStorageStrategy(payload);

    expect(payload.update).not.toHaveBeenCalled();
  });

  test('should skip documents that already match the current strategy (upload with url)', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'upload',
    });
    const payload = createMockPayload([
      { id: '1', locale: 'en', url: 'http://example.com/en.json' },
    ]);

    await migrateStorageStrategy(payload);

    expect(payload.update).not.toHaveBeenCalled();
  });

  test('should migrate from upload to db when storage is db and doc has url but no data', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });
    const payload = createMockPayload([
      { id: '1', locale: 'en', url: 'http://example.com/en.json' },
    ]);

    await migrateStorageStrategy(payload);

    expect(fetch).toHaveBeenCalledWith('http://example.com/en.json');
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'messages',
      id: '1',
      data: { data: { greeting: 'hello' } },
    });
  });

  test('should continue on fetch failure during upload-to-db migration', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const payload = createMockPayload([
      { id: '1', locale: 'en', url: 'http://example.com/en.json' },
      { id: '2', locale: 'de', url: 'http://example.com/de.json' },
    ]);

    await migrateStorageStrategy(payload);

    expect(payload.update).not.toHaveBeenCalled();
  });

  test('should handle errors during upload-to-db migration gracefully', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );
    const payload = createMockPayload([
      { id: '1', locale: 'en', url: 'http://example.com/en.json' },
    ]);

    await expect(migrateStorageStrategy(payload)).resolves.toBeUndefined();
    expect(payload.update).not.toHaveBeenCalled();
  });

  test('should migrate from db to upload when storage is upload and doc has data but no url', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'upload',
    });
    const payload = createMockPayload([
      { id: '1', locale: 'en', data: { greeting: 'hello' } },
    ]);

    await migrateStorageStrategy(payload);

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'messages',
        id: '1',
        data: {},
        file: expect.objectContaining({
          mimetype: 'application/json',
          name: expect.stringMatching(/^en-\d+\.json$/),
        }),
      }),
    );
  });

  test('should include correct JSON content in the uploaded file during db-to-upload migration', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'upload',
    });
    const payload = createMockPayload([
      { id: '1', locale: 'en', data: { greeting: 'hello' } },
    ]);

    await migrateStorageStrategy(payload);

    const updateCall = vi.mocked(payload.update).mock.calls[0]?.[0] as {
      file: { data: Buffer };
    };
    const fileContent = JSON.parse(updateCall.file.data.toString('utf-8'));
    expect(fileContent).toEqual({ greeting: 'hello' });
  });

  test('should handle errors during db-to-upload migration gracefully', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'upload',
    });
    const payload = createMockPayload([
      { id: '1', locale: 'en', data: { greeting: 'hello' } },
    ]);
    vi.mocked(payload.update).mockRejectedValue(new Error('DB error'));

    await expect(migrateStorageStrategy(payload)).resolves.toBeUndefined();
  });

  test('should migrate multiple documents in sequence', async () => {
    mockedGet.mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ greeting: 'hello' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ greeting: 'hallo' }),
        }),
    );
    const payload = createMockPayload([
      { id: '1', locale: 'en', url: 'http://example.com/en.json' },
      { id: '2', locale: 'de', url: 'http://example.com/de.json' },
    ]);

    await migrateStorageStrategy(payload);

    expect(payload.update).toHaveBeenCalledTimes(2);
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'messages',
      id: '1',
      data: { data: { greeting: 'hello' } },
    });
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'messages',
      id: '2',
      data: { data: { greeting: 'hallo' } },
    });
  });
});
