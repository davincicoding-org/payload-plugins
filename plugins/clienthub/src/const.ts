import type { EndpointConfig } from '@davincicoding/payload-plugin-kit';

export const SETTINGS_SLUG = 'clienthub-settings';

export const ENDPOINTS = {
  processAllClients: {
    path: '/plugin-invoices/process-all-clients',
    method: 'get',
  },
} satisfies Record<string, EndpointConfig>;
