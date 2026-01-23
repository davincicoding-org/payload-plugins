import type { Endpoint, PayloadRequest } from 'payload';

import { fetchMessages } from '../requests/fetchMessages';

export const getMessagesEndpoint: Endpoint = {
  handler: async (req: PayloadRequest) => {
    const { locale } = req.routeParams as { locale: string };
    const messages = await fetchMessages(req.payload, locale);
    return Response.json(messages);
  },
  method: 'get',
  path: '/intl-plugin/:locale',
};
