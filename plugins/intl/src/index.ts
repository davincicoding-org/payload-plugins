import type {
  CollectionSlug,
  Field,
  GlobalAdminOptions,
  GlobalConfig,
  Plugin,
} from 'payload';
import { PLUGIN_CONTEXT, VIRTUAL_MESSAGES_FIELD_NAME } from './const';
import type { MessagesFieldProps } from './exports/client';
import {
  createPersistDataToFileHook,
  createPopulateDataFromFileHook,
} from './file-storage-hooks';
import {
  createExtractScopedMessagesHook,
  createPopulateScopedMessagesHook,
} from './hooks';
import type {
  EditorAccessGuard,
  MessagesHooks,
  MessagesSchema,
  MessagesScopesConfig,
  Messages as MessagesType,
  TypedMessagesScopesConfig,
} from './types.ts';
import { normalizeScopes } from './utils/scopes';

export interface MessagesPluginConfig<Schema extends MessagesSchema> {
  /** Nested object defining message keys and ICU templates. */
  schema: Schema;
  globalSlug?: string;
  globalGroup?: GlobalAdminOptions['group'];
  globalLabel?: string;
  uploadCollection?: CollectionSlug;
  /**
   * Colocate translation editing with Payload globals. Each entry maps a
   * top-level schema key to a global with the same slug, adding a Messages
   * tab or sidebar to that global's edit view.
   *
   * Accepts an array of slugs (defaults to `'tab'` position) or a record
   * mapping slugs to `'tab' | 'sidebar' | { position, existingFieldsTabLabel? }`.
   */
  scopes?: TypedMessagesScopesConfig<Schema>;
  /**
   * Access control for allowing to edit the messages.
   *
   * @default `({ user }) => user !== null`
   */
  editorAccess?: EditorAccessGuard;
  /**
   * Collection hooks for the messages collection. Extends Payload's
   * collection hooks with an additional `afterUpdate` callback.
   */
  hooks?: GlobalConfig['hooks'];
}

export type {
  MessagesScopesConfig,
  MessagesSchema,
  MessagesHooks,
  EditorAccessGuard,
};

export { fetchMessages } from './exports/fetchMessages';

export const intlPlugin =
  <Schema extends MessagesSchema>({
    schema,
    globalSlug = 'messages',
    globalGroup,
    globalLabel,
    scopes: scopesConfig,
    uploadCollection,
    hooks = {},
    editorAccess = ({ user }) => user !== null,
  }: MessagesPluginConfig<Schema>): Plugin =>
  (config) => {
    if (!config.localization) {
      console.warn(
        '[payload-intl] You have not set the localization option in your Payload config, so this plugin will have no effect.',
      );
    }

    PLUGIN_CONTEXT.set(config, {
      globalSlug,
      uploadCollection,
    });

    const scopes = normalizeScopes(scopesConfig);

    config.typescript ??= {};
    config.typescript.schema ??= [];
    config.typescript.schema.push(({ jsonSchema }) => ({
      ...jsonSchema,
      definitions: {
        ...jsonSchema.definitions,
        MessagesData: {
          type: 'object',
          additionalProperties: {
            anyOf: [{ $ref: '#/definitions/MessagesData' }, { type: 'string' }],
          },
        },
      },
    }));

    config.globals ??= [];

    config.globals.push({
      slug: globalSlug,
      label: globalLabel,
      access: {
        read: () => true,
        update: ({ req }) => editorAccess(req),
      },
      hooks: {
        ...(uploadCollection
          ? {
              afterRead: [createPopulateDataFromFileHook({ uploadCollection })],
              beforeChange: [createPersistDataToFileHook({ uploadCollection })],
            }
          : {}),
        ...hooks,
      },
      admin: {
        hidden: (req) => !editorAccess(req),
        group: globalGroup,
        components: {
          elements: {
            beforeDocumentControls: [
              {
                path: 'payload-intl/client#MessagesImport',
              },
            ],
          },
        },
      },
      fields: [
        {
          name: 'data',
          type: 'json',
          label: false,
          required: true,
          localized: true,
          virtual: uploadCollection !== undefined,
          defaultValue: {},
          typescriptSchema: [
            () => ({
              $ref: '#/definitions/MessagesData',
            }),
          ],
          admin: {
            components: {
              Field: {
                path: 'payload-intl/client#MessagesField',
                clientProps: {
                  schema: schema,
                } satisfies MessagesFieldProps,
              },
            },
          },
        },

        ...(uploadCollection
          ? [
              {
                name: 'file',
                type: 'upload' as const,
                localized: true,
                relationTo: uploadCollection,
              },
            ]
          : []),
      ],
    });

    if (scopes.size === 0) return config;

    /* Configure Scopes */

    for (const global of config.globals) {
      const scopeConfig = scopes.get(global.slug);
      if (!scopeConfig) continue;

      /* Inject Messages Field */

      const messagesField: Field = {
        name: VIRTUAL_MESSAGES_FIELD_NAME,
        label: false,
        type: 'json',
        virtual: true,
        access: {
          read: ({ req }) => editorAccess(req),
          update: ({ req }) => editorAccess(req),
          create: ({ req }) => editorAccess(req),
        },
        admin: {
          components: {
            Field: {
              path: 'payload-intl/client#MessagesField',
              clientProps: {
                schema: schema[global.slug] as MessagesType,
              } satisfies MessagesFieldProps,
            },
          },
        },
        hooks: {
          afterRead: [
            createPopulateScopedMessagesHook({
              globalSlug: globalSlug as 'messages',
              scope: global.slug,
            }),
          ],
          beforeChange: [
            createExtractScopedMessagesHook({
              globalSlug: globalSlug as 'messages',
              scope: global.slug,
            }),
          ],
        },
      };

      global.fields ??= [];

      if (scopeConfig.position === 'sidebar') {
        global.fields.push({
          type: 'group',
          label: 'Messages',
          admin: {
            position: 'sidebar',
          },
          fields: [messagesField],
        });
      } else if (global.fields[0]?.type === 'tabs') {
        global.fields[0].tabs.push({
          label: 'Messages',
          fields: [messagesField],
        });
      } else {
        global.fields = [
          {
            type: 'tabs',
            tabs: [
              {
                label: scopeConfig.existingFieldsTabLabel ?? 'Fields',
                fields: global.fields,
              },
              {
                label: 'Messages',
                fields: [messagesField],
              },
            ],
          },
        ];
      }
    }

    return config;
  };
