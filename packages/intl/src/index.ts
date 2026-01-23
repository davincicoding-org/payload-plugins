import './styles.css';

import type {
  CollectionAfterChangeHook,
  CollectionConfig,
  Plugin,
} from 'payload';
import { getMessagesEndpoint } from './endpoints/get-messages';
import { setMessagesEndpoint } from './endpoints/set-messages';
import type { MessagesViewProps } from './exports/view';
import type { MessagesPluginConfig } from './types.ts';
import { attachPluginContext, getSupportedLocales } from './utils/config';

export const intlPlugin =
  ({
    schema,
    tabs,
    collectionSlug = 'messages',
    hooks,
    editorAccess = (req) => req.user !== null,
  }: MessagesPluginConfig): Plugin =>
  (config) => {
    const locales = getSupportedLocales(config.localization);

    if (!config.serverURL) {
      throw new Error(
        'serverURL is required in your payload.config.ts file for payload-intl to work.',
      );
    }

    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.actions ??= [];
    config.admin.components.actions.push({
      exportName: 'MessagesLink',
      path: 'payload-intl/rsc#MessagesLink',
    });

    config.admin.components.views = {
      ...config.admin.components.views,
      intl: {
        Component: {
          path: 'payload-intl/rsc#MessagesView',
          serverProps: {
            access: editorAccess,
            locales,
            schema,
            tabs,
          } satisfies MessagesViewProps,
        },
        path: '/intl',
      },
    };

    attachPluginContext(config, {
      collectionSlug,
    });
    // config.globals ??= [];
    // config.globals.push({
    //   slug: 'intl-plugin',
    //   fields: [
    //     {
    //       name: 'editorTemplate',
    //       type: 'richText',
    //       editor: lexicalEditor({
    //         features: ({ defaultFeatures }) =>
    //           defaultFeatures.filter(
    //             ({ key }) => !['relationship', 'upload'].includes(key),
    //           ),
    //       }),
    //       admin: { hidden: true },
    //     },
    //   ],
    // });

    config.collections ??= [];
    config.collections.push({
      slug: collectionSlug,
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
    });

    config.endpoints ??= [];
    config.endpoints.push(getMessagesEndpoint);
    config.endpoints.push(setMessagesEndpoint);

    return config;
  };

export { fetchMessages } from './requests/fetchMessages';

export type {
  Messages,
  MessagesPluginConfig,
  MessagesSchema,
} from './types.ts';

const createHooks = (
  hooks: MessagesPluginConfig['hooks'],
): CollectionConfig['hooks'] => {
  if (!hooks) {
    return undefined;
  }
  const { afterUpdate, ...rest } = hooks;
  if (!afterUpdate) {
    return rest;
  }

  const afterUpdateHook: CollectionAfterChangeHook = async ({ operation }) => {
    if (operation === 'update') {
      await afterUpdate();
    }
    return;
  };
  return {
    ...rest,
    afterChange: [...(rest.afterChange ?? []), afterUpdateHook],
  };
};
