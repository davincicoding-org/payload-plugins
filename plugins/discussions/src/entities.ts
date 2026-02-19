import { createCollectionConfigFactory } from '@davincicoding/payload-plugin-kit';

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
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'replies',
      type: 'relationship',
      relationTo: slug as 'comments',
      hasMany: true,
      custom: { smartDeletion: 'cascade' },
      admin: {
        condition: (data) => Boolean(data?.id),
      },
    },
  ],
}));
