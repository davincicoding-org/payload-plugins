import type { Endpoint } from 'payload';
import { APIError } from 'payload';
import { ENDPOINTS, SETTINGS_SLUG } from '@/const';
import type { ResolvedPluginOptions } from '@/types';
import { getAuthentication } from '@/utils/authentication';
import { processClientInvoice } from '@/utils/process-client-invoice';

export const createProcessAllClientsEndpoint = (
  options: ResolvedPluginOptions<
    | 'cronSecret'
    | 'clientsCollectionSlug'
    | 'servicesCollectionSlug'
    | 'onError'
  >,
): Endpoint =>
  ENDPOINTS.processAllClients.endpoint(async (req) => {
    const authentication = getAuthentication(req, options.cronSecret);
    if (authentication === null) {
      throw new APIError('Unauthorized', 401);
    }

    const payload = req.payload;

    const [settings, { docs: clients }, { docs: services }] = await Promise.all(
      [
        payload.findGlobal({
          slug: SETTINGS_SLUG,
          depth: 2,
          overrideAccess: authentication === 'cron',
          req,
        }),
        payload.find({
          collection: options.clientsCollectionSlug as 'clients',
          depth: 0,
          limit: 1000,
          overrideAccess: authentication === 'cron',
          req,
        }),
        payload.find({
          collection: options.servicesCollectionSlug as 'services',
          depth: 0,
          limit: 1000,
          overrideAccess: authentication === 'cron',
          req,
        }),
      ],
    );

    const results: {
      client: string;
      invoiceNumber?: string;
      error?: string;
    }[] = [];

    for (const client of clients) {
      const servicesOfClient = services.filter(
        (service) => service.client === client.id,
      );

      const result = await processClientInvoice(
        req,
        {
          client,
          services: servicesOfClient,
          settings,
        },
        options,
      );

      if (result) {
        results.push(result);
      }
    }

    return {
      message: 'Invoice generation completed',
      results,
    };
  });
