import { createTestConfig } from '@davincicoding/payload-plugin-kit/testing';
import { clienthubPlugin } from 'payload-clienthub';

export default createTestConfig({
  dirname: import.meta.dirname,
  plugins: [
    clienthubPlugin({
      cronSecret: 'test-cron-secret',
      clientsCollectionSlug: 'clients',
      servicesCollectionSlug: 'services',
      invoicesCollectionSlug: 'invoices',
      invoicePdfsCollectionSlug: 'invoice-pdfs',
    }),
  ],
});
