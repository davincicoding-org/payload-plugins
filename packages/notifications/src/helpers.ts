import type { CollectionSlug, PayloadRequest } from 'payload';
import type {
  NotifactionCallback,
  NotificationEmailConfig,
  NotifyInput,
} from './types';

export async function createNotificationDoc(
  req: PayloadRequest,
  notificationsSlug: CollectionSlug,
  input: NotifyInput,
): Promise<void> {
  await req.payload.create({
    collection: notificationsSlug as 'notifications',
    data: {
      recipient: String(input.recipient),
      event: input.event,
      actor: {
        id: String(input.actor.id),
        displayName: input.actor.displayName,
      },
      subject: input.subject,
      url: input.url,
      meta: input.meta,
    },
    req,
  });
}

export async function sendNotificationEmail(
  req: PayloadRequest,
  emailConfig: NotificationEmailConfig,
  parsed: NotifyInput,
  recipientEmail: string,
): Promise<void> {
  try {
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({
        notification: parsed,
        recipient: { id: parsed.recipient, email: recipientEmail },
      }),
      emailConfig.generateSubject({
        notification: parsed,
        recipient: { id: parsed.recipient, email: recipientEmail },
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
  parsed: NotifyInput,
  recipientEmail: string,
): Promise<void> {
  try {
    await onNotify({
      req,
      notification: parsed,
      recipient: { id: parsed.recipient, email: recipientEmail },
    });
  } catch (err) {
    console.error('[payload-notifications] onNotify callback failed:', err);
  }
}
