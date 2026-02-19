import { defineProcedure } from '@repo/common';

export const SETTINGS_SLUG = 'clienthub-settings';

export const ENDPOINTS = {
  processAllClients: defineProcedure({
    path: '/plugin-invoices/process-all-clients',
    method: 'get',
  }).returns<{
    message: string;
    results: { client: string; invoiceNumber?: string; error?: string }[];
  }>(),
};
