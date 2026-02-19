import type { BasePayload } from 'payload';
import { pluginContext } from '@/const';
import { getErrorMessage } from '@/utils/error-handling';

export async function fetchMessagesFromPayload(
  payload: BasePayload,
  locale: string,
) {
  const ctx = pluginContext.get(payload.config);
  if (!ctx) {
    throw new Error(
      'payload-intl plugin context not found. Is the plugin registered?',
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
    console.warn(`No messages found for locale ${locale}`);
    return {};
  }

  if (storage === 'db') {
    return (doc as unknown as { data: Record<string, unknown> }).data;
  }

  const { url } = doc as unknown as { url: string };

  console.debug(`PAYLOAD_INTL: Fetching messages from storage: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    const error = await getErrorMessage(response);
    throw new Error(
      `Could not fetch messages for locale "${locale}": ${error}`,
    );
  }

  if (response.headers.get('content-type') !== 'application/json') {
    throw new Error(
      `Could not fetch messages for locale "${locale}": The page did not return a JSON file.`,
    );
  }

  return await response.json();
}
