import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

export const deleteNotificationEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.deleteNotification.endpoint(async (req, { id }) => {
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
