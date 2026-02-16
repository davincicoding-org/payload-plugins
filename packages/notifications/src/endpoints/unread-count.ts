import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

export const unreadCountEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.unreadCount.endpoint(async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await req.payload.count({
      collection: notificationsSlug as 'notifications',
      where: {
        and: [
          { recipient: { equals: req.user.id } },
          { readAt: { exists: false } },
        ],
      },
    });

    return { count: result.totalDocs };
  });
