import { defineProcedure } from '@davincicoding/payload-plugin-kit/procedure';

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
