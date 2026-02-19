import {
  type DocumentID,
  type DocumentReference,
  getApiURL,
} from '@davincicoding/payload-plugin-kit';
import type { PayloadRequest } from 'payload';
import type {
  MinimalNotification,
  NotificationEmailConfig,
  ResolvedUser,
} from '@/types';
import { signUnsubscribeToken } from './email-token';

export async function sendNotificationEmail(
  req: PayloadRequest,
  {
    emailConfig,
    notification,
    recipient,
    notificationId,
    documentReference,
  }: {
    emailConfig: NotificationEmailConfig;
    notification: MinimalNotification;
    notificationId: DocumentID;
    recipient: ResolvedUser;
    documentReference: DocumentReference | undefined;
  },
): Promise<void> {
  try {
    const openURL = getApiURL({
      req,
      path: `/notifications-plugin/open?id=${notificationId}`,
    });

    let unsubscribeURL: string | undefined;
    if (documentReference) {
      const token = signUnsubscribeToken(req.payload.config.secret, {
        userId: recipient.id,
        documentReference,
      });
      unsubscribeURL = getApiURL({
        req,
        path: `/notifications-plugin/email-unsubscribe?token=${token}`,
      });
    }
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({
        notification,
        recipient,
        links: { openURL, unsubscribeURL },
      }),
      emailConfig.generateSubject({
        notification,
        recipient,
        links: { openURL, unsubscribeURL },
      }),
    ]);
    await req.payload.sendEmail({ to: recipient.email, subject, html });
  } catch (err) {
    console.error('[payload-notifications] Email delivery failed:', err);
  }
}
