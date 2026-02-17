import type { DocumentID } from '@repo/common';
import type { BasePayload, PayloadRequest } from 'payload';
import type {
  MinimalNotification,
  NotificationEmailConfig,
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

export async function sendNotificationEmail(
  req: PayloadRequest,
  {
    emailConfig,
    notification,
    recipient,
  }: {
    emailConfig: NotificationEmailConfig;
    notification: MinimalNotification;
    recipient: ResolvedUser;
  },
): Promise<void> {
  try {
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({
        notification,
        recipient,
      }),
      emailConfig.generateSubject({
        notification,
        recipient,
      }),
    ]);
    await req.payload.sendEmail({ to: recipient.email, subject, html });
  } catch (err) {
    console.error('[payload-notifications] Email delivery failed:', err);
  }
}
