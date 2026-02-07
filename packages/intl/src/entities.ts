import { createCollectionConfigFactory } from '@repo/common';
import { getMessagesEndpoint } from './endpoints/get-messages';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { createHooks } from './hooks';
import type { ResolvedPluginOptions } from './types';

export const Messages = createCollectionConfigFactory<
  ResolvedPluginOptions<'hooks'>
>(({ hooks }) => ({
  admin: {
    hidden: true,
  },
  access: {
    read: () => true,
  },
  endpoints: [setMessagesEndpoint, getMessagesEndpoint],
  fields: [
    {
      name: 'locale',
      type: 'text',
      required: true,
    },
  ],
  hooks: createHooks(hooks),
  indexes: [
    {
      fields: ['locale'],
    },
  ],
  upload: {
    mimeTypes: ['application/json'],
  },
}));
