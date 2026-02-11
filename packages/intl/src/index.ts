import type { CollectionSlug, Plugin } from 'payload';
import type { MessagesViewProps } from './components/MessagesView';
import { getMessagesEndpoint } from './endpoints/get-messages';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { Messages } from './entities';
import type { MessagesGuard, MessagesHooks, MessagesSchema } from './types.ts';
import { attachPluginContext, getSupportedLocales } from './utils/config';

export interface MessagesPluginConfig {
  schema: MessagesSchema;
  /**
   * The slug of the collection to use for the messages.
   *
   * @default `messages`
   */
  collectionSlug?: CollectionSlug;
  /**
   * Access control for allowing to edit the messages.
   *
   * @default `(req) => req.user !== null // Authenticated users only`
   */
  editorAccess?: MessagesGuard;
  hooks?: MessagesHooks;
  tabs?: boolean;
}

export const intlPlugin =
  ({
    schema,
    tabs,
    collectionSlug = 'messages',
    hooks = {},
    editorAccess = (req) => req.user !== null,
  }: MessagesPluginConfig): Plugin =>
  (config) => {
    if (!config.localization) {
      console.warn(
        '[payload-intl] You have not set the localization option in your Payload config, so this plugin will have no effect.',
      );
      return config;
    }

    const locales = getSupportedLocales(config.localization);

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
    config.collections.push(Messages({ slug: collectionSlug, hooks }));

    config.endpoints ??= [];
    config.endpoints.push(getMessagesEndpoint);
    config.endpoints.push(setMessagesEndpoint);

    return config;
  };

export { fetchMessages } from './requests/fetchMessages';

export type {
  Messages,
  MessagesSchema,
} from './types.ts';
