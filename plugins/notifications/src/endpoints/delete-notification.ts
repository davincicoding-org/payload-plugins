import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/const';

export const deleteNotificationEndpoint = (notificationsSlug: CollectionSlug) =>
  createEndpointHandler(ENDPOINTS.deleteNotification, async (req, { id }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await req.payload.delete({
      collection: notificationsSlug as 'notifications',
      id,
      req,
    });

    return { success: true as const };
  });
