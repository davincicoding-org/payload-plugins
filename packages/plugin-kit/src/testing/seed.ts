import type { Payload } from 'payload';

export const DEV_USER = {
  email: 'dev@test.com',
  password: 'test1234',
  name: 'Dev User',
} as const;

export async function seedDevUser(payload: Payload): Promise<void> {
  const { totalDocs } = await payload.count({ collection: 'users' });
  if (totalDocs > 0) return;
  await payload.create({ collection: 'users', data: DEV_USER });
}
