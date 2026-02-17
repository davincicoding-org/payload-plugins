import type { DocumentID, DocumentReference } from '@repo/common';
import { getServerURL } from '@repo/common';
import type { BasePayload, PayloadRequest } from 'payload';
import { signUnsubscribeToken } from './email-token';
import type {
  MinimalNotification,
  NotificationEmailConfig,
  NotificationEmailLinks,
  ResolvedUser,
} from './types';

/**
 * Resolve a user ID into a display-name pair using the user collection's
 * `admin.useAsTitle` config. Falls back to `email` when the configured
 * field is missing or not a string.
 */
export async function resolveUser(
  payload: BasePayload,
  userId: DocumentID,
): Promise<ResolvedUser> {
  const userSlug = payload.config.admin?.user as 'users' | undefined;
  if (!userSlug) throw new Error('User collection not configured');

  const user = await payload.findByID({
    collection: userSlug,
    id: userId,
    depth: 0,
  });

  const displayName = (() => {
    const { useAsTitle = 'email' } =
      payload.collections[userSlug].config.admin ?? {};

    const title = user[useAsTitle as keyof typeof user];

    if (typeof title === 'string') {
      return title;
    }
    return user.email;
  })();

  return { ...user, displayName };
}

/** Build the `openURL` and optional `unsubscribeURL` for notification emails. */
export function generateEmailLinks(
  req: PayloadRequest,
  {
    notificationId,
    recipientId,
    url,
    documentReference,
  }: {
    notificationId: string | undefined;
    recipientId: DocumentID;
    url: string | undefined;
    documentReference: DocumentReference | undefined;
  },
): NotificationEmailLinks {
  const serverURL = getServerURL(req);
  const apiRoute = req.payload.config.routes.api;

  const openURL = notificationId
    ? `${serverURL}${apiRoute}/notifications-plugin/open?id=${notificationId}`
    : (url ?? '#');

  const unsubscribeURL = documentReference
    ? (() => {
        const token = signUnsubscribeToken(req.payload.config.secret, {
          userId: recipientId,
          documentReference,
        });
        return `${serverURL}${apiRoute}/notifications-plugin/email-unsubscribe?token=${token}`;
      })()
    : undefined;

  return { openURL, unsubscribeURL };
}

export async function sendNotificationEmail(
  req: PayloadRequest,
  {
    emailConfig,
    notification,
    recipient,
    links,
  }: {
    emailConfig: NotificationEmailConfig;
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;
  },
): Promise<void> {
  try {
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({ notification, recipient, links }),
      emailConfig.generateSubject({ notification, recipient, links }),
    ]);
    await req.payload.sendEmail({ to: recipient.email, subject, html });
  } catch (err) {
    console.error('[payload-notifications] Email delivery failed:', err);
  }
}
