import type { CollectionSlug, PayloadRequest } from 'payload';
import type { StoredSubject } from './resolve-subject';
import type {
  NotifactionCallback,
  NotificationEmailConfig,
  StoredDocumentReference,
} from './types';

export async function createNotificationDoc(
  req: PayloadRequest,
  notificationsSlug: CollectionSlug,
  data: {
    recipient: string;
    event: string;
    actor?: string;
    subject: StoredSubject;
    url?: string;
    meta?: Record<string, unknown>;
    documentReference?: StoredDocumentReference;
  },
): Promise<void> {
  await req.payload.create({
    collection: notificationsSlug as 'notifications',
    data: {
      recipient: data.recipient,
      event: data.event,
      actor: data.actor,
      subject: data.subject,
      url: data.url,
      meta: data.meta,
      documentReference: data.documentReference,
    },
    req,
  });
}

export async function sendNotificationEmail(
  req: PayloadRequest,
  emailConfig: NotificationEmailConfig,
  notification: { subject: string; recipient: string; event: string },
  recipientEmail: string,
): Promise<void> {
  try {
    const input = { ...notification, subject: notification.subject } as any;
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({
        notification: input,
        recipient: { id: notification.recipient, email: recipientEmail },
      }),
      emailConfig.generateSubject({
        notification: input,
        recipient: { id: notification.recipient, email: recipientEmail },
      }),
    ]);
    await req.payload.sendEmail({ to: recipientEmail, subject, html });
  } catch (err) {
    console.error('[payload-notifications] Email delivery failed:', err);
  }
}

export async function invokeCallback(
  onNotify: NotifactionCallback,
  req: PayloadRequest,
  notification: { subject: string; recipient: string; event: string },
  recipientEmail: string,
): Promise<void> {
  try {
    await onNotify({
      req,
      notification: notification as any,
      recipient: { id: notification.recipient, email: recipientEmail },
    });
  } catch (err) {
    console.error('[payload-notifications] onNotify callback failed:', err);
  }
}
