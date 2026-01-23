import type { Endpoint } from 'payload';

export const ENDPOINT_CONFIG = {
  setMessages: {
    path: '/intl-plugin',
    method: 'put',
  },
  getMessages: {
    path: '/intl-plugin/:locale',
    method: 'get',
  },
} satisfies Record<string, Pick<Endpoint, 'path' | 'method'>>;
