import type { BasePayload } from 'payload';
import type { Messages } from '../types';
import type { MessagesRequestConfig } from './fetchMessageFromAPI';

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
    const { fetchMessagesFromAPI } = await import('./fetchMessageFromAPI');
    return fetchMessagesFromAPI(configOrPayload, locale);
  } else {
    const { fetchMessagesFromPayload } = await import(
      './fetchMessageFromPayload'
    );
    return fetchMessagesFromPayload(configOrPayload, locale);
  }
}
