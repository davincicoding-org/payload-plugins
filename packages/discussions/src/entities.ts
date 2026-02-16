import { createCollectionConfigFactory } from '@repo/common';
import { attachAuthor } from './hooks';

export const Comments = createCollectionConfigFactory(({ slug }) => ({
  admin: {
    hidden: true,
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'content', type: 'textarea', required: true },
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
      custom: { smartDeletion: 'cascade' },
      admin: {
        condition: (data) => Boolean(data?.id),
      },
    },
  ],

  hooks: {
    beforeChange: [attachAuthor],
  },
}));
