import { createCollectionConfigFactory } from '@repo/common';

export const Subscriptions = createCollectionConfigFactory(({ slug }) => ({
  admin: { hidden: true },
  access: {
    read: ({ req }) => {
      if (!req.user) return false;
      return { user: { equals: req.user.id } };
    },
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'documentId', type: 'text', required: true, index: true },
    { name: 'collectionSlug', type: 'text', required: true },
    {
      name: 'reason',
      type: 'select',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Auto', value: 'auto' },
      ],
      defaultValue: 'auto',
      required: true,
    },
  ],
}));
