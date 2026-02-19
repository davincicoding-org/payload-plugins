import type { CollectionSlug, Plugin } from 'payload';
import { deepMerge } from 'payload';
import { createProcessAllClientsEndpoint } from '@/endpoints/process-all-clients';
import { Clients, InvoicePdfs, Invoices, Services, Settings } from '@/entities';
import { invoiceTranslations } from '@/translations';

export interface ClienthubPluginOptions {
  cronSecret: string;
  clientsCollectionSlug: CollectionSlug;
  servicesCollectionSlug: CollectionSlug;
  invoicesCollectionSlug: CollectionSlug;
  invoicePdfsCollectionSlug: CollectionSlug;
  onError?: (
    error: Error,
    context: { operation: string; metadata?: Record<string, unknown> },
  ) => void;
}

export const clienthubPlugin =
  ({
    cronSecret,
    clientsCollectionSlug = 'clients',
    servicesCollectionSlug = 'services',
    invoicesCollectionSlug = 'invoices',
    invoicePdfsCollectionSlug = 'invoice-pdfs',
    onError = console.error,
  }: ClienthubPluginOptions): Plugin =>
  (config) => {
    config.globals ??= [];
    config.globals.push(Settings);

    config.collections ??= [];
    config.collections.push(Clients({ slug: clientsCollectionSlug }));
    config.collections.push(
      Services({ slug: servicesCollectionSlug, clientsCollectionSlug }),
    );
    config.collections.push(InvoicePdfs({ slug: invoicePdfsCollectionSlug }));
    config.collections.push(
      Invoices({
        slug: invoicesCollectionSlug,
        invoicePdfsCollectionSlug,
        clientsCollectionSlug,
        servicesCollectionSlug,
      }),
    );

    config.endpoints ??= [];
    config.endpoints.push(
      createProcessAllClientsEndpoint({
        cronSecret,
        clientsCollectionSlug,
        servicesCollectionSlug,
        onError,
      }),
    );

    config.i18n = {
      ...config.i18n,
      translations: deepMerge(
        config.i18n?.translations || {},
        invoiceTranslations,
      ),
    };

    return config;
  };
