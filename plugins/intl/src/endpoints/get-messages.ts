import type { Endpoint, PayloadRequest } from 'payload';
import { ENDPOINTS } from '@/const';
import { fetchMessagesFromPayload } from '@/requests/fetchMessageFromPayload';

export const getMessagesEndpoint: Endpoint = ENDPOINTS.getMessages.endpoint(
  async (req: PayloadRequest, { locale }) => {
    return await fetchMessagesFromPayload(req.payload, locale);
  },
);
