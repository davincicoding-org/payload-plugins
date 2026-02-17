import { createCollectionConfigFactory } from '@repo/common';

export const Notifications = createCollectionConfigFactory({
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
    delete: ({ req }) => {
      if (!req.user) return false;
      return { recipient: { equals: req.user.id } };
    },
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
    { name: 'collectionSlug', type: 'text' },
    { name: 'documentId', type: 'text' },
    { name: 'readAt', type: 'date' },
    { name: 'emailSentAt', type: 'date' },
    { name: 'emailError', type: 'text' },
  ],
});

export const Subscriptions = createCollectionConfigFactory({
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
});
