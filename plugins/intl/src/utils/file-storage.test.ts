import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
}));

import { readFile, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { persistDataToFile, readDataFromFile } from './file-storage';

describe('persistDataToFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new upload when no existing file ID is given', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new-doc-id' });
    const payload = { create: mockCreate } as any;

    const result = await persistDataToFile({
      payload,
      collection: 'media',
      data: { greeting: 'Hello' },
      locale: 'en',
    });

    expect(result).toBe('new-doc-id');
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('intl-messages-en-'),
      JSON.stringify({ greeting: 'Hello' }, null, 2),
      'utf-8',
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        data: {},
        filePath: expect.stringContaining(
          path.join(os.tmpdir(), 'intl-messages-en-'),
        ),
      }),
    );
    expect(unlink).toHaveBeenCalledOnce();
  });

  it('should update the existing upload when a file ID is given', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: 'existing-id' });
    const payload = { update: mockUpdate } as any;

    const result = await persistDataToFile({
      payload,
      collection: 'media',
      data: { farewell: 'Bye' },
      locale: 'de',
      existingFileId: 'existing-id',
    });

    expect(result).toBe('existing-id');
    expect(writeFile).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        id: 'existing-id',
        data: {},
        filePath: expect.stringContaining(
          path.join(os.tmpdir(), 'intl-messages-de-'),
        ),
      }),
    );
    expect(unlink).toHaveBeenCalledOnce();
  });

  it('should clean up the temp file even if upload fails', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Upload failed'));
    const payload = { create: mockCreate } as any;

    await expect(
      persistDataToFile({
        payload,
        collection: 'media',
        data: { greeting: 'Hello' },
        locale: 'en',
      }),
    ).rejects.toThrow('Upload failed');

    expect(unlink).toHaveBeenCalledOnce();
  });
});

describe('readDataFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty object when fileId is nullish', async () => {
    const payload = {} as any;

    const resultUndefined = await readDataFromFile({
      payload,
      collection: 'media',
      fileId: undefined,
    });
    expect(resultUndefined).toEqual({});
  });

  it('should read and parse the upload file content', async () => {
    const mockFindByID = vi.fn().mockResolvedValue({
      id: 'file-1',
      filename: 'messages-en.json',
    });
    const payload = {
      findByID: mockFindByID,
      config: {
        collections: [
          {
            slug: 'media',
            upload: { staticDir: '/absolute/uploads' },
          },
        ],
      },
    } as any;

    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ greeting: 'Hello', nested: { key: 'val' } }),
    );

    const result = await readDataFromFile({
      payload,
      collection: 'media',
      fileId: 'file-1',
    });

    expect(mockFindByID).toHaveBeenCalledWith({
      collection: 'media',
      id: 'file-1',
      depth: 0,
    });
    expect(readFile).toHaveBeenCalledWith(
      path.join('/absolute/uploads', 'messages-en.json'),
      'utf-8',
    );
    expect(result).toEqual({ greeting: 'Hello', nested: { key: 'val' } });
  });

  it('should return empty object when file cannot be read', async () => {
    const mockFindByID = vi.fn().mockResolvedValue({
      id: 'file-1',
      filename: 'missing.json',
    });
    const payload = {
      findByID: mockFindByID,
      config: {
        collections: [
          {
            slug: 'media',
            upload: { staticDir: '/absolute/uploads' },
          },
        ],
      },
    } as any;

    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file'));

    const result = await readDataFromFile({
      payload,
      collection: 'media',
      fileId: 'file-1',
    });

    expect(result).toEqual({});
  });

  it('should resolve relative staticDir against cwd', async () => {
    const mockFindByID = vi.fn().mockResolvedValue({
      id: 'file-1',
      filename: 'messages.json',
    });
    const payload = {
      findByID: mockFindByID,
      config: {
        collections: [
          {
            slug: 'media',
            upload: { staticDir: 'relative/uploads' },
          },
        ],
      },
    } as any;

    vi.mocked(readFile).mockResolvedValue('{}');

    await readDataFromFile({
      payload,
      collection: 'media',
      fileId: 'file-1',
    });

    expect(readFile).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'relative/uploads', 'messages.json'),
      'utf-8',
    );
  });

  it('should default staticDir to collection slug when upload is true', async () => {
    const mockFindByID = vi.fn().mockResolvedValue({
      id: 'file-1',
      filename: 'data.json',
    });
    const payload = {
      findByID: mockFindByID,
      config: {
        collections: [
          {
            slug: 'media',
            upload: true,
          },
        ],
      },
    } as any;

    vi.mocked(readFile).mockResolvedValue('{}');

    await readDataFromFile({
      payload,
      collection: 'media',
      fileId: 'file-1',
    });

    expect(readFile).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'media', 'data.json'),
      'utf-8',
    );
  });
});
