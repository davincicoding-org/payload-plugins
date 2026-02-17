import type { CollectionSlug, Field, GlobalSlug, Plugin } from 'payload';
import { createCommentEndpoint } from './endpoints/create-comment';
import { createReplyEndpoint } from './endpoints/create-reply';
import { Comments } from './entities';
import type { CreateCommentCallback, DiscussionsFieldConfig } from './types';

export interface DiscussionsPluginOptions {
  /**
   * The collections to add the discussions field to.
   * @default []
   */
  collections?: CollectionSlug[];
  /**
   * The globals to add the discussions field to.
   * @default []
   */
  globals?: GlobalSlug[];
  /**
   * The maximum depth of the comments.
   * @default 5
   */
  maxCommentDepth?: number;
  /**
   * The slug to use for the comments collection.
   * @default "comments"
   */
  collectionSlug?: CollectionSlug;
  /** Called after a comment or reply is created. Use this to integrate with other plugins (e.g. notifications). */
  onComment?: CreateCommentCallback;
}

export const discussionsPlugin =
  ({
    collections = [],
    globals = [],
    maxCommentDepth = 5,
    collectionSlug = 'comments',
    onComment,
  }: DiscussionsPluginOptions): Plugin =>
  (config) => {
    const commentsSlug = collectionSlug as 'comments';

    const createDisussionsField = (
      source: DiscussionsFieldConfig['source'],
    ): Field => ({
      name: 'discussions',
      type: 'relationship',
      relationTo: commentsSlug,
      hasMany: true,
      custom: { smartDeletion: 'cascade' },
      admin: {
        position: 'sidebar',
        condition: (data) => Boolean(data?.id || data?.createdAt),
        components: {
          Field: {
            path: 'payload-discussions/rsc#DiscussionsField',
            clientProps: {
              maxDepth: maxCommentDepth,
              commentsSlug,
              source,
            } satisfies DiscussionsFieldConfig,
          },
          Cell: {
            path: 'payload-discussions/rsc#DiscussionsCell',
          },
        },
      },
    });

    config.endpoints ??= [];
    config.endpoints.push(
      createCommentEndpoint({
        commentsSlug,
        callback: onComment,
      }),
    );
    config.endpoints.push(
      createReplyEndpoint({
        commentsSlug,
        callback: onComment,
        enabledEntities: { collections, globals },
      }),
    );

    config.collections ??= [];
    config.collections.push(Comments({ slug: commentsSlug }));

    for (const collection of config.collections ?? []) {
      if (!collections.includes(collection.slug as CollectionSlug)) continue;
      collection.fields ??= [];
      collection.fields.push(
        createDisussionsField({
          entity: 'collection',
          slug: collection.slug,
        }),
      );
    }

    config.globals ??= [];

    for (const global of config.globals ?? []) {
      if (!globals.includes(global.slug as GlobalSlug)) continue;
      global.fields ??= [];
      global.fields.push(
        createDisussionsField({
          entity: 'global',
          slug: global.slug,
        }),
      );
    }

    return config;
  };
