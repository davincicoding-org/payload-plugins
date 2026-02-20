import type { GlobalAfterReadHook, GlobalBeforeChangeHook } from 'payload';

import { persistDataToFile, readDataFromFile } from './utils/file-storage';

interface FileHookOptions {
  readonly uploadCollection: string;
}

/**
 * Creates a `GlobalAfterReadHook` that reads the upload file
 * referenced by `doc.file` and populates the virtual `data` field.
 */
export const createPopulateDataFromFileHook =
  ({ uploadCollection }: FileHookOptions): GlobalAfterReadHook =>
  async ({ doc, req: { payload } }) => {
    console.log(doc);
    const data = await readDataFromFile({
      payload,
      collection: uploadCollection,
      fileId: doc.file,
    });

    return { ...doc, data };
  };

/**
 * Creates a `GlobalBeforeChangeHook` that serializes the incoming
 * `data` field to a JSON file in the upload collection and stores
 * the resulting file ID on `data.file`.
 */
export const createPersistDataToFileHook =
  ({ uploadCollection }: FileHookOptions): GlobalBeforeChangeHook =>
  async ({ data, originalDoc, req: { payload, locale } }) => {
    if (!data.data) return data;

    const existingFileId = originalDoc?.file ?? data.file;

    const fileId = await persistDataToFile({
      payload,
      collection: uploadCollection,
      data: data.data,
      locale: locale ?? 'en',
      existingFileId: existingFileId ?? undefined,
    });

    return { ...data, file: fileId };
  };
