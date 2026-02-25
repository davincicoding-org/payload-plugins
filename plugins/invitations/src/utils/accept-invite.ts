import type { Payload } from 'payload';
import { type AcceptInviteResult, cookieStringSchema } from '../types';

export async function acceptInvite({
  token,
  password,
  payload,
}: {
  token: string;
  password: string;
  payload: Payload;
}): Promise<AcceptInviteResult> {
  const usersCollection = payload.config.admin.user as 'users';

  const {
    docs: [user],
  } = await payload.find({
    collection: usersCollection,
    where: { _verificationToken: { equals: token } },
    overrideAccess: true,
    limit: 1,
  });

  if (!user) return { success: false, error: 'INVALID_TOKEN' };

  if (user._verified) return { success: false, error: 'ALREADY_ACCEPTED' };

  await payload.update({
    collection: usersCollection,
    id: user.id,
    overrideAccess: true,
    data: { _verified: true, password, joinedAt: new Date().toISOString() },
  });

  const loginResult = await payload.login({
    collection: usersCollection,
    data: { email: user.email, password },
  });

  const { generatePayloadCookie } = await import('payload');
  const cookieString = generatePayloadCookie({
    collectionAuthConfig: payload.collections[usersCollection].config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token: loginResult.token ?? '',
  });

  return {
    success: true,
    user: loginResult.user,
    token: loginResult.token ?? '',
    cookie: cookieStringSchema.parse(cookieString),
    rawCookie: cookieString,
  };
}
