import type { CollectionSlug } from 'payload';
import { resolveMessageAtReadTime } from '@/message';
import type { Notification } from '@/payload-types';
import { ENDPOINTS } from '@/procedures';
import type { NotificationData } from '@/types';

export const listNotificationsEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.listNotifications.endpoint(async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await req.payload.find({
      collection: notificationsSlug as 'notifications',
      where: { recipient: { equals: req.user.id } },
      sort: '-createdAt',
      limit: 20,
      depth: 0,
    });

    const docs: NotificationData[] = result.docs.map((doc) => ({
      id: doc.id,
      event: doc.event,
      message: resolveMessage(doc),
      readAt: doc.readAt,
      documentReference: {
        entity: doc.documentReference?.entity ?? 'collection',
        slug: doc.documentReference?.slug ?? '',
        documentId: doc.documentReference?.documentId ?? undefined,
      },
      createdAt: doc.createdAt,
    }));

    return { docs };
  });

/** Resolve the stored message into a plain display string. */
function resolveMessage(doc: Notification): string {
  return resolveMessageAtReadTime(doc.message, {
    meta: doc.meta as Record<string, unknown> | undefined,
  });
}
