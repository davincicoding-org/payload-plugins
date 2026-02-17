import { getAdminURL, resolveDocumentID } from '@repo/common';
import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

/** Marks a notification as read and redirects to its target URL. */
export const openNotificationEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.openNotification.endpoint(async (req, { id }) => {
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

    // Explicitly passed URL wins
    if (notification.url) {
      return Response.redirect(notification.url, 302);
    }

    if (!notification.documentReference) {
      return Response.redirect(getAdminURL({ req, path: '' }), 302);
    }

    // Derive from document reference
    const ref = notification.documentReference;
    const path =
      ref.entity === 'collection' && ref.documentId
        ? (`/collections/${ref.slug}/${ref.documentId}` as const)
        : (`/globals/${ref.slug}` as const);

    return Response.redirect(getAdminURL({ req, path }), 302);
  });
