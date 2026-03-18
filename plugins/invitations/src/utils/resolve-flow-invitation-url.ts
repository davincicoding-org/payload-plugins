import type { PayloadRequest, TypedUser } from 'payload';
import type { AcceptInvitationURLFn } from '../types';

export async function resolveFlowInvitationURL({
  acceptInvitationURL,
  req,
  token,
  user,
}: {
  acceptInvitationURL: string | AcceptInvitationURLFn;
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
