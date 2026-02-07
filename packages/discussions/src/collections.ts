import { createCollectionConfigFactory } from '@repo/common';
import {
  attachAuthor,
  createDeleteRepliesHooks,
  createSoftDeleteRepliesHooks,
} from './hooks';

export const Comments = createCollectionConfigFactory(({ slug }) => ({
  trash: true,
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        condition: (data) => Boolean(data?.id),
      },
    },
    {
      name: 'replies',
      type: 'relationship',
      relationTo: slug,
      hasMany: true,
      admin: {
        condition: (data) => Boolean(data?.id),
      },
    },
  ],

  hooks: {
    beforeChange: [attachAuthor],
    afterChange: [createSoftDeleteRepliesHooks({ commentsSlug: slug })],
    afterDelete: [createDeleteRepliesHooks({ commentsSlug: slug })],
  },
}));
