import type {
  CollectionAfterChangeHook,
  PayloadRequest,
  TypedUser,
} from 'payload';
import type { EmailSenderOption } from '../types';
import { resolveEmailSender } from '../utils/resolve-email-sender';

export function createSendInvitationEmailHook({
  emailSender,
  generateInvitationEmailHTML,
  generateInvitationEmailSubject,
  resolveInvitationURL,
}: {
  emailSender: EmailSenderOption;
  generateInvitationEmailHTML: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: TypedUser;
  }) => string | Promise<string>;
  generateInvitationEmailSubject: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: TypedUser;
  }) => string | Promise<string>;
  resolveInvitationURL: (args: {
    req: PayloadRequest;
    token: string;
    user: TypedUser;
  }) => Promise<string>;
}): CollectionAfterChangeHook {
  return async ({ collection, doc, operation, req }) => {
    if (operation !== 'create') return doc;

    // _verificationToken is a hidden field, so it's stripped from `doc` by
    // Payload's afterRead phase. Re-fetch it directly.
    const fullDoc = await req.payload.findByID({
      collection: collection.slug as 'users',
      id: doc.id,
      showHiddenFields: true,
      overrideAccess: true,
      depth: 0,
    });
    const token = fullDoc._verificationToken;
    if (!token) return doc;

    const sender = await resolveEmailSender({ emailSender, req, user: doc });
    const invitationURL = await resolveInvitationURL({ req, token, user: doc });
    const html = await generateInvitationEmailHTML({
      req,
      invitationURL,
      user: doc,
    });
    const subject = await generateInvitationEmailSubject({
      req,
      invitationURL,
      user: doc,
    });

    await req.payload.sendEmail({
      from: `"${sender.name}" <${sender.email}>`,
      to: doc.email,
      subject,
      html,
    });

    return doc;
  };
}
