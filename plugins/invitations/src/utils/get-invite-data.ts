import type { Payload } from 'payload';

const SENSITIVE_FIELDS = [
  'password',
  'salt',
  'hash',
  '_verificationToken',
] as const;

export async function getInviteData({
  token,
  payload,
}: {
  token: string;
  payload: Payload;
}) {
  const usersCollection = payload.config.admin.user as 'users';

  const {
    docs: [user],
  } = await payload.find({
    collection: usersCollection,
    where: { _verificationToken: { equals: token } },
    overrideAccess: true,
    limit: 1,
  });

  if (!user)
    return { success: false as const, error: 'INVALID_TOKEN' as const };

  if (user._verified)
    return { success: false as const, error: 'ALREADY_ACCEPTED' as const };

  const sanitized = { ...user };
  for (const field of SENSITIVE_FIELDS) {
    delete sanitized[field];
  }

  return { success: true as const, user: sanitized };
}
