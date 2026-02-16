import type { CollectionBeforeChangeHook } from 'payload';

export const attachAuthor: CollectionBeforeChangeHook<{
  id: number | string;
  author: number | string;
}> = ({ req, operation, data }) => {
  if (operation === 'create' && req.user) {
    data.author = req.user.id;
  }

  return data;
};
