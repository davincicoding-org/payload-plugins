import type { Endpoint } from 'payload';
import { APIError, headersWithCors } from 'payload';

import { ENDPOINT_CONFIG } from '../const';

export const checkEndpoint: Endpoint = {
  ...ENDPOINT_CONFIG.check,
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401);
    }

    const { totalDocs } = await req.payload.count({
      collection: 'publish-queue',
    });

    return Response.json(
      {
        hasChanges: totalDocs > 0,
      },
      {
        status: 200,
        headers: headersWithCors({
          headers: new Headers(),
          req,
        }),
      },
    );
  },
};
