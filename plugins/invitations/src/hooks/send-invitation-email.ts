import type { CollectionAfterChangeHook } from 'payload';
import type { SendInvitationEmailResult } from '../utils/send-invitation-email';

export function createSendInvitationEmailHook({
  sendEmail,
}: {
  sendEmail: (options: {
    payload: any;
    userId: string | number;
    req?: any;
  }) => Promise<SendInvitationEmailResult>;
}): CollectionAfterChangeHook {
  return async ({ doc, operation, req }) => {
    if (operation !== 'create') return doc;
    if (req.context.skipInvitationEmail) return doc;

    await sendEmail({
      payload: req.payload,
      userId: doc.id,
      req,
    });

    return doc;
  };
}
