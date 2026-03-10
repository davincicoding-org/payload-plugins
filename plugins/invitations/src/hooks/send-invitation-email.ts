import type {
  CollectionAfterChangeHook,
  PayloadRequest,
  TypedUser,
} from 'payload';
import type { CreateFlow, EmailSenderOption } from '../types';
import { resolveEmailSender } from '../utils/resolve-email-sender';

export function createSendInvitationEmailHook({
  emailSender,
  generateInvitationEmailHTML,
  generateInvitationEmailSubject,
  resolveInvitationURL,
}: {
  emailSender: EmailSenderOption | undefined;
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
      depth: 1,
    });
    const token = fullDoc._verificationToken;
    if (!token) return doc;

    // Merge the collection discriminant so fullDoc satisfies TypedUser.
    const user = { ...fullDoc, collection: collection.slug } as TypedUser;

    // Read flow from req.context — stashed by autoGeneratePassword in beforeValidate.
    // Cannot re-resolve from doc because _verificationFlow is a virtual field
    // stripped before persistence.
    const flow = (req.context.createFlow as CreateFlow | undefined) ?? {
      type: 'admin-invite' as const,
    };

    let sender: { email: string; name: string };
    let html: string;
    let subject: string;

    if (flow.type === 'verification-flow') {
      sender = await resolveEmailSender({
        emailSender: flow.config.emailSender,
        req,
        user,
      });
      const verificationURL = await resolveFlowInvitationURL({
        acceptInvitationURL: flow.config.acceptInvitationURL,
        req,
        token,
        user,
      });
      html = await flow.config.generateEmailHTML({
        req,
        verificationURL,
        user,
      });
      subject = await flow.config.generateEmailSubject({
        req,
        verificationURL,
        user,
      });
    } else if (flow.type === 'admin-invite' && emailSender) {
      sender = await resolveEmailSender({ emailSender, req, user });
      const invitationURL = await resolveInvitationURL({ req, token, user });
      html = await generateInvitationEmailHTML({ req, invitationURL, user });
      subject = await generateInvitationEmailSubject({
        req,
        invitationURL,
        user,
      });
    } else {
      return doc;
    }

    await req.payload.sendEmail({
      from: `"${sender.name}" <${sender.email}>`,
      to: doc.email,
      subject,
      html,
    });

    return doc;
  };
}

async function resolveFlowInvitationURL({
  acceptInvitationURL,
  req,
  token,
  user,
}: {
  acceptInvitationURL:
    | string
    | ((args: {
        token: string;
        user: TypedUser;
        req: PayloadRequest;
        defaultURL: string;
      }) => string | Promise<string>);
  req: PayloadRequest;
  token: string;
  user: TypedUser;
}): Promise<string> {
  if (typeof acceptInvitationURL === 'string') {
    const separator = acceptInvitationURL.includes('?') ? '&' : '?';
    return `${acceptInvitationURL}${separator}token=${token}`;
  }
  return acceptInvitationURL({ token, user, req, defaultURL: '' });
}
