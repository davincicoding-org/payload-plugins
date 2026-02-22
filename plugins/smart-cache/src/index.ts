import type { CollectionSlug, GlobalSlug, Plugin } from 'payload';
import {
  invalidateCollectionCache,
  invalidateCollectionCacheOnDelete,
  invalidateGlobalCache,
} from '@/hooks';
import type { GraphResolver, OnInvalidate } from '@/types';
import {
  createDependencyGraph,
  type EntitiesGraph,
} from '@/utils/dependency-graph';
import { getTrackedCollections } from '@/utils/tracked-collections';

export type { InvalidationChange, OnInvalidate } from '@/types';
export {
  createRequestHandler,
  type RequestHandlerCacheOptions,
} from './exports/create-request';

export interface SmartCachePluginConfig<
  C extends CollectionSlug = CollectionSlug,
  G extends GlobalSlug = GlobalSlug,
> {
  /**
   * The collections to track changes for.
   * By default, collections referenced via relationship or upload fields
   * are automatically tracked as well.
   */
  collections?: C[];
  /**
   * The globals to track changes for.
   * Collections referenced by these globals via relationship or upload
   * fields are automatically tracked as well.
   */
  globals?: G[];
  /**
   * Disable automatic tracking of collections referenced by the configured ones.
   * @default false
   */
  disableAutoTracking?: boolean;
  /**
   * Called when cache invalidation is triggered.
   * Only fires for collections/globals explicitly registered in the config.
   */
  onInvalidate?: OnInvalidate<C, G>;
}

function createGraphResolver(
  registeredCollections: Set<CollectionSlug>,
  registeredGlobals: Set<GlobalSlug>,
): GraphResolver {
  let graph: EntitiesGraph | undefined;
  return (payload) => {
    graph ??= createDependencyGraph(payload);
    return { graph, registeredCollections, registeredGlobals };
  };
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

    const resolve = createGraphResolver(
      new Set(collections),
      new Set(globals),
    );
    const hookConfig = { resolve, onInvalidate };

    config.globals ??= [];
    for (const global of config.globals) {
      if (!globals.includes(global.slug as GlobalSlug)) continue;
      global.hooks ??= {};
      global.hooks.afterChange ??= [];
      global.hooks.afterChange.push(invalidateGlobalCache(hookConfig));
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
      collection.hooks.afterChange.push(invalidateCollectionCache(hookConfig));
      collection.hooks.afterDelete ??= [];
      collection.hooks.afterDelete.push(invalidateCollectionCacheOnDelete(hookConfig));
    }

    return config;
  };
