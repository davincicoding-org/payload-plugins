import type { CollectionSlug, Field, GlobalSlug, Plugin } from 'payload';
import { createCommentEndpoint } from './endpoints/create-comment';
import { createReplyEndpoint } from './endpoints/create-reply';
import { Comments } from './entities';
import {
  attachAuthor,
  createDeleteCommentsHooks,
  createDeleteRepliesHooks,
  createRestoreCommentsHooks,
  createSoftDeleteCommentsHooks,
  createSoftDeleteRepliesHooks,
} from './hooks';
import type { FieldConfig } from './types';

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
}

export const discussionsPlugin =
  ({
    collections = [],
    globals = [],
    maxCommentDepth = 5,
    collectionSlug = 'comments',
  }: DiscussionsPluginOptions): Plugin =>
  (config) => {
    const commentsSlug = collectionSlug as CollectionSlug;

    const discussionsField: Field = {
      name: 'discussions',
      type: 'relationship',
      relationTo: commentsSlug,
      hasMany: true,
      admin: {
        position: 'sidebar',
        condition: (data) => Boolean(data?.id),
        components: {
          Field: {
            path: '@/cms/plugins/discussions/rsc#DiscussionsField',
            clientProps: {
              maxDepth: maxCommentDepth,
              commentsCollectionSlug: collectionSlug,
            } satisfies FieldConfig,
          },
          Cell: {
            path: '@/cms/plugins/discussions/rsc#DiscussionsCell',
          },
        },
      },
    };

    config.endpoints ??= [];
    config.endpoints.push(createCommentEndpoint({ collectionSlug }));
    config.endpoints.push(createReplyEndpoint({ collectionSlug }));

    config.collections ??= [];
    config.collections.push(Comments({ slug: commentsSlug }));

    for (const collection of config.collections ?? []) {
      if (!collections.includes(collection.slug as CollectionSlug)) continue;
      collection.fields ??= [];
      collection.fields.push(discussionsField);

      collection.hooks ??= {};
      collection.hooks.beforeChange ??= [];
      collection.hooks.beforeChange.push(
        createSoftDeleteCommentsHooks({
          commentsSlug,
        }),
      );
      collection.hooks.afterChange ??= [];
      collection.hooks.afterChange.push(
        createRestoreCommentsHooks({
          commentsSlug,
        }),
      );
      collection.hooks.afterDelete ??= [];
      collection.hooks.afterDelete.push(
        createDeleteCommentsHooks({
          commentsSlug,
        }),
      );
    }

    config.globals ??= [];

    for (const global of config.globals ?? []) {
      if (!globals.includes(global.slug as GlobalSlug)) continue;
      global.fields ??= [];
      global.fields.push(discussionsField);
    }

    return config;
  };
