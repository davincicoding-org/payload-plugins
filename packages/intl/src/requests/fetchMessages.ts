import type { BasePayload } from 'payload';
import { ENDPOINT_CONFIG } from '@/const';
import { getPluginContext } from '@/utils/config';
import { getErrorMessage } from '@/utils/error-handling';
import type { Messages } from '../types';

interface MessagesRequestConfig {
  serverUrl: string;
  /**
   * If defined a custom api route in your payload.config.ts (`routes.api`), add them same here.
   * @default 'api'
   */
  apiRoute?: string;
}

export async function fetchMessages(
  config: MessagesRequestConfig,
  locale: string,
): Promise<Messages>;
export async function fetchMessages(
  payload: BasePayload,
  locale: string,
): Promise<Messages>;
export async function fetchMessages(
  configOrPayload: MessagesRequestConfig | BasePayload,
  locale: string,
): Promise<Messages> {
  if ('serverUrl' in configOrPayload) {
    const { serverUrl, apiRoute = 'api' } = configOrPayload;

    const cleanApiRoute = apiRoute.replace(/^\/|\/$/g, '');

    const relativePath = ENDPOINT_CONFIG.getMessages.path
      .replace(/^\/|\/$/g, '')
      .replace(':locale', locale);

    const fullPath = `/${cleanApiRoute}/${relativePath}`;

    const url = new URL(fullPath, serverUrl);

    console.debug(
      `PAYLOAD_INTL: Fetching messages from API: ${url.toString()}`,
    );

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch messages for locale ${locale}`);
    }
    return await response.json();
  }

  const payload = configOrPayload;

  const {
    docs: [doc],
  } = await payload.find({
    collection: getPluginContext(payload.config).collectionSlug,
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
