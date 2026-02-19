import type { PayloadRequest } from 'payload';

export const getAuthentication = (req: PayloadRequest, cronSecret: string) => {
  const authHeader = req.headers.get('authorization');
  const isValidCronRequest = authHeader === `Bearer ${cronSecret}`;
  if (isValidCronRequest) return 'cron';
  if (req.user !== null) return 'user';
  return null;
};
