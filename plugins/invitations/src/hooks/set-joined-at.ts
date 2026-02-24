import type { CollectionBeforeChangeHook } from 'payload';
import type { User } from '@/payload-types';

export const setJoinedAt: CollectionBeforeChangeHook<User> = ({
  operation,
  data,
}) => {
  if (operation !== 'create' || data._email) return data;

  return { ...data, joinedAt: new Date().toISOString() };
};
