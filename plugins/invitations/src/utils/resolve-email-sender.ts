import type { PayloadRequest, TypedUser } from 'payload';
import type { EmailSender, EmailSenderOption } from '../types';

export async function resolveEmailSender({
  emailSender,
  req,
  user,
}: {
  emailSender: EmailSenderOption;
  req: PayloadRequest;
  user: TypedUser;
}): Promise<EmailSender> {
  if (typeof emailSender === 'function') {
    return emailSender({ req, user });
  }
  return emailSender;
}
