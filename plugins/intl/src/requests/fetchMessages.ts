import type { BasePayload } from 'payload';
import type { Messages } from '../types';
import { fetchMessagesFromPayload } from './fetchMessageFromPayload';

export async function fetchMessages(
  payload: BasePayload,
  locale: string,
): Promise<Messages> {
  return fetchMessagesFromPayload(payload, locale);
}
