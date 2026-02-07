import type { Endpoint } from 'payload';

export const SETTINGS_SLUG = 'clienthub-settings';

export const ENDPOINT_CONFIG = {
  processAllClients: {
    path: '/plugin-invoices/process-all-clients',
    method: 'get',
  },
} satisfies Record<string, Pick<Endpoint, 'path' | 'method'>>;
