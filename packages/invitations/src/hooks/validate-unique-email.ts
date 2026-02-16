import { APIError, type CollectionBeforeChangeHook } from 'payload';
import type { User } from '@/payload-types';

export const validateUniqueEmail: CollectionBeforeChangeHook<User> = async ({
  operation,
  data,
  req,
  collection,
}) => {
  if (operation !== 'create') return data;

  const email = data.email;
  if (!email) return data;

  const { docs } = await req.payload.find({
    collection: collection.slug,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  });

  if (docs.length > 0) {
    throw new APIError(`A user with the email "${email}" already exists.`, 400);
  }

  return data;
};
