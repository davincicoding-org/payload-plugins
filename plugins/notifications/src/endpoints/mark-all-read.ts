import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/const';

export const markAllReadEndpoint = (notificationsSlug: CollectionSlug) =>
  createEndpointHandler(ENDPOINTS.markAllRead, async (req) => {
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
