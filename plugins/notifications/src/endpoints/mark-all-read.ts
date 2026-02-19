import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

export const markAllReadEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.markAllRead.endpoint(async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await req.payload.update({
      collection: notificationsSlug as 'notifications',
      where: {
        and: [
          { recipient: { equals: req.user.id } },
          { readAt: { exists: false } },
        ],
      },
      data: { readAt: new Date().toISOString() },
      req,
    });

    return { success: true as const };
  });
