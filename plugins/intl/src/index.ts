import type { Plugin } from 'payload';
import type { MessagesViewProps } from './components/MessagesView';
import { PLUGIN_CONTEXT } from './const';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { Messages } from './entities';
import { injectScopeIntoGlobal } from './globals';
import type {
  EditorAccessGuard,
  MessagesHooks,
  MessagesSchema,
  MessagesScopesConfig,
} from './types.ts';
import { getSupportedLocales } from './utils/config';
import { normalizeScopes } from './utils/scopes';

export { fetchMessages } from './requests/fetchMessages';

export interface MessagesPluginConfig {
  /** Nested object defining message keys and ICU templates. */
  schema: MessagesSchema;
  /**
   * Where translated messages are persisted.
   *
   * - `'db'` — stores translations as JSON in a `data` field (default).
   * - `'upload'` — stores translations as uploaded `.json` files, enabling
   *   static hosting via a CDN or object storage.
   *
   * @default 'db'
   */
  storage?: 'db' | 'upload';
  /**
   * Colocate translation editing with Payload globals. Each entry maps a
   * top-level schema key to a global with the same slug, adding a Messages
   * tab or sidebar to that global's edit view.
   *
   * Accepts an array of slugs (defaults to `'tab'` position) or a record
   * mapping slugs to `'tab' | 'sidebar' | { position, existingFieldsTabLabel? }`.
   */
  scopes?: MessagesScopesConfig;
  /**
   * When enabled, top-level schema keys are rendered as tabs in the
   * admin UI instead of a flat list.
   *
   * @default false
   */
  tabs?: boolean;
  /**
   * The slug of the collection used to store translation documents.
   *
   * @default 'messages'
   */
  collectionSlug?: string;
  /**
   * Access control for allowing to edit the messages.
   *
   * @default `(req) => req.user !== null`
   */
  editorAccess?: EditorAccessGuard;
  /**
   * Collection hooks for the messages collection. Extends Payload's
   * collection hooks with an additional `afterUpdate` callback.
   */
  hooks?: MessagesHooks;
}

export type {
  MessagesScopesConfig,
  MessagesSchema,
  MessagesHooks,
  EditorAccessGuard,
};

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

    /* Add admin components */

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
          } satisfies MessagesViewProps,
        },
        path: '/intl',
      },
    };

    /* Configure Scopes */

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
