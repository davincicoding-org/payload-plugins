import type { CollectionSlug, Where } from 'payload';
import { ENDPOINTS } from '@/procedures';
import { mapNotification } from './map-notification';

export const unreadNotificationsEndpoint = (
  notificationsSlug: CollectionSlug,
) =>
  ENDPOINTS.unread.endpoint(async (req, { since }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timestamp = new Date().toISOString();

    const where: Where = {
      and: [
        { recipient: { equals: req.user.id } },
        { readAt: { exists: false } },
        ...(since ? [{ createdAt: { greater_than: since } }] : []),
      ],
    };

    const result = await req.payload.find({
      collection: notificationsSlug as 'notifications',
      where,
      sort: '-createdAt',
      limit: 0,
      depth: 0,
    });

    return { docs: result.docs.map(mapNotification), timestamp };
  });
