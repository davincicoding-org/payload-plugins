import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import type { CollectionSlug, Where } from 'payload';
import { ENDPOINTS } from '@/const';
import { mapNotification } from './map-notification';

export const unreadNotificationsEndpoint = (
  notificationsSlug: CollectionSlug,
) =>
  createEndpointHandler(ENDPOINTS.unread, async (req, { since }) => {
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

    // On initial load, check if any read notifications exist so the UI
    // can decide whether to show the "Show older" button.
    const hasMore = since
      ? undefined
      : (
          await req.payload.find({
            collection: notificationsSlug as 'notifications',
            where: {
              and: [
                { recipient: { equals: req.user.id } },
                { readAt: { exists: true } },
              ],
            },
            limit: 1,
            depth: 0,
            select: {},
          })
        ).docs.length > 0;

    return { docs: result.docs.map(mapNotification), timestamp, hasMore };
  });
