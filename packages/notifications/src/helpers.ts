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
      recipient: input.recipient as string,
      event: input.event,
      actor: {
        id: input.actor.id as string,
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
  input: NotifyInput,
  recipientEmail: string,
): Promise<void> {
  try {
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({
        notification: input,
        recipient: { id: input.recipient as string, email: recipientEmail },
      }),
      emailConfig.generateSubject({
        notification: input,
        recipient: { id: input.recipient as string, email: recipientEmail },
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
  input: NotifyInput,
  recipientEmail: string,
): Promise<void> {
  try {
    await onNotify({
      req,
      notification: input,
      recipient: { id: input.recipient as string, email: recipientEmail },
    });
  } catch (err) {
    console.error('[payload-notifications] onNotify callback failed:', err);
  }
}
