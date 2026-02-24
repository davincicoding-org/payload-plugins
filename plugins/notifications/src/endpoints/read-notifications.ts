import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/const';
import { mapNotification } from './map-notification';

export const readNotificationsEndpoint = (notificationsSlug: CollectionSlug) =>
  createEndpointHandler(ENDPOINTS.read, async (req, { page, limit }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await req.payload.find({
      collection: notificationsSlug as 'notifications',
      where: {
        and: [
          { recipient: { equals: req.user.id } },
          { readAt: { exists: true } },
        ],
      },
      sort: '-readAt',
      page,
      limit,
      depth: 0,
    });

    return {
      docs: result.docs.map(mapNotification),
      hasNextPage: result.hasNextPage,
      totalDocs: result.totalDocs,
    };
  });
