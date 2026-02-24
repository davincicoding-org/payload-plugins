import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/const';

export const markReadEndpoint = (notificationsSlug: CollectionSlug) =>
  createEndpointHandler(ENDPOINTS.markRead, async (req, { id }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await req.payload.update({
      collection: notificationsSlug as 'notifications',
      id,
      data: { readAt: new Date().toISOString() },
      req,
    });

    return { success: true as const };
  });
