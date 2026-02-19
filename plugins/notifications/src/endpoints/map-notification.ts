import { resolveMessageAtReadTime } from '@/message';
import type { Notification } from '@/payload-types';
import type { NotificationData } from '@/types';

/** Maps a Notification document to the client-facing NotificationData shape. */
export function mapNotification(doc: Notification): NotificationData {
  return {
    id: doc.id,
    event: doc.event,
    message: resolveMessageAtReadTime(doc.message, {
      meta: doc.meta as Record<string, unknown> | undefined,
    }),
    readAt: doc.readAt,
    documentReference: {
      entity: doc.documentReference?.entity ?? 'collection',
      slug: doc.documentReference?.slug ?? '',
      documentId: doc.documentReference?.documentId ?? undefined,
    },
    createdAt: doc.createdAt,
  };
}
