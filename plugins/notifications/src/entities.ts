import { createCollectionConfigFactory } from '@repo/common';
import type { JSONSchema4 } from 'json-schema';
import { z } from 'zod';
import { messageSchema } from './types';

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
      name: 'message',
      type: 'json',
      required: true,
      typescriptSchema: [() => z.toJSONSchema(messageSchema) as JSONSchema4],
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
  ],
});
