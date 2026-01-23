import type { Endpoint, PayloadRequest } from 'payload';
import { ENDPOINT_CONFIG } from '@/const';
import { fetchMessages } from '../requests/fetchMessages';

export const getMessagesEndpoint: Endpoint = {
  ...ENDPOINT_CONFIG.getMessages,
  handler: async (req: PayloadRequest) => {
    const { locale } = req.routeParams as { locale: string };
    const messages = await fetchMessages(req.payload, locale);
    return Response.json(messages);
  },
};
