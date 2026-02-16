import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

export const markReadEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.markRead.endpoint(async (req, { id }) => {
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
