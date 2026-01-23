import type { Endpoint, PayloadRequest } from 'payload';

import { ENDPOINT_CONFIG } from '../const';

export const checkEndpoint: Endpoint = {
  ...ENDPOINT_CONFIG.check,
  handler: async ({ payload }: PayloadRequest) => {
    const { totalDocs } = await payload.count({
      collection: 'publish-queue',
    });

    return Response.json(
      {
        hasChanges: totalDocs > 0,
      },
      { status: 200 },
    );
  },
};
