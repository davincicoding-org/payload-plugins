import crypto from 'node:crypto';
import type { CollectionBeforeValidateHook } from 'payload';
import type { User } from '@/payload-types';

export const autoGeneratePassword: CollectionBeforeValidateHook<User> = ({
  operation,
  data,
}) => {
  if (operation !== 'create') return data;

  const password = crypto.randomBytes(32).toString('hex');

  return {
    ...data,
    email: data?._email,
    password,
    'confirm-password': password,
  };
};
