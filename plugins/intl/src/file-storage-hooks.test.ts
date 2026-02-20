import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./utils/file-storage', () => ({
  readDataFromFile: vi.fn(),
  persistDataToFile: vi.fn(),
}));

import {
  createPersistDataToFileHook,
  createPopulateDataFromFileHook,
} from './file-storage-hooks';
import { persistDataToFile, readDataFromFile } from './utils/file-storage';

describe('createPopulateDataFromFileHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should populate doc.data from the referenced upload file', async () => {
    vi.mocked(readDataFromFile).mockResolvedValue({ hello: 'world' });

    const hook = createPopulateDataFromFileHook({ uploadCollection: 'media' });
    const result = await hook({
      doc: { file: 'upload-123', data: undefined },
      req: { payload: {} } as any,
      global: {} as any,
      findMany: false,
      query: {},
      context: {},
    });

    expect(result.data).toEqual({ hello: 'world' });
    expect(readDataFromFile).toHaveBeenCalledWith({
      payload: {},
      collection: 'media',
      fileId: 'upload-123',
    });
  });

  it('should return data as empty object when no file is referenced', async () => {
    vi.mocked(readDataFromFile).mockResolvedValue({});

    const hook = createPopulateDataFromFileHook({ uploadCollection: 'media' });
    const result = await hook({
      doc: { file: null, data: undefined },
      req: { payload: {} } as any,
      global: {} as any,
      findMany: false,
      query: {},
      context: {},
    });

    expect(result.data).toEqual({});
  });
});

describe('createPersistDataToFileHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should persist data to a new file and set the file reference', async () => {
    vi.mocked(persistDataToFile).mockResolvedValue('new-upload-id');

    const hook = createPersistDataToFileHook({ uploadCollection: 'media' });
    const result = await hook({
      data: { data: { hello: 'world' }, file: null },
      originalDoc: {},
      req: { payload: {}, locale: 'en' } as any,
      global: {} as any,
      context: {},
    });

    expect(result.file).toBe('new-upload-id');
    expect(persistDataToFile).toHaveBeenCalledWith({
      payload: {},
      collection: 'media',
      data: { hello: 'world' },
      locale: 'en',
      existingFileId: undefined,
    });
  });

  it('should update the existing file when a reference already exists', async () => {
    vi.mocked(persistDataToFile).mockResolvedValue('existing-id');

    const hook = createPersistDataToFileHook({ uploadCollection: 'media' });
    const result = await hook({
      data: { data: { hello: 'welt' }, file: 'existing-id' },
      originalDoc: { file: 'existing-id' },
      req: { payload: {}, locale: 'de' } as any,
      global: {} as any,
      context: {},
    });

    expect(persistDataToFile).toHaveBeenCalledWith({
      payload: {},
      collection: 'media',
      data: { hello: 'welt' },
      locale: 'de',
      existingFileId: 'existing-id',
    });
    expect(result.file).toBe('existing-id');
  });

  it('should skip persistence when data is empty or undefined', async () => {
    const hook = createPersistDataToFileHook({ uploadCollection: 'media' });
    const result = await hook({
      data: { data: undefined, file: null },
      originalDoc: {},
      req: { payload: {}, locale: 'en' } as any,
      global: {} as any,
      context: {},
    });

    expect(persistDataToFile).not.toHaveBeenCalled();
    expect(result).toEqual({ data: undefined, file: null });
  });
});
