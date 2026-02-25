import type { Payload } from 'payload';
import type { User } from '@/payload-types';
import type { GetInviteDataResult, SanitizedUser } from '../types';

const SENSITIVE_FIELDS: (keyof User)[] = [
  'password',
  'salt',
  'hash',
  '_verificationToken',
];

export async function getInviteData({
  token,
  payload,
}: {
  token: string;
  payload: Payload;
}): Promise<GetInviteDataResult> {
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

  // TypeScript cannot track property deletion, so a single assertion is needed
  const sanitized: Record<string, unknown> = { ...user };
  for (const field of SENSITIVE_FIELDS) {
    delete sanitized[field];
  }

  return { success: true, user: sanitized as SanitizedUser };
}
