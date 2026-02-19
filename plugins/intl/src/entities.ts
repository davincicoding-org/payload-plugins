import { createCollectionConfigFactory } from '@davincicoding/payload-plugin-kit';
import type { Field } from 'payload';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { createHooks } from './hooks';
import type { ResolvedPluginOptions, StorageStrategy } from './types';

const localeField: Field = {
  name: 'locale',
  type: 'text',
  required: true,
};

const dataField: Field = {
  name: 'data',
  type: 'json',
  required: true,
};

export const Messages = createCollectionConfigFactory<
  ResolvedPluginOptions<'hooks'> & { storage: StorageStrategy }
>(({ hooks, storage }) => ({
  admin: {
    hidden: true,
  },
  access: {
    read: () => true,
  },
  endpoints: [setMessagesEndpoint],
  fields: storage === 'db' ? [localeField, dataField] : [localeField],
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
