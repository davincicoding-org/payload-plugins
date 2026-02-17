import { getAdminURL } from '@repo/common';
import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

/** Marks a notification as read and redirects to its target URL. */
export const openNotificationEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.openNotification.endpoint(async (req, { id }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notification = await req.payload.findByID({
      collection: notificationsSlug as 'notifications',
      id,
      depth: 0,
      req,
    });

    // Verify ownership
    const recipientId =
      typeof notification.recipient === 'object'
        ? notification.recipient.id
        : notification.recipient;

    if (String(recipientId) !== String(req.user.id)) {
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

    // Determine redirect URL
    let redirectUrl: string;

    if (notification.url) {
      // Explicit URL override wins
      redirectUrl = notification.url;
    } else if (
      notification.documentReference?.entity &&
      notification.documentReference?.slug
    ) {
      // Derive from document reference
      const ref = notification.documentReference;
      const path =
        ref.entity === 'collection' && ref.documentId
          ? `/collections/${ref.slug}/${ref.documentId}`
          : `/globals/${ref.slug}`;
      redirectUrl = getAdminURL({ req, path: path as `/${string}` });
    } else {
      // Fallback to admin root
      redirectUrl = getAdminURL({ req, path: '' });
    }

    return Response.redirect(redirectUrl, 302);
  });
