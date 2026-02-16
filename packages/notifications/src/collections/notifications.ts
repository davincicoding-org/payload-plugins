import { createCollectionConfigFactory } from '@repo/common';

export const Notifications = createCollectionConfigFactory(({ slug }) => ({
  admin: { hidden: true },
  access: {
    read: ({ req }) => {
      if (!req.user) return false;
      return { recipient: { equals: req.user.id } };
    },
    create: () => false,
    update: ({ req }) => {
      if (!req.user) return false;
      return { recipient: { equals: req.user.id } };
    },
    delete: () => false,
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'event', type: 'text', required: true },
    {
      name: 'actor',
      type: 'group',
      fields: [
        {
          name: 'id',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        { name: 'displayName', type: 'text', required: true },
      ],
    },
    { name: 'subject', type: 'text', required: true },
    { name: 'url', type: 'text' },
    { name: 'meta', type: 'json' },
    { name: 'readAt', type: 'date' },
    { name: 'emailSentAt', type: 'date' },
    { name: 'emailError', type: 'text' },
  ],
}));
