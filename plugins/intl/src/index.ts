import type { Plugin } from 'payload';
import type { MessagesViewProps } from './components/MessagesView';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { Messages } from './entities';
import type {
  MessagesGuard,
  MessagesHooks,
  MessagesSchema,
  StorageStrategy,
} from './types.ts';
import { attachPluginContext, getSupportedLocales } from './utils/config';

export interface MessagesPluginConfig {
  schema: MessagesSchema;
  /**
   * The slug of the collection to use for the messages.
   *
   * @default `messages`
   */
  collectionSlug?: string;
  /**
   * Access control for allowing to edit the messages.
   *
   * @default `(req) => req.user !== null // Authenticated users only`
   */
  editorAccess?: MessagesGuard;
  hooks?: MessagesHooks;
  /**
   * Where translated messages are persisted.
   *
   * - `'db'` — stores translations as JSON in a `data` field (default).
   * - `'upload'` — stores translations as uploaded `.json` files, enabling
   *   static hosting via a CDN or object storage.
   *
   * @default 'db'
   */
  storage?: StorageStrategy;
  tabs?: boolean;
}

export const intlPlugin =
  ({
    schema,
    tabs,
    collectionSlug = 'messages',
    hooks = {},
    editorAccess = (req) => req.user !== null,
    storage = 'db',
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
      storage,
    });
    config.collections ??= [];
    config.collections.push(Messages({ slug: collectionSlug, hooks, storage }));

    config.endpoints ??= [];
    config.endpoints.push(setMessagesEndpoint);

    return config;
  };

export { fetchMessages } from './requests/fetchMessages';

export type {
  Messages,
  MessagesSchema,
  StorageStrategy,
} from './types.ts';
