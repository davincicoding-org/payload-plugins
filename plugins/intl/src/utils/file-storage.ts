import { readFile, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { BasePayload, CollectionSlug } from 'payload';

import type { Messages } from '../types';

interface PersistOptions {
  readonly payload: BasePayload;
  readonly collection: string;
  readonly data: Messages;
  readonly locale: string;
  readonly existingFileId?: number | string;
}

/**
 * Serializes messages to a JSON file and uploads it via Payload's
 * `filePath` API. Creates a new document or updates an existing one.
 */
export async function persistDataToFile({
  payload,
  collection,
  data,
  locale,
  existingFileId,
}: PersistOptions): Promise<number | string> {
  const jsonString = JSON.stringify(data, null, 2);
  const tmpPath = path.join(
    os.tmpdir(),
    `intl-messages-${locale}-${Date.now()}.json`,
  );

  await writeFile(tmpPath, jsonString, 'utf-8');

  try {
    if (existingFileId) {
      const doc = await payload.update({
        collection: collection as CollectionSlug,
        id: existingFileId,
        data: {},
        filePath: tmpPath,
      });
      return doc.id;
    }

    const doc = await payload.create({
      collection: collection as CollectionSlug,
      data: {},
      filePath: tmpPath,
    });
    return doc.id;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

interface ReadOptions {
  readonly payload: BasePayload;
  readonly collection: string;
  readonly fileId: number | string | undefined;
}

/**
 * Reads and parses a JSON messages file from the upload collection's
 * local filesystem path.
 */
export async function readDataFromFile({
  payload,
  collection,
  fileId,
}: ReadOptions): Promise<Messages> {
  if (!fileId) return {};

  const uploadDoc = await payload.findByID({
    collection: collection as CollectionSlug,
    id: fileId,
    depth: 0,
  });

  const filename = (uploadDoc as unknown as Record<string, unknown>).filename;
  if (typeof filename !== 'string') return {};

  const filePath = resolveUploadPath(payload, collection, filename);

  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as Messages;
  } catch {
    return {};
  }
}

/** Resolves the absolute filesystem path for a file in an upload collection. */
function resolveUploadPath(
  payload: BasePayload,
  collectionSlug: string,
  filename: string,
): string {
  const collectionConfig = payload.config.collections.find(
    (c) => c.slug === collectionSlug,
  );

  let staticDir = collectionSlug;
  if (
    typeof collectionConfig?.upload === 'object' &&
    collectionConfig.upload.staticDir
  ) {
    staticDir = collectionConfig.upload.staticDir;
  }

  const resolvedDir = path.isAbsolute(staticDir)
    ? staticDir
    : path.resolve(process.cwd(), staticDir);

  return path.join(resolvedDir, filename);
}
