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
    if (storage === 'db' && !doc.data && doc.url) {
      try {
        console.debug(
          `[payload-intl] Migrating locale "${doc.locale}" from upload to db`,
        );
        const response = await fetch(doc.url);
        if (!response.ok) {
          console.error(
            `[payload-intl] Failed to fetch ${doc.url} during migration`,
          );
          continue;
        }
        const data = await response.json();
        await payload.update({
          collection: collectionSlug as 'messages',
          id: doc.id,
          data: { data },
        });
      } catch (error) {
        console.error(
          `[payload-intl] Migration failed for locale "${doc.locale}":`,
          error,
        );
      }
    } else if (storage === 'upload' && doc.data && !doc.url) {
      try {
        console.debug(
          `[payload-intl] Migrating locale "${doc.locale}" from db to upload`,
        );
        const rawFile = new File(
          [JSON.stringify(doc.data)],
          `${doc.locale}-${Date.now()}.json`,
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
          id: doc.id,
          data: {},
          file,
        });
      } catch (error) {
        console.error(
          `[payload-intl] Migration failed for locale "${doc.locale}":`,
          error,
        );
      }
    }
  }
}
