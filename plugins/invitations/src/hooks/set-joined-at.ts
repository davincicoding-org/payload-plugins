import type { CollectionBeforeChangeHook } from 'payload';
import type { User } from '@/payload-types';
import type { CreateFlow } from '../types';

export const setJoinedAt: CollectionBeforeChangeHook<User> = ({
  operation,
  data,
  req,
}) => {
  if (operation !== 'create') return data;

  const flow = req.context.createFlow as CreateFlow | undefined;
  if (flow && flow.type !== 'direct-create') return data;

  return { ...data, joinedAt: new Date().toISOString() };
};
