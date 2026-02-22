import type { CollectionSlug, GlobalSlug, Plugin } from 'payload';
import { createHooks } from '@/hooks';
import type { EntitySlug } from '@/types';
import { getTrackedCollections } from '@/utils/tracked-collections';

export {
  createRequestHandler,
  type RequestHandlerCacheOptions,
} from './exports/create-request';

export interface SmartCachePluginConfig {
  /**
   * The collections to track changes for.
   * By default, collections referenced via relationship or upload fields
   * are automatically tracked as well.
   */
  collections?: CollectionSlug[];
  /**
   * The globals to track changes for.
   * Collections referenced by these globals via relationship or upload
   * fields are automatically tracked as well.
   */
  globals?: GlobalSlug[];
  /**
   * Disable automatic tracking of collections referenced by the configured ones.
   * @default false
   */
  disableAutoTracking?: boolean;
  /**
   * Called when a document triggers cache invalidation.
   * Only fires for collections/globals explicitly registered in the config.
   */
  onInvalidate?: (change: {
    collection: EntitySlug;
    docID: string;
  }) => void | Promise<void>;
}

export const smartCachePlugin =
  ({
    collections = [],
    globals = [],
    onInvalidate,
    disableAutoTracking,
  }: SmartCachePluginConfig): Plugin =>
  (config) => {
    if (collections.length + globals.length === 0) {
      console.warn(
        '[payload-smart-cache] No collections or globals are configured to track changes for, hence this plugin will have no effect.',
      );
      return config;
    }

    const hooks = createHooks({
      collections,
      globals,
      onInvalidate,
    });

    config.globals ??= [];
    for (const global of config.globals) {
      if (!globals.includes(global.slug as GlobalSlug)) continue;
      global.hooks ??= {};
      global.hooks.afterChange ??= [];
      global.hooks.afterChange.push(hooks.globalAfterChange);
    }

    config.collections ??= [];
    const collectionsToTrack = disableAutoTracking
      ? new Set(collections)
      : getTrackedCollections(
          { collections, globals },
          { collections: config.collections, globals: config.globals },
        );
    for (const collection of config.collections) {
      if (!collectionsToTrack.has(collection.slug as CollectionSlug)) continue;
      collection.hooks ??= {};
      collection.hooks.afterChange ??= [];
      collection.hooks.afterChange.push(hooks.collectionAfterChange);
      collection.hooks.afterDelete ??= [];
      collection.hooks.afterDelete.push(hooks.collectionAfterDelete);
    }

    return config;
  };
