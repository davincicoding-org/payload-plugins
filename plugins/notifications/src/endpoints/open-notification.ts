import {
  getAdminURL,
  resolveDocumentID,
} from '@davincicoding/payload-plugin-kit';
import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import type { CollectionSlug, PayloadRequest } from 'payload';
import { ENDPOINTS } from '@/const';

/** Resolves the target URL for a notification, or null if there's no target. */
function resolveTargetURL(
  req: PayloadRequest,
  notification: {
    url?: string | null;
    documentReference?: {
      entity?: string | null;
      slug?: string | null;
      documentId?: string | null;
    } | null;
  },
): string | null {
  if (notification.url) return notification.url;

  if (!notification.documentReference) return null;

  const ref = notification.documentReference;
  if (!ref.slug) return null;

  const path =
    ref.entity === 'collection' && ref.documentId
      ? (`/collections/${ref.slug}/${ref.documentId}` as const)
      : (`/globals/${ref.slug}` as const);

  return getAdminURL({ req, path });
}

/**
 * Marks a notification as read and either redirects (for email links)
 * or returns JSON with the resolved URL (for in-app use with `?json=true`).
 */
export const openNotificationEndpoint = (notificationsSlug: CollectionSlug) =>
  createEndpointHandler(
    ENDPOINTS.openNotification,
    async (req, { id, json }) => {
      if (!req.user) {
        const loginURL = getAdminURL({ req, path: '/login' });
        const apiRoute = req.payload.config.routes.api;
        const currentPath = `${apiRoute}/notifications-plugin/open?id=${id}`;
        return Response.redirect(
          `${loginURL}?redirect=${encodeURIComponent(currentPath)}`,
          302,
        );
      }

      const notification = await req.payload.findByID({
        collection: notificationsSlug as 'notifications',
        id,
        depth: 0,
        req,
      });

      // Verify ownership
      const recipientId = resolveDocumentID(notification.recipient);

      if (recipientId !== req.user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Mark as read
      if (!notification.readAt) {
        await req.payload.update({
          collection: notificationsSlug as 'notifications',
          id,
          data: { readAt: new Date().toISOString() },
          req,
        });
      }

      const url = resolveTargetURL(req, notification);

      if (json === 'true') {
        return { url };
      }

      return Response.redirect(url ?? getAdminURL({ req, path: '' }), 302);
    },
  );
