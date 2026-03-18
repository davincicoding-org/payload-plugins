import type { Payload, PayloadRequest, TypedUser } from 'payload';
import type { EmailSenderOption, VerificationFlowConfig } from '../types';
import { resolveEmailSender } from './resolve-email-sender';
import { resolveFlowInvitationURL } from './resolve-flow-invitation-url';

export type SendInvitationEmailResult =
  | { status: 'sent' }
  | { status: 'already_accepted' }
  | { status: 'user_not_found' }
  | { status: 'flow_not_found' }
  | { status: 'no_invitation_flow' };

interface SendInvitationEmailConfig {
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
  verificationFlows: Record<string, VerificationFlowConfig> | undefined;
}

let boundSendInvitationEmail:
  | ((options: {
      payload: Payload;
      userId: string | number;
      req?: PayloadRequest;
    }) => Promise<SendInvitationEmailResult>)
  | undefined;

export function createSendInvitationEmail(
  config: SendInvitationEmailConfig,
): (options: {
  payload: Payload;
  userId: string | number;
  req?: PayloadRequest;
}) => Promise<SendInvitationEmailResult> {
  const execute = async ({
    payload,
    userId,
    req,
  }: {
    payload: Payload;
    userId: string | number;
    req?: PayloadRequest;
  }): Promise<SendInvitationEmailResult> => {
    const usersSlug = payload.config.admin?.user ?? 'users';

    const {
      docs: [user],
    } = await payload.find({
      collection: usersSlug as 'users',
      where: { id: { equals: userId } },
      showHiddenFields: true,
      overrideAccess: true,
      depth: 1,
      limit: 1,
      req,
    });

    if (!user) return { status: 'user_not_found' };

    const token = user._verificationToken as string | null | undefined;
    if (!token) return { status: 'already_accepted' };

    const invitationFlow = user._invitationFlow as string | null | undefined;
    if (!invitationFlow) return { status: 'no_invitation_flow' };

    const typedUser = { ...user, collection: usersSlug } as TypedUser;

    let sender: { email: string; name: string };
    let html: string;
    let subject: string;

    if (invitationFlow === 'admin-invite') {
      if (config.emailSender) {
        sender = await resolveEmailSender({
          emailSender: config.emailSender,
          req: req as PayloadRequest,
          user: typedUser,
        });
      } else {
        sender = {
          email: payload.email.defaultFromAddress,
          name: payload.email.defaultFromName,
        };
      }

      const invitationURL = await config.resolveInvitationURL({
        req: req as PayloadRequest,
        token,
        user: typedUser,
      });
      html = await config.generateInvitationEmailHTML({
        req: req as PayloadRequest,
        invitationURL,
        user: typedUser,
      });
      subject = await config.generateInvitationEmailSubject({
        req: req as PayloadRequest,
        invitationURL,
        user: typedUser,
      });
    } else {
      const flowConfig = config.verificationFlows?.[invitationFlow];
      if (!flowConfig) return { status: 'flow_not_found' };

      sender = await resolveEmailSender({
        emailSender: flowConfig.emailSender,
        req: req as PayloadRequest,
        user: typedUser,
      });

      const verificationURL = await resolveFlowInvitationURL({
        acceptInvitationURL: flowConfig.acceptInvitationURL,
        req: req as PayloadRequest,
        token,
        user: typedUser,
      });
      html = await flowConfig.generateEmailHTML({
        req: req as PayloadRequest,
        verificationURL,
        user: typedUser,
      });
      subject = await flowConfig.generateEmailSubject({
        req: req as PayloadRequest,
        verificationURL,
        user: typedUser,
      });
    }

    await payload.sendEmail({
      from: `"${sender.name}" <${sender.email}>`,
      to: user.email,
      subject,
      html,
    });

    return { status: 'sent' };
  };

  boundSendInvitationEmail = execute;
  return execute;
}

export async function sendInvitationEmail(options: {
  payload: Payload;
  userId: string | number;
  req?: PayloadRequest;
}): Promise<SendInvitationEmailResult> {
  if (!boundSendInvitationEmail) {
    throw new Error(
      'sendInvitationEmail cannot be called before the invitations plugin is initialized',
    );
  }
  return boundSendInvitationEmail(options);
}
