import { ENDPOINTS } from '@/const';

export interface MessagesRequestConfig {
  serverUrl: string;
  /**
   * If defined a custom api route in your payload.config.ts (`routes.api`), add them same here.
   * @default 'api'
   */
  apiRoute?: string;
}

export async function fetchMessagesFromAPI(
  { serverUrl, apiRoute = 'api' }: MessagesRequestConfig,
  locale: string,
) {
  const cleanApiRoute = apiRoute.replace(/^\/|\/$/g, '');

  const relativePath = ENDPOINTS.getMessages.path
    .replace(/^\/|\/$/g, '')
    .replace(':locale', locale);

  const fullPath = `/${cleanApiRoute}/${relativePath}`;

  const url = new URL(fullPath, serverUrl);

  console.debug(`PAYLOAD_INTL: Fetching messages from API: ${url.toString()}`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch messages for locale ${locale}`);
  }
  return await response.json();
}
