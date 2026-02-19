import type { BasePayload } from 'payload';
import { pluginContext } from '@/const';
import { getErrorMessage } from '@/utils/error-handling';

export async function fetchMessages(payload: BasePayload, locale: string) {
  const ctx = pluginContext.get(payload.config);
  if (!ctx) {
    throw new Error(
      '[payload-intl] Plugin context not found. Is the plugin registered?',
    );
  }
  const { collectionSlug, storage } = ctx;

  const {
    docs: [doc],
  } = await payload.find({
    collection: collectionSlug as 'messages',
    where: { locale: { equals: locale } },
  });

  if (!doc) {
    console.warn(`[payload-intl] No messages found for locale ${locale}`);
    return {};
  }

  if (storage === 'db') {
    return doc.data ?? {};
  }

  const { url } = doc;

  if (!url) {
    console.warn(
      `[payload-intl] No file URL for locale ${locale}, returning empty messages`,
    );
    return {};
  }

  const response = await fetch(url);

  if (!response.ok) {
    const error = await getErrorMessage(response);
    throw new Error(
      `[payload-intl] Could not fetch messages for locale "${locale}": ${error}`,
    );
  }

  if (response.headers.get('content-type') !== 'application/json') {
    throw new Error(
      `[payload-intl] Could not fetch messages for locale "${locale}": The page did not return a JSON file.`,
    );
  }

  return await response.json();
}
