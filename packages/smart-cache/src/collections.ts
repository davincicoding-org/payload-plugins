import type { CollectionConfig } from 'payload';

export const PublishQueue = {
  slug: 'publish-queue',
  admin: {
    hidden: true,
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'entityType',
      type: 'text',
      required: true,
    },
    {
      name: 'entityId',
      type: 'text',
      admin: {
        description: 'ID of the changed entity',
      },
    },
  ],
} satisfies CollectionConfig;
