import type { Plugin } from 'payload';
import type { MessagesViewProps } from './components/MessagesView';
import { PLUGIN_CONTEXT } from './const';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { Messages } from './entities';
import { injectScopeIntoGlobal } from './globals';
import type {
  MessagesGuard,
  MessagesHooks,
  MessagesSchema,
  Scopes,
  StorageStrategy,
} from './types.ts';
import { getSupportedLocales } from './utils/config';
import { normalizeScopes } from './utils/scopes';

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
  scopes?: Scopes;
}

export const intlPlugin =
  ({
    schema,
    tabs,
    scopes: rawScopes,
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
    }

    const locales = getSupportedLocales(config.localization);
    const scopes = normalizeScopes(rawScopes);

    const scopeKeys = new Set(scopes.keys());
    const viewSchema = Object.fromEntries(
      Object.entries(schema).filter(([key]) => !scopeKeys.has(key)),
    );

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
            fullSchema: schema,
            locales,
            schema: viewSchema,
            scopes,
            tabs,
          } as MessagesViewProps,
        },
        path: '/intl',
      },
    };

    if (scopes.size > 0) {
      config.globals = (config.globals ?? []).map((global) => {
        const scopeConfig = scopes.get(global.slug);
        if (!scopeConfig) return global;
        return injectScopeIntoGlobal(global, global.slug, scopeConfig, schema);
      });
    }

    PLUGIN_CONTEXT.set(config, {
      collectionSlug,
      storage,
      scopes,
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
  NormalizedScope,
  ScopeConfig,
  ScopePosition,
  Scopes,
  StorageStrategy,
} from './types.ts';
