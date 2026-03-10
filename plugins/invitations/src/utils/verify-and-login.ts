import jwt from 'jsonwebtoken';
import type { Payload } from 'payload';
import { type AcceptInviteResult, cookieStringSchema } from '../types';

export async function verifyAndLogin({
  token,
  payload,
}: {
  token: string;
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
    data: { _verified: true, joinedAt: new Date().toISOString() },
  });

  // Re-save _verificationToken — Payload clears it when _verified becomes true.
  // Keeping it allows getInviteData to identify the user on repeat visits.
  await payload.update({
    collection: usersCollection,
    id: user.id,
    overrideAccess: true,
    data: { _verificationToken: token },
  });

  const authConfig = payload.collections[usersCollection].config.auth;
  const tokenExpiration =
    typeof authConfig === 'object' && 'tokenExpiration' in authConfig
      ? (authConfig.tokenExpiration ?? 7200)
      : 7200;

  const jwtToken = jwt.sign(
    { id: user.id, email: user.email, collection: usersCollection },
    payload.secret,
    { expiresIn: tokenExpiration },
  );

  const { generatePayloadCookie } = await import('payload');
  const cookieString = generatePayloadCookie({
    collectionAuthConfig: authConfig,
    cookiePrefix: payload.config.cookiePrefix,
    token: jwtToken,
  });

  return {
    success: true,
    user: { ...user, collection: usersCollection } as any,
    token: jwtToken,
    cookie: cookieStringSchema.parse(cookieString),
    rawCookie: cookieString,
  };
}
