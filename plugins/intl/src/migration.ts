import type { BasePayload } from 'payload';
import { pluginContext } from './const';

/**
 * Detects documents stored in a format that does not match the
 * current storage strategy and migrates them.
 */
export async function migrateStorageStrategy(
  payload: BasePayload,
): Promise<void> {
  const ctx = pluginContext.get(payload.config);
  if (!ctx) return;
  const { collectionSlug, storage } = ctx;

  const { docs } = await payload.find({
    collection: collectionSlug as 'messages',
    limit: 100,
  });

  if (docs.length === 0) return;

  for (const doc of docs) {
    const record = doc as unknown as {
      id: string;
      locale: string;
      data?: Record<string, unknown>;
      url?: string;
    };

    if (storage === 'db' && !record.data && record.url) {
      try {
        console.debug(
          `PAYLOAD_INTL: Migrating locale "${record.locale}" from upload to db`,
        );
        const response = await fetch(record.url);
        if (!response.ok) {
          console.error(
            `PAYLOAD_INTL: Failed to fetch ${record.url} during migration`,
          );
          continue;
        }
        const data = await response.json();
        await payload.update({
          collection: collectionSlug as 'messages',
          id: record.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { data } as any,
        });
      } catch (error) {
        console.error(
          `PAYLOAD_INTL: Migration failed for locale "${record.locale}":`,
          error,
        );
      }
    } else if (storage === 'upload' && record.data && !record.url) {
      try {
        console.debug(
          `PAYLOAD_INTL: Migrating locale "${record.locale}" from db to upload`,
        );
        const rawFile = new File(
          [JSON.stringify(record.data)],
          `${record.locale}-${Date.now()}.json`,
          { type: 'application/json' },
        );
        const file = {
          name: rawFile.name,
          data: Buffer.from(await rawFile.arrayBuffer()),
          mimetype: rawFile.type,
          size: rawFile.size,
        };
        await payload.update({
          collection: collectionSlug as 'messages',
          id: record.id,
          data: {},
          file,
        });
      } catch (error) {
        console.error(
          `PAYLOAD_INTL: Migration failed for locale "${record.locale}":`,
          error,
        );
      }
    }
  }
}
