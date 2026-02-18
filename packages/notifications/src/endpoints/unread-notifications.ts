import type { CollectionSlug } from 'payload';
import { resolveMessageAtReadTime } from '@/message';
import type { Notification } from '@/payload-types';
import { ENDPOINTS } from '@/procedures';
import type { NotificationData } from '@/types';

export const unreadNotificationsEndpoint = (
  notificationsSlug: CollectionSlug,
) =>
  ENDPOINTS.unread.endpoint(async (req, { since }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timestamp = new Date().toISOString();

    const where: Record<string, unknown> = {
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

    return { docs, timestamp };
  });

function resolveMessage(doc: Notification): string {
  return resolveMessageAtReadTime(doc.message, {
    meta: doc.meta as Record<string, unknown> | undefined,
  });
}
