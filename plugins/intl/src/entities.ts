import { createCollectionConfigFactory } from '@davincicoding/payload-plugin-kit';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { createHooks } from './hooks';
import type { ResolvedPluginOptions } from './types';

export const Messages = createCollectionConfigFactory<
  ResolvedPluginOptions<'hooks' | 'storage'>
>(({ hooks, storage }) => ({
  admin: {
    hidden: true,
  },
  access: {
    read: () => true,
  },
  endpoints: [setMessagesEndpoint],
  fields: [
    {
      name: 'locale',
      type: 'text',
      required: true,
    },
    {
      name: 'data',
      type: 'json',
    },
  ],
  hooks: createHooks(hooks),
  indexes: [
    {
      fields: ['locale'],
    },
  ],
  ...(storage === 'upload' && {
    upload: {
      mimeTypes: ['application/json'],
    },
  }),
}));
