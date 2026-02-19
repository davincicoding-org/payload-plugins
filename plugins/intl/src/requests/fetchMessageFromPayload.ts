import type { BasePayload } from 'payload';
import { getPluginContext } from '@/utils/config';
import { getErrorMessage } from '@/utils/error-handling';

export async function fetchMessagesFromPayload(
  payload: BasePayload,
  locale: string,
) {
  const {
    docs: [doc],
  } = await payload.find({
    collection: getPluginContext(payload.config).collectionSlug as 'messages',
    where: { locale: { equals: locale } },
  });

  if (!doc) {
    console.warn(`No messages found for locale ${locale}`);
    return {};
  }

  const { url } = doc as unknown as { url: string };

  console.debug(`PAYLOAD_INTL: Fetching messages from stroage: ${url}`);

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
