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
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'subject',
      type: 'json',
      required: true,
      typescriptSchema: [
        () => ({
          oneOf: [
            {
              type: 'object' as const,
              properties: {
                type: { type: 'string' as const, enum: ['static'] },
                value: { type: 'string' as const },
              },
              required: ['type', 'value'],
              additionalProperties: false,
            },
            {
              type: 'object' as const,
              properties: {
                type: { type: 'string' as const, enum: ['dynamic'] },
                parts: {
                  type: 'array' as const,
                  items: {
                    oneOf: [
                      { type: 'string' as const },
                      {
                        type: 'object' as const,
                        properties: {
                          type: {
                            type: 'string' as const,
                            enum: ['actor', 'document', 'meta'],
                          },
                          field: { type: 'string' as const },
                        },
                        required: ['type', 'field'],
                        additionalProperties: false,
                      },
                    ],
                  },
                },
              },
              required: ['type', 'parts'],
              additionalProperties: false,
            },
          ],
        }),
      ],
    },
    { name: 'url', type: 'text' },
    { name: 'meta', type: 'json' },
    {
      name: 'documentReference',
      type: 'group',
      fields: [
        {
          name: 'entity',
          type: 'select',
          options: ['collection', 'global'],
        },
        { name: 'slug', type: 'text', index: true },
        { name: 'documentId', type: 'text', index: true },
      ],
    },
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
    {
      name: 'documentReference',
      type: 'group',
      fields: [
        {
          name: 'entity',
          type: 'select',
          options: ['collection', 'global'],
          required: true,
        },
        { name: 'slug', type: 'text', required: true, index: true },
        { name: 'documentId', type: 'text', index: true },
      ],
    },
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
