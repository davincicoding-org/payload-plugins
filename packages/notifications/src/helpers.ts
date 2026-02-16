import type { CollectionSlug, PayloadRequest } from 'payload';
import type { NotificationsConfig, NotifyInput } from './types';

export async function createNotificationDoc(
  req: PayloadRequest,
  notifSlug: CollectionSlug,
  parsed: NotifyInput,
): Promise<void> {
  await req.payload.create({
    collection: notifSlug,
    data: {
      recipient: parsed.recipient,
      event: parsed.event,
      actor: { id: parsed.actor.id, displayName: parsed.actor.displayName },
      subject: parsed.subject,
      url: parsed.url ?? null,
      meta: parsed.meta ?? null,
    },
    req,
  });
}

export async function sendNotificationEmail(
  req: PayloadRequest,
  emailConfig: NonNullable<NotificationsConfig['email']>,
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
  onNotify: NonNullable<NotificationsConfig['onNotify']>,
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
